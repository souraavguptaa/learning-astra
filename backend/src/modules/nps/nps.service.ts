import { and, eq } from "drizzle-orm";
import { db } from "../../db/client.js";
import { npsResponses, trainingProgress, trainings } from "../../db/schema/index.js";
import { ApiError } from "../../middleware/errorHandler.js";

export async function submitNps(userId: string, trainingId: string, rating: number) {
  const [training] = await db.select().from(trainings).where(eq(trainings.id, trainingId)).limit(1);
  if (!training) throw new ApiError(404, "Training not found");
  if (!training.npsEnabled) throw new ApiError(400, "NPS feedback is not enabled for this training");

  const [progress] = await db
    .select()
    .from(trainingProgress)
    .where(and(eq(trainingProgress.userId, userId), eq(trainingProgress.trainingId, trainingId)))
    .limit(1);
  if (!progress?.completed) throw new ApiError(400, "Complete the training before submitting feedback");

  const [existing] = await db
    .select()
    .from(npsResponses)
    .where(and(eq(npsResponses.userId, userId), eq(npsResponses.trainingId, trainingId)))
    .limit(1);
  if (existing) throw new ApiError(400, "You have already submitted feedback for this training");

  const [response] = await db.insert(npsResponses).values({ userId, trainingId, rating }).returning();
  return response;
}

export async function getMyNpsStatus(userId: string, trainingId: string) {
  const [existing] = await db
    .select()
    .from(npsResponses)
    .where(and(eq(npsResponses.userId, userId), eq(npsResponses.trainingId, trainingId)))
    .limit(1);
  return { submitted: !!existing, rating: existing?.rating ?? null };
}

export async function getNpsReport(trainingId: string) {
  const rows = await db.select().from(npsResponses).where(eq(npsResponses.trainingId, trainingId));

  const distribution: Record<number, number> = {};
  for (let i = 0; i <= 10; i++) distribution[i] = 0;
  let sum = 0;
  for (const row of rows) {
    distribution[row.rating] = (distribution[row.rating] ?? 0) + 1;
    sum += row.rating;
  }

  return {
    responseCount: rows.length,
    average: rows.length ? Math.round((sum / rows.length) * 10) / 10 : null,
    distribution,
  };
}
