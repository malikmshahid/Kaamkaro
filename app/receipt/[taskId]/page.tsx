import type { Metadata } from "next";
import Link from "next/link";
import Navbar from "@/components/Navbar";
import { getReceipt } from "@/lib/receipt";
import { categoryLabel } from "@/lib/constants";
import { formatMoney } from "@/lib/currency";

/**
 * Public, shareable proof that a job was done and paid.
 *
 * This is the thing no other Pakistani platform hands you: a link you can send
 * to a future client (or paste in a portfolio) that shows the work, the amount,
 * the escrow release and a content hash of the delivered file — all verifiable
 * against /api/receipt/<id>.
 */

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ taskId: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { taskId } = await params;
  const result = await getReceipt(taskId);
  if (!result.ok) return { title: "Work receipt" };
  return {
    title: `Work receipt ${result.receipt.receiptId}`,
    description: `${result.receipt.task.title} — ${formatMoney(
      result.receipt.task.amount,
      result.receipt.task.currency
    )}, delivered and released through KaamKaro escrow.`,
    robots: { index: true, follow: true },
  };
}

function fmtDate(value: Date | string | null) {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}

const VERDICT: Record<string, { label: string; tone: string }> = {
  pass: { label: "Passed", tone: "ok" },
  review_needed: { label: "Flagged for review", tone: "warn" },
  fail: { label: "Failed check", tone: "bad" },
  not_run: { label: "Not run", tone: "muted" },
  error: { label: "Check errored", tone: "muted" },
};

export default async function ReceiptPage({ params }: Props) {
  const { taskId } = await params;
  const result = await getReceipt(taskId);

  if (!result.ok) {
    return (
      <>
        <Navbar />
        <main className="mx-auto w-full max-w-2xl px-5 py-20 text-center sm:px-6">
          <p className="font-display text-[1.8rem] leading-tight text-heading">
            {result.reason === "not_completed" ? "No receipt yet" : "Receipt not found"}
          </p>
          <p className="mt-2 text-sm leading-relaxed text-ink/60">
            {result.reason === "not_completed"
              ? "A receipt is issued only after the work is confirmed and escrow is released. Come back once the client taps confirm."
              : "This link does not match any job on KaamKaro. Receipt links are permanent — check for a typo."}
          </p>
          <Link
            href="/tools"
            className="mt-6 inline-block rounded-full bg-green-900 px-6 py-2.5 text-sm font-semibold text-cream hover:bg-green-800"
          >
            Browse the Toolbox
          </Link>
        </main>
      </>
    );
  }

  const r = result.receipt;
  const verdict = VERDICT[r.proof.verification] || VERDICT.not_run;
  const score = r.provider?.kaamScore;

  return (
    <>
      <Navbar />
      <main className="flex-1">
        <section className="aurora grain relative isolate overflow-hidden border-b border-line">
          <div className="relative mx-auto w-full max-w-3xl px-5 pb-8 pt-10 sm:px-6 sm:pt-14">
            <p className="inline-flex items-center gap-2.5 rounded-full border border-gold-500/35 bg-card/70 px-3.5 py-1.5 text-[10.5px] font-semibold uppercase tracking-[0.18em] text-gold-600 shadow-lux-sm backdrop-blur dark:text-gold-300">
              <span className="inline-block h-1.5 w-1.5 rounded-full bg-gold-500" />
              Verified work receipt
            </p>
            <h1 className="mt-5 break-words font-display text-[2rem] font-medium leading-[1.06] tracking-[-0.02em] text-heading sm:text-[2.7rem] [overflow-wrap:anywhere]">
              {r.task.title}
            </h1>
            <p className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-ink/55">
              <span>{categoryLabel(r.task.category)}</span>
              {r.task.city ? (
                <>
                  <span>·</span>
                  <span>{r.task.city}</span>
                </>
              ) : null}
              <span>·</span>
              <span>Released {fmtDate(r.escrow.releasedAt || r.issuedAt)}</span>
            </p>
          </div>
        </section>

        <div className="mx-auto w-full max-w-3xl px-5 py-8 sm:px-6 sm:py-10">
          <div className="card-lux relative overflow-hidden p-5 sm:p-7">
            <div className="gold-hairline absolute inset-x-6 top-0" aria-hidden="true" />

            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className="text-[10.5px] uppercase tracking-[0.18em] text-ink/45">Amount released</p>
                <p className="tnum mt-1 font-display text-[2rem] leading-none text-heading">
                  {formatMoney(r.task.amount, r.task.currency)}
                </p>
                <p className="mt-1.5 text-xs text-ink/50">
                  Held in escrow, released after the client confirmed the work
                </p>
              </div>
              <div className="rounded-xl border border-green-900/25 bg-green-950/[0.04] px-3.5 py-2.5 text-right dark:border-green-500/25 dark:bg-green-500/10">
                <p className="text-[10px] uppercase tracking-[0.16em] text-ink/45">Receipt ID</p>
                <p className="mt-0.5 font-mono text-[13px] font-semibold text-heading">{r.receiptId}</p>
              </div>
            </div>

            <div className="mt-6 grid gap-3 sm:grid-cols-3">
              {[
                ["Provider", r.provider?.displayName || "Provider", r.provider?.verified ? "ID verified" : "ID not verified"],
                ["Escrow status", r.escrow.status.replace(/_/g, " "), `via ${r.escrow.gateway || "KaamKaro"}`],
                ["Proof check", verdict.label, r.proof.verifiedAt ? fmtDate(r.proof.verifiedAt) : "no file check"],
              ].map(([label, value, detail]) => (
                <div key={label} className="rounded-xl bg-surface-2/60 px-3.5 py-3">
                  <p className="text-[10px] uppercase tracking-[0.16em] text-ink/40">{label}</p>
                  <p className="mt-0.5 truncate text-sm font-semibold capitalize text-heading">{value}</p>
                  <p className="truncate text-[11px] capitalize text-ink/45">{detail}</p>
                </div>
              ))}
            </div>

            {/* timeline */}
            <div className="mt-7">
              <p className="text-[10.5px] uppercase tracking-[0.18em] text-ink/45">
                What happened, in order
              </p>
              <ol className="mt-3 space-y-3">
                {([
                  ["Work posted", "The client described the job and set the budget", null],
                  [
                    "Escrow funded",
                    "Money left the client and was held by KaamKaro — not by the provider",
                    r.escrow.fundedAt,
                  ],
                  [
                    "Work delivered",
                    `Proof uploaded${r.proof.fileCount ? ` (${r.proof.fileCount} file${r.proof.fileCount === 1 ? "" : "s"})` : ""} and checked automatically — ${verdict.label.toLowerCase()}`,
                    r.proof.verifiedAt,
                  ],
                  [
                    "Payment released",
                    "Client confirmed, escrow paid the provider",
                    r.escrow.releasedAt,
                  ],
                ] as [string, string, Date | null][]).map(([title, body, date], i) => (
                  <li key={String(title)} className="flex items-start gap-3">
                    <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-green-900 to-green-800 text-[10px] font-semibold text-cream ring-1 ring-inset ring-white/10">
                      {i + 1}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-baseline justify-between gap-x-3">
                        <p className="text-sm font-semibold text-heading">{title}</p>
                        <p className="text-[11px] text-ink/40">{fmtDate(date)}</p>
                      </div>
                      <p className="mt-0.5 text-[12.5px] leading-relaxed text-ink/55">{body}</p>
                    </div>
                  </li>
                ))}
              </ol>
            </div>

            {/* hashes */}
            <div className="mt-7 rounded-xl border border-line bg-surface-2/50 p-4">
              <p className="text-[10.5px] uppercase tracking-[0.18em] text-ink/45">Tamper-evident</p>
              <div className="mt-2 space-y-1.5 font-mono text-[11.5px] text-ink/60">
                <p className="flex flex-wrap gap-2">
                  <span className="text-ink/40">receipt</span>
                  <span className="break-all text-heading">{r.receiptId}</span>
                </p>
                <p className="flex flex-wrap gap-2">
                  <span className="text-ink/40">proof&nbsp;hash</span>
                  <span className="break-all text-heading">{r.proof.contentHash || "no hashed file"}</span>
                </p>
              </div>
              <p className="mt-2 text-[11px] leading-relaxed text-ink/45">
                The receipt id is a hash of the job, its title and its amount. If any of those were
                edited after release, this id would no longer match the record.
              </p>
            </div>

            {score && (
              <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-gold-500/25 bg-gradient-to-r from-gold-100/60 to-card px-4 py-3 dark:from-gold-500/10 dark:to-card">
                <div className="min-w-0">
                  <p className="text-[10.5px] uppercase tracking-[0.18em] text-ink/45">Provider KaamScore</p>
                  <p className="mt-0.5 text-sm text-ink/65">
                    {r.provider?.displayName} · {score.grade.label}
                  </p>
                </div>
                <p className="tnum font-display text-[1.8rem] leading-none text-heading">
                  {score.score}
                  <span className="text-sm text-ink/40">/100</span>
                </p>
              </div>
            )}

            <div className="mt-6 flex flex-wrap items-center gap-3">
              <a
                href={`/api/receipt/${taskId}`}
                className="rounded-full border border-green-900/25 px-4 py-2 text-xs font-semibold text-green-800 transition-colors hover:bg-green-900 hover:text-cream dark:border-green-300/30 dark:text-green-300 dark:hover:bg-green-500/20 dark:hover:text-cream"
              >
                Verify as JSON ↗
              </a>
              <span className="text-[11px] text-ink/40">
                Anyone can check this link — it needs no login.
              </span>
            </div>
          </div>

          <div className="mt-6 rounded-2xl border border-dashed border-line bg-card/50 px-5 py-6 text-center">
            <p className="text-sm text-ink/60">
              KaamKaro receipts are permanent portfolio proof. Providers can paste this link anywhere
              — no client name, no address, no contact details are exposed.
            </p>
            <Link
              href="/tasks"
              className="mt-4 inline-block rounded-full bg-green-900 px-5 py-2.5 text-sm font-semibold text-cream hover:bg-green-800"
            >
              Find work on KaamKaro
            </Link>
          </div>
        </div>
      </main>
    </>
  );
}
