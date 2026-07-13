import { and, eq } from "drizzle-orm";
import { db } from "../../db/client.js";
import { contentItems, contentProgress } from "../../db/schema/index.js";
import { ApiError } from "../../middleware/errorHandler.js";
import { awardPoints } from "../gamification/gamification.service.js";
import { advanceTrainingProgressForContent } from "../training/training.service.js";

const HEARTBEAT_CAP_SECONDS = 15;
const WALL_CLOCK_TOLERANCE_SECONDS = 2;
const COMPLETION_TOLERANCE_SECONDS = 2;

async function getOrCreateProgress(userId: string, contentId: string) {
  const [existing] = await db
    .select()
    .from(contentProgress)
    .where(and(eq(contentProgress.userId, userId), eq(contentProgress.contentId, contentId)))
    .limit(1);
  if (existing) return existing;

  const [created] = await db.insert(contentProgress).values({ userId, contentId }).returning();
  return created;
}

export async function getProgress(userId: string, contentId: string) {
  const progress = await getOrCreateProgress(userId, contentId);
  return {
    lastPositionSeconds: Number(progress.lastPositionSeconds),
    highestPointSeconds: Number(progress.highestPointSeconds),
    completed: progress.completed,
  };
}

export async function heartbeat(
  userId: string,
  contentId: string,
  input: { currentTime: number; durationSeconds?: number },
) {
  const [content] = await db.select().from(contentItems).where(eq(contentItems.id, contentId)).limit(1);
  if (!content) throw new ApiError(404, "Content not found");
  if (content.type !== "video") throw new ApiError(400, "Heartbeat tracking only applies to video content");

  if (input.durationSeconds && !content.durationSeconds) {
    await db
      .update(contentItems)
      .set({ durationSeconds: input.durationSeconds.toString() })
      .where(eq(contentItems.id, contentId));
  }
  const durationSeconds = input.durationSeconds ?? Number(content.durationSeconds ?? 0);

  const progress = await getOrCreateProgress(userId, contentId);
  const now = new Date();
  const lastPosition = Number(progress.lastPositionSeconds);
  const highestPoint = Number(progress.highestPointSeconds);
  const reportedDelta = input.currentTime - lastPosition;

  let newLastPosition = lastPosition;
  let newHighestPoint = highestPoint;

  if (reportedDelta <= 0) {
    // Rewind or no movement — always allowed, never raises the highest point reached.
    newLastPosition = Math.max(0, input.currentTime);
  } else {
    const elapsedWallSeconds = progress.lastPingServerAt
      ? (now.getTime() - progress.lastPingServerAt.getTime()) / 1000
      : HEARTBEAT_CAP_SECONDS;
    const validIncrement = Math.min(
      reportedDelta,
      elapsedWallSeconds + WALL_CLOCK_TOLERANCE_SECONDS,
      HEARTBEAT_CAP_SECONDS,
    );
    newLastPosition = lastPosition + validIncrement;
    newHighestPoint = Math.max(highestPoint, newLastPosition);
  }

  const isNowComplete =
    !progress.completed && durationSeconds > 0 && newHighestPoint >= durationSeconds - COMPLETION_TOLERANCE_SECONDS;

  const [updated] = await db
    .update(contentProgress)
    .set({
      lastPositionSeconds: newLastPosition.toString(),
      highestPointSeconds: newHighestPoint.toString(),
      lastPingServerAt: now,
      completed: progress.completed || isNowComplete,
      completedAt: progress.completed ? progress.completedAt : isNowComplete ? now : null,
    })
    .where(eq(contentProgress.id, progress.id))
    .returning();

  if (updated.completed) {
    // Idempotent — also backfills progress for any OTHER training that reuses this same
    // content item and was assigned/added after the user already completed it elsewhere.
    await advanceTrainingProgressForContent(userId, contentId);
  }
  if (isNowComplete) {
    await awardPoints(userId, 10, "content_completed", "content", contentId);
  }

  return {
    lastPositionSeconds: Number(updated.lastPositionSeconds),
    highestPointSeconds: Number(updated.highestPointSeconds),
    completed: updated.completed,
  };
}

export async function markViewed(userId: string, contentId: string) {
  const [content] = await db.select().from(contentItems).where(eq(contentItems.id, contentId)).limit(1);
  if (!content) throw new ApiError(404, "Content not found");
  if (content.type === "video") throw new ApiError(400, "Use the heartbeat endpoint for video content");

  const progress = await getOrCreateProgress(userId, contentId);
  if (!progress.completed) {
    await db
      .update(contentProgress)
      .set({ completed: true, completedAt: new Date() })
      .where(eq(contentProgress.id, progress.id));
    await awardPoints(userId, 10, "content_completed", "content", contentId);
  }
  // Idempotent — also backfills progress for any OTHER training that reuses this same
  // content item and was assigned/added after the user already completed it elsewhere.
  await advanceTrainingProgressForContent(userId, contentId);
  return { completed: true };
}
