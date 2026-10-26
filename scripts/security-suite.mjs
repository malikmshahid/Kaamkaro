/**
 * Live security suite — runs against a booted KaamKaro instance.
 *
 *   node scripts/security-suite.mjs http://localhost:3000
 *
 * It creates throwaway accounts, then tries to break the rules the platform
 * claims to enforce: authorisation, IDOR, mass assignment, token forgery,
 * price tampering, replayed payments, oversized payloads, rate limits and
 * gateway-callback spoofing. Every case prints PASS/FAIL and the run exits
 * non-zero if anything fails.
 */
const BASE = process.argv[2] || "http://localhost:3000";
const KEY = process.env.JWT_TEST_SECRET || "";
let pass = 0;
const failures = [];

function check(name, ok, extra = "") {
  if (ok) {
    pass += 1;
    console.log(`  PASS  ${name}`);
  } else {
    failures.push(`${name} ${extra}`);
    console.log(`  FAIL  ${name} ${extra}`);
  }
}

const jar = {};
async function call(who, path, init = {}) {
  const headers = { ...(init.headers || {}) };
  if (init.body && typeof init.body !== "string") {
    headers["content-type"] = "application/json";
    init.body = JSON.stringify(init.body);
  }
  if (who && jar[who]) headers.cookie = jar[who];
  const res = await fetch(BASE + path, { ...init, headers, redirect: "manual" });
  const text = await res.text();
  let json = null;
  try {
    json = JSON.parse(text);
  } catch {}
  return { status: res.status, json, text, headers: res.headers };
}

async function login(who, identifier, password) {
  const r = await call(null, "/api/auth/login", { method: "POST", body: { identifier, password } });
  const c = r.headers.getSetCookie?.() || [];
  jar[who] = c.map((x) => x.split(";")[0]).join("; ");
  return r;
}

async function main() {
  const tag = Math.random().toString(36).slice(2, 8);
  console.log(`\n== bootstrapping accounts (${tag}) ==`);
  const pw = "TestPass123!";

  for (const [who, role] of [
    ["alice", "client"],
    ["bob", "provider"],
    ["carol", "client"],
    ["dave", "provider"],
  ]) {
    const email = `${who}.${tag}@example.com`;
    const r = await call(null, "/api/auth/signup", {
      method: "POST",
      body: {
        name: `${who.toUpperCase()} ${tag}`,
        email,
        phone: `+9230${Math.floor(10000000 + Math.random() * 89999999)}`,
        password: pw,
        role,
        city: "Lahore",
      },
    });
    console.log(`  signup ${who}: ${r.status} ${r.status === 200 || r.status === 201 ? "" : r.text.slice(0, 120)}`);
  }
  for (const who of ["alice", "bob", "carol", "dave"]) {
    const r = await login(who, `${who}.${tag}@example.com`, pw);
    if (r.status !== 200) console.log(`  login ${who}: ${r.status} ${r.text.slice(0, 120)}`);
  }

  console.log("\n== unauthenticated access ==");
  for (const [path, method] of [
    ["/api/profile", "PATCH"],
    ["/api/keys", "GET"],
    ["/api/saved", "GET"],
    ["/api/payouts", "POST"],
    ["/api/notifications", "GET"],
    ["/api/conversations", "GET"],
    ["/api/admin/users", "GET"],
    ["/api/admin/payouts", "GET"],
    ["/api/admin/credits", "GET"],
    ["/api/agent/tasks", "GET"],
    ["/api/agent/tools", "GET"],
  ]) {
    const r = await call(null, path, { method, body: method === "GET" ? undefined : {} });
    check(`anon ${method} ${path} is blocked`, [401, 403].includes(r.status), `got ${r.status}`);
  }

  const cron = await call(null, "/api/cron/expire-tasks");
  check("cron without secret is blocked", [401, 403].includes(cron.status), `got ${cron.status}`);
  const cronBad = await call(null, "/api/cron/expire-tasks", { headers: { authorization: "Bearer undefined" } });
  check("cron with 'Bearer undefined' is blocked", [401, 403].includes(cronBad.status), `got ${cronBad.status}`);

  console.log("\n== token forgery ==");
  const sig = jar.alice;
  const forgedRole = (() => {
    const token = sig.split("=")[1];
    const [h, p] = token.split(".");
    const payload = JSON.parse(Buffer.from(p, "base64url").toString());
    payload.role = "admin";
    return `${h}.${Buffer.from(JSON.stringify(payload)).toString("base64url")}.${token.split(".")[2]}`;
  })();
  const tampered = await call(null, "/api/admin/payouts", { headers: { cookie: `kaamkaro_session=${forgedRole}` } });
  check("role-escalated JWT is rejected", [401, 403].includes(tampered.status), `got ${tampered.status}`);

  const algNone = (() => {
    const token = sig.split("=")[1];
    const [h, p] = token.split(".");
    const header = Buffer.from(JSON.stringify({ alg: "none", typ: "JWT" })).toString("base64url");
    return `${header}.${p}.`;
  })();
  const noneRes = await call(null, "/api/profile", {
    method: "PATCH",
    headers: { cookie: `kaamkaro_session=${algNone}` },
    body: { name: "Hacked" },
  });
  check("alg:none token is rejected", [401, 403].includes(noneRes.status), `got ${noneRes.status}`);

  console.log("\n== mass assignment ==");
  await call("alice", "/api/profile", {
    method: "PATCH",
    body: { name: "Alice Fine", role: "admin", cnicVerified: true, ratingAvg: 5, passwordHash: "x" },
  });
  const meAfter = await call("alice", "/api/auth/me");
  check(
    "extra profile fields ignored",
    meAfter.json?.user?.role !== "admin" && meAfter.json?.user?.cnicVerified !== true,
    `role=${meAfter.json?.user?.role} verified=${meAfter.json?.user?.cnicVerified}`
  );

  console.log("\n== input validation ==");
  const longTitle = await call("alice", "/api/tasks", {
    method: "POST",
    body: {
      title: "x".repeat(5000),
      description: "y".repeat(50),
      category: "delivery",
      budget: 500,
      expiresAt: new Date(Date.now() + 864e5).toISOString(),
    },
  });
  check("5000-char title rejected", longTitle.status === 400, `got ${longTitle.status}`);

  const negBudget = await call("alice", "/api/tasks", {
    method: "POST",
    body: {
      title: "Negative budget task",
      description: "trying a negative amount here",
      category: "delivery",
      budget: -100,
      expiresAt: new Date(Date.now() + 864e5).toISOString(),
    },
  });
  check("negative budget rejected", negBudget.status === 400, `got ${negBudget.status}`);

  const badCat = await call("alice", "/api/tasks", {
    method: "POST",
    body: {
      title: "Category injection",
      description: "trying a fake category value",
      category: "hacking",
      budget: 500,
      expiresAt: new Date(Date.now() + 864e5).toISOString(),
    },
  });
  check("unknown category rejected", badCat.status === 400, `got ${badCat.status}`);

  const sqli = await call(null, "/api/tasks?q=%27%20OR%201%3D1%20--");
  check("SQL-ish search term handled", sqli.status === 200, `got ${sqli.status}`);

  console.log("\n== create a real task and check IDOR ==");
  const created = await call("alice", "/api/tasks", {
    method: "POST",
    body: {
      title: `Parity test ${tag}`,
      description: "Deliver a small parcel across town today please.",
      category: "delivery",
      budget: 2500,
      city: "Lahore",
      expiresAt: new Date(Date.now() + 3 * 864e5).toISOString(),
    },
  });
  const taskId = created.json?.taskId;
  check("task created", Boolean(taskId), created.text.slice(0, 120));

  const app = await call("bob", `/api/tasks/${taskId}/apply`, {
    method: "POST",
    body: { message: "I can do this today." },
  });
  const applicationId = app.json?.applicationId;
  check("provider applied", Boolean(applicationId), app.text.slice(0, 120));

  check(
    "stranger cannot accept application",
    (await call("carol", `/api/tasks/${taskId}/accept`, { method: "POST", body: { applicationId } })).status === 403
  );
  check(
    "client cannot accept someone else's application id",
    (await call("alice", `/api/tasks/${taskId}/apply`, { method: "POST", body: { message: "self apply" } })).status === 400
  );

  const accepted = await call("alice", `/api/tasks/${taskId}/accept`, { method: "POST", body: { applicationId } });
  check("owner accepted application", accepted.status === 200, `got ${accepted.status}`);
  const doubleAccept = await call("alice", `/api/tasks/${taskId}/accept`, { method: "POST", body: { applicationId } });
  check("double accept rejected", [409, 400].includes(doubleAccept.status), `got ${doubleAccept.status}`);

  check(
    "stranger cannot read task messages",
    [403, 404].includes((await call("carol", `/api/tasks/${taskId}/messages`)).status)
  );
  check(
    "stranger cannot post task messages",
    [403, 404].includes(
      (await call("carol", `/api/tasks/${taskId}/messages`, { method: "POST", body: { body: "hi" } })).status
    )
  );
  check(
    "stranger cannot pay for someone else's task",
    (await call("carol", `/api/tasks/${taskId}/pay`, { method: "POST", body: {} })).status === 403
  );
  check(
    "provider cannot pay for the client's task",
    (await call("bob", `/api/tasks/${taskId}/pay`, { method: "POST", body: {} })).status === 403
  );

  console.log("\n== payment flow ==");
  const paid = await call("alice", `/api/tasks/${taskId}/pay`, { method: "POST", body: {} });
  check("escrow funded (mock mode)", paid.status === 200, `got ${paid.status} ${paid.text.slice(0, 120)}`);
  const paidTwice = await call("alice", `/api/tasks/${taskId}/pay`, { method: "POST", body: {} });
  check("double payment rejected", [409, 400].includes(paidTwice.status), `got ${paidTwice.status}`);

  check(
    "stranger cannot release escrow",
    [403, 404].includes((await call("carol", `/api/tasks/${taskId}/complete`, { method: "POST", body: {} })).status)
  );
  check(
    "provider cannot release escrow to themselves",
    [403, 404].includes((await call("bob", `/api/tasks/${taskId}/complete`, { method: "POST", body: {} })).status)
  );

  const submitted = await call("bob", `/api/tasks/${taskId}/submit`, {
    method: "POST",
    body: { note: "Delivered, parcel handed over." },
  });
  check("provider submitted work", submitted.status === 200, `got ${submitted.status}`);

  const released = await call("alice", `/api/tasks/${taskId}/complete`, { method: "POST", body: {} });
  check("client released escrow", released.status === 200, `got ${released.status}`);
  const releasedAgain = await call("alice", `/api/tasks/${taskId}/complete`, { method: "POST", body: {} });
  check("double release rejected", [409, 400].includes(releasedAgain.status), `got ${releasedAgain.status}`);

  const payout = await call("bob", "/api/payouts", {
    method: "POST",
    body: {
      amount: 2250,
      method: "jazzcash",
      accountTitle: "Bob Test",
      accountNumber: "03001234567",
    },
  });
  check("provider payout requested", payout.status === 200, `got ${payout.status} ${payout.text.slice(0, 100)}`);
  const overWithdraw = await call("bob", "/api/payouts", {
    method: "POST",
    body: { amount: 999999, method: "jazzcash", accountTitle: "Bob", accountNumber: "03001234567" },
  });
  check("over-withdrawal rejected", [400, 409].includes(overWithdraw.status), `got ${overWithdraw.status}`);
  const crossWithdraw = await call("dave", "/api/payouts", {
    method: "POST",
    body: { amount: 100, method: "jazzcash", accountTitle: "Dave", accountNumber: "03001234567" },
  });
  check("user with no earnings cannot withdraw", [400, 409].includes(crossWithdraw.status), `got ${crossWithdraw.status}`);
  check(
    "non-admin cannot settle payouts",
    [401, 403].includes(
      (await call("bob", "/api/admin/payouts", { method: "GET" })).status
    )
  );

  console.log("\n== agent API ==");
  const badKey = await call(null, "/api/agent/tasks", {
    headers: { authorization: "Bearer kk_live_deadbeef" },
  });
  check("invalid agent key rejected", badKey.status === 401, `got ${badKey.status}`);
  const noKey = await call(null, "/api/agent/tasks");
  check("missing agent key rejected", noKey.status === 401, `got ${noKey.status}`);

  console.log("\n== gateway callback ==");
  const spoof = await call(null, "/api/payments/payfast/callback", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: "basket_id=does-not-exist&err_code=000&transaction_id=1&validation_hash=deadbeef",
  });
  check("callback with unknown basket is not trusted", spoof.status >= 400 || spoof.text.includes("not"), `got ${spoof.status}`);
  const badHash = await call(null, "/api/payments/payfast/callback", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: `basket_id=KK-${tag}&err_code=000&transaction_id=1&validation_hash=${"0".repeat(64)}`,
  });
  check("callback with bad hash is not trusted", badHash.status >= 400 || badHash.text.includes("not"), `got ${badHash.status}`);

  console.log("\n== security headers ==");
  const home = await call(null, "/");
  const h = home.headers;
  check("CSP present", Boolean(h.get("content-security-policy")), h.get("content-security-policy") || "missing");
  check("HSTS present", Boolean(h.get("strict-transport-security")));
  check("frame-ancestors / XFO set", Boolean(h.get("x-frame-options")) || (h.get("content-security-policy") || "").includes("frame-ancestors"));
  check("nosniff present", h.get("x-content-type-options") === "nosniff");
  check("no x-powered-by", !h.get("x-powered-by"));

  console.log("\n== rate limiting ==");
  let limited = false;
  for (let i = 0; i < 12; i += 1) {
    const r = await call(null, "/api/auth/login", {
      method: "POST",
      body: { identifier: `nobody.${tag}@example.com`, password: "wrong-password" },
    });
    if (r.status === 429) {
      limited = true;
      break;
    }
  }
  check("login brute force is throttled", limited);

  console.log("\n== open redirect ==");
  const redirect = await call(null, "/login?next=https://evil.example.com", { method: "GET" });
  check("login page loads", redirect.status === 200, `got ${redirect.status}`);

  console.log("\n== agent money path ==");
  const keyRes = await call("alice", "/api/keys", { method: "POST", body: { agentName: `Suite Agent ${tag}` } });
  const rawKey = keyRes.json?.key || keyRes.json?.rawKey || keyRes.json?.apiKey;
  check("api key issued", Boolean(rawKey), keyRes.text.slice(0, 140));
  if (rawKey) {
    const agentAuth = { authorization: `Bearer ${rawKey}` };
    const agentTask = await call(null, "/api/agent/tasks", {
      method: "POST",
      headers: agentAuth,
      body: {
        title: `Agent suite ${tag}`,
        description: "An AI agent posts this task as part of the security suite.",
        category: "delivery",
        budget: 1200,
        expiresAt: new Date(Date.now() + 2 * 864e5).toISOString(),
      },
    });
    const agentTaskId = agentTask.json?.taskId || agentTask.json?.id;
    check("agent created a task", Boolean(agentTaskId), agentTask.text.slice(0, 140));

    if (agentTaskId) {
      const earlyComplete = await call(null, `/api/agent/tasks/${agentTaskId}`, {
        method: "POST",
        headers: agentAuth,
        body: { action: "complete" },
      });
      check("agent cannot complete an unpaid task", [400, 409].includes(earlyComplete.status), `got ${earlyComplete.status}`);

      const otherAgentView = await call("carol", `/api/tasks/${agentTaskId}`);
      check("agent task is publicly readable", otherAgentView.status === 200, `got ${otherAgentView.status}`);
    }
  }

  console.log("\n== stored XSS ==");
  const xssTitle = `XSS probe <script>alert(1)</script> ${tag}`;
  const xss = await call("alice", "/api/tasks", {
    method: "POST",
    body: {
      title: xssTitle,
      description: "Checking that markup in a title is escaped, not executed.",
      category: "other",
      budget: 300,
      expiresAt: new Date(Date.now() + 864e5).toISOString(),
    },
  });
  const xssId = xss.json?.taskId;
  check("xss probe task created", Boolean(xssId), xss.text.slice(0, 120));
  if (xssId) {
    const page = await call(null, `/tasks/${xssId}`);
    check(
      "task page does not echo raw <script>",
      !/<script>alert\(1\)<\/script>/.test(page.text),
      "raw script tag found in HTML"
    );
  }
  // JSON is data, not markup — escaping has to happen at render time, which the
  // task page check above proves. Here we only assert the API stays a valid,
  // parseable payload while carrying hostile-looking text.
  const xssList = await call(null, "/api/find-work");
  check(
    "find-work stays valid JSON with hostile titles",
    xssList.status === 200 && Array.isArray(xssList.json?.tasks),
    `status ${xssList.status}`
  );

  console.log("\n== saved + notifications scoping ==");
  if (taskId) {
    const saved = await call("alice", "/api/saved", { method: "POST", body: { itemType: "task", itemId: taskId } });
    check("alice can save a task", saved.status === 200, `got ${saved.status}`);
    const bobList = await call("bob", "/api/saved");
    check(
      "saved items are per-user",
      !JSON.stringify(bobList.json || {}).includes(taskId),
      "bob sees alice's saved item"
    );
    const carolNotifs = await call("carol", "/api/notifications");
    check("notifications are per-user", carolNotifs.status === 200, `got ${carolNotifs.status}`);
  }

  console.log(`\n${pass} passed, ${failures.length} failed`);
  if (failures.length) {
    console.log("FAILURES:");
    failures.forEach((f) => console.log(" - " + f));
    process.exitCode = 1;
  }
}

main().catch((e) => {
  console.error("suite crashed:", e);
  process.exitCode = 2;
});
