import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { tasks, payments } from "@/db/schema";
import { eq } from "drizzle-orm";
import { getSessionUser } from "@/lib/auth";
import { verifyTaskProof } from "@/lib/aiVerification";
import { notify } from "@/lib/notify";
import {
  extractUrl,
  uploadProofFile,
  isStorageConfigured,
  MAX_PROOF_FILES,
} from "@/lib/proof";
import { checkDuplicateProof, rememberProof } from "@/lib/proofIntegrity";
import { throttle, tooManyRequests } from "@/lib/rateLimit";

export const maxDuration = 30;

/**
 * POST /api/tasks/[id]/submit
 *
 * Two content types are accepted:
 *  - multipart/form-data: `files` (1..5 images/PDFs) + optional `note` + optional `proofUrl`
 *  - application/json:    { proofUrl, note }
 *
 * Files go to Vercel Blob, so providers can upload screenshots straight from
 * their phone instead of hunting for a public URL (the #1 drop-off in testing).
 *
 * AI verification now runs *inline* for up to VERIFY_BUDGET_MS so the person
 * submitting (and the client who opens the page next) immediately sees a real
 * verdict instead of a stale "not run" badge. If the model is slow we fall
 * back to the background runner and the task page keeps polling.
 */
const VERIFY_BUDGET_MS = 12_000;

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getSessionUser();
    if (!session) {
      return NextResponse.json({ error: "Please log in first" }, { status: 401 });
    }
    const { id: taskId } = await params;

    const submitLimit = await throttle("submitProof", session.userId);
    if (!submitLimit.allowed) return tooManyRequests(submitLimit);

    const found = await db.select().from(tasks).where(eq(tasks.id, taskId)).limit(1);
    const task = found[0];
    if (!task) return NextResponse.json({ error: "Task not found" }, { status: 404 });
    if (task.assignedProviderId !== session.userId) {
      return NextResponse.json(
        { error: "Only the assigned provider can submit proof" },
        { status: 403 }
      );
    }
    if (task.status !== "assigned") {
      return NextResponse.json(
        { error: "This task is not ready for submission yet" },
        { status: 400 }
      );
    }

    const paymentRows = await db.select().from(payments).where(eq(payments.taskId, taskId)).limit(1);
    if (paymentRows.length === 0 || paymentRows[0].status !== "held_in_escrow") {
      return NextResponse.json(
        { error: "The client has not funded escrow yet" },
        { status: 400 }
      );
    }

    // ---- read the payload (multipart upload or plain JSON) ----
    const contentType = req.headers.get("content-type") || "";
    let note = "";
    let rawUrl = "";
    let uploaded: { ref: string; hash: string; dataUrl: string }[] = [];

    if (contentType.includes("multipart/form-data")) {
      const form = await req.formData().catch(() => null);
      if (!form) {
        return NextResponse.json({ error: "Could not read the upload" }, { status: 400 });
      }
      note = String(form.get("note") || "").slice(0, 2000);
      rawUrl = String(form.get("proofUrl") || "").slice(0, 2000);

      const files = form.getAll("files").filter((f): f is File => f instanceof File && f.size > 0);
      if (files.length > MAX_PROOF_FILES) {
        return NextResponse.json(
          { error: `You can attach up to ${MAX_PROOF_FILES} files` },
          { status: 400 }
        );
      }
      if (files.length > 0 && !isStorageConfigured()) {
        return NextResponse.json(
          { error: "File uploads aren't configured on this server. Please paste a link instead." },
          { status: 503 }
        );
      }
      try {
        uploaded = await Promise.all(files.map((f) => uploadProofFile(f, session.userId)));
      } catch (err) {
        return NextResponse.json(
          { error: err instanceof Error ? err.message : "Upload failed" },
          { status: 400 }
        );
      }
    } else {
      const body = await req.json().catch(() => ({} as Record<string, string>));
      note = String(body.note || body.proofNote || "").slice(0, 2000);
      rawUrl = String(body.proofUrl || "").slice(0, 2000);
    }

    // Accept "link + a sentence" — grab just the URL so the vision model can
    // actually fetch the image instead of choking on prose.
    const linkedUrl = extractUrl(rawUrl) || extractUrl(note);
    const proofFiles = uploaded.length > 0 ? uploaded.map((u) => u.ref) : linkedUrl ? [linkedUrl] : [];
    const primaryUrl = proofFiles[0] || null;
    const hashes = uploaded.map((u) => u.hash);
    // For uploaded files we already hold the bytes, so the vision model gets a
    // data URL — no public URL, no second network hop. Pasted links are fetched
    // by lib/aiVerification as before.
    const primaryImage = uploaded.find((u) => u.dataUrl.startsWith("data:image/"))?.dataUrl
      || (primaryUrl && primaryUrl.startsWith("http") ? primaryUrl : null);

    if (!primaryUrl && !note.trim()) {
      return NextResponse.json(
        { error: "Attach at least one photo/PDF or write what you delivered" },
        { status: 400 }
      );
    }

    await db
      .update(tasks)
      .set({
        status: "submitted",
        proofUrl: primaryUrl,
        proofFiles: proofFiles,
        proofNote: note.trim() || null,
        verificationStatus: "not_run",
        verificationNotes: null,
        verificationConfidence: null,
        verifiedAt: null,
      })
      .where(eq(tasks.id, taskId));

    await notify(
      task.postedById,
      "task_submitted",
      `Work was submitted for "${task.title}" — review it now`,
      taskId
    );

    // ---- anti-fraud: has this exact file been submitted before? ----
    const duplicate = await checkDuplicateProof(hashes, taskId);
    await rememberProof(hashes, taskId, session.userId);

    // ---- run the AI sanity check now, with a hard time budget ----
    const description = note.trim() ? `${task.description}\n\nProvider's note: ${note.trim()}` : task.description;

    const runVerification = async () => {
      const result = await verifyTaskProof(task.title, description, primaryImage);
      if (duplicate.duplicate) {
        // Byte-identical file already used on another task — never auto-pass it.
        result.status = "review_needed";
        result.notes = `Heads up: this exact file was already submitted for another task earlier${
          duplicate.previousTaskId ? ` (task ${duplicate.previousTaskId.slice(0, 8)})` : ""
        }. AI check: ${result.notes}`;
      }
      await db
        .update(tasks)
        .set({
          verificationStatus: result.status,
          verificationConfidence: result.confidence,
          verificationNotes: result.notes,
          verifiedAt: new Date(),
        })
        .where(eq(tasks.id, taskId));
      return result;
    };

    const verification = await Promise.race([
      runVerification().catch(() => null),
      new Promise<null>((resolve) => setTimeout(() => resolve(null), VERIFY_BUDGET_MS)),
    ]);

    if (!verification) {
      // Model was too slow — let it finish in the background; the client's
      // task page polls every 3s while the badge says "not run".
      runVerification().catch(() => {
        /* advisory only — never block the flow */
      });
    }

    return NextResponse.json({
      success: true,
      verification,
      proofFiles,
      duplicate: duplicate.duplicate,
    });
  } catch (err) {
    console.error("POST /api/tasks/[id]/submit failed:", err);
    return NextResponse.json(
      { error: "Something went wrong on our end. Please try again." },
      { status: 500 }
    );
  }
}
