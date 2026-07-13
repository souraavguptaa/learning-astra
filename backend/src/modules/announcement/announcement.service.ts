import { and, desc, eq, inArray, or } from "drizzle-orm";
import { db } from "../../db/client.js";
import { announcementReads, announcements, users } from "../../db/schema/index.js";
import { ApiError } from "../../middleware/errorHandler.js";
import { buildFileKey, getUploadUrl } from "../../services/r2Service.js";
import { upsertEmbedding } from "../support/support.service.js";
import type { UserRole } from "../../utils/jwt.js";

export async function createAttachmentUploadUrl(originalFilename: string, contentType: string) {
  const fileKey = buildFileKey("announcements", originalFilename);
  const uploadUrl = await getUploadUrl(fileKey, contentType);
  return { uploadUrl, fileKey };
}

export async function createAnnouncement(
  createdBy: string,
  input: {
    title: string;
    body: string;
    attachmentFileKey?: string;
    trainingLinkId?: string;
    targetType: "all" | "role" | "franchise";
    targetRole?: UserRole;
    targetFranchiseId?: string;
  },
) {
  const [announcement] = await db
    .insert(announcements)
    .values({
      title: input.title,
      body: input.body,
      attachmentFileKey: input.attachmentFileKey,
      trainingLinkId: input.trainingLinkId,
      targetType: input.targetType,
      targetRole: input.targetRole,
      targetFranchiseId: input.targetFranchiseId,
      createdBy,
    })
    .returning();
  upsertEmbedding("announcement", announcement.id, `${announcement.title}. ${announcement.body}`).catch((err) =>
    console.error("Failed to embed announcement:", err),
  );
  return announcement;
}

export async function listAllAnnouncements() {
  return db.select().from(announcements).orderBy(desc(announcements.createdAt));
}

export async function listForUser(user: { id: string; role: UserRole; franchiseId: string | null }) {
  const conditions = [eq(announcements.targetType, "all"), and(eq(announcements.targetType, "role"), eq(announcements.targetRole, user.role))];
  if (user.franchiseId) {
    conditions.push(and(eq(announcements.targetType, "franchise"), eq(announcements.targetFranchiseId, user.franchiseId))!);
  }

  const rows = await db
    .select()
    .from(announcements)
    .where(or(...conditions))
    .orderBy(desc(announcements.createdAt));

  const reads = await db.select().from(announcementReads).where(eq(announcementReads.userId, user.id));
  const readIds = new Set(reads.map((r) => r.announcementId));

  return rows.map((a) => ({ ...a, isRead: readIds.has(a.id) }));
}

export async function markAnnouncementRead(announcementId: string, userId: string) {
  await db.insert(announcementReads).values({ announcementId, userId }).onConflictDoNothing();
}

export async function deleteAnnouncement(id: string) {
  await db.delete(announcements).where(eq(announcements.id, id));
}

export async function getReadStatus(announcementId: string) {
  const [announcement] = await db.select().from(announcements).where(eq(announcements.id, announcementId)).limit(1);
  if (!announcement) throw new ApiError(404, "Announcement not found");

  let audience: { id: string; name: string }[] = [];
  if (announcement.targetType === "all") {
    audience = await db.select({ id: users.id, name: users.name }).from(users);
  } else if (announcement.targetType === "role" && announcement.targetRole) {
    audience = await db.select({ id: users.id, name: users.name }).from(users).where(eq(users.role, announcement.targetRole));
  } else if (announcement.targetType === "franchise" && announcement.targetFranchiseId) {
    audience = await db
      .select({ id: users.id, name: users.name })
      .from(users)
      .where(eq(users.franchiseId, announcement.targetFranchiseId));
  }

  const audienceIds = audience.map((a) => a.id);
  const reads = audienceIds.length
    ? await db.select().from(announcementReads).where(and(eq(announcementReads.announcementId, announcementId), inArray(announcementReads.userId, audienceIds)))
    : [];
  const readMap = new Map(reads.map((r) => [r.userId, r.readAt]));

  return audience.map((a) => ({ userId: a.id, name: a.name, readAt: readMap.get(a.id) ?? null }));
}
