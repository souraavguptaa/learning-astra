import { and, desc, eq } from "drizzle-orm";
import { db } from "../../db/client.js";
import { notifications } from "../../db/schema/index.js";

export async function notify(userId: string, type: string, title: string, message: string, deepLink?: string) {
  await db.insert(notifications).values({ userId, type, title, message, deepLink });
}

export async function listMyNotifications(userId: string) {
  return db.select().from(notifications).where(eq(notifications.userId, userId)).orderBy(desc(notifications.createdAt)).limit(50);
}

export async function markRead(notificationId: string, userId: string) {
  await db
    .update(notifications)
    .set({ isRead: true })
    .where(and(eq(notifications.id, notificationId), eq(notifications.userId, userId)));
}

export async function markAllRead(userId: string) {
  await db.update(notifications).set({ isRead: true }).where(eq(notifications.userId, userId));
}
