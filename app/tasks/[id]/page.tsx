"use client";

import { useEffect, useState, use } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Navbar from "@/components/Navbar";
import { useUser } from "@/lib/useUser";
import { formatMoney } from "@/lib/currency";
import { categoryLabel } from "@/lib/constants";
import { proofDisplayUrl, isImageRef } from "@/lib/proof";

type Task = {
  id: string;
  title: string;
  description: string;
  category: string;
  budget: number;
  currency: string;
  city: string | null;
  status: string;
  postedById: string;
  postedByType: "human" | "ai_agent";
  assignedProviderId: string | null;
  assignedProviderType: "human" | "ai_agent";
  proofUrl: string | null;
  proofFiles?: string[] | null;
  proofNote?: string | null;
  verificationStatus: "not_run" | "pass" | "review_needed" | "fail" | "error";
  verificationNotes: string | null;
  verificationConfidence: number | null;
};

type Application = {
  id: string;
  providerId: string;
  applicantType: "human" | "ai_agent";
  agentListingId: string | null;
  agentName: string | null;
  message: string | null;
  proposedAmount?: number | null;
  currency?: string | null;
  deliveryDays?: number | null;
  portfolioUrl?: string | null;
  aiDrafted?: boolean | null;
  createdAt?: string | null;
  status: string;
  providerName: string | null;
  providerRating: number | null;
  providerRatingCount?: number | null;
  providerVerified?: boolean | null;
};

type Payment = {
  id: string;
  status: string;
  amount: number;
  currency: string;
  commissionAmount: number;
  netPayoutAmount: number;
  provider: string;
};

type Review = {
  id: string;
  reviewerId: string;
  rating: number;
  comment: string | null;
};

type ChatMessage = {
  id: string;
  senderId: string;
  body: string;
  createdAt: string;
  senderName: string | null;
};

export default function TaskDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const { user } = useUser();
  const [task, setTask] = useState<Task | null>(null);
  const [applications, setApplications] = useState<Application[]>([]);
  const [myApplication, setMyApplication] = useState<Application | null>(null);
  const [payment, setPayment] = useState<Payment | null>(null);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [hasDraft, setHasDraft] = useState(false);
  const [notice, setNotice] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  const [chat, setChat] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState("");

  const [reviewRating, setReviewRating] = useState(5);
  const [reviewComment, setReviewComment] = useState("");
  const [proofNote, setProofNote] = useState(""); // delivery note (what I did)
  const [proofLink, setProofLink] = useState(""); // optional external link
  const [proofFiles, setProofFiles] = useState<File[]>([]);

  const router = useRouter();
  const [aiVerdict, setAiVerdict] = useState<{
    status: string;
    confidence: number;
    notes: string;
  } | null>(null);

  async function load() {
    const res = await fetch(`/api/tasks/${id}`);
    const data = await res.json();
    setTask(data.task);
    setApplications(data.applications || []);
    setMyApplication(data.myApplication || null);
    setPayment(data.payment);
    setReviews(data.reviews || []);
    setLoading(false);
  }

  async function loadChat() {
    const res = await fetch(`/api/tasks/${id}/messages`);
    if (!res.ok) return;
    const data = await res.json();
    setChat(data.messages || []);
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  // The apply page autosaves the proposal; surface that so nobody loses work.
  useEffect(() => {
    try {
      const raw = localStorage.getItem(`kk-apply-${id}`);
      if (!raw) return;
      const saved = JSON.parse(raw);
      setHasDraft(Boolean(saved?.message?.trim() || saved?.amount));
    } catch {
      /* private mode */
    }
  }, [id]);

  const isOwner = user && task && user.id === task.postedById;
  const isAssignedProvider =
    user && task && user.id === task.assignedProviderId;
  const isParticipant = isOwner || isAssignedProvider;

  useEffect(() => {
    if (isParticipant && task && task.status !== "open") {
      loadChat();
      const interval = setInterval(loadChat, 4000);
      return () => clearInterval(interval);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isParticipant, task?.status]);

  useEffect(() => {
    if (task?.status === "submitted" && task.verificationStatus === "not_run") {
      const interval = setInterval(load, 3000);
      return () => clearInterval(interval);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [task?.status, task?.verificationStatus]);

  async function handleAccept(applicationId: string) {
    const res = await fetch(`/api/tasks/${id}/accept`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ applicationId }),
    });
    const data = await res.json();
    if (!res.ok) return setNotice(data.error);
    load();
  }

  async function handlePay() {
    setBusy(true);
    setNotice("");
    const res = await fetch(`/api/tasks/${id}/pay`, { method: "POST" });
    const data = await res.json();
    setBusy(false);

    if (!res.ok) {
      // A pending checkout can be resumed rather than re-created.
      if (data.resumeUrl) {
        router.push(data.resumeUrl);
        return;
      }
      return setNotice(data.error);
    }

    // Real gateway: hand the browser over to PayFast's hosted checkout.
    if (data.mode === "payfast" && data.paymentId) {
      router.push(data.continueUrl || `/pay/${data.paymentId}`);
      return;
    }

    setNotice("Escrow funded — the provider can get to work now.");
    load();
  }

  async function handleSubmitProof(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setNotice("");
    setAiVerdict(null);

    const fd = new FormData();
    fd.append("note", proofNote);
    fd.append("proofUrl", proofLink);
    for (const f of proofFiles) fd.append("files", f);

    const res = await fetch(`/api/tasks/${id}/submit`, {
      method: "POST",
      body: fd,
    });
    const data = await res.json();
    setBusy(false);
    if (!res.ok) return setNotice(data.error);

    if (data.verification) setAiVerdict(data.verification);
    setNotice(
      data.verification
        ? "Submitted! AI proof check is done — see the verdict below."
        : "Submitted! The AI proof check is running in the background.",
    );
    setProofFiles([]);
    setProofLink("");
    load();
  }

  function onPickFiles(e: React.ChangeEvent<HTMLInputElement>) {
    const picked = Array.from(e.target.files || []);
    const combined = [...proofFiles, ...picked].slice(0, 5);
    setProofFiles(combined);
    e.target.value = "";
  }

  async function handleComplete() {
    setBusy(true);
    setNotice("");
    const res = await fetch(`/api/tasks/${id}/complete`, { method: "POST" });
    const data = await res.json();
    setBusy(false);
    if (!res.ok) return setNotice(data.error);
    setNotice("Task complete! Payment has been released. 🎉");
    load();
  }

  async function handleReverify() {
    setBusy(true);
    setNotice("");
    const res = await fetch(`/api/tasks/${id}/verify`, { method: "POST" });
    const data = await res.json();
    setBusy(false);
    if (!res.ok) return setNotice(data.error);
    load();
  }

  async function handleDispute() {
    const reason = window.prompt("What's the issue? (visible to the client)");
    if (reason === null) return;
    setBusy(true);
    setNotice("");
    const res = await fetch(`/api/tasks/${id}/dispute`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reason }),
    });
    const data = await res.json();
    setBusy(false);
    if (!res.ok) return setNotice(data.error);
    setNotice("Dispute raised — an admin will review this shortly.");
    load();
  }

  async function handleReview(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setNotice("");
    const res = await fetch(`/api/tasks/${id}/review`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ rating: reviewRating, comment: reviewComment }),
    });
    const data = await res.json();
    setBusy(false);
    if (!res.ok) return setNotice(data.error);
    setReviewComment("");
    load();
  }

  async function handleSendChat(e: React.FormEvent) {
    e.preventDefault();
    if (!chatInput.trim()) return;
    const body = chatInput;
    setChatInput("");
    await fetch(`/api/tasks/${id}/messages`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ body }),
    });
    loadChat();
  }

  if (loading) {
    return (
      <>
        <Navbar />
        <main className="flex-1 max-w-3xl mx-auto w-full px-6 py-16">
          <p className="text-ink/50">Loading...</p>
        </main>
      </>
    );
  }

  if (!task) {
    return (
      <>
        <Navbar />
        <main className="flex-1 max-w-3xl mx-auto w-full px-6 py-16">
          <p className="text-ink/50">This task couldn&apos;t be found.</p>
        </main>
      </>
    );
  }

  const alreadyApplied =
    !!user &&
    (applications.some((a) => a.providerId === user.id) || !!myApplication);
  const myReview = user && reviews.find((r) => r.reviewerId === user.id);

  const STAGE_LABELS: Record<string, string> = {
    open: "Open — waiting for applicants",
    assigned: "Assigned — escrow not funded yet",
    submitted: "Submitted — awaiting client confirmation",
    completed: "Completed ✓",
    disputed: "In dispute",
    cancelled: "Cancelled",
  };

  return (
    <>
      <Navbar />
      <main className="flex-1">
        {/* ------------------------------- HERO ------------------------------- */}
        <section className="aurora grain relative isolate overflow-hidden border-b border-line">
          <div className="relative mx-auto w-full max-w-6xl px-5 pb-7 pt-9 sm:px-6 sm:pt-12">
            <Link
              href="/tasks"
              className="inline-flex items-center gap-1.5 text-xs font-medium text-ink/50 transition-colors hover:text-green-700"
            >
              ← All work
            </Link>

            <div className="mt-3 flex flex-wrap items-center gap-2 text-[11px] uppercase tracking-[0.12em]">
              <span className="rounded-full bg-green-950/5 px-2.5 py-1 font-semibold text-green-800 dark:bg-green-500/15 dark:text-green-300">
                {categoryLabel(task.category)}
              </span>
              <span className="text-ink/45">{task.city || "Remote"}</span>
              {task.postedByType === "ai_agent" && (
                <span className="rounded-full bg-gold-100 px-2.5 py-1 font-semibold text-gold-500 dark:bg-gold-500/15">
                  🤖 Posted by an AI agent
                </span>
              )}
              {payment?.status === "held_in_escrow" && (
                <span className="rounded-full bg-green-900 px-2.5 py-1 font-semibold text-cream">
                  🔒 Escrow funded
                </span>
              )}
              {payment?.status === "released" && (
                <span className="rounded-full bg-green-950/5 px-2.5 py-1 font-semibold text-green-800 dark:bg-green-500/15 dark:text-green-300">
                  ✓ Payment released
                </span>
              )}
            </div>

            <h1 className="mt-3.5 max-w-3xl break-words font-display text-[1.75rem] font-medium leading-[1.08] tracking-[-0.015em] text-heading [overflow-wrap:anywhere] sm:text-[2.6rem]">
              {task.title}
            </h1>

            <div className="mt-4 flex flex-wrap items-center gap-3">
              <span className="tnum rounded-xl bg-gradient-to-br from-green-900 to-green-950 px-4 py-2 font-display text-[1.35rem] text-cream shadow-[0_16px_34px_-22px_rgba(11,32,22,0.9)] ring-1 ring-inset ring-white/10">
                {formatMoney(task.budget, task.currency)}
              </span>
              <span className="rounded-full border border-line bg-card px-3 py-1.5 text-xs font-semibold text-ink/65">
                {payment?.status === "held_in_escrow" &&
                task.status === "assigned"
                  ? "Assigned — money held safely"
                  : STAGE_LABELS[task.status]}
              </span>
              {task.status !== "open" && task.assignedProviderId && (
                <span className="rounded-full border border-line bg-card px-3 py-1.5 text-xs text-ink/60">
                  {task.assignedProviderType === "ai_agent"
                    ? "🤖 AI agent assigned"
                    : "Human provider assigned"}
                </span>
              )}
            </div>
          </div>
        </section>

        <div className="mx-auto grid w-full max-w-6xl items-start gap-6 px-5 py-7 sm:px-6 lg:grid-cols-[minmax(0,1fr)_320px] lg:gap-8">
          {/* ---------------------------- MAIN COLUMN ---------------------------- */}
          <div className="min-w-0 space-y-6">
            <div className="card-lux relative overflow-hidden p-5 sm:p-6">
              <div className="gold-hairline absolute inset-x-6 top-0 opacity-70" aria-hidden="true" />
              <h2 className="mb-2 text-[10.5px] uppercase tracking-[0.18em] text-ink/45">
                What the client needs
              </h2>
              <p className="whitespace-pre-wrap break-words leading-relaxed text-ink/75 [overflow-wrap:anywhere]">
                {task.description}
              </p>
            </div>

            {notice && (
              <p className="text-sm bg-gold-100 text-gold-500 rounded-lg px-4 py-2 mb-6">
                {notice}
              </p>
            )}

            {aiVerdict && (
              <div
                className={`mb-6 rounded-lg px-4 py-3 text-sm border ${
                  aiVerdict.status === "pass"
                    ? "bg-green-950/5 text-green-800 border-green-800/20"
                    : aiVerdict.status === "fail"
                      ? "bg-red-50 text-red-700 border-red-200"
                      : "bg-gold-100/60 text-gold-500 border-gold-400/40"
                }`}
              >
                <p className="font-semibold uppercase text-xs tracking-wide mb-1">
                  AI proof check:{" "}
                  {aiVerdict.status === "pass"
                    ? "Pass"
                    : aiVerdict.status === "fail"
                      ? "Fail"
                      : aiVerdict.status === "error"
                        ? "Error"
                        : "Needs manual review"}
                  {aiVerdict.confidence > 0 &&
                    ` (${Math.round(aiVerdict.confidence * 100)}% confidence)`}
                </p>
                <p>{aiVerdict.notes}</p>
              </div>
            )}

            {/* --- Apply panel (open tasks, non-owner) --- */}
            {user && !isOwner && task.status === "open" && (
              <div className="overflow-hidden rounded-2xl border border-green-900/20 bg-card">
                {alreadyApplied ? (
                  <div className="flex flex-wrap items-center justify-between gap-3 p-5">
                    <div className="min-w-0">
                      <p className="font-display text-lg text-heading">
                        Your proposal is in ✓
                      </p>
                      <p className="text-sm text-ink/60">
                        The client sees your pitch, price and delivery time. You
                        will be notified if they accept.
                      </p>
                      {myApplication && (
                        <div className="mt-2 flex flex-wrap items-center gap-1.5">
                          {myApplication.proposedAmount ? (
                            <span className="rounded-full bg-green-900 px-2.5 py-1 text-xs font-semibold text-cream">
                              {formatMoney(
                                myApplication.proposedAmount,
                                myApplication.currency || task.currency,
                              )}
                            </span>
                          ) : null}
                          {myApplication.deliveryDays ? (
                            <span className="rounded-full border border-line px-2.5 py-1 text-xs text-ink/60">
                              in {myApplication.deliveryDays} day
                              {myApplication.deliveryDays === 1 ? "" : "s"}
                            </span>
                          ) : null}
                          <span className="rounded-full border border-line px-2.5 py-1 text-[10px] uppercase tracking-wide text-ink/50">
                            {myApplication.status}
                          </span>
                        </div>
                      )}
                    </div>
                    <Link
                      href="/tasks"
                      className="shrink-0 rounded-full border border-line px-4 py-2 text-sm text-ink/70 hover:border-green-800/40"
                    >
                      Find more work
                    </Link>
                  </div>
                ) : (
                  <div className="flex flex-wrap items-center justify-between gap-4 bg-gradient-to-br from-green-950 to-green-800 p-5 text-cream">
                    <div className="min-w-0">
                      <p className="text-[11px] uppercase tracking-[0.14em] text-cream/60">
                        Ready to take this on?
                      </p>
                      <p className="mt-1 font-display text-2xl">
                        Send a proposal in about 2 minutes
                      </p>
                      <p className="mt-1 max-w-md text-sm text-cream/70">
                        Your pitch, your price, your delivery time — and AI can
                        draft the writing for you. No connects, no bidding fees.
                      </p>
                      {hasDraft && (
                        <p className="mt-2 text-xs text-gold-400">
                          You already started a draft — pick it up where you
                          left off.
                        </p>
                      )}
                    </div>
                    <Link
                      href={`/tasks/${id}/apply`}
                      className="sheen shrink-0 rounded-full bg-cream px-6 py-3 text-sm font-semibold text-green-900 shadow-[0_14px_30px_-20px_rgba(0,0,0,0.9)] transition-transform hover:-translate-y-0.5"
                    >
                      Apply now →
                    </Link>
                  </div>
                )}
              </div>
            )}

            {!user && task.status === "open" && (
              <div className="card-lux flex flex-wrap items-center justify-between gap-3 p-5">
                <p className="text-sm text-ink/65">
                  <span className="font-semibold text-heading">
                    Log in to apply.
                  </span>{" "}
                  Escrow-backed work, no bidding fees.
                </p>
                <Link
                  href={`/login?next=/tasks/${id}/apply`}
                  className="sheen shrink-0 rounded-full bg-green-900 px-5 py-2.5 text-sm font-semibold text-cream shadow-lux-sm transition-transform hover:-translate-y-0.5 hover:bg-green-800"
                >
                  Log in to apply
                </Link>
              </div>
            )}

            {/* --- Applications list (owner, open task) --- */}
            {isOwner && task.status === "open" && (
              <div className="mb-10">
                <h2 className="mb-1 font-display text-[1.4rem] text-heading">
                  Proposals ({applications.length})
                </h2>
                <p className="mb-4 text-sm text-ink/55">
                  Every proposal shows the provider&apos;s price and delivery
                  time — compare, then accept.
                </p>
                {applications.length === 0 && (
                  <p className="text-ink/50">No applicants yet.</p>
                )}
                <div className="space-y-3">
                  {applications.map((app) => (
                    <div
                      key={app.id}
                      className="card-lux flex items-start justify-between gap-4 p-5"
                    >
                      <div>
                        <Link
                          href={
                            app.applicantType === "ai_agent" &&
                            app.agentListingId
                              ? `/agents/${app.agentListingId}`
                              : `/providers/${app.providerId}`
                          }
                          className="font-semibold hover:underline hover:text-green-700 inline-flex items-center gap-2"
                        >
                          {app.applicantType === "ai_agent"
                            ? app.agentName
                            : app.providerName}
                          {app.applicantType === "ai_agent" && (
                            <span className="text-xs bg-green-900/10 text-green-800 rounded-full px-2 py-0.5">
                              🤖 AI Agent
                            </span>
                          )}
                        </Link>
                        <div className="flex flex-wrap items-center gap-2 mt-1 text-xs text-ink/60">
                          {app.providerRating && app.providerRating > 0 ? (
                            <span className="inline-flex items-center gap-1">
                              ⭐ {Number(app.providerRating).toFixed(1)}
                              {typeof app.providerRatingCount === "number" &&
                              app.providerRatingCount > 0
                                ? ` (${app.providerRatingCount})`
                                : ""}
                            </span>
                          ) : (
                            <span className="text-ink/40">
                              New provider — no reviews yet
                            </span>
                          )}
                          {app.providerVerified && (
                            <span className="bg-green-900/10 text-green-800 rounded-full px-2 py-0.5">
                              ✓ ID verified
                            </span>
                          )}
                          <Link
                            href={`/providers/${app.providerId}`}
                            className="underline hover:text-green-700"
                          >
                            View profile
                          </Link>
                        </div>
                        {(app.proposedAmount || app.deliveryDays) && (
                          <div className="mt-2 flex flex-wrap items-center gap-1.5">
                            {app.proposedAmount ? (
                              <span className="rounded-full bg-green-900 px-2.5 py-1 text-xs font-semibold text-cream">
                                {formatMoney(
                                  app.proposedAmount,
                                  app.currency || task.currency,
                                )}
                              </span>
                            ) : null}
                            {app.deliveryDays ? (
                              <span className="rounded-full border border-line px-2.5 py-1 text-xs text-ink/60">
                                in {app.deliveryDays} day
                                {app.deliveryDays === 1 ? "" : "s"}
                              </span>
                            ) : null}
                            {app.aiDrafted ? (
                              <span className="rounded-full bg-gold-100 px-2.5 py-1 text-xs text-gold-500 dark:bg-gold-500/15">
                                ✨ AI assisted
                              </span>
                            ) : null}
                          </div>
                        )}
                        {app.message && (
                          <p className="mt-2 whitespace-pre-wrap break-words text-sm text-ink/60 [overflow-wrap:anywhere]">
                            {app.message}
                          </p>
                        )}
                        {app.portfolioUrl && (
                          <a
                            href={app.portfolioUrl}
                            target="_blank"
                            rel="noopener noreferrer nofollow"
                            className="mt-1 inline-block max-w-full truncate text-xs text-green-800 underline dark:text-green-300"
                          >
                            📎 Work sample
                          </a>
                        )}
                        <p className="mt-2 text-xs uppercase text-ink/40">
                          {app.status}
                        </p>
                      </div>
                      {app.status === "pending" && (
                        <button
                          onClick={() => handleAccept(app.id)}
                          className="rounded-full bg-green-900 text-cream px-4 py-2 text-sm hover:bg-green-800 transition-colors whitespace-nowrap"
                        >
                          Accept
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* --- Escrow payment step (owner, assigned, no payment yet) --- */}
            {isOwner && task.status === "assigned" && !payment && (
              <div className="mb-10 border border-gold-400 bg-gold-100/40 rounded-xl p-6">
                <p className="mb-1 font-semibold text-heading">Fund Escrow</p>
                <p className="mb-4 text-sm text-ink/60">
                  Hold {formatMoney(task.budget, task.currency)} in escrow to
                  confirm the provider. Pay by JazzCash, Easypaisa, Raast or
                  card — KaamKaro keeps the money safe until you confirm the
                  work is done.
                </p>
                <button
                  onClick={handlePay}
                  disabled={busy}
                  className="rounded-full bg-green-900 text-cream px-6 py-2.5 hover:bg-green-800 transition-colors disabled:opacity-50"
                >
                  {busy
                    ? "Opening checkout…"
                    : `Fund Escrow — ${formatMoney(task.budget, task.currency)}`}
                </button>
              </div>
            )}

            {/* --- Gateway checkout started but not confirmed yet --- */}
            {isOwner &&
              task.status === "assigned" &&
              payment &&
              payment.status === "pending" && (
                <div className="mb-10 rounded-xl border border-gold-400 bg-gold-100/40 p-6">
                  <p className="mb-1 font-semibold text-heading">
                    Payment is being confirmed
                  </p>
                  <p className="mb-4 text-sm text-ink/60">
                    Your checkout of{" "}
                    {formatMoney(payment.amount, payment.currency)} hasn&apos;t
                    reached us yet. If you completed it, it will show up here
                    automatically — otherwise you can pick it back up.
                  </p>
                  <Link
                    href={`/pay/${payment.id}`}
                    className="inline-block rounded-full bg-green-900 px-6 py-2.5 text-cream transition-colors hover:bg-green-800"
                  >
                    Continue payment
                  </Link>
                </div>
              )}

            {/* --- Provider submits proof (assigned provider, payment held) --- */}
            {isAssignedProvider &&
              task.status === "assigned" &&
              payment?.status === "held_in_escrow" && (
                <form
                  onSubmit={handleSubmitProof}
                  className="mb-10 border border-line rounded-xl p-6 bg-card space-y-3"
                >
                  <p className="font-semibold text-heading">Submit Your Work</p>
                  {payment.commissionAmount > 0 && (
                    <p className="text-xs text-ink/50 bg-paper rounded-lg px-3 py-2">
                      Escrow held:{" "}
                      {formatMoney(payment.amount, payment.currency)} · Platform
                      fee:{" "}
                      {formatMoney(payment.commissionAmount, payment.currency)}{" "}
                      · You&apos;ll receive:{" "}
                      <span className="font-semibold text-green-800">
                        {formatMoney(payment.netPayoutAmount, payment.currency)}
                      </span>
                    </p>
                  )}
                  <label className="block">
                    <span className="text-sm font-medium text-ink">
                      Photos / PDF proof
                    </span>
                    <p className="text-xs text-ink/50 mb-2">
                      Screenshot or photo of the finished work — up to 5 files,
                      5MB each. This is what the AI checks against the brief.
                    </p>
                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/webp,image/gif,application/pdf"
                      multiple
                      onChange={onPickFiles}
                      className="block w-full text-sm text-ink/70 file:mr-3 file:rounded-full file:border-0 file:bg-green-900 file:px-4 file:py-2 file:text-cream file:text-sm hover:file:bg-green-800"
                    />
                  </label>

                  {proofFiles.length > 0 && (
                    <ul className="space-y-1">
                      {proofFiles.map((f, i) => (
                        <li
                          key={`${f.name}-${i}`}
                          className="flex items-center justify-between gap-2 text-xs bg-paper border border-line rounded-lg px-3 py-1.5"
                        >
                          <span className="truncate">
                            {f.name} · {(f.size / 1024).toFixed(0)} KB
                          </span>
                          <button
                            type="button"
                            onClick={() =>
                              setProofFiles(
                                proofFiles.filter((_, j) => j !== i),
                              )
                            }
                            className="text-red-600 hover:underline shrink-0"
                          >
                            Remove
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}

                  <label className="block">
                    <span className="text-sm font-medium text-ink">
                      Or paste a link (optional)
                    </span>
                    <input
                      type="url"
                      className="mt-1 w-full border border-line rounded-lg px-4 py-2.5 bg-paper focus:outline-none focus:ring-2 focus:ring-green-700"
                      placeholder="https://drive.google.com/..."
                      value={proofLink}
                      onChange={(e) => setProofLink(e.target.value)}
                    />
                  </label>

                  <label className="block">
                    <span className="text-sm font-medium text-ink">
                      What did you deliver?
                    </span>
                    <textarea
                      className="mt-1 w-full border border-line rounded-lg px-4 py-2.5 bg-paper focus:outline-none focus:ring-2 focus:ring-green-700 min-h-20"
                      placeholder="3 logo concepts attached, the client picked option 2, final files in the Drive folder."
                      value={proofNote}
                      onChange={(e) => setProofNote(e.target.value)}
                    />
                  </label>

                  <button
                    type="submit"
                    disabled={
                      busy ||
                      (proofFiles.length === 0 &&
                        !proofLink.trim() &&
                        !proofNote.trim())
                    }
                    className="rounded-full bg-green-900 text-cream px-6 py-2.5 hover:bg-green-800 transition-colors disabled:opacity-50"
                  >
                    {busy ? "Uploading & checking with AI…" : "Submit Work"}
                  </button>
                </form>
              )}

            {isAssignedProvider &&
              task.status === "assigned" &&
              payment?.status !== "held_in_escrow" && (
                <p className="mb-10 text-sm text-ink/50 italic">
                  Waiting on the client to fund escrow before you can submit.
                  You can already message them in the chat below.
                </p>
              )}

            {/* --- Delivery review: while submitted (actionable) and after
                completion (read-only archive — the proof and the AI verdict
                used to vanish the moment the client pressed confirm) --- */}
            {(isOwner || isAssignedProvider) &&
              ["submitted", "completed"].includes(task.status) && (
                <div className="mb-10 border border-line rounded-xl p-6 bg-card">
                  <p className="font-semibold text-heading mb-1">
                    {task.status === "completed"
                      ? "Delivered work — archived"
                      : "The provider submitted their work"}
                  </p>
                  {task.proofNote && (
                    <p className="text-sm text-ink/70 mb-3 whitespace-pre-wrap">
                      {task.proofNote}
                    </p>
                  )}
                  {(() => {
                    const shots = (
                      task.proofFiles && task.proofFiles.length > 0
                        ? task.proofFiles
                        : task.proofUrl
                          ? [task.proofUrl]
                          : []
                    ) as string[];
                    if (shots.length === 0) return null;
                    return (
                      <div className="mb-4 grid grid-cols-2 sm:grid-cols-3 gap-2">
                        {shots.map((raw, i) => {
                          const u = proofDisplayUrl(task.id, raw);
                          const isPdf =
                            !isImageRef(raw) && /\.pdf(\?|$)/i.test(raw);
                          return isPdf ? (
                            <a
                              key={i}
                              href={u}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="border border-line rounded-lg px-3 py-4 text-center text-xs bg-paper hover:bg-line/20"
                            >
                              PDF proof{shots.length > 1 ? ` ${i + 1}` : ""}
                            </a>
                          ) : (
                            <a
                              key={i}
                              href={u}
                              target="_blank"
                              rel="noopener noreferrer"
                            >
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img
                                src={u}
                                alt={`Proof ${i + 1}`}
                                className="h-28 w-full rounded-lg border border-line object-cover hover:opacity-90"
                              />
                            </a>
                          );
                        })}
                      </div>
                    );
                  })()}

                  {/* AI verification signal */}
                  <div className="mb-5">
                    {task.verificationStatus === "not_run" && (
                      <p className="text-sm text-ink/50 italic flex items-center gap-2">
                        <span className="inline-block w-2 h-2 rounded-full bg-gold-500 animate-pulse" />
                        Running AI proof check...
                      </p>
                    )}
                    {task.verificationStatus !== "not_run" && (
                      <div
                        className={`rounded-lg px-4 py-3 text-sm ${
                          task.verificationStatus === "pass"
                            ? "bg-green-950/5 text-green-800 border border-green-800/20"
                            : task.verificationStatus === "fail"
                              ? "bg-red-50 text-red-700 border border-red-200"
                              : "bg-gold-100/60 text-gold-500 border border-gold-400/40"
                        }`}
                      >
                        <p className="font-semibold uppercase text-xs tracking-wide mb-1">
                          AI Verification:{" "}
                          {task.verificationStatus === "pass"
                            ? "✓ Pass"
                            : task.verificationStatus === "fail"
                              ? "✗ Fail"
                              : task.verificationStatus === "error"
                                ? "Error"
                                : "Needs Manual Review"}
                          {task.verificationConfidence !== null &&
                            task.verificationConfidence > 0 &&
                            ` (${Math.round(task.verificationConfidence * 100)}% confidence)`}
                        </p>
                        <p>{task.verificationNotes}</p>
                      </div>
                    )}
                    {task.verificationStatus !== "not_run" && (
                      <button
                        onClick={handleReverify}
                        disabled={busy}
                        className="text-xs text-green-700 underline mt-2"
                      >
                        Re-run AI Check
                      </button>
                    )}
                  </div>

                  {task.status === "submitted" ? (
                    <>
                      <button
                        onClick={handleComplete}
                        disabled={busy}
                        className="rounded-full bg-green-900 px-6 py-2.5 text-cream transition-colors hover:bg-green-800 disabled:opacity-50"
                      >
                        {busy ? "..." : "Confirm & Release Payment"}
                      </button>
                      <p className="mt-2 text-xs text-ink/40">
                        AI verification is just a signal — the final call is
                        always yours.
                      </p>
                    </>
                  ) : (
                    <p className="text-xs text-ink/50">
                      Payment was released to the provider. This delivery stays
                      here as a permanent record for both of you.
                    </p>
                  )}
                </div>
              )}

            {/* --- Dispute banner --- */}
            {task.status === "disputed" && (
              <div className="mb-6 border border-red-200 bg-red-50 rounded-xl p-5">
                <p className="font-semibold text-red-700 mb-1">
                  This task is in dispute
                </p>
                <p className="text-sm text-red-600">
                  An admin is reviewing it. Escrow stays held until a decision
                  is made.
                </p>
              </div>
            )}

            {/* --- Raise dispute (participants, work in progress) --- */}
            {isParticipant &&
              ["assigned", "submitted"].includes(task.status) && (
                <div className="mb-6">
                  <button
                    onClick={handleDispute}
                    disabled={busy}
                    className="text-sm text-red-500 underline"
                  >
                    Something wrong? Raise a dispute
                  </button>
                </div>
              )}

            {/* --- Chat (participants, once assigned) --- */}
            {isParticipant && task.status !== "open" && (
              <div className="mb-10 border border-line rounded-xl bg-card overflow-hidden">
                <p className="font-semibold text-heading px-6 pt-5 pb-3 border-b border-line">
                  Chat
                </p>
                <div className="max-h-72 overflow-y-auto px-6 py-4 space-y-3">
                  {chat.length === 0 && (
                    <p className="text-sm text-ink/40">No messages yet.</p>
                  )}
                  {chat.map((m) => (
                    <div
                      key={m.id}
                      className={m.senderId === user?.id ? "text-right" : ""}
                    >
                      <span
                        className={`inline-block rounded-xl px-3 py-2 text-sm max-w-[75%] ${
                          m.senderId === user?.id
                            ? "bg-green-900 text-cream"
                            : "bg-paper border border-line"
                        }`}
                      >
                        {m.body}
                      </span>
                      <p className="text-[10px] text-ink/30 mt-0.5">
                        {m.senderName}
                      </p>
                    </div>
                  ))}
                </div>
                <form
                  onSubmit={handleSendChat}
                  className="flex border-t border-line"
                >
                  <input
                    className="flex-1 px-4 py-3 text-sm focus:outline-none"
                    placeholder="Type a message..."
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                  />
                  <button
                    type="submit"
                    className="px-5 text-sm font-semibold text-green-800 hover:bg-paper"
                  >
                    Send
                  </button>
                </form>
              </div>
            )}

            {/* --- Reviews (completed) --- */}
            {task.status === "completed" && (
              <div className="mb-10">
                <h2 className="mb-4 font-display text-[1.4rem] text-heading">
                  Reviews
                </h2>
                {reviews.length > 0 && (
                  <div className="space-y-3 mb-6">
                    {reviews.map((r) => (
                      <div
                        key={r.id}
                        className="border border-line rounded-xl p-4 bg-card"
                      >
                        <p className="text-gold-500">{"⭐".repeat(r.rating)}</p>
                        {r.comment && (
                          <p className="text-sm text-ink/60 mt-1">
                            {r.comment}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                )}
                {isParticipant && !myReview && (
                  <form
                    onSubmit={handleReview}
                    className="border border-line rounded-xl p-6 bg-card space-y-3"
                  >
                    <p className="font-semibold text-heading">
                      {isOwner && task.assignedProviderType === "ai_agent"
                        ? "Rate this AI Agent"
                        : "Leave a Review"}
                    </p>
                    <select
                      className="border border-line rounded-lg px-4 py-2 bg-paper"
                      value={reviewRating}
                      onChange={(e) => setReviewRating(Number(e.target.value))}
                    >
                      {[5, 4, 3, 2, 1].map((n) => (
                        <option key={n} value={n}>
                          {"⭐".repeat(n)} ({n})
                        </option>
                      ))}
                    </select>
                    <textarea
                      className="w-full border border-line rounded-lg px-4 py-2.5 bg-paper focus:outline-none focus:ring-2 focus:ring-green-700 min-h-20"
                      placeholder="Comment (optional)..."
                      value={reviewComment}
                      onChange={(e) => setReviewComment(e.target.value)}
                    />
                    <button
                      type="submit"
                      disabled={busy}
                      className="rounded-full bg-green-900 text-cream px-6 py-2.5 hover:bg-green-800 transition-colors disabled:opacity-50"
                    >
                      {busy ? "..." : "Submit Review"}
                    </button>
                  </form>
                )}
              </div>
            )}
          </div>

          {/* ------------------------------ SIDEBAR ------------------------------ */}
          <aside className="min-w-0 space-y-4 lg:sticky lg:top-20 lg:self-start">
            <div className="card-lux p-4">
              <p className="font-display text-xl text-heading">
                {formatMoney(task.budget, task.currency)}
              </p>
              <p className="mt-0.5 text-xs text-ink/50">
                {payment?.status === "held_in_escrow"
                  ? "Held in escrow by KaamKaro"
                  : payment?.status === "released"
                    ? "Released to the provider"
                    : "Client's stated budget"}
              </p>
              <div className="mt-3 space-y-1.5 border-t border-line pt-3 text-xs">
                <p className="flex items-center justify-between gap-2">
                  <span className="text-ink/50">City</span>
                  <span className="truncate text-ink/75">
                    {task.city || "Remote"}
                  </span>
                </p>
                <p className="flex items-center justify-between gap-2">
                  <span className="text-ink/50">Category</span>
                  <span className="truncate text-ink/75">
                    {categoryLabel(task.category)}
                  </span>
                </p>
                <p className="flex items-center justify-between gap-2">
                  <span className="text-ink/50">Proposals</span>
                  <span className="text-ink/75">
                    {isOwner
                      ? applications.length
                      : task.status === "open"
                        ? "Still open"
                        : "Closed"}
                  </span>
                </p>
                {payment && (
                  <p className="flex items-center justify-between gap-2">
                    <span className="text-ink/50">Platform fee</span>
                    <span className="text-ink/75">
                      {formatMoney(payment.commissionAmount, payment.currency)}
                    </span>
                  </p>
                )}
              </div>
            </div>

            <div className="card-lux p-4">
              <p className="text-sm font-semibold text-heading">Progress</p>
              <ol className="mt-3 space-y-3">
                {[
                  { key: "open", label: "Posted & open" },
                  { key: "assigned", label: "Provider accepted" },
                  { key: "submitted", label: "Work submitted" },
                  { key: "completed", label: "Paid & completed" },
                ].map((stage, idx) => {
                  const order = ["open", "assigned", "submitted", "completed"];
                  const currentIdx = order.indexOf(task.status);
                  const done =
                    task.status === "completed" ||
                    (currentIdx >= idx && currentIdx >= 0);
                  const active = currentIdx === idx;
                  return (
                    <li key={stage.key} className="flex items-start gap-2.5">
                      <span
                        className={`mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full text-[9px] ${
                          done
                            ? "bg-green-900 text-cream"
                            : "border border-line text-transparent"
                        }`}
                      >
                        ✓
                      </span>
                      <span
                        className={`text-xs ${
                          active
                            ? "font-semibold text-heading"
                            : done
                              ? "text-ink/60"
                              : "text-ink/40"
                        }`}
                      >
                        {stage.label}
                      </span>
                    </li>
                  );
                })}
              </ol>
              {(task.status === "disputed" || task.status === "cancelled") && (
                <p className="mt-3 rounded-lg bg-gold-100/60 px-2.5 py-1.5 text-[11px] text-gold-500 dark:bg-gold-500/10">
                  This task is {task.status}.
                </p>
              )}
            </div>

            <div className="rounded-2xl border border-green-900/20 bg-green-950/[0.04] p-4 dark:bg-green-500/10">
              <p className="text-sm font-semibold text-heading">
                Escrow protects both sides
              </p>
              <p className="mt-1 text-xs leading-relaxed text-ink/60">
                The client funds the task before work starts. KaamKaro holds the
                money and releases it the moment the work is confirmed — nobody
                has to trust a stranger with cash.
              </p>
            </div>
          </aside>
        </div>
      </main>
    </>
  );
}
