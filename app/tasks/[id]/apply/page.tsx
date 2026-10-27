"use client";

import { use, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Navbar from "@/components/Navbar";
import { useUser } from "@/lib/useUser";
import { formatMoney } from "@/lib/currency";
import { categoryLabel } from "@/lib/constants";

type Task = {
  id: string;
  title: string;
  description: string;
  category: string;
  budget: number;
  currency: string;
  city: string | null;
  status: string;
  created_at?: string;
  createdAt?: string;
  expiresAt?: string | null;
  postedByType: "human" | "ai_agent";
};

type FeedTask = {
  id: string;
  applicantCount: number;
  matchScore: number | null;
  matchReasons: string[];
  clientName: string | null;
  clientVerified: boolean | null;
  clientRating: number | null;
};

const STEPS = [
  { key: 1, label: "Your pitch" },
  { key: 2, label: "Price & time" },
  { key: 3, label: "Review" },
] as const;

function daysLabel(d: number) {
  if (d === 1) return "1 day";
  if (d < 7) return `${d} days`;
  if (d === 7) return "1 week";
  return `${Math.round((d / 7) * 10) / 10} weeks`;
}

export default function ApplyPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const { user, loading: userLoading } = useUser();

  const [task, setTask] = useState<Task | null>(null);
  const [feed, setFeed] = useState<FeedTask | null>(null);
  const [loading, setLoading] = useState(true);
  const [step, setStepState] = useState(1);
  const setStep = (n: number) => {
    setStepState(n);
    if (typeof window !== "undefined")
      window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const [message, setMessage] = useState("");
  const [amount, setAmount] = useState<string>("");
  const [days, setDays] = useState<string>("3");
  const [portfolio, setPortfolio] = useState("");
  const [aiDrafted, setAiDrafted] = useState(false);
  const [drafting, setDrafting] = useState(false);
  const [sending, setSending] = useState(false);
  const [notice, setNotice] = useState<{
    tone: "error" | "ok" | "info";
    text: string;
  } | null>(null);
  const [alreadyApplied, setAlreadyApplied] = useState(false);
  const [savedAt, setSavedAt] = useState<string | null>(null);
  const restored = useRef(false);
  const dirty = useRef(false);

  const draftKey = `kk-apply-${id}`;

  useEffect(() => {
    fetch(`/api/tasks/${id}`)
      .then((r) => r.json())
      .then((d) => {
        setTask(d.task || null);
        // Start from the client's own number — most providers quote the budget,
        // and it means the form is sendable after one sentence.
        if (d.task?.budget)
          setAmount((prev) => prev || String(Math.round(d.task.budget)));
        if (
          user &&
          (d.applications || []).some(
            (a: { providerId: string }) => a.providerId === user.id,
          )
        ) {
          setAlreadyApplied(true);
        }
      })
      .catch(() => setTask(null))
      .finally(() => setLoading(false));
  }, [id, user]);

  // Competition + match score live in the Find Work feed; reuse it rather than
  // adding another endpoint just for two numbers.
  useEffect(() => {
    fetch("/api/find-work", { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => {
        const hit = (d.tasks || []).find((t: FeedTask) => t.id === id);
        if (hit) setFeed(hit);
      })
      .catch(() => {});
  }, [id]);

  // Autosave the draft so a phone that kills the tab doesn't eat the proposal.
  useEffect(() => {
    if (restored.current) return;
    restored.current = true;
    try {
      const raw = localStorage.getItem(draftKey);
      if (!raw) return;
      const saved = JSON.parse(raw);
      if (saved.message) setMessage(saved.message);
      if (saved.amount) setAmount(saved.amount);
      if (saved.days) setDays(saved.days);
      if (saved.portfolio) setPortfolio(saved.portfolio);
      if (saved.aiDrafted) setAiDrafted(true);
      setNotice({
        tone: "info",
        text: "We restored the draft you started earlier.",
      });
    } catch {
      /* private mode — never mind */
    }
  }, [draftKey]);

  useEffect(() => {
    if (!restored.current || !dirty.current) return;
    const t = setTimeout(() => {
      try {
        localStorage.setItem(
          draftKey,
          JSON.stringify({ message, amount, days, portfolio, aiDrafted }),
        );
        setSavedAt(
          new Date().toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
          }),
        );
      } catch {
        /* ignore */
      }
    }, 600);
    return () => clearTimeout(t);
  }, [message, amount, days, portfolio, aiDrafted, draftKey]);

  const budget = task?.budget ?? 0;
  const amountNum = Number(amount) || 0;
  const daysNum = Number(days) || 0;

  const checks = useMemo(
    () => [
      { label: "At least 20 characters", ok: message.trim().length >= 20 },
      {
        label: "Mentions what you will actually do",
        ok: /\b(i will|i'll|main|karunga|deliver|design|build|fix)\b/i.test(
          message,
        ),
      },
      { label: "Price set", ok: amountNum > 0 },
      { label: "Delivery time set", ok: daysNum >= 1 },
    ],
    [message, amountNum, daysNum],
  );
  const doneCount = checks.filter((c) => c.ok).length;
  const readyToSend =
    checks.slice(0, 2).every((c) => c.ok) && amountNum > 0 && daysNum >= 1;

  const priceHint = useMemo(() => {
    if (!budget) return null;
    if (!amountNum)
      return `Client's budget is ${formatMoney(budget, task?.currency || "PKR")}.`;
    const diff = ((amountNum - budget) / budget) * 100;
    if (Math.abs(diff) <= 10)
      return "Right on the client's budget — the easiest quote to accept.";
    if (diff > 0)
      return `${Math.round(diff)}% above the client's budget. Explain what extra you're adding.`;
    return `${Math.round(Math.abs(diff))}% under budget. Make sure it still covers your costs.`;
  }, [budget, amountNum, task?.currency]);

  async function draftWithAi() {
    setDrafting(true);
    setNotice(null);
    try {
      const res = await fetch("/api/ai/copilot/proposal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ taskId: id }),
      });
      const data = await res.json();
      if (!res.ok) {
        setNotice({
          tone: "error",
          text: data.error || "AI Copilot is unavailable right now.",
        });
        return;
      }
      setMessage(data.draft?.proposal || "");
      setAiDrafted(true);
      setNotice({
        tone: "ok",
        text: data.draft?.angle
          ? `Drafted with the “${data.draft.angle}” angle. Read it, change your own details, then continue.`
          : "Draft ready. Read it, change your own details, then continue.",
      });
    } catch {
      setNotice({
        tone: "error",
        text: "Could not reach AI Copilot. Please write it yourself.",
      });
    } finally {
      setDrafting(false);
    }
  }

  async function submit() {
    setSending(true);
    setNotice(null);
    try {
      const res = await fetch(`/api/tasks/${id}/apply`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: message.trim(),
          proposedAmount: amountNum > 0 ? amountNum : undefined,
          deliveryDays: daysNum > 0 ? daysNum : undefined,
          portfolioUrl: portfolio.trim() || undefined,
          aiDrafted,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setNotice({
          tone: "error",
          text: data.error || "Could not send your proposal.",
        });
        return;
      }
      try {
        localStorage.removeItem(draftKey);
      } catch {
        /* ignore */
      }
      setAlreadyApplied(true);
      setNotice({
        tone: "ok",
        text: "Proposal sent. The client has been notified.",
      });
      router.push(`/tasks/${id}?applied=1`);
    } catch {
      setNotice({
        tone: "error",
        text: "Network error — your proposal was not sent. Try again.",
      });
    } finally {
      setSending(false);
    }
  }

  /* ------------------------------- states ------------------------------- */

  if (loading || userLoading) {
    return (
      <>
        <Navbar />
        <main className="mx-auto w-full max-w-5xl px-5 py-12 sm:px-6">
          <div className="animate-pulse space-y-4">
            <div className="h-4 w-32 rounded bg-line/60" />
            <div className="h-9 w-2/3 rounded bg-line/60" />
            <div className="h-64 rounded-2xl bg-line/40" />
          </div>
        </main>
      </>
    );
  }

  if (!task) {
    return (
      <>
        <Navbar />
        <main className="mx-auto w-full max-w-3xl px-5 py-16 text-center sm:px-6">
          <p className="font-display text-2xl text-heading">
            This task is not here anymore
          </p>
          <p className="mt-2 text-sm text-ink/60">
            It may have been closed or removed by the client.
          </p>
          <Link
            href="/tasks"
            className="mt-6 inline-block rounded-full bg-green-900 px-6 py-2.5 text-sm text-cream"
          >
            Back to Find Work
          </Link>
        </main>
      </>
    );
  }

  if (!user) {
    return (
      <>
        <Navbar />
        <main className="mx-auto w-full max-w-3xl px-5 py-10 sm:px-6 sm:py-14">
          <div className="overflow-hidden rounded-2xl border border-line bg-card">
            <div className="bg-gradient-to-br from-green-950 to-green-800 px-5 py-6 text-cream sm:px-7">
              <p className="text-[11px] uppercase tracking-[0.14em] text-cream/60">
                Apply · {categoryLabel(task.category)} · {task.city || "Remote"}
              </p>
              <h1 className="mt-2 break-words font-display text-2xl leading-tight [overflow-wrap:anywhere] sm:text-3xl">
                {task.title}
              </h1>
              <div className="mt-3 flex flex-wrap items-center gap-2 text-sm">
                <span className="rounded-xl bg-cream/15 px-3 py-1.5 font-display text-lg text-gold-400">
                  {formatMoney(task.budget, task.currency)}
                </span>
                <span className="text-cream/70">
                  🔒 held in escrow before work starts
                </span>
              </div>
            </div>
            <div className="px-5 py-6 sm:px-7">
              <p className="text-sm text-ink/65">
                Log in to send a proposal. It takes about two minutes: your
                pitch, your price and your delivery time — and AI can write the
                first draft for you.
              </p>
              <ul className="mt-4 grid gap-2 text-xs text-ink/60 sm:grid-cols-3">
                <li className="rounded-xl bg-paper/70 px-3 py-2 dark:bg-green-500/5">
                  💰 You set your own price
                </li>
                <li className="rounded-xl bg-paper/70 px-3 py-2 dark:bg-green-500/5">
                  ⏱ You set the deadline
                </li>
                <li className="rounded-xl bg-paper/70 px-3 py-2 dark:bg-green-500/5">
                  🚫 No connects, no bidding fees
                </li>
              </ul>
              <div className="mt-6 flex flex-wrap items-center gap-3">
                <Link
                  href={`/login?next=/tasks/${id}/apply`}
                  className="rounded-full bg-green-900 px-6 py-3 text-sm font-semibold text-cream hover:bg-green-800"
                >
                  Log in to apply
                </Link>
                <Link
                  href={`/signup?next=/tasks/${id}/apply`}
                  className="rounded-full border border-line px-6 py-3 text-sm text-ink/70 hover:border-green-800/40"
                >
                  Create an account
                </Link>
                <Link
                  href={`/tasks/${id}`}
                  className="text-sm text-ink/50 hover:text-green-700"
                >
                  Read the full task
                </Link>
              </div>
            </div>
          </div>
        </main>
      </>
    );
  }

  if (alreadyApplied) {
    return (
      <>
        <Navbar />
        <main className="mx-auto w-full max-w-2xl px-5 py-16 text-center sm:px-6">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-green-900 text-2xl text-cream">
            ✓
          </div>
          <h1 className="mt-4 font-display text-3xl text-heading">
            Your proposal is in
          </h1>
          <p className="mx-auto mt-3 max-w-md text-sm text-ink/60">
            The client can see your pitch, price and delivery time. You will get
            a notification the moment they accept — no need to keep checking.
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <Link
              href={`/tasks/${id}`}
              className="rounded-full bg-green-900 px-6 py-2.5 text-sm text-cream hover:bg-green-800"
            >
              View the task
            </Link>
            <Link
              href="/tasks"
              className="rounded-full border border-line px-6 py-2.5 text-sm text-ink/70 hover:border-green-800/40"
            >
              Find more work
            </Link>
          </div>
        </main>
      </>
    );
  }

  const isOwnTask =
    user.id === (task as unknown as { postedById?: string }).postedById;
  if (isOwnTask) {
    return (
      <>
        <Navbar />
        <main className="mx-auto w-full max-w-2xl px-5 py-16 text-center sm:px-6">
          <h1 className="font-display text-2xl text-heading">
            This is your own task
          </h1>
          <p className="mt-2 text-sm text-ink/60">
            You cannot send a proposal to yourself.
          </p>
          <Link
            href={`/tasks/${id}`}
            className="mt-6 inline-block rounded-full bg-green-900 px-6 py-2.5 text-sm text-cream"
          >
            Back to the task
          </Link>
        </main>
      </>
    );
  }

  if (task.status !== "open") {
    return (
      <>
        <Navbar />
        <main className="mx-auto w-full max-w-2xl px-5 py-16 text-center sm:px-6">
          <h1 className="font-display text-2xl text-heading">
            Applications are closed
          </h1>
          <p className="mt-2 text-sm text-ink/60">
            This task is already{" "}
            {task.status === "assigned"
              ? "assigned to a provider"
              : task.status}
            .
          </p>
          <Link
            href="/tasks"
            className="mt-6 inline-block rounded-full bg-green-900 px-6 py-2.5 text-sm text-cream"
          >
            Find similar work
          </Link>
        </main>
      </>
    );
  }

  /* -------------------------------- form -------------------------------- */

  const posted = task.createdAt || task.created_at;

  return (
    <>
      <Navbar />
      <main className="flex-1 pb-28 lg:pb-12">
        {/* header */}
        <section className="relative overflow-hidden border-b border-line">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0"
            style={{
              background:
                "radial-gradient(50% 60% at 92% 0%, rgba(200,150,62,0.16) 0%, rgba(200,150,62,0) 62%), radial-gradient(45% 60% at 0% 100%, rgba(18,58,38,0.10) 0%, rgba(18,58,38,0) 65%)",
            }}
          />
          <div className="relative mx-auto w-full max-w-5xl px-5 pb-7 pt-8 sm:px-6 sm:pt-10">
            <Link
              href={`/tasks/${id}`}
              className="text-xs text-ink/50 hover:text-green-700"
            >
              ← Back to the task
            </Link>
            <div className="mt-3 flex flex-wrap items-center gap-2 text-[11px] uppercase tracking-[0.12em]">
              <span className="rounded-full border border-gold-500/40 bg-gold-100/50 px-2.5 py-1 font-semibold text-gold-500 dark:bg-gold-500/10">
                Applying
              </span>
              <span className="text-ink/45">
                {categoryLabel(task.category)}
              </span>
              <span className="text-ink/30">·</span>
              <span className="text-ink/45">{task.city || "Remote"}</span>
            </div>
            <h1 className="mt-3 max-w-2xl break-words font-display text-2xl leading-tight text-heading [overflow-wrap:anywhere] sm:text-4xl">
              {task.title}
            </h1>

            {/* steps */}
            <ol className="mt-6 flex items-center gap-2 sm:gap-3">
              {STEPS.map((s, i) => {
                const active = step === s.key;
                const done = step > s.key;
                return (
                  <li
                    key={s.key}
                    className="flex min-w-0 items-center gap-2 sm:gap-3"
                  >
                    <button
                      type="button"
                      onClick={() => setStep(s.key)}
                      className={`flex min-w-0 items-center gap-2 rounded-full border px-2.5 py-1.5 text-xs font-semibold transition-colors sm:px-3.5 ${
                        active
                          ? "border-green-900 bg-green-900 text-cream"
                          : done
                            ? "border-green-800/30 bg-green-950/5 text-green-800 dark:bg-green-500/10 dark:text-green-300"
                            : "border-line bg-card text-ink/50"
                      }`}
                    >
                      <span
                        className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-full text-[10px] ${
                          active
                            ? "bg-cream/20"
                            : done
                              ? "bg-green-800/15"
                              : "bg-line/60"
                        }`}
                      >
                        {done ? "✓" : s.key}
                      </span>
                      <span className="truncate">{s.label}</span>
                    </button>
                    {i < STEPS.length - 1 && (
                      <span className="h-px w-3 shrink-0 bg-line sm:w-6" />
                    )}
                  </li>
                );
              })}
            </ol>
          </div>
        </section>

        <div className="mx-auto grid w-full max-w-5xl gap-6 px-5 py-7 sm:px-6 lg:grid-cols-[minmax(0,1fr)_340px] lg:gap-8">
          {/* ---------------------------- form ---------------------------- */}
          <div className="min-w-0">
            {notice && (
              <div
                role="status"
                className={`mb-5 rounded-xl border px-4 py-3 text-sm ${
                  notice.tone === "error"
                    ? "border-red-300 bg-red-50 text-red-700"
                    : notice.tone === "ok"
                      ? "border-green-800/25 bg-green-950/5 text-green-800 dark:bg-green-500/10 dark:text-green-300"
                      : "border-gold-400/40 bg-gold-100/60 text-gold-500 dark:bg-gold-500/10"
                }`}
              >
                {notice.text}
              </div>
            )}

            {/* STEP 1 — pitch */}
            {step === 1 && (
              <div className="rounded-2xl border border-line bg-card p-5 sm:p-6">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h2 className="font-display text-xl text-heading">
                      What will you do?
                    </h2>
                    <p className="mt-1 text-sm text-ink/60">
                      One short paragraph beats a long CV. Say what you will do,
                      and when.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={draftWithAi}
                    disabled={drafting}
                    className="shrink-0 rounded-full border border-green-800/30 px-3.5 py-2 text-xs font-semibold text-green-800 transition-colors hover:bg-green-950/5 disabled:opacity-50 dark:text-green-300"
                  >
                    {drafting ? "Drafting…" : "✨ Draft with AI"}
                  </button>
                </div>

                <textarea
                  value={message}
                  onChange={(e) => {
                    dirty.current = true;
                    setMessage(e.target.value);
                    setAiDrafted(false);
                  }}
                  maxLength={1000}
                  aria-label="Your proposal message"
                  placeholder="e.g. Main ye kaam aaj shaam tak kar sakta hoon — Lahore mein hoon, 30 minute door. Delivery ke baad photo bhi bhej dunga."
                  className="mt-4 min-h-[180px] w-full resize-y rounded-xl border border-line bg-paper/60 px-4 py-3 text-sm leading-relaxed focus:outline-none focus:ring-2 focus:ring-green-700"
                />

                <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-[11px] text-ink/45">
                  <span>
                    {message.trim().length} / 1000 characters
                    {aiDrafted && (
                      <span className="ml-2 text-green-800 dark:text-green-300">
                        · AI drafted, your words count more
                      </span>
                    )}
                  </span>
                  <span>
                    {savedAt ? `Draft saved ${savedAt}` : "Draft autosaves"}
                  </span>
                </div>

                <div className="mt-4 grid gap-2 rounded-xl bg-paper/70 p-3 text-xs text-ink/60 sm:grid-cols-3 dark:bg-green-500/5">
                  <p>✓ Name the exact thing you will deliver</p>
                  <p>✓ Give a realistic deadline</p>
                  <p>✓ Mention your city or that you work remotely</p>
                </div>

                <div className="mt-5 flex items-center justify-between gap-3">
                  <Link
                    href={`/tasks/${id}`}
                    className="text-sm text-ink/50 hover:text-green-700"
                  >
                    Cancel
                  </Link>
                  <button
                    type="button"
                    onClick={() => setStep(2)}
                    className="rounded-full bg-green-900 px-6 py-2.5 text-sm font-semibold text-cream hover:bg-green-800"
                  >
                    Next: price & time →
                  </button>
                </div>
              </div>
            )}

            {/* STEP 2 — terms */}
            {step === 2 && (
              <div className="rounded-2xl border border-line bg-card p-5 sm:p-6">
                <h2 className="font-display text-xl text-heading">
                  Your price and delivery time
                </h2>
                <p className="mt-1 text-sm text-ink/60">
                  This is your offer — the client compares it with everyone
                  else's. You can always discuss changes in chat.
                </p>

                <label className="mt-5 block text-sm font-medium text-ink/70">
                  Your price ({task.currency})
                </label>
                <div className="mt-2 flex flex-wrap gap-2">
                  <input
                    value={amount}
                    onChange={(e) => {
                      dirty.current = true;
                      setAmount(e.target.value.replace(/[^0-9]/g, ""));
                    }}
                    inputMode="numeric"
                    placeholder={String(budget)}
                    aria-label="Your price"
                    className="min-w-0 flex-1 rounded-xl border border-line bg-paper/60 px-4 py-3 text-lg font-semibold focus:outline-none focus:ring-2 focus:ring-green-700"
                  />
                </div>
                <div className="mt-2 flex flex-wrap gap-2">
                  {[budget, Math.round(budget * 0.9), Math.round(budget * 1.1)]
                    .filter((v, i, a) => v > 0 && a.indexOf(v) === i)
                    .map((v, i) => (
                      <button
                        key={v}
                        type="button"
                        onClick={() => setAmount(String(v))}
                        className="rounded-full border border-line bg-card px-3 py-1.5 text-xs font-semibold text-ink/70 hover:border-green-800/40"
                      >
                        {i === 0
                          ? "Client budget"
                          : i === 1
                            ? "10% less"
                            : "10% more"}{" "}
                        · {formatMoney(v, task.currency)}
                      </button>
                    ))}
                </div>
                {priceHint && (
                  <p className="mt-2 text-xs text-ink/50">{priceHint}</p>
                )}

                <label className="mt-6 block text-sm font-medium text-ink/70">
                  Delivery time
                </label>
                <div className="mt-2 flex items-center gap-3">
                  <button
                    type="button"
                    aria-label="Fewer days"
                    onClick={() => setDays(String(Math.max(1, daysNum - 1)))}
                    className="h-11 w-11 shrink-0 rounded-full border border-line text-lg text-ink/70 hover:border-green-800/40"
                  >
                    −
                  </button>
                  <div className="min-w-0 flex-1 rounded-xl border border-line bg-paper/60 px-4 py-2.5 text-center">
                    <p className="font-display text-lg text-heading">
                      {daysLabel(daysNum || 1)}
                    </p>
                  </div>
                  <button
                    type="button"
                    aria-label="More days"
                    onClick={() => setDays(String(Math.min(365, daysNum + 1)))}
                    className="h-11 w-11 shrink-0 rounded-full border border-line text-lg text-ink/70 hover:border-green-800/40"
                  >
                    +
                  </button>
                </div>
                <div className="mt-2 flex flex-wrap gap-2">
                  {[1, 3, 7, 14].map((d) => (
                    <button
                      key={d}
                      type="button"
                      onClick={() => setDays(String(d))}
                      className={`rounded-full border px-3 py-1.5 text-xs font-semibold ${
                        daysNum === d
                          ? "border-green-900 bg-green-900 text-cream"
                          : "border-line bg-card text-ink/70 hover:border-green-800/40"
                      }`}
                    >
                      {daysLabel(d)}
                    </button>
                  ))}
                </div>

                <label className="mt-6 block text-sm font-medium text-ink/70">
                  Work sample{" "}
                  <span className="font-normal text-ink/40">(optional)</span>
                </label>
                <input
                  value={portfolio}
                  onChange={(e) => setPortfolio(e.target.value)}
                  placeholder="https://drive.google.com/… or your Behance / GitHub link"
                  aria-label="Work sample link"
                  className="mt-2 w-full rounded-xl border border-line bg-paper/60 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-green-700"
                />

                <div className="mt-6 flex items-center justify-between gap-3">
                  <button
                    type="button"
                    onClick={() => setStep(1)}
                    className="text-sm text-ink/50 hover:text-green-700"
                  >
                    ← Back
                  </button>
                  <button
                    type="button"
                    onClick={() => setStep(3)}
                    className="rounded-full bg-green-900 px-6 py-2.5 text-sm font-semibold text-cream hover:bg-green-800"
                  >
                    Next: review →
                  </button>
                </div>
              </div>
            )}

            {/* STEP 3 — review */}
            {step === 3 && (
              <div className="space-y-5">
                <div className="rounded-2xl border border-line bg-card p-5 sm:p-6">
                  <h2 className="font-display text-xl text-heading">
                    How the client will see it
                  </h2>
                  <div className="mt-4 rounded-xl border border-line bg-paper/50 p-4">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="text-sm font-semibold text-heading">
                        {user.name}
                      </p>
                      <div className="flex flex-wrap items-center gap-2 text-[11px]">
                        {amountNum > 0 && (
                          <span className="rounded-full bg-green-900 px-2.5 py-1 font-semibold text-cream">
                            {formatMoney(amountNum, task.currency)}
                          </span>
                        )}
                        {daysNum > 0 && (
                          <span className="rounded-full border border-line px-2.5 py-1 text-ink/60">
                            in {daysLabel(daysNum)}
                          </span>
                        )}
                        {aiDrafted && (
                          <span className="rounded-full bg-gold-100 px-2.5 py-1 font-semibold text-gold-500 dark:bg-gold-500/15">
                            ✨ AI assisted
                          </span>
                        )}
                      </div>
                    </div>
                    <p className="mt-3 whitespace-pre-wrap break-words text-sm leading-relaxed text-ink/70 [overflow-wrap:anywhere]">
                      {message.trim() || "— your message will appear here —"}
                    </p>
                    {portfolio.trim() && (
                      <p className="mt-3 truncate text-xs text-green-800 dark:text-green-300">
                        📎 {portfolio.trim()}
                      </p>
                    )}
                  </div>
                </div>

                <div className="rounded-2xl border border-line bg-card p-5 sm:p-6">
                  <div className="flex items-center justify-between gap-3">
                    <h3 className="font-display text-lg text-heading">
                      Before you send
                    </h3>
                    <span className="text-xs font-semibold text-ink/50">
                      {doneCount}/{checks.length}
                    </span>
                  </div>
                  <ul className="mt-3 space-y-2">
                    {checks.map((c) => (
                      <li
                        key={c.label}
                        className="flex items-start gap-2 text-sm"
                      >
                        <span
                          className={`mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full text-[10px] ${
                            c.ok
                              ? "bg-green-900 text-cream"
                              : "border border-line text-ink/30"
                          }`}
                        >
                          {c.ok ? "✓" : ""}
                        </span>
                        <span className={c.ok ? "text-ink/70" : "text-ink/50"}>
                          {c.label}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="flex flex-wrap items-center justify-between gap-3">
                  <button
                    type="button"
                    onClick={() => setStep(2)}
                    className="text-sm text-ink/50 hover:text-green-700"
                  >
                    ← Back
                  </button>
                  <button
                    type="button"
                    onClick={submit}
                    disabled={!readyToSend || sending}
                    className="rounded-full bg-green-900 px-7 py-3 text-sm font-semibold text-cream hover:bg-green-800 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    {sending ? "Sending…" : "Send proposal"}
                  </button>
                </div>
                {!readyToSend && (
                  <p className="text-right text-xs text-ink/45">
                    Add a short pitch, a price and a delivery time to send.
                  </p>
                )}
              </div>
            )}
          </div>

          {/* ---------------------------- sidebar ---------------------------- */}
          <aside className="min-w-0 space-y-4 lg:sticky lg:top-20 lg:self-start">
            <div className="rounded-2xl border border-green-900/25 bg-gradient-to-br from-green-950 to-green-800 p-5 text-cream">
              <p className="text-[11px] uppercase tracking-[0.14em] text-cream/60">
                Client budget
              </p>
              <p className="mt-1 font-display text-3xl text-gold-400">
                {formatMoney(task.budget, task.currency)}
              </p>
              <p className="mt-1 flex items-center gap-1.5 text-xs text-cream/70">
                🔒 Escrow-backed — the money is held before work starts
              </p>
              <div className="mt-4 space-y-1.5 border-t border-cream/15 pt-3 text-xs text-cream/70">
                <p className="flex justify-between gap-2">
                  <span>Category</span>
                  <span className="text-cream">
                    {categoryLabel(task.category)}
                  </span>
                </p>
                <p className="flex justify-between gap-2">
                  <span>Location</span>
                  <span className="text-cream">{task.city || "Remote"}</span>
                </p>
                {posted && (
                  <p className="flex justify-between gap-2">
                    <span>Posted</span>
                    <span className="text-cream">
                      {new Date(posted).toLocaleDateString()}
                    </span>
                  </p>
                )}
                {feed && (
                  <p className="flex justify-between gap-2">
                    <span>Competition</span>
                    <span className="text-cream">
                      {feed.applicantCount === 0
                        ? "No one yet"
                        : `${feed.applicantCount} proposal${feed.applicantCount === 1 ? "" : "s"}`}
                    </span>
                  </p>
                )}
              </div>
            </div>

            {feed?.matchScore !== null && feed?.matchScore !== undefined && (
              <div className="rounded-2xl border border-line bg-card p-4">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-semibold text-heading">
                    Your match
                  </p>
                  <span className="font-display text-xl text-green-800 dark:text-green-300">
                    {feed.matchScore}%
                  </span>
                </div>
                <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-line/60">
                  <div
                    className="h-full rounded-full bg-green-700"
                    style={{ width: `${feed.matchScore}%` }}
                  />
                </div>
                {feed.matchReasons.length > 0 && (
                  <ul className="mt-3 flex flex-wrap gap-1.5">
                    {feed.matchReasons.map((r) => (
                      <li
                        key={r}
                        className="rounded-full bg-paper px-2 py-0.5 text-[10px] text-ink/55 dark:bg-green-500/10"
                      >
                        {r}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}

            <div className="rounded-2xl border border-line bg-card p-4">
              <p className="text-sm font-semibold text-heading">
                Why apply on KaamKaro
              </p>
              <ul className="mt-2 space-y-1.5 text-xs text-ink/60">
                <li>🔒 Money is already escrowed — no chasing payment</li>
                <li>🤝 No connects, no bidding fees to apply</li>
                <li>⚡ AI drafts your proposal so you send in minutes</li>
                <li>🤖 AI agents can hire here too, not just humans</li>
              </ul>
            </div>
          </aside>
        </div>

        {/* mobile sticky action bar */}
        <div className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-paper/95 px-5 py-3 backdrop-blur lg:hidden">
          <div className="flex items-center gap-3">
            <div className="min-w-0 flex-1">
              <p className="truncate text-[11px] text-ink/45">
                {amountNum > 0
                  ? formatMoney(amountNum, task.currency)
                  : "No price yet"}
                {daysNum > 0 && ` · ${daysLabel(daysNum)}`}
              </p>
              <p className="text-[11px] font-semibold text-ink/60">
                Step {step} of 3 · {doneCount}/{checks.length} ready
              </p>
            </div>
            {step < 3 ? (
              <button
                type="button"
                onClick={() => setStep(step + 1)}
                className="shrink-0 rounded-full bg-green-900 px-5 py-2.5 text-sm font-semibold text-cream"
              >
                Continue →
              </button>
            ) : (
              <button
                type="button"
                onClick={submit}
                disabled={!readyToSend || sending}
                className="shrink-0 rounded-full bg-green-900 px-5 py-2.5 text-sm font-semibold text-cream disabled:opacity-40"
              >
                {sending ? "Sending…" : "Send"}
              </button>
            )}
          </div>
        </div>
      </main>
    </>
  );
}
