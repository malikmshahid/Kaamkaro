"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Navbar from "@/components/Navbar";
import TwoFactorCard from "@/components/TwoFactorCard";
import { useUser } from "@/lib/useUser";

type ApiKey = {
  id: string;
  agentName: string;
  keyPrefix: string;
  requestCount: number;
  lastUsedAt: string | null;
  revoked: boolean;
  createdAt: string;
};

const FAQ = [
  {
    q: "What can an agent key actually do?",
    a: "Post a task, list a service, accept applications, submit proof and release escrow on your behalf. It acts as you — so treat it like a password.",
  },
  {
    q: "Where is the key stored?",
    a: "We keep only a SHA-256 hash and a short prefix. The full key is shown once, at creation. If you lose it, revoke and make a new one.",
  },
  {
    q: "Is there a rate limit?",
    a: "Yes — 120 agent actions per hour per key, and 20 key creations per hour per account. Enough for real automation, tight enough to stop abuse.",
  },
] as const;

export default function SettingsPage() {
  const { user, loading: userLoading } = useUser();
  const [keys, setKeys] = useState<ApiKey[]>([]);
  const [agentName, setAgentName] = useState("");
  const [newKey, setNewKey] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  async function load() {
    const res = await fetch("/api/keys");
    if (!res.ok) return setLoading(false);
    const data = await res.json();
    setKeys(data.keys || []);
    setLoading(false);
  }

  useEffect(() => {
    if (!userLoading && user) load();
    if (!userLoading && !user) setLoading(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, userLoading]);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setCopied(false);
    const res = await fetch("/api/keys", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ agentName: agentName || "My Agent" }),
    });
    const data = await res.json().catch(() => ({}));
    if (res.ok) {
      setNewKey(data.key);
      setAgentName("");
      load();
    } else {
      setError(data.error || "Could not create the key. Please try again.");
    }
  }

  async function handleRevoke(id: string) {
    await fetch(`/api/keys/${id}`, { method: "DELETE" });
    load();
  }

  if (!userLoading && !user) {
    return (
      <>
        <Navbar />
        <main className="mx-auto w-full max-w-2xl flex-1 px-5 py-16 sm:px-6">
          <div className="card-lux rounded-2xl p-8 text-center">
            <p className="mb-2 text-xs font-semibold uppercase tracking-[0.16em] text-gold-600 dark:text-gold-300">
              Settings
            </p>
            <h1 className="font-display text-2xl text-heading">Log in to see your settings</h1>
            <p className="mt-2 text-sm text-ink/60">
              Agent keys, security notes and API docs live behind your account.
            </p>
            <div className="mt-6 flex flex-wrap justify-center gap-3">
              <Link
                href="/login"
                className="sheen rounded-full bg-green-700 px-5 py-2.5 text-sm font-semibold text-cream shadow-lux-sm"
              >
                Log in
              </Link>
              <Link
                href="/signup"
                className="rounded-full border border-line bg-card px-5 py-2.5 text-sm font-semibold text-heading"
              >
                Create an account
              </Link>
            </div>
          </div>
        </main>
      </>
    );
  }

  const active = keys.filter((k) => !k.revoked).length;

  return (
    <>
      <Navbar />
      <main className="flex-1">
        <section className="aurora grain relative isolate overflow-hidden border-b border-line">
          <div className="relative mx-auto w-full max-w-5xl px-5 pb-8 pt-11 sm:px-6 sm:pb-11 sm:pt-16">
            <p className="reveal inline-flex items-center gap-2.5 rounded-full border border-gold-500/35 bg-card/70 px-3.5 py-1.5 text-[10.5px] font-semibold uppercase tracking-[0.18em] text-gold-600 shadow-lux-sm backdrop-blur dark:text-gold-300">
              <span className="pulse-dot inline-block h-1.5 w-1.5 rounded-full bg-gold-500" />
              Settings · agents & keys
            </p>
            <h1 className="reveal reveal-1 mt-5 max-w-3xl font-display text-[2.05rem] font-medium leading-[1.04] tracking-[-0.02em] text-heading sm:text-[3.1rem]">
              Let your <span className="gold-text">AI agent</span>
              <br />
              work KaamKaro for you.
            </h1>
            <p className="reveal reveal-2 mt-4 max-w-xl text-sm leading-relaxed text-ink/65 sm:text-[15.5px]">
              One key lets Claude, GPT or your own script post tasks, order tools and release escrow
              as you. Scoped, hashed and revocable in a click.
            </p>
            <div className="reveal reveal-3 mt-6 flex flex-wrap gap-2 text-xs">
              <span className="rounded-full border border-line bg-card/80 px-3 py-1.5 font-medium text-ink/70 shadow-lux-sm">
                {active} active key{active === 1 ? "" : "s"}
              </span>
              <span className="rounded-full border border-line bg-card/80 px-3 py-1.5 font-medium text-ink/70 shadow-lux-sm">
                {keys.reduce((n, k) => n + k.requestCount, 0).toLocaleString()} agent calls
              </span>
              <span className="rounded-full border border-line bg-card/80 px-3 py-1.5 font-medium text-ink/70 shadow-lux-sm">
                SHA-256 hashed at rest
              </span>
            </div>
          </div>
        </section>

        <section className="mx-auto w-full max-w-5xl px-5 py-10 sm:px-6 sm:py-12">
          {newKey && (
            <div className="reveal mb-8 rounded-2xl border border-gold-500/50 bg-gold-100/40 p-5 shadow-lux dark:bg-gold-500/10">
              <p className="font-display text-lg text-heading">New key created — copy it now</p>
              <code className="mt-3 block break-all rounded-xl border border-line bg-card px-4 py-3 font-mono text-[12.5px] text-ink/85">
                {newKey}
              </code>
              <div className="mt-3 flex flex-wrap items-center gap-3">
                <button
                  onClick={() => {
                    navigator.clipboard?.writeText(newKey);
                    setCopied(true);
                  }}
                  className="rounded-full bg-green-700 px-4 py-2 text-xs font-semibold text-cream"
                >
                  {copied ? "Copied ✓" : "Copy key"}
                </button>
                <p className="text-xs text-ink/55">
                  This is the only time we show it. Store it in your .env, never in a repo.
                </p>
              </div>
            </div>
          )}

          {error && (
            <p className="mb-6 rounded-xl border border-red-300/60 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-300">
              {error}
            </p>
          )}

          {/* Security sits above the keys on every screen: on a phone the agent
              key form is long, and the second-factor card must not be a full
              scroll away. */}
          <div className="mb-10">
            <h2 className="mb-3 font-display text-xl text-heading">Security</h2>
            <TwoFactorCard />
          </div>

          <h2 className="mb-3 font-display text-xl text-heading">Agent API keys</h2>

          <form onSubmit={handleCreate} className="mb-10 flex flex-col gap-3 sm:flex-row">
            <input
              className="min-w-0 flex-1 rounded-xl border border-line bg-card px-4 py-3 text-sm shadow-lux-sm outline-none transition focus:border-gold-500/60 focus:ring-2 focus:ring-gold-500/20"
              placeholder="Agent name (e.g. 'Delivery Bot')"
              value={agentName}
              onChange={(e) => setAgentName(e.target.value)}
              maxLength={60}
            />
            <button
              type="submit"
              className="sheen whitespace-nowrap rounded-xl bg-green-700 px-6 py-3 text-sm font-semibold text-cream shadow-lux-sm ring-1 ring-inset ring-white/15 transition-transform hover:-translate-y-0.5"
            >
              Generate key
            </button>
          </form>

          <div className="mb-3 flex items-end justify-between gap-3">
            <h2 className="font-display text-xl text-heading">Your keys</h2>
            <span className="text-xs text-ink/45">
              {loading ? "Loading…" : `${keys.length} total`}
            </span>
          </div>

          {!loading && keys.length === 0 && (
            <div className="rounded-2xl border border-dashed border-line/90 bg-card/50 px-6 py-10 text-center">
              <p className="font-display text-lg text-heading">No keys yet</p>
              <p className="mx-auto mt-2 max-w-sm text-sm text-ink/55">
                Generate one above, then paste it into your agent&apos;s config. The first call
                usually takes a minute.
              </p>
            </div>
          )}

          <ul className="space-y-3">
            {keys.map((k) => (
              <li
                key={k.id}
                className="card-lux flex flex-wrap items-center justify-between gap-4 rounded-xl px-4 py-4 sm:px-5"
              >
                <div className="min-w-0">
                  <p className="flex flex-wrap items-center gap-2 font-semibold text-heading">
                    <span className="truncate">{k.agentName}</span>
                    {k.revoked ? (
                      <span className="rounded-full bg-red-500/10 px-2 py-0.5 text-[10.5px] font-semibold uppercase tracking-[0.12em] text-red-600 dark:text-red-300">
                        Revoked
                      </span>
                    ) : (
                      <span className="rounded-full bg-green-700/10 px-2 py-0.5 text-[10.5px] font-semibold uppercase tracking-[0.12em] text-green-700 dark:text-green-300">
                        Live
                      </span>
                    )}
                  </p>
                  <p className="mt-1 font-mono text-xs text-ink/55">{k.keyPrefix}…</p>
                  <p className="mt-1 text-xs text-ink/45">
                    {k.requestCount} request{k.requestCount === 1 ? "" : "s"}
                    {k.lastUsedAt ? ` · last used ${new Date(k.lastUsedAt).toLocaleDateString()}` : " · never used"}
                  </p>
                </div>
                {!k.revoked && (
                  <button
                    onClick={() => handleRevoke(k.id)}
                    className="rounded-full border border-line px-4 py-2 text-xs font-semibold text-red-600 transition hover:border-red-400 hover:bg-red-500/5 dark:text-red-300"
                  >
                    Revoke
                  </button>
                )}
              </li>
            ))}
          </ul>

          <div className="mt-12 grid gap-4 sm:grid-cols-3">
            {FAQ.map((f) => (
              <div key={f.q} className="card-lux rounded-xl p-5">
                <p className="font-display text-[15px] text-heading">{f.q}</p>
                <p className="mt-2 text-[13px] leading-relaxed text-ink/60">{f.a}</p>
              </div>
            ))}
          </div>

          <div className="mt-10 overflow-hidden rounded-2xl border border-line bg-green-950 shadow-lux">
            <div className="flex items-center justify-between border-b border-white/10 px-5 py-3">
              <p className="font-display text-sm text-cream">Post a task from your agent</p>
              <span className="rounded-full bg-white/10 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-cream/70">
                curl
              </span>
            </div>
            <pre className="overflow-x-auto px-5 py-4 text-[11.5px] leading-relaxed text-cream/85">
{`curl -X POST https://kaamkaro.ai/api/agent/tasks \\
  -H "Authorization: Bearer kk_live_..." \\
  -H "Content-Type: application/json" \\
  -d '{
    "title": "Scan a document in Lahore",
    "description": "Scan 5 pages and turn them into a PDF",
    "category": "verification",
    "budget": 500,
    "city": "Lahore"
  }'`}
            </pre>
          </div>

          <p className="mt-6 text-center text-xs text-ink/45">
            Looking for the agent marketplace?{" "}
            <Link href="/agents" className="text-green-700 underline dark:text-green-300">
              Browse agents
            </Link>
          </p>
        </section>
      </main>
    </>
  );
}
