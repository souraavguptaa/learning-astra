import { eq } from "drizzle-orm";
import { db } from "../../db/client.js";
import { contentItems, masterTopics } from "../../db/schema/index.js";
import { ApiError } from "../../middleware/errorHandler.js";
import { convertToPdf, LibreOfficeUnavailableError } from "../../services/docConvertService.js";
import {
  buildFileKey,
  getDownloadUrl,
  getObjectBuffer,
  getUploadUrl,
  putObjectBuffer,
} from "../../services/r2Service.js";
import { upsertEmbedding } from "../support/support.service.js";

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

  if (!NEEDS_CONVERSION[input.type]) {
    embedContentItem(item);
    return { item, warning: null as string | null };
  }

  try {
    const original = await getObjectBuffer(input.fileKey);
    const pdfBuffer = await convertToPdf(original);
    const convertedPdfKey = input.fileKey.replace(/\.[^./]+$/, ".pdf");
    await putObjectBuffer(convertedPdfKey, pdfBuffer, "application/pdf");
    const [updated] = await db
      .update(contentItems)
      .set({ convertedPdfKey, status: "ready" })
      .where(eq(contentItems.id, item.id))
      .returning();
    embedContentItem(updated);
    return { item: updated, warning: null as string | null };
  } catch (err) {
    await db.update(contentItems).set({ status: "failed" }).where(eq(contentItems.id, item.id));
    if (err instanceof LibreOfficeUnavailableError) {
      return { item: { ...item, status: "failed" as const }, warning: err.message };
    }
    throw err;
  }
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
