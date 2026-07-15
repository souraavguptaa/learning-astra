import { eq, inArray, sql } from "drizzle-orm";
import { db } from "../../db/client.js";
import { aiSearchQueries, assessmentResults, npsResponses, supportTickets, users } from "../../db/schema/index.js";

// Expands training_assignments (which target a user, a whole role, or a whole franchise) into
// concrete (training_id, user_id) pairs — the actual set of people a published training is
// mandatory/assigned for, whether or not they've ever opened it. Counting completion against
// training_progress rows alone (which only exist once someone starts) silently drops everyone
// who was assigned something and never touched it, making the rate look better than it is.
const ASSIGNED_PAIRS_CTE = sql`
  assigned_pairs AS (
    SELECT ta.training_id, ta.user_id AS user_id
    FROM training_assignments ta
    WHERE ta.assignee_type = 'user' AND ta.user_id IS NOT NULL
    UNION
    SELECT ta.training_id, u.id AS user_id
    FROM training_assignments ta
    JOIN users u ON u.role = ta.role
    WHERE ta.assignee_type = 'role'
    UNION
    SELECT ta.training_id, u.id AS user_id
    FROM training_assignments ta
    JOIN users u ON u.franchise_id = ta.franchise_id
    WHERE ta.assignee_type = 'franchise' AND ta.franchise_id IS NOT NULL
  )
`;

export async function getOverview() {
  const [{ totalUsers }] = await db.select({ totalUsers: sql<number>`count(*)::int` }).from(users);
  const [{ activeUsers }] = await db
    .select({ activeUsers: sql<number>`count(*)::int` })
    .from(users)
    .where(eq(users.isActive, true));

  const completionResult = await db.execute(sql`
    WITH ${ASSIGNED_PAIRS_CTE}
    SELECT
      count(*)::int AS total,
      count(*) FILTER (WHERE tp.completed)::int AS completed
    FROM assigned_pairs ap
    JOIN trainings t ON t.id = ap.training_id AND t.status = 'published'
    LEFT JOIN training_progress tp ON tp.training_id = ap.training_id AND tp.user_id = ap.user_id
  `);
  const { total: totalProgress, completed: completedProgress } = completionResult.rows[0] as { total: number; completed: number };

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

  const [{ aiSupportQueries, unansweredQueries }] = await db
    .select({
      aiSupportQueries: sql<number>`count(*)::int`,
      unansweredQueries: sql<number>`count(*) filter (where not ${aiSearchQueries.hadConfidentMatch})::int`,
    })
    .from(aiSearchQueries);

  return {
    totalUsers,
    activeUsers,
    trainingCompletionRate: totalProgress > 0 ? Math.round((completedProgress / totalProgress) * 100) : null,
    assessmentPassRate: totalAttempts > 0 ? Math.round((passedAttempts / totalAttempts) * 100) : null,
    averageNps: avgNps !== null ? Math.round(Number(avgNps) * 10) / 10 : null,
    aiSupportQueries,
    unansweredQueries,
    openTickets,
  };
}

// Includes people who were assigned a training but never started it (left-joined progress, so
// `completed` is false and `completedAt`/`createdAt` are null) — previously this report only ever
// showed rows that already had a training_progress record, so a fully-unstarted mandatory
// assignment was invisible here even though it's exactly what a compliance report needs to surface.
export async function getTrainingCompletionReport(filter: { franchiseId?: string; from?: string; to?: string }) {
  const conditions = [sql`t.status = 'published'`];
  if (filter.from) conditions.push(sql`(tp.created_at IS NULL OR tp.created_at >= ${new Date(filter.from)})`);
  if (filter.to) conditions.push(sql`(tp.created_at IS NULL OR tp.created_at <= ${new Date(filter.to)})`);
  if (filter.franchiseId) conditions.push(sql`u.franchise_id = ${filter.franchiseId}`);

  const result = await db.execute(sql`
    WITH ${ASSIGNED_PAIRS_CTE}
    SELECT
      t.title AS "trainingTitle",
      u.name AS "userName",
      u.email AS "userEmail",
      u.role AS "role",
      f.name AS "franchiseName",
      COALESCE(tp.completed, false) AS "completed",
      tp.completed_at AS "completedAt",
      tp.created_at AS "createdAt"
    FROM assigned_pairs ap
    JOIN trainings t ON t.id = ap.training_id
    JOIN users u ON u.id = ap.user_id
    LEFT JOIN franchises f ON f.id = u.franchise_id
    LEFT JOIN training_progress tp ON tp.training_id = ap.training_id AND tp.user_id = ap.user_id
    WHERE ${sql.join(conditions, sql` AND `)}
    ORDER BY t.title, u.name
  `);

  return result.rows as {
    trainingTitle: string;
    userName: string;
    userEmail: string;
    role: string;
    franchiseName: string | null;
    completed: boolean;
    completedAt: string | null;
    createdAt: string | null;
  }[];
}
