import { NextResponse } from "next/server";
import { getPlatformSettings, publicSettingsPayload } from "@/lib/platformSettings";

export const dynamic = "force-dynamic";

/** Safe, non-secret settings used by public forms and content. */
export async function GET() {
  const payload = publicSettingsPayload(await getPlatformSettings());
  return NextResponse.json(payload, {
    headers: { "Cache-Control": "private, no-store, max-age=0" },
  });
}
