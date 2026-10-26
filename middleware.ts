import { NextRequest, NextResponse } from "next/server";

/**
 * Edge middleware: one place for the things that must never be forgotten.
 *
 *  1. Security headers on every HTML/API response (CSP, nosniff, frame-ancestors,
 *     referrer policy, permissions policy, HSTS).
 *  2. Cross-site request guard: state-changing requests must come from our own
 *     origin. Session cookies are SameSite=Lax already, which blocks classic
 *     CSRF — this is defence in depth and also covers browser quirks and
 *     same-site subdomain tricks.
 *  3. Hard blocks for paths that only scanners and bots ask for (.env, .git,
 *     wp-admin, php shells…), so probing costs us nothing.
 *
 * Deliberately exempt from the origin guard: the PayFast callback (a server to
 * server POST from the gateway), Vercel Cron and the agent API (both use their
 * own bearer secrets, no cookies involved).
 */

const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);

/** Requests authenticated by a header secret rather than a cookie. */
const ORIGIN_EXEMPT_PREFIXES = [
  "/api/payments/payfast/callback",
  "/api/cron/",
  "/api/agent/",
];

/** Checkout has to be able to POST the form to the gateway. */
const FORM_ACTION_ORIGINS = [
  "'self'",
  "https://ipg1.apps.net.pk",
  "https://ipguat.apps.net.pk",
  "https://payfast.pk",
  "https://sandbox.payfast.pk",
];

const BLOCKED_PATH_PATTERNS = [
  /\/\.env/i,
  /\/\.git/i,
  /\/wp-admin/i,
  /\/wp-login/i,
  /\/xmlrpc\.php/i,
  /\.php$/i,
  /\/\.aws\//i,
  /\/\.ssh\//i,
  /\/vendor\/phpunit/i,
];

function contentSecurityPolicy() {
  const isDev = process.env.NODE_ENV !== "production";
  return [
    "default-src 'self'",
    // Scripts may only come from our own origin. 'unsafe-inline' is needed for
    // Next's inline bootstrap and our pre-paint theme script; crucially it does
    // NOT allow eval, and no third-party origin is permitted, so an injected
    // <script src="//evil"> or exfiltration to another host is blocked.
    `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ""}`,
    // Tailwind ships a stylesheet, but React inline styles on components need this.
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' blob: data: https:",
    "font-src 'self' data:",
    "connect-src 'self' https://api.groq.com",
    "media-src 'self' blob:",
    "worker-src 'self' blob:",
    "frame-src 'self'",
    "frame-ancestors 'none'",
    "object-src 'none'",
    "base-uri 'self'",
    `form-action ${FORM_ACTION_ORIGINS.join(" ")}`,
    "manifest-src 'self'",
    "upgrade-insecure-requests",
  ].join("; ");
}

export function middleware(req: NextRequest) {
  const { pathname, origin } = req.nextUrl;

  if (BLOCKED_PATH_PATTERNS.some((re) => re.test(pathname))) {
    return new NextResponse("Not found", { status: 404 });
  }

  // ---- cross-site mutation guard -------------------------------------------
  if (!SAFE_METHODS.has(req.method)) {
    const exempt = ORIGIN_EXEMPT_PREFIXES.some((p) => pathname.startsWith(p));
    if (!exempt) {
      const requestOrigin = req.headers.get("origin");
      const site = req.headers.get("sec-fetch-site");

      if (requestOrigin && requestOrigin !== origin) {
        return NextResponse.json({ error: "Cross-site request blocked" }, { status: 403 });
      }
      // sec-fetch-site is absent on older clients / server-to-server calls; only
      // act on it when the browser told us this came from another site.
      if (!requestOrigin && site && site !== "same-origin" && site !== "none") {
        return NextResponse.json({ error: "Cross-site request blocked" }, { status: 403 });
      }
    }
  }

  const csp = contentSecurityPolicy();

  const requestHeaders = new Headers(req.headers);
  requestHeaders.set("content-security-policy", csp);

  const res = NextResponse.next({ request: { headers: requestHeaders } });

  res.headers.set("content-security-policy", csp);
  res.headers.set("x-content-type-options", "nosniff");
  res.headers.set("x-frame-options", "DENY");
  res.headers.set("referrer-policy", "strict-origin-when-cross-origin");
  res.headers.set(
    "permissions-policy",
    "camera=(), microphone=(), geolocation=(), payment=(), usb=(), interest-cohort=()"
  );
  res.headers.set("cross-origin-opener-policy", "same-origin");
  res.headers.set("cross-origin-resource-policy", "same-origin");
  res.headers.set("x-dns-prefetch-control", "off");
  if (process.env.NODE_ENV === "production") {
    res.headers.set("strict-transport-security", "max-age=63072000; includeSubDomains; preload");
  }

  return res;
}

export const config = {
  // Everything except static assets and image optimisation endpoints.
  matcher: ["/((?!_next/static|_next/image|favicon.ico|icon.svg|apple-icon).*)"],
};
