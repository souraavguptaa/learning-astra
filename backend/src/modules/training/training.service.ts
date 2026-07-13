import { and, asc, eq, inArray, max } from "drizzle-orm";
import { db } from "../../db/client.js";
import {
  assessmentResults,
  assessments,
  contentItems,
  contentProgress,
  trainingAssignments,
  trainingItems,
  trainingProgress,
  trainings,
  trainingVersions,
  users,
} from "../../db/schema/index.js";
import { ApiError } from "../../middleware/errorHandler.js";
import { awardPoints, checkAndAwardBadges } from "../gamification/gamification.service.js";
import { notify } from "../notification/notification.service.js";
import type { UserRole } from "../../utils/jwt.js";

export async function createTraining(
  trainerId: string,
  input: { title: string; description: string; isMandatory: boolean },
) {
  const [training] = await db
    .insert(trainings)
    .values({ title: input.title, description: input.description, isMandatory: input.isMandatory, trainerId })
    .returning();
  return training;
}

export async function listTrainings() {
  return db.select().from(trainings).orderBy(asc(trainings.createdAt));
}

export async function getTrainingDetail(trainingId: string) {
  const [training] = await db.select().from(trainings).where(eq(trainings.id, trainingId)).limit(1);
  if (!training) throw new ApiError(404, "Training not found");

  const items = await db
    .select({ item: trainingItems, content: contentItems, assessment: assessments })
    .from(trainingItems)
    .leftJoin(contentItems, eq(trainingItems.contentId, contentItems.id))
    .leftJoin(assessments, eq(trainingItems.assessmentId, assessments.id))
    .where(eq(trainingItems.trainingId, trainingId))
    .orderBy(asc(trainingItems.itemOrder));

  const assignments = await db
    .select()
    .from(trainingAssignments)
    .where(eq(trainingAssignments.trainingId, trainingId));

  return { training, items, assignments };
}

export async function updateTraining(
  trainingId: string,
  input: Partial<{ title: string; description: string; isMandatory: boolean; npsEnabled: boolean }>,
) {
  const [training] = await db.update(trainings).set(input).where(eq(trainings.id, trainingId)).returning();
  if (!training) throw new ApiError(404, "Training not found");
  return training;
}

async function nextItemOrder(trainingId: string): Promise<number> {
  const [{ value: maxOrder }] = await db
    .select({ value: max(trainingItems.itemOrder) })
    .from(trainingItems)
    .where(eq(trainingItems.trainingId, trainingId));
  return (maxOrder ?? -1) + 1;
}

export async function addItem(trainingId: string, contentId: string) {
  const [item] = await db
    .insert(trainingItems)
    .values({ trainingId, contentId, itemType: "content", itemOrder: await nextItemOrder(trainingId) })
    .returning();
  return item;
}

/** Called by the assessments module when a new assessment is created for a training. */
export async function addAssessmentItemToTraining(trainingId: string, assessmentId: string) {
  const [item] = await db
    .insert(trainingItems)
    .values({ trainingId, assessmentId, itemType: "assessment", itemOrder: await nextItemOrder(trainingId) })
    .returning();
  return item;
}

export async function reorderItems(trainingId: string, orderedItemIds: string[]) {
  await Promise.all(
    orderedItemIds.map((itemId, index) =>
      db
        .update(trainingItems)
        .set({ itemOrder: index })
        .where(and(eq(trainingItems.id, itemId), eq(trainingItems.trainingId, trainingId))),
    ),
  );
  return getTrainingDetail(trainingId);
}

export async function removeItem(trainingId: string, itemId: string) {
  await db.delete(trainingItems).where(and(eq(trainingItems.id, itemId), eq(trainingItems.trainingId, trainingId)));
}

export async function publishTraining(trainingId: string, changedBy: string) {
  const [training] = await db
    .update(trainings)
    .set({ status: "published", publishedAt: new Date() })
    .where(eq(trainings.id, trainingId))
    .returning();
  if (!training) throw new ApiError(404, "Training not found");

  await db.insert(trainingVersions).values({
    trainingId,
    versionMajor: training.versionMajor,
    versionMinor: training.versionMinor,
    changeType: "major",
    changedBy,
  });
  return training;
}

export async function bumpVersion(trainingId: string, changedBy: string, changeType: "minor" | "major") {
  const [training] = await db.select().from(trainings).where(eq(trainings.id, trainingId)).limit(1);
  if (!training) throw new ApiError(404, "Training not found");

  const versionMajor = changeType === "major" ? training.versionMajor + 1 : training.versionMajor;
  const versionMinor = changeType === "major" ? 0 : training.versionMinor + 1;

  const [updated] = await db
    .update(trainings)
    .set({ versionMajor, versionMinor })
    .where(eq(trainings.id, trainingId))
    .returning();

  await db.insert(trainingVersions).values({ trainingId, versionMajor, versionMinor, changeType, changedBy });

  if (changeType === "major") {
    const affected = await db
      .update(trainingProgress)
      .set({ requiresRecompletion: true })
      .where(and(eq(trainingProgress.trainingId, trainingId), eq(trainingProgress.completed, true)))
      .returning();

    for (const p of affected) {
      await notify(
        p.userId,
        "training_major_update",
        "Updated Training — Re-completion Required",
        `"${updated.title}" was updated and needs to be completed again.`,
        `/learning/${trainingId}`,
      );
    }
  }

  return updated;
}

export async function assignTraining(
  trainingId: string,
  input: { assigneeType: "user" | "role" | "franchise"; userId?: string; role?: UserRole; franchiseId?: string },
) {
  const [assignment] = await db
    .insert(trainingAssignments)
    .values({
      trainingId,
      assigneeType: input.assigneeType,
      userId: input.userId ?? null,
      role: input.role ?? null,
      franchiseId: input.franchiseId ?? null,
    })
    .returning();

  const [training] = await db.select().from(trainings).where(eq(trainings.id, trainingId)).limit(1);
  const title = "New Training Assigned";
  const message = `"${training?.title ?? "A training"}" has been assigned to you.`;
  const deepLink = `/learning/${trainingId}`;

  let recipients: { id: string }[] = [];
  if (input.assigneeType === "user" && input.userId) {
    recipients = [{ id: input.userId }];
  } else if (input.assigneeType === "role" && input.role) {
    recipients = await db.select({ id: users.id }).from(users).where(eq(users.role, input.role));
  } else if (input.assigneeType === "franchise" && input.franchiseId) {
    recipients = await db.select({ id: users.id }).from(users).where(eq(users.franchiseId, input.franchiseId));
  }
  for (const r of recipients) {
    await notify(r.id, "training_assigned", title, message, deepLink);
  }

  return assignment;
}

export async function removeAssignment(trainingId: string, assignmentId: string) {
  await db
    .delete(trainingAssignments)
    .where(and(eq(trainingAssignments.id, assignmentId), eq(trainingAssignments.trainingId, trainingId)));
}

export async function listAssignedTrainings(user: { id: string; role: UserRole; franchiseId: string | null }) {
  const assignmentRows = await db
    .select({ trainingId: trainingAssignments.trainingId })
    .from(trainingAssignments)
    .where(
      and(
        eq(trainingAssignments.assigneeType, "user"),
        eq(trainingAssignments.userId, user.id),
      ),
    );

  const roleRows = await db
    .select({ trainingId: trainingAssignments.trainingId })
    .from(trainingAssignments)
    .where(and(eq(trainingAssignments.assigneeType, "role"), eq(trainingAssignments.role, user.role)));

  const franchiseRows = user.franchiseId
    ? await db
        .select({ trainingId: trainingAssignments.trainingId })
        .from(trainingAssignments)
        .where(
          and(eq(trainingAssignments.assigneeType, "franchise"), eq(trainingAssignments.franchiseId, user.franchiseId)),
        )
    : [];

  const trainingIds = [...new Set([...assignmentRows, ...roleRows, ...franchiseRows].map((r) => r.trainingId))];
  if (trainingIds.length === 0) return [];

  const rows = await db
    .select()
    .from(trainings)
    .where(and(inArray(trainings.id, trainingIds), eq(trainings.status, "published")));

  const progressRows = await db
    .select()
    .from(trainingProgress)
    .where(and(inArray(trainingProgress.trainingId, trainingIds), eq(trainingProgress.userId, user.id)));

  return rows.map((training) => ({
    training,
    progress: progressRows.find((p) => p.trainingId === training.id) ?? null,
  }));
}

export async function getTrainingForUser(userId: string, trainingId: string) {
  const { training, items } = await getTrainingDetail(trainingId);

  const contentIds = items.map((i) => i.item.contentId).filter((id): id is string => !!id);
  const contentProgressRows = contentIds.length
    ? await db
        .select()
        .from(contentProgress)
        .where(and(eq(contentProgress.userId, userId), inArray(contentProgress.contentId, contentIds)))
    : [];

  const assessmentIds = items.map((i) => i.item.assessmentId).filter((id): id is string => !!id);
  const assessmentResultRows = assessmentIds.length
    ? await db
        .select()
        .from(assessmentResults)
        .where(and(eq(assessmentResults.userId, userId), inArray(assessmentResults.assessmentId, assessmentIds)))
    : [];

  let previousCompleted = true;
  const itemsWithState = items.map(({ item, content, assessment }) => {
    const progress = item.contentId
      ? contentProgressRows.find((p) => p.contentId === item.contentId) ?? null
      : assessmentResultRows.find((r) => r.assessmentId === item.assessmentId) ?? null;
    const isItemComplete = item.contentId ? (progress as typeof contentProgressRows[number] | null)?.completed : (progress as typeof assessmentResultRows[number] | null)?.passed;
    const unlocked = previousCompleted;
    previousCompleted = isItemComplete ?? false;
    return { item, content, assessment, progress, unlocked };
  });

  return { training, items: itemsWithState };
}

async function advanceTrainingProgress(
  userId: string,
  matchColumn: typeof trainingItems.contentId | typeof trainingItems.assessmentId,
  matchValue: string,
) {
  const rows = await db
    .select({ item: trainingItems, training: trainings })
    .from(trainingItems)
    .innerJoin(trainings, eq(trainingItems.trainingId, trainings.id))
    .where(eq(matchColumn, matchValue));

  for (const { item, training } of rows) {
    const allItems = await db
      .select()
      .from(trainingItems)
      .where(eq(trainingItems.trainingId, training.id))
      .orderBy(asc(trainingItems.itemOrder));

    const isLastItem = item.itemOrder === allItems.length - 1;

    const [existing] = await db
      .select()
      .from(trainingProgress)
      .where(and(eq(trainingProgress.userId, userId), eq(trainingProgress.trainingId, training.id)))
      .limit(1);

    const nextOrder = item.itemOrder + 1;
    const wasAlreadyCompleted = existing?.completed ?? false;

    if (existing) {
      await db
        .update(trainingProgress)
        .set({
          currentItemOrder: Math.max(existing.currentItemOrder, nextOrder),
          completed: existing.completed || isLastItem,
          completedAt: existing.completed || isLastItem ? (existing.completedAt ?? new Date()) : null,
          versionMajorCompleted: isLastItem ? training.versionMajor : existing.versionMajorCompleted,
          versionMinorCompleted: isLastItem ? training.versionMinor : existing.versionMinorCompleted,
          requiresRecompletion: isLastItem ? false : existing.requiresRecompletion,
        })
        .where(eq(trainingProgress.id, existing.id));
    } else {
      await db.insert(trainingProgress).values({
        userId,
        trainingId: training.id,
        currentItemOrder: nextOrder,
        completed: isLastItem,
        completedAt: isLastItem ? new Date() : null,
        versionMajorCompleted: isLastItem ? training.versionMajor : null,
        versionMinorCompleted: isLastItem ? training.versionMinor : null,
      });
    }

    if (isLastItem && !wasAlreadyCompleted) {
      await awardPoints(userId, 50, "training_completed", "training", training.id);
      await checkAndAwardBadges(userId);
      await notify(
        userId,
        "training_completed",
        "Training Completed",
        `You completed "${training.title}".`,
        `/learning/${training.id}`,
      );
    }
  }
}

/** Advances training_progress for every training containing this content item once it's completed. */
export function advanceTrainingProgressForContent(userId: string, contentId: string) {
  return advanceTrainingProgress(userId, trainingItems.contentId, contentId);
}

/** Advances training_progress for every training containing this assessment once it's passed. */
export function advanceTrainingProgressForAssessment(userId: string, assessmentId: string) {
  return advanceTrainingProgress(userId, trainingItems.assessmentId, assessmentId);
}
