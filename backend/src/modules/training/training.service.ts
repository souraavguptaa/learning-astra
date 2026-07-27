import { and, asc, eq, inArray, isNotNull, lt, max } from "drizzle-orm";
import { db } from "../../db/client.js";
import {
  assessmentResults,
  assessments,
  certificates,
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
import { deleteEmbedding, upsertEmbedding } from "../support/support.service.js";
import type { UserRole } from "../../utils/jwt.js";

function embedTraining(training: { id: string; title: string; description: string }) {
  upsertEmbedding("training", training.id, `${training.title}. ${training.description}`).catch((err) =>
    console.error("Failed to embed training:", err),
  );
}

export async function createTraining(
  trainerId: string,
  input: { title: string; description: string; isMandatory: boolean; isStandaloneAssessment?: boolean },
) {
  const [training] = await db
    .insert(trainings)
    .values({
      title: input.title,
      description: input.description,
      isMandatory: input.isMandatory,
      isStandaloneAssessment: input.isStandaloneAssessment ?? false,
      trainerId,
    })
    .returning();
  embedTraining(training);
  return training;
}

// Blocked (rather than cascading) once anyone has real progress or an earned certificate on this
// training — certificates.trainingId cascades on delete, so an unguarded delete would silently
// destroy a learner's already-issued proof-of-completion. Untouched drafts/test trainings delete cleanly.
export async function deleteTraining(trainingId: string, options?: { force?: boolean }) {
  if (!options?.force) {
    const [progressRow] = await db.select({ id: trainingProgress.id }).from(trainingProgress).where(eq(trainingProgress.trainingId, trainingId)).limit(1);
    if (progressRow) {
      throw new ApiError(400, "This training has learner progress or certificates and can't be deleted. Unassign it instead if it shouldn't be active anymore.");
    }
    const [cert] = await db.select({ id: certificates.id }).from(certificates).where(eq(certificates.trainingId, trainingId)).limit(1);
    if (cert) {
      throw new ApiError(400, "This training has learner progress or certificates and can't be deleted. Unassign it instead if it shouldn't be active anymore.");
    }
  }
  // force=true (super_admin only, set at the route) skips the guard above — the training,
  // everyone's progress on it, and any certificates earned from it are all cascade-deleted.

  const assessmentRows = await db.select({ id: assessments.id }).from(assessments).where(eq(assessments.trainingId, trainingId));
  const deleted = await db.delete(trainings).where(eq(trainings.id, trainingId)).returning();
  if (!deleted.length) throw new ApiError(404, "Training not found");

  deleteEmbedding("training", trainingId).catch((err) => console.error("Failed to delete training embedding:", err));
  for (const a of assessmentRows) {
    deleteEmbedding("assessment", a.id).catch((err) => console.error("Failed to delete assessment embedding:", err));
  }
}

export async function listTrainings(kind?: "course" | "assessment") {
  if (!kind) return db.select().from(trainings).orderBy(asc(trainings.createdAt));
  return db
    .select()
    .from(trainings)
    .where(eq(trainings.isStandaloneAssessment, kind === "assessment"))
    .orderBy(asc(trainings.createdAt));
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
  if (input.title !== undefined || input.description !== undefined) embedTraining(training);
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
  const itemCount = await db.select({ id: trainingItems.id }).from(trainingItems).where(eq(trainingItems.trainingId, trainingId));
  if (itemCount.length === 0) {
    throw new ApiError(400, "Add at least one item before publishing — a training with no content would leave assigned learners with nothing to complete.");
  }

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
  assignedBy: string,
  input: {
    assigneeType: "user" | "role" | "franchise";
    userId?: string;
    role?: UserRole;
    franchiseId?: string;
    dueAt?: string;
    isMandatory?: boolean;
  },
) {
  const [assignment] = await db
    .insert(trainingAssignments)
    .values({
      trainingId,
      assigneeType: input.assigneeType,
      userId: input.userId ?? null,
      role: input.role ?? null,
      franchiseId: input.franchiseId ?? null,
      dueAt: input.dueAt ? new Date(input.dueAt) : null,
      isMandatory: input.isMandatory ?? true,
      assignedBy,
    })
    .returning();

  const [training] = await db.select().from(trainings).where(eq(trainings.id, trainingId)).limit(1);
  const [assigner] = await db.select({ name: users.name }).from(users).where(eq(users.id, assignedBy)).limit(1);
  const kind = training?.isStandaloneAssessment ? "assessment" : "training";
  const title = training?.isStandaloneAssessment ? "New Assessment Assigned" : "New Training Assigned";
  const who = assigner?.name ? ` by ${assigner.name}` : "";
  const message = input.dueAt
    ? `"${training?.title ?? "A " + kind}" has been assigned to you${who} — complete by ${new Date(input.dueAt).toLocaleString("en-IN")}.`
    : `"${training?.title ?? "A " + kind}" has been assigned to you${who}.`;
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

/**
 * Overdue = a specific person (assigneeType "user") was assigned a mandatory training with a
 * due date that has passed and hasn't completed it yet.
 * ponytail: role/franchise-wide assignments aren't tracked per-person here (a deadline against a
 * whole role is a fuzzier commitment); add if a report is requested for those too.
 */
export async function getOverdueAssignments(requester: { id: string; role: UserRole }) {
  const rows = await db
    .select({
      assignment: trainingAssignments,
      training: trainings,
      assigneeName: users.name,
      progress: trainingProgress,
    })
    .from(trainingAssignments)
    .innerJoin(trainings, eq(trainingAssignments.trainingId, trainings.id))
    .innerJoin(users, eq(trainingAssignments.userId, users.id))
    .leftJoin(
      trainingProgress,
      and(eq(trainingProgress.userId, trainingAssignments.userId), eq(trainingProgress.trainingId, trainingAssignments.trainingId)),
    )
    .where(
      and(
        eq(trainingAssignments.assigneeType, "user"),
        eq(trainingAssignments.isMandatory, true),
        isNotNull(trainingAssignments.dueAt),
        lt(trainingAssignments.dueAt, new Date()),
        requester.role === "trainer" ? eq(trainings.trainerId, requester.id) : undefined,
      ),
    );

  return rows
    .filter((r) => !r.progress?.completed)
    .map((r) => ({
      userId: r.assignment.userId as string,
      userName: r.assigneeName,
      trainingId: r.training.id,
      trainingTitle: r.training.title,
      dueAt: r.assignment.dueAt,
    }));
}

export async function removeAssignment(trainingId: string, assignmentId: string) {
  await db
    .delete(trainingAssignments)
    .where(and(eq(trainingAssignments.id, assignmentId), eq(trainingAssignments.trainingId, trainingId)));
}

export async function listAssignedTrainings(user: { id: string; role: UserRole; franchiseId: string | null }) {
  const cols = {
    trainingId: trainingAssignments.trainingId,
    isMandatory: trainingAssignments.isMandatory,
    dueAt: trainingAssignments.dueAt,
    assignedBy: trainingAssignments.assignedBy,
  };
  const assignmentRows = await db
    .select(cols)
    .from(trainingAssignments)
    .where(
      and(
        eq(trainingAssignments.assigneeType, "user"),
        eq(trainingAssignments.userId, user.id),
      ),
    );

  const roleRows = await db
    .select(cols)
    .from(trainingAssignments)
    .where(and(eq(trainingAssignments.assigneeType, "role"), eq(trainingAssignments.role, user.role)));

  const franchiseRows = user.franchiseId
    ? await db
        .select(cols)
        .from(trainingAssignments)
        .where(
          and(eq(trainingAssignments.assigneeType, "franchise"), eq(trainingAssignments.franchiseId, user.franchiseId)),
        )
    : [];

  const allAssignments = [...assignmentRows, ...roleRows, ...franchiseRows];
  const trainingIds = [...new Set(allAssignments.map((r) => r.trainingId))];
  if (trainingIds.length === 0) return [];

  // A training can match more than one assignment (e.g. assigned to the user's role AND directly);
  // the effective mandatory flag is "mandatory if any matching assignment says so", the effective
  // due date is the earliest one set (the binding deadline), and "assigned by" rides along with
  // whichever assignment currently sets the due date, falling back to the first assigner seen.
  const effectiveByTraining = new Map<string, { isMandatory: boolean; dueAt: Date | null; assignedBy: string | null }>();
  for (const a of allAssignments) {
    const existing = effectiveByTraining.get(a.trainingId);
    const isMandatory = existing ? existing.isMandatory || a.isMandatory : a.isMandatory;
    const dueAtWins = existing?.dueAt && a.dueAt ? existing.dueAt < a.dueAt : !existing?.dueAt && !!a.dueAt;
    const dueAt = existing?.dueAt && a.dueAt ? (dueAtWins ? existing.dueAt : a.dueAt) : (existing?.dueAt ?? a.dueAt ?? null);
    const assignedBy = existing ? (dueAtWins ? existing.assignedBy : a.assignedBy ?? existing.assignedBy) : a.assignedBy;
    effectiveByTraining.set(a.trainingId, { isMandatory, dueAt, assignedBy });
  }

  const rows = await db
    .select()
    .from(trainings)
    .where(and(inArray(trainings.id, trainingIds), eq(trainings.status, "published")));

  const progressRows = await db
    .select()
    .from(trainingProgress)
    .where(and(inArray(trainingProgress.trainingId, trainingIds), eq(trainingProgress.userId, user.id)));

  const assignerIds = [...new Set([...effectiveByTraining.values()].map((e) => e.assignedBy).filter((id): id is string => !!id))];
  const assigners = assignerIds.length
    ? await db.select({ id: users.id, name: users.name }).from(users).where(inArray(users.id, assignerIds))
    : [];

  return rows.map((training) => {
    const effective = effectiveByTraining.get(training.id)!;
    return {
      training,
      progress: progressRows.find((p) => p.trainingId === training.id) ?? null,
      isMandatory: effective.isMandatory,
      dueAt: effective.dueAt,
      assignedByName: assigners.find((a) => a.id === effective.assignedBy)?.name ?? null,
    };
  });
}

export async function getTrainingForUser(userId: string, trainingId: string) {
  const { training, items } = await getTrainingDetail(trainingId);

  // A trainer's "major update" (bumpVersion) marks trainingProgress.requiresRecompletion but
  // never touches the per-item contentProgress/assessmentResults rows — those are what the
  // unlock cascade below actually reads. Left as-is, every item still shows completed from the
  // old version, so the whole training reads as unlocked/finished and a learner can jump straight
  // to the last item without redoing anything, defeating the point of forcing recompletion.
  // Treating every item as not-yet-done while recompletion is pending re-locks the sequence from
  // item 1, same as a first-time run — advanceTrainingProgress already clears the flag correctly
  // once the last item is genuinely completed again.
  const [progressRow] = await db
    .select({ requiresRecompletion: trainingProgress.requiresRecompletion })
    .from(trainingProgress)
    .where(and(eq(trainingProgress.userId, userId), eq(trainingProgress.trainingId, trainingId)))
    .limit(1);
  const needsRecompletion = progressRow?.requiresRecompletion ?? false;

  const contentIds = items.map((i) => i.item.contentId).filter((id): id is string => !!id);
  const contentProgressRows =
    contentIds.length && !needsRecompletion
      ? await db
          .select()
          .from(contentProgress)
          .where(and(eq(contentProgress.userId, userId), inArray(contentProgress.contentId, contentIds)))
      : [];

  const assessmentIds = items.map((i) => i.item.assessmentId).filter((id): id is string => !!id);
  const assessmentResultRows =
    assessmentIds.length && !needsRecompletion
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

  return { training, items: itemsWithState, requiresRecompletion: needsRecompletion };
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
