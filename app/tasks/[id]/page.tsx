"use client";

import { useEffect, useState, use } from "react";
import Navbar from "@/components/Navbar";
import { useUser } from "@/lib/useUser";

type Task = {
  id: string;
  title: string;
  description: string;
  category: string;
  budget: number;
  city: string | null;
  status: string;
  postedById: string;
  postedByType: "human" | "ai_agent";
  assignedProviderId: string | null;
  proofUrl: string | null;
  verificationStatus: "not_run" | "pass" | "review_needed" | "fail" | "error";
  verificationNotes: string | null;
  verificationConfidence: number | null;
};

type Application = {
  id: string;
  providerId: string;
  message: string | null;
  status: string;
  providerName: string | null;
  providerRating: number | null;
};

type Payment = {
  id: string;
  status: string;
  amount: number;
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
  const [payment, setPayment] = useState<Payment | null>(null);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [message, setMessage] = useState("");
  const [notice, setNotice] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  const [chat, setChat] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState("");

  const [reviewRating, setReviewRating] = useState(5);
  const [reviewComment, setReviewComment] = useState("");
  const [proofNote, setProofNote] = useState("");

  async function load() {
    const res = await fetch(`/api/tasks/${id}`);
    const data = await res.json();
    setTask(data.task);
    setApplications(data.applications || []);
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

  const isOwner = user && task && user.id === task.postedById;
  const isAssignedProvider = user && task && user.id === task.assignedProviderId;
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

  async function handleApply(e: React.FormEvent) {
    e.preventDefault();
    setNotice("");
    const res = await fetch(`/api/tasks/${id}/apply`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message }),
    });
    const data = await res.json();
    if (!res.ok) {
      setNotice(data.error);
      return;
    }
    setMessage("");
    setNotice("You're in! Waiting on the client now.");
    load();
  }

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
    if (!res.ok) return setNotice(data.error);
    setNotice("Escrow funded — the provider can get to work now.");
    load();
  }

  async function handleSubmitProof(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setNotice("");
    const res = await fetch(`/api/tasks/${id}/submit`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ proofUrl: proofNote }),
    });
    const data = await res.json();
    setBusy(false);
    if (!res.ok) return setNotice(data.error);
    setNotice("Submitted! Waiting on the client to confirm.");
    load();
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

  const alreadyApplied = user && applications.some((a) => a.providerId === user.id);
  const myReview = user && reviews.find((r) => r.reviewerId === user.id);

  const STAGE_LABELS: Record<string, string> = {
    open: "Open — waiting for applicants",
    assigned: "Assigned — awaiting payment/work",
    submitted: "Submitted — awaiting client confirmation",
    completed: "Completed ✓",
    disputed: "In dispute",
    cancelled: "Cancelled",
  };

  return (
    <>
      <Navbar />
      <main className="flex-1 max-w-3xl mx-auto w-full px-6 py-16">
        <div className="flex items-center gap-3 mb-4">
          <span
            className={`text-xs uppercase tracking-wide px-2 py-1 rounded-full ${
              task.postedByType === "ai_agent"
                ? "bg-gold-100 text-gold-500"
                : "bg-green-950/5 text-green-800"
            }`}
          >
            {task.postedByType === "ai_agent" ? "AI Agent" : "Client"}
          </span>
          <span className="text-xs text-ink/50">{STAGE_LABELS[task.status]}</span>
        </div>

        <h1 className="font-display text-4xl text-heading mb-4">{task.title}</h1>
        <p className="text-ink/70 leading-relaxed mb-6 whitespace-pre-wrap">
          {task.description}
        </p>

        <div className="flex gap-8 text-sm mb-10 border-y border-line py-4">
          <div>
            <p className="text-ink/50">Budget</p>
            <p className="font-semibold text-green-800 text-lg">
              Rs. {task.budget.toLocaleString()}
            </p>
          </div>
          <div>
            <p className="text-ink/50">City</p>
            <p className="font-semibold text-lg">{task.city || "Remote"}</p>
          </div>
          <div>
            <p className="text-ink/50">Category</p>
            <p className="font-semibold text-lg">{task.category}</p>
          </div>
        </div>

        {notice && (
          <p className="text-sm bg-gold-100 text-gold-500 rounded-lg px-4 py-2 mb-6">
            {notice}
          </p>
        )}

        {/* --- Apply form (open tasks, non-owner) --- */}
        {user && !isOwner && task.status === "open" && !alreadyApplied && (
          <form onSubmit={handleApply} className="mb-10 space-y-3">
            <label className="block text-sm mb-1">
              Write a quick message to apply
            </label>
            <textarea
              className="w-full border border-line rounded-lg px-4 py-2.5 bg-card focus:outline-none focus:ring-2 focus:ring-green-700 min-h-24"
              placeholder="Why you're a good fit for this..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
            />
            <button
              type="submit"
              className="rounded-full bg-green-900 text-cream px-6 py-2.5 hover:bg-green-800 transition-colors"
            >
              Apply
            </button>
          </form>
        )}

        {!user && task.status === "open" && (
          <p className="text-ink/60 mb-10">
            <a href="/login" className="text-green-700 underline">
              Log in
            </a>{" "}
            to apply.
          </p>
        )}

        {/* --- Applications list (owner, open task) --- */}
        {isOwner && task.status === "open" && (
          <div className="mb-10">
            <h2 className="font-display text-2xl text-heading mb-4">
              Applications ({applications.length})
            </h2>
            {applications.length === 0 && (
              <p className="text-ink/50">No applicants yet.</p>
            )}
            <div className="space-y-3">
              {applications.map((app) => (
                <div
                  key={app.id}
                  className="border border-line rounded-xl p-5 bg-card flex items-start justify-between gap-4"
                >
                  <div>
                    <p className="font-semibold">{app.providerName}</p>
                    {app.message && (
                      <p className="text-sm text-ink/60 mt-1">{app.message}</p>
                    )}
                    <p className="text-xs text-ink/40 mt-2 uppercase">{app.status}</p>
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
            <p className="font-semibold text-heading mb-1">Fund Escrow</p>
            <p className="text-sm text-ink/60 mb-4">
              Hold Rs. {task.budget.toLocaleString()} in escrow to confirm the
              provider. The funds stay safely with us until the work is done.
              <br />
              <span className="text-xs italic">
                (Sandbox/mock mode for now — this will process real payments
                once JazzCash/EasyPaisa is integrated.)
              </span>
            </p>
            <button
              onClick={handlePay}
              disabled={busy}
              className="rounded-full bg-green-900 text-cream px-6 py-2.5 hover:bg-green-800 transition-colors disabled:opacity-50"
            >
              {busy ? "..." : `Fund Escrow — Rs. ${task.budget.toLocaleString()}`}
            </button>
          </div>
        )}

        {/* --- Provider submits proof (assigned provider, payment held) --- */}
        {isAssignedProvider && task.status === "assigned" && payment?.status === "held_in_escrow" && (
          <form onSubmit={handleSubmitProof} className="mb-10 border border-line rounded-xl p-6 bg-card space-y-3">
            <p className="font-semibold text-heading">Submit Your Work</p>
            <textarea
              className="w-full border border-line rounded-lg px-4 py-2.5 bg-paper focus:outline-none focus:ring-2 focus:ring-green-700 min-h-20"
              placeholder="Link to proof (photo URL, description)..."
              value={proofNote}
              onChange={(e) => setProofNote(e.target.value)}
              required
            />
            <button
              type="submit"
              disabled={busy}
              className="rounded-full bg-green-900 text-cream px-6 py-2.5 hover:bg-green-800 transition-colors disabled:opacity-50"
            >
              {busy ? "..." : "Submit Work"}
            </button>
          </form>
        )}

        {isAssignedProvider && task.status === "assigned" && payment?.status !== "held_in_escrow" && (
          <p className="mb-10 text-sm text-ink/50 italic">
            Waiting on the client to fund escrow before you can submit.
          </p>
        )}

        {/* --- Owner confirms completion (submitted) --- */}
        {isOwner && task.status === "submitted" && (
          <div className="mb-10 border border-line rounded-xl p-6 bg-card">
            <p className="font-semibold text-heading mb-1">The provider submitted their work</p>
            {task.proofUrl && (
              <p className="text-sm text-ink/60 mb-4 break-words">Proof: {task.proofUrl}</p>
            )}

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

            <button
              onClick={handleComplete}
              disabled={busy}
              className="rounded-full bg-green-900 text-cream px-6 py-2.5 hover:bg-green-800 transition-colors disabled:opacity-50"
            >
              {busy ? "..." : "Confirm & Release Payment"}
            </button>
            <p className="text-xs text-ink/40 mt-2">
              AI verification is just a signal — the final call is always yours.
            </p>
          </div>
        )}

        {/* --- Dispute banner --- */}
        {task.status === "disputed" && (
          <div className="mb-6 border border-red-200 bg-red-50 rounded-xl p-5">
            <p className="font-semibold text-red-700 mb-1">
              This task is in dispute
            </p>
            <p className="text-sm text-red-600">
              An admin is reviewing it. Escrow stays held until a decision is made.
            </p>
          </div>
        )}

        {/* --- Raise dispute (participants, work in progress) --- */}
        {isParticipant && ["assigned", "submitted"].includes(task.status) && (
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
                <div key={m.id} className={m.senderId === user?.id ? "text-right" : ""}>
                  <span
                    className={`inline-block rounded-xl px-3 py-2 text-sm max-w-[75%] ${
                      m.senderId === user?.id
                        ? "bg-green-900 text-cream"
                        : "bg-paper border border-line"
                    }`}
                  >
                    {m.body}
                  </span>
                  <p className="text-[10px] text-ink/30 mt-0.5">{m.senderName}</p>
                </div>
              ))}
            </div>
            <form onSubmit={handleSendChat} className="flex border-t border-line">
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
            <h2 className="font-display text-2xl text-heading mb-4">Reviews</h2>
            {reviews.length > 0 && (
              <div className="space-y-3 mb-6">
                {reviews.map((r) => (
                  <div key={r.id} className="border border-line rounded-xl p-4 bg-card">
                    <p className="text-gold-500">{"⭐".repeat(r.rating)}</p>
                    {r.comment && <p className="text-sm text-ink/60 mt-1">{r.comment}</p>}
                  </div>
                ))}
              </div>
            )}
            {isParticipant && !myReview && (
              <form onSubmit={handleReview} className="border border-line rounded-xl p-6 bg-card space-y-3">
                <p className="font-semibold text-heading">Leave a Review</p>
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
      </main>
    </>
  );
}
