import { NextRequest, NextResponse } from "next/server";
import { getReceipt } from "@/lib/receipt";

/**
 * Machine-readable version of a KaamKaro work receipt.
 *
 * Same data as /receipt/[id], but as JSON so another platform, an auditor or an
 * AI agent can verify a completed job without scraping our HTML.
 * Public, read-only, no personal data beyond the provider's masked name.
 */

export const dynamic = "force-dynamic";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ taskId: string }> }) {
  try {
    const { taskId } = await params;
    if (!/^[0-9a-fA-F-]{10,64}$/.test(taskId)) {
      return NextResponse.json({ error: "Invalid receipt id" }, { status: 400 });
    }

    const result = await getReceipt(taskId);
    if (!result.ok) {
      if (result.reason === "not_found") {
        return NextResponse.json({ error: "Receipt not found" }, { status: 404 });
      }
      return NextResponse.json(
        {
          available: false,
          reason:
            "This task is not completed yet — a receipt is issued only after the work is confirmed and escrow is released.",
        },
        { status: 409 }
      );
    }

    return NextResponse.json(result.receipt, {
      headers: { "Cache-Control": "public, max-age=60, s-maxage=300" },
    });
  } catch (err) {
    console.error("receipt lookup failed:", err);
    return NextResponse.json({ error: "Could not read this receipt" }, { status: 500 });
  }
}
