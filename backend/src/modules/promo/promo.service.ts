import { desc, eq } from "drizzle-orm";
import { db } from "../../db/client.js";
import { ads, partnerVideos } from "../../db/schema/index.js";
import { ApiError } from "../../middleware/errorHandler.js";
import { buildFileKey, getUploadUrl } from "../../services/r2Service.js";

export async function createAdUploadUrl(originalFilename: string, contentType: string) {
  const fileKey = buildFileKey("ads", originalFilename);
  const uploadUrl = await getUploadUrl(fileKey, contentType);
  return { uploadUrl, fileKey };
}

export async function createAd(createdBy: string, input: { title: string; imageFileKey: string; linkUrl: string }) {
  const [ad] = await db.insert(ads).values({ ...input, createdBy }).returning();
  return ad;
}

export function listActiveAds() {
  return db.select().from(ads).where(eq(ads.isActive, true)).orderBy(desc(ads.createdAt));
}

export function listAllAds() {
  return db.select().from(ads).orderBy(desc(ads.createdAt));
}

export async function setAdActive(id: string, isActive: boolean) {
  const [ad] = await db.update(ads).set({ isActive }).where(eq(ads.id, id)).returning();
  if (!ad) throw new ApiError(404, "Ad not found");
  return ad;
}

export async function deleteAd(id: string) {
  await db.delete(ads).where(eq(ads.id, id));
}

export async function createPartnerVideo(createdBy: string, input: { title: string; youtubeUrl: string }) {
  const [video] = await db.insert(partnerVideos).values({ ...input, createdBy }).returning();
  return video;
}

export function listPartnerVideos() {
  return db.select().from(partnerVideos).orderBy(desc(partnerVideos.createdAt));
}

export async function deletePartnerVideo(id: string) {
  await db.delete(partnerVideos).where(eq(partnerVideos.id, id));
}
