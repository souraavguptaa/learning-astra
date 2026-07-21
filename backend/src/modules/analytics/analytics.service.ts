import { desc, eq, inArray, sql } from "drizzle-orm";
import { db } from "../../db/client.js";
import { aiSearchQueries, assessmentResults, assessments, certificates, npsResponses, supportTickets, users } from "../../db/schema/index.js";
import { ApiError } from "../../middleware/errorHandler.js";

// Franchise owners/operators run their own store ("franchise partners"); employees are
// SastaSundar's own staff. Everything segment/trainer/training-wise below only counts these
// three — super_admin/admin/trainer accounts aren't learners.
const LEARNER_ROLES = sql`('franchise_owner', 'operator', 'employee')`;

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

// The "what has this learner actually done" view — pulled up from a support ticket so a trainer
// can check someone's real progress instead of just taking their word for it.
export async function getUserLearningProgress(userId: string) {
  const [user] = await db
    .select({ id: users.id, name: users.name, email: users.email, role: users.role, franchiseId: users.franchiseId })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);
  if (!user) throw new ApiError(404, "User not found");

  const trainingsResult = await db.execute(sql`
    WITH ${ASSIGNED_PAIRS_CTE}
    SELECT
      t.title AS "trainingTitle",
      t.is_standalone_assessment AS "isStandaloneAssessment",
      COALESCE(tp.completed, false) AS "completed",
      tp.completed_at AS "completedAt",
      tp.created_at AS "startedAt"
    FROM assigned_pairs ap
    JOIN trainings t ON t.id = ap.training_id AND t.status = 'published'
    LEFT JOIN training_progress tp ON tp.training_id = ap.training_id AND tp.user_id = ap.user_id
    WHERE ap.user_id = ${userId}
    ORDER BY t.title
  `);

  const assessmentRows = await db
    .select({
      title: assessments.title,
      bestScore: assessmentResults.bestScorePercentage,
      passed: assessmentResults.passed,
      attemptsUsed: assessmentResults.attemptsUsed,
      lastAttemptedAt: assessmentResults.lastAttemptedAt,
    })
    .from(assessmentResults)
    .innerJoin(assessments, eq(assessmentResults.assessmentId, assessments.id))
    .where(eq(assessmentResults.userId, userId))
    .orderBy(desc(assessmentResults.lastAttemptedAt));

  const certRows = await db
    .select({ certificateNumber: certificates.certificateNumber, scorePercentage: certificates.scorePercentage, issuedAt: certificates.issuedAt })
    .from(certificates)
    .where(eq(certificates.userId, userId))
    .orderBy(desc(certificates.issuedAt));

  return {
    user,
    trainings: trainingsResult.rows as {
      trainingTitle: string;
      isStandaloneAssessment: boolean;
      completed: boolean;
      completedAt: string | null;
      startedAt: string | null;
    }[],
    assessments: assessmentRows,
    certificates: certRows,
  };
}

export interface TrendPoint {
  period: string;
  completions: number;
  quizPasses: number;
  activeLearners: number;
}

/** Date/month-wise trend for the dashboard chart. Three independent grouped queries merged by
 * period rather than one join — content_progress, training_progress, and assessment_results are
 * all one-to-many off a user, so joining them together in a single query would fan out and
 * over-count instead of giving three clean per-period counts. */
export async function getTrends(params: { from?: Date; to?: Date; granularity?: "day" | "month" }): Promise<TrendPoint[]> {
  // Plain string, not sql`` — date_trunc's first argument is a text literal, not a column
  // identifier, so it needs to be bound as a parameter rather than interpolated as raw SQL.
  const granularity = params.granularity === "month" ? "month" : "day";
  const range = (column: ReturnType<typeof sql>) => {
    const conditions = [sql`${column} IS NOT NULL`];
    if (params.from) conditions.push(sql`${column} >= ${params.from}`);
    if (params.to) conditions.push(sql`${column} <= ${params.to}`);
    return sql.join(conditions, sql` AND `);
  };

  const completionsResult = await db.execute(sql`
    SELECT date_trunc(${granularity}, tp.completed_at) AS period, count(*)::int AS count
    FROM training_progress tp
    WHERE ${range(sql`tp.completed_at`)}
    GROUP BY period
  `);
  const quizPassesResult = await db.execute(sql`
    SELECT date_trunc(${granularity}, ar.passed_at) AS period, count(*)::int AS count
    FROM assessment_results ar
    WHERE ${range(sql`ar.passed_at`)}
    GROUP BY period
  `);
  const activeLearnersResult = await db.execute(sql`
    SELECT date_trunc(${granularity}, cp.last_ping_server_at) AS period, count(DISTINCT cp.user_id)::int AS count
    FROM content_progress cp
    WHERE ${range(sql`cp.last_ping_server_at`)}
    GROUP BY period
  `);

  const byPeriod = new Map<string, TrendPoint>();
  function key(period: unknown): string {
    return new Date(period as string).toISOString();
  }
  function get(period: unknown): TrendPoint {
    const k = key(period);
    let point = byPeriod.get(k);
    if (!point) {
      point = { period: k, completions: 0, quizPasses: 0, activeLearners: 0 };
      byPeriod.set(k, point);
    }
    return point;
  }
  for (const row of completionsResult.rows as { period: unknown; count: number }[]) get(row.period).completions = row.count;
  for (const row of quizPassesResult.rows as { period: unknown; count: number }[]) get(row.period).quizPasses = row.count;
  for (const row of activeLearnersResult.rows as { period: unknown; count: number }[]) get(row.period).activeLearners = row.count;

  return [...byPeriod.values()].sort((a, b) => a.period.localeCompare(b.period));
}

export interface SegmentRow {
  role: "franchise_owner" | "operator" | "employee";
  learnerCount: number;
  totalWatchHours: number;
  completionRate: number | null;
  quizPassRate: number | null;
}

/** Time spent, completion rate, and quiz pass rate broken down by "franchise partner"
 * (franchise_owner/operator) vs "employee" — three independent grouped queries merged by role,
 * same fan-out reasoning as getTrends. */
export async function getSegments(): Promise<SegmentRow[]> {
  const roles = ["franchise_owner", "operator", "employee"] as const;
  const byRole = new Map<string, SegmentRow>(
    roles.map((role) => [role, { role, learnerCount: 0, totalWatchHours: 0, completionRate: null, quizPassRate: null }]),
  );

  const learnerCounts = await db.execute(sql`
    SELECT role, count(*)::int AS count FROM users WHERE role IN ${LEARNER_ROLES} GROUP BY role
  `);
  for (const row of learnerCounts.rows as { role: string; count: number }[]) {
    const seg = byRole.get(row.role);
    if (seg) seg.learnerCount = row.count;
  }

  const watchTime = await db.execute(sql`
    SELECT u.role, coalesce(sum(cp.valid_watched_seconds), 0)::float AS seconds
    FROM users u
    LEFT JOIN content_progress cp ON cp.user_id = u.id
    WHERE u.role IN ${LEARNER_ROLES}
    GROUP BY u.role
  `);
  for (const row of watchTime.rows as { role: string; seconds: number }[]) {
    const seg = byRole.get(row.role);
    if (seg) seg.totalWatchHours = Math.round((row.seconds / 3600) * 10) / 10;
  }

  const completion = await db.execute(sql`
    WITH ${ASSIGNED_PAIRS_CTE}
    SELECT u.role, count(*)::int AS total, count(*) FILTER (WHERE tp.completed)::int AS completed
    FROM assigned_pairs ap
    JOIN trainings t ON t.id = ap.training_id AND t.status = 'published'
    JOIN users u ON u.id = ap.user_id AND u.role IN ${LEARNER_ROLES}
    LEFT JOIN training_progress tp ON tp.training_id = ap.training_id AND tp.user_id = ap.user_id
    GROUP BY u.role
  `);
  for (const row of completion.rows as { role: string; total: number; completed: number }[]) {
    const seg = byRole.get(row.role);
    if (seg) seg.completionRate = row.total > 0 ? Math.round((row.completed / row.total) * 100) : null;
  }

  const passRate = await db.execute(sql`
    SELECT u.role, count(*)::int AS attempts, count(*) FILTER (WHERE ar.passed)::int AS passed
    FROM assessment_results ar
    JOIN users u ON u.id = ar.user_id AND u.role IN ${LEARNER_ROLES}
    GROUP BY u.role
  `);
  for (const row of passRate.rows as { role: string; attempts: number; passed: number }[]) {
    const seg = byRole.get(row.role);
    if (seg) seg.quizPassRate = row.attempts > 0 ? Math.round((row.passed / row.attempts) * 100) : null;
  }

  return roles.map((r) => byRole.get(r)!);
}

export interface TrainerPerformanceRow {
  trainerId: string;
  trainerName: string;
  trainingsCreated: number;
  totalAssigned: number;
  totalCompleted: number;
  completionRate: number | null;
  quizPassRate: number | null;
}

export async function getTrainerPerformance(): Promise<TrainerPerformanceRow[]> {
  const result = await db.execute(sql`
    WITH ${ASSIGNED_PAIRS_CTE}
    SELECT
      trn.id AS "trainerId",
      trn.name AS "trainerName",
      count(DISTINCT t.id)::int AS "trainingsCreated",
      count(ap.user_id)::int AS "totalAssigned",
      count(*) FILTER (WHERE tp.completed)::int AS "totalCompleted"
    FROM users trn
    JOIN trainings t ON t.trainer_id = trn.id AND t.status = 'published'
    LEFT JOIN assigned_pairs ap ON ap.training_id = t.id
    LEFT JOIN training_progress tp ON tp.training_id = ap.training_id AND tp.user_id = ap.user_id
    GROUP BY trn.id, trn.name
    ORDER BY trn.name
  `);

  const passRates = await db.execute(sql`
    SELECT t.trainer_id AS "trainerId", count(*)::int AS attempts, count(*) FILTER (WHERE ar.passed)::int AS passed
    FROM assessment_results ar
    JOIN assessments a ON a.id = ar.assessment_id
    JOIN trainings t ON t.id = a.training_id
    GROUP BY t.trainer_id
  `);
  const passByTrainer = new Map(
    (passRates.rows as { trainerId: string; attempts: number; passed: number }[]).map((r) => [r.trainerId, r]),
  );

  return (
    result.rows as { trainerId: string; trainerName: string; trainingsCreated: number; totalAssigned: number; totalCompleted: number }[]
  ).map((row) => {
    const pr = passByTrainer.get(row.trainerId);
    return {
      ...row,
      completionRate: row.totalAssigned > 0 ? Math.round((row.totalCompleted / row.totalAssigned) * 100) : null,
      quizPassRate: pr && pr.attempts > 0 ? Math.round((pr.passed / pr.attempts) * 100) : null,
    };
  });
}

export interface TrainingPerformanceRow {
  trainingId: string;
  title: string;
  trainerName: string;
  assignedCount: number;
  startedCount: number;
  completedCount: number;
  completionRate: number | null;
  quizAttemptedCount: number;
  quizAttemptRate: number | null;
  quizPassedCount: number;
  quizPassRate: number | null;
}

/** The "trainer made an onboarding training — how many took it, quiz completion rate, pass rate"
 * view. Funnel: assigned -> started -> quiz attempted -> quiz passed. */
export async function getTrainingPerformance(): Promise<TrainingPerformanceRow[]> {
  const result = await db.execute(sql`
    WITH ${ASSIGNED_PAIRS_CTE}
    SELECT
      t.id AS "trainingId",
      t.title AS "title",
      trn.name AS "trainerName",
      count(ap.user_id)::int AS "assignedCount",
      count(*) FILTER (WHERE tp.id IS NOT NULL)::int AS "startedCount",
      count(*) FILTER (WHERE tp.completed)::int AS "completedCount"
    FROM trainings t
    JOIN users trn ON trn.id = t.trainer_id
    LEFT JOIN assigned_pairs ap ON ap.training_id = t.id
    LEFT JOIN training_progress tp ON tp.training_id = ap.training_id AND tp.user_id = ap.user_id
    WHERE t.status = 'published'
    GROUP BY t.id, t.title, trn.name
    ORDER BY t.title
  `);

  const quizStats = await db.execute(sql`
    SELECT a.training_id AS "trainingId",
      count(DISTINCT ar.user_id)::int AS attempted,
      count(DISTINCT ar.user_id) FILTER (WHERE ar.passed)::int AS passed
    FROM assessment_results ar
    JOIN assessments a ON a.id = ar.assessment_id
    GROUP BY a.training_id
  `);
  const quizByTraining = new Map(
    (quizStats.rows as { trainingId: string; attempted: number; passed: number }[]).map((r) => [r.trainingId, r]),
  );

  return (
    result.rows as {
      trainingId: string;
      title: string;
      trainerName: string;
      assignedCount: number;
      startedCount: number;
      completedCount: number;
    }[]
  ).map((row) => {
    const q = quizByTraining.get(row.trainingId);
    const attempted = q?.attempted ?? 0;
    const passed = q?.passed ?? 0;
    return {
      ...row,
      completionRate: row.assignedCount > 0 ? Math.round((row.completedCount / row.assignedCount) * 100) : null,
      quizAttemptedCount: attempted,
      quizAttemptRate: row.startedCount > 0 ? Math.round((attempted / row.startedCount) * 100) : null,
      quizPassedCount: passed,
      quizPassRate: attempted > 0 ? Math.round((passed / attempted) * 100) : null,
    };
  });
}
