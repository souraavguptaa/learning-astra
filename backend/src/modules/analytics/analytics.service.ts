import { and, eq, gte, inArray, lte, sql } from "drizzle-orm";
import { db } from "../../db/client.js";
import {
  assessmentResults,
  franchises,
  npsResponses,
  supportTickets,
  trainingProgress,
  trainings,
  users,
} from "../../db/schema/index.js";

export async function getOverview() {
  const [{ totalUsers }] = await db.select({ totalUsers: sql<number>`count(*)::int` }).from(users);
  const [{ activeUsers }] = await db
    .select({ activeUsers: sql<number>`count(*)::int` })
    .from(users)
    .where(eq(users.isActive, true));

  const [{ totalProgress, completedProgress }] = await db
    .select({
      totalProgress: sql<number>`count(*)::int`,
      completedProgress: sql<number>`count(*) filter (where ${trainingProgress.completed})::int`,
    })
    .from(trainingProgress);

  const [{ totalAttempts, passedAttempts }] = await db
    .select({
      totalAttempts: sql<number>`count(*)::int`,
      passedAttempts: sql<number>`count(*) filter (where ${assessmentResults.passed})::int`,
    })
    .from(assessmentResults);

  const [{ avgNps }] = await db
    .select({ avgNps: sql<number | null>`avg(${npsResponses.rating})` })
    .from(npsResponses);

  const [{ openTickets }] = await db
    .select({ openTickets: sql<number>`count(*)::int` })
    .from(supportTickets)
    .where(inArray(supportTickets.status, ["open", "in_progress"]));

  return {
    totalUsers,
    activeUsers,
    trainingCompletionRate: totalProgress > 0 ? Math.round((completedProgress / totalProgress) * 100) : null,
    assessmentPassRate: totalAttempts > 0 ? Math.round((passedAttempts / totalAttempts) * 100) : null,
    averageNps: avgNps !== null ? Math.round(Number(avgNps) * 10) / 10 : null,
    aiSupportQueries: 0,
    unansweredQueries: 0,
    openTickets,
  };
}

export async function getTrainingCompletionReport(filter: { franchiseId?: string; from?: string; to?: string }) {
  const conditions = [];
  if (filter.from) conditions.push(gte(trainingProgress.createdAt, new Date(filter.from)));
  if (filter.to) conditions.push(lte(trainingProgress.createdAt, new Date(filter.to)));
  if (filter.franchiseId) conditions.push(eq(users.franchiseId, filter.franchiseId));

  const rows = await db
    .select({
      trainingTitle: trainings.title,
      userName: users.name,
      userEmail: users.email,
      role: users.role,
      franchiseName: franchises.name,
      completed: trainingProgress.completed,
      completedAt: trainingProgress.completedAt,
      createdAt: trainingProgress.createdAt,
    })
    .from(trainingProgress)
    .innerJoin(trainings, eq(trainingProgress.trainingId, trainings.id))
    .innerJoin(users, eq(trainingProgress.userId, users.id))
    .leftJoin(franchises, eq(users.franchiseId, franchises.id))
    .where(conditions.length ? and(...conditions) : undefined)
    .orderBy(trainingProgress.createdAt);

  return rows;
}
