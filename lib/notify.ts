import { db } from "@/db";
import { notifications } from "@/db/schema";
import { randomUUID } from "crypto";

export async function notify(userId: string, type: string, message: string, taskId?: string) {
  try {
    await db.insert(notifications).values({
      id: randomUUID(),
      userId,
      type,
      message,
      taskId: taskId || null,
    });
  } catch {
    // Notifications are best-effort — never let a failure here break the
    // actual action (applying, accepting, paying, etc.).
  }
}
