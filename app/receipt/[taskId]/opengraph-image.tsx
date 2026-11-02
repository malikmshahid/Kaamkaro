import { ImageResponse } from "next/og";
import { getReceipt } from "@/lib/receipt";
import { formatMoney } from "@/lib/currency";
import { getPlatformSettings } from "@/lib/platformSettings";

/**
 * Share card for a work receipt.
 *
 * A receipt is meant to be pasted into a portfolio, a WhatsApp chat or a client's
 * inbox — and until now it shared as a bare grey link. This renders the proof
 * itself: amount, receipt id, verification verdict and KaamScore, in the same
 * jade + gold + parchment language as the site.
 *
 * Everything is drawn from getReceipt(), so the card can never claim more than
 * the public receipt does. No names, no emails, no file URLs.
 */

export const alt = "KaamKaro verified work receipt";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const dynamic = "force-dynamic";

const JADE = "#0b2016";
const JADE_SOFT = "#123a26";
const GOLD = "#c8963e";
const PARCHMENT = "#f6f1e7";
const INK = "#211d17";

function clip(text: string, max: number) {
  const clean = (text || "").trim();
  return clean.length > max ? `${clean.slice(0, max - 1).trimEnd()}…` : clean;
}

export default async function Image({ params }: { params: Promise<{ taskId: string }> }) {
  const { taskId } = await params;
  const result = await getReceipt(taskId);

  if (!result.ok) {
    return new ImageResponse(
      (
        <div
          style={{
            width: "100%",
            height: "100%",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            background: JADE,
            color: PARCHMENT,
            fontFamily: "sans-serif",
          }}
        >
          <div style={{ display: "flex", fontSize: 64, fontWeight: 700, letterSpacing: -1 }}>KaamKaro</div>
          <div style={{ display: "flex", fontSize: 30, color: GOLD, marginTop: 16 }}>
            {result.reason === "not_completed"
              ? "No receipt yet — this job is still open"
              : "Receipt not found"}
          </div>
        </div>
      ),
      { ...size }
    );
  }

  const r = result.receipt;
  const settings = await getPlatformSettings();
  const categoryLabel = settings.marketplace.categoryLabels.find((item) => item.value === r.task.category)?.label || r.task.category.replace(/_/g, " ");
  const score = r.provider?.kaamScore;
  const verified = r.proof.verification === "pass";

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          background: PARCHMENT,
          fontFamily: "sans-serif",
          position: "relative",
        }}
      >
        {/* left jade spine */}
        <div style={{ display: "flex", width: 22, height: "100%", background: JADE }} />

        <div
          style={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            padding: "54px 62px",
          }}
        >
          {/* header */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
              <div
                style={{
                  width: 46,
                  height: 46,
                  borderRadius: 12,
                  background: JADE,
                  color: PARCHMENT,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 26,
                  fontWeight: 700,
                }}
              >
                K
              </div>
              <div style={{ display: "flex", flexDirection: "column" }}>
                <div style={{ display: "flex", fontSize: 27, fontWeight: 700, color: INK, letterSpacing: -0.5 }}>
                  KaamKaro
                </div>
                <div style={{ display: "flex", fontSize: 14, color: "#6b6152", letterSpacing: 3 }}>
                  VERIFIED WORK RECEIPT
                </div>
              </div>
            </div>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                padding: "9px 18px",
                borderRadius: 999,
                border: `1.5px solid ${verified ? JADE_SOFT : GOLD}`,
                color: verified ? JADE_SOFT : "#8a6118",
                fontSize: 17,
                fontWeight: 600,
              }}
            >
              <div
                style={{ display: "flex",
                  width: 9,
                  height: 9,
                  borderRadius: 999,
                  background: verified ? JADE_SOFT : GOLD,
                }}
              />
              {verified ? "Proof verified" : "Manually confirmed"}
            </div>
          </div>

          {/* title */}
          <div
            style={{
              display: "flex",
              marginTop: 44,
              fontSize: r.task.title.length > 46 ? 46 : 54,
              fontWeight: 700,
              color: INK,
              lineHeight: 1.12,
              letterSpacing: -1,
              maxWidth: 940,
            }}
          >
            {clip(r.task.title, 90)}
          </div>

          <div style={{ display: "flex", flexWrap: "wrap", marginTop: 20, gap: 10, fontSize: 19, color: "#6b6152" }}>
            <span>{categoryLabel}</span>
            <span>·</span>
            <span>{r.task.city || "Remote"}</span>
            <span>·</span>
            <span>{r.escrow.status === "released" ? "Escrow released" : r.escrow.status}</span>
          </div>

          {/* amount + score */}
          <div style={{ display: "flex", alignItems: "flex-end", gap: 28, marginTop: 38, flexWrap: "wrap" }}>
            <div style={{ display: "flex", flexDirection: "column" }}>
              <div style={{ display: "flex", fontSize: 14, letterSpacing: 3, color: "#8a8172" }}>AMOUNT PAID</div>
              <div
                style={{ display: "flex",
                  fontSize: 62,
                  fontWeight: 700,
                  color: JADE_SOFT,
                  letterSpacing: -1.5,
                  marginTop: 4,
                }}
              >
                {formatMoney(r.task.amount, r.task.currency)}
              </div>
            </div>

            {score && (
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  padding: "14px 22px",
                  borderRadius: 16,
                  background: "#ffffff",
                  border: "1px solid #e4dbca",
                }}
              >
                <div style={{ display: "flex", fontSize: 13, letterSpacing: 2.5, color: "#8a8172" }}>KAAMSCORE</div>
                <div style={{ display: "flex", alignItems: "baseline", gap: 9, marginTop: 3 }}>
                  <span style={{ fontSize: 38, fontWeight: 700, color: INK }}>{score.score}</span>
                  <span style={{ fontSize: 20, color: GOLD, fontWeight: 600 }}>
                    {score.grade.label}
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* footer */}
          <div
            style={{
              marginTop: "auto",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              borderTop: "1px solid #e4dbca",
              paddingTop: 20,
            }}
          >
            <div style={{ display: "flex", flexDirection: "column" }}>
              <div style={{ display: "flex", fontSize: 13, letterSpacing: 2.5, color: "#8a8172" }}>RECEIPT ID</div>
              <div
                style={{ display: "flex",
                  fontSize: 26,
                  fontWeight: 700,
                  color: INK,
                  letterSpacing: 2,
                  marginTop: 3,
                }}
              >
                {r.receiptId}
              </div>
            </div>
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "flex-end",
                fontSize: 18,
                color: "#6b6152",
              }}
            >
              Verify independently at
              <div style={{ display: "flex", color: JADE_SOFT, fontWeight: 600 }}>kaamkaro.ai/receipt/{clip(taskId, 8)}…</div>
            </div>
          </div>
        </div>
      </div>
    ),
    { ...size }
  );
}
