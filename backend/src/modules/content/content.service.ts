import { eq } from "drizzle-orm";
import { db } from "../../db/client.js";
import { contentItems, masterTopics, trainingItems } from "../../db/schema/index.js";
import { ApiError } from "../../middleware/errorHandler.js";
import { convertToPdf, LibreOfficeUnavailableError } from "../../services/docConvertService.js";
import {
  buildFileKey,
  getDownloadUrl,
  getObjectBuffer,
  getUploadUrl,
  putObjectBuffer,
} from "../../services/r2Service.js";
import { deleteEmbedding, upsertEmbedding } from "../support/support.service.js";

function embedContentItem(item: { id: string; title: string; description: string; topic: string; language: string }) {
  upsertEmbedding("content", item.id, `${item.title}. ${item.description}. Topic: ${item.topic}. Language: ${item.language}`).catch(
    (err) => console.error("Failed to embed content item:", err),
  );
}

const NEEDS_CONVERSION: Record<string, boolean> = {
  ppt: true,
  word: true,
  excel: true,
  pdf: false,
  video: false,
};

type ContentRow = typeof contentItems.$inferSelect;

/** Runs the PPT/Word/Excel→PDF conversion (if needed) and (re-)embeds for AI Support. Shared by create and update. */
async function convertAndFinalize(item: ContentRow): Promise<{ item: ContentRow; warning: string | null }> {
  if (!NEEDS_CONVERSION[item.type]) {
    embedContentItem(item);
    return { item, warning: null };
  }

  try {
    const original = await getObjectBuffer(item.fileKey);
    const pdfBuffer = await convertToPdf(original);
    const convertedPdfKey = item.fileKey.replace(/\.[^./]+$/, ".pdf");
    await putObjectBuffer(convertedPdfKey, pdfBuffer, "application/pdf");
    const [updated] = await db
      .update(contentItems)
      .set({ convertedPdfKey, status: "ready" })
      .where(eq(contentItems.id, item.id))
      .returning();
    embedContentItem(updated);
    return { item: updated, warning: null };
  } catch (err) {
    const [failed] = await db.update(contentItems).set({ status: "failed" }).where(eq(contentItems.id, item.id)).returning();
    if (err instanceof LibreOfficeUnavailableError) {
      return { item: failed, warning: err.message };
    }
    throw err;
  }
}

export async function createUploadUrl(originalFilename: string, contentType: string) {
  const fileKey = buildFileKey("content", originalFilename);
  const uploadUrl = await getUploadUrl(fileKey, contentType);
  return { uploadUrl, fileKey };
}

export async function createContentItem(
  uploaderId: string,
  input: {
    type: "video" | "pdf" | "ppt" | "word" | "excel";
    title: string;
    description: string;
    topic: string;
    language: string;
    targetRoles: string[];
    fileKey: string;
    mimeType: string;
    masterTopicId?: string;
    durationSeconds?: number;
  },
) {
  const [item] = await db
    .insert(contentItems)
    .values({
      type: input.type,
      title: input.title,
      description: input.description,
      topic: input.topic,
      language: input.language,
      targetRoles: input.targetRoles,
      fileKey: input.fileKey,
      mimeType: input.mimeType,
      masterTopicId: input.masterTopicId ?? null,
      durationSeconds: input.durationSeconds?.toString(),
      status: NEEDS_CONVERSION[input.type] ? "processing" : "ready",
      uploadedBy: uploaderId,
    })
    .returning();

  return convertAndFinalize(item);
}

export async function updateContentItem(
  contentId: string,
  input: Partial<{
    title: string;
    description: string;
    topic: string;
    language: string;
    targetRoles: string[];
    masterTopicId: string | null;
    fileKey: string; // presence means "replace the underlying file"
    mimeType: string;
  }>,
) {
  const [existing] = await db.select().from(contentItems).where(eq(contentItems.id, contentId)).limit(1);
  if (!existing) throw new ApiError(404, "Content not found");

  const replacingFile = !!input.fileKey;
  const [updated] = await db
    .update(contentItems)
    .set({
      title: input.title,
      description: input.description,
      topic: input.topic,
      language: input.language,
      targetRoles: input.targetRoles,
      masterTopicId: input.masterTopicId,
      mimeType: input.mimeType,
      ...(replacingFile
        ? { fileKey: input.fileKey, convertedPdfKey: null, status: NEEDS_CONVERSION[existing.type] ? ("processing" as const) : ("ready" as const) }
        : {}),
    })
    .where(eq(contentItems.id, contentId))
    .returning();

  if (replacingFile) return convertAndFinalize(updated);

  embedContentItem(updated);
  return { item: updated, warning: null as string | null };
}

export async function deleteContentItem(contentId: string) {
  const usedIn = await db.select({ id: trainingItems.id }).from(trainingItems).where(eq(trainingItems.contentId, contentId)).limit(1);
  if (usedIn.length > 0) {
    throw new ApiError(400, "This content is used in a training. Remove it from that training first, then delete it.");
  }
  const [deleted] = await db.delete(contentItems).where(eq(contentItems.id, contentId)).returning();
  if (!deleted) throw new ApiError(404, "Content not found");
  await deleteEmbedding("content", contentId);
}

export async function listContent() {
  return db.select().from(contentItems).orderBy(contentItems.createdAt);
}

export async function getContentPlaybackUrl(contentId: string) {
  const [item] = await db.select().from(contentItems).where(eq(contentItems.id, contentId)).limit(1);
  if (!item) throw new ApiError(404, "Content not found");
  const key = item.convertedPdfKey ?? item.fileKey;
  const url = await getDownloadUrl(key);
  return { url, type: item.type, viewedAsPdf: !!item.convertedPdfKey };
}

export async function listMasterTopics() {
  return db.select().from(masterTopics);
}

export async function createMasterTopic(input: { title: string; category?: string }) {
  const [topic] = await db.insert(masterTopics).values(input).returning();
  return topic;
}
