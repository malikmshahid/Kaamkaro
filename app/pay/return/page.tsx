import { redirect } from "next/navigation";
import { db } from "@/db";
import { payments } from "@/db/schema";
import { eq } from "drizzle-orm";

export const dynamic = "force-dynamic";

/**
 * /pay/return?basket=…&failed=1
 *
 * Where PayFast sends the shopper after checkout (SUCCESS_URL / FAILURE_URL).
 * We translate the basket id into our own payment id and hand over to
 * /pay/[paymentId]?back=1, which shows the live confirmation screen.
 *
 * Note we deliberately ignore the `failed` flag for state: the gateway's
 * server-to-server callback plus our own status query decide what happened.
 * A shopper who closes the tab on the success page must still end up funded.
 */
export default async function PayReturnPage({
  searchParams,
}: {
  searchParams: Promise<{ basket?: string }>;
}) {
  const { basket } = await searchParams;
  if (!basket) redirect("/dashboard");

  const rows = await db.select().from(payments).where(eq(payments.basketId, basket)).limit(1);
  const payment = rows[0];
  if (!payment) redirect("/dashboard");

  redirect(`/pay/${payment.id}?back=1`);
}
