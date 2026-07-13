import { and, desc, eq, inArray, sql } from "drizzle-orm";
import { db } from "../../db/client.js";
import {
  assessmentResults,
  badges,
  certificates,
  pointsLedger,
  trainingProgress,
  userBadges,
  users,
} from "../../db/schema/index.js";
import { notify } from "../notification/notification.service.js";
import type { UserRole } from "../../utils/jwt.js";

const EMPLOYEE_ROLES: UserRole[] = ["employee"];
const FRANCHISE_ROLES: UserRole[] = ["franchise_owner", "operator"];

export async function awardPoints(
  userId: string,
  points: number,
  reason: string,
  refType?: string,
  refId?: string,
) {
  await db.insert(pointsLedger).values({ userId, points, reason, refType, refId });
}

export async function checkAndAwardBadges(userId: string) {
  const allBadges = await db.select().from(badges);
  if (allBadges.length === 0) return;

  const alreadyEarned = new Set(
    (await db.select({ badgeId: userBadges.badgeId }).from(userBadges).where(eq(userBadges.userId, userId))).map(
      (r) => r.badgeId,
    ),
  );

  const [{ completedCount }] = await db
    .select({ completedCount: sql<number>`count(*)::int` })
    .from(trainingProgress)
    .where(and(eq(trainingProgress.userId, userId), eq(trainingProgress.completed, true)));

  const [{ perfectCount }] = await db
    .select({ perfectCount: sql<number>`count(*)::int` })
    .from(assessmentResults)
    .where(and(eq(assessmentResults.userId, userId), eq(assessmentResults.passed, true), sql`${assessmentResults.bestScorePercentage}::int = 100`));

  const [{ certCount }] = await db
    .select({ certCount: sql<number>`count(*)::int` })
    .from(certificates)
    .where(eq(certificates.userId, userId));

  const newlyEarned: string[] = [];
  for (const badge of allBadges) {
    if (alreadyEarned.has(badge.id)) continue;
    let earned = false;
    if (badge.criteriaType === "trainings_completed" && completedCount >= badge.criteriaValue) earned = true;
    if (badge.criteriaType === "perfect_score" && perfectCount >= 1) earned = true;
    if (badge.criteriaType === "first_certificate" && certCount >= 1) earned = true;
    if (earned) newlyEarned.push(badge.id);
  }

  for (const badgeId of newlyEarned) {
    await db.insert(userBadges).values({ userId, badgeId }).onConflictDoNothing();
    const badge = allBadges.find((b) => b.id === badgeId);
    if (badge) {
      await notify(userId, "badge_earned", "New Badge Earned", `${badge.icon} You earned the "${badge.name}" badge!`, "/");
    }
  }
}

export async function getMyGamificationSummary(userId: string) {
  const [{ totalPoints }] = await db
    .select({ totalPoints: sql<number>`coalesce(sum(${pointsLedger.points}), 0)::int` })
    .from(pointsLedger)
    .where(eq(pointsLedger.userId, userId));

  const earnedBadges = await db
    .select({ badge: badges, earnedAt: userBadges.earnedAt })
    .from(userBadges)
    .innerJoin(badges, eq(userBadges.badgeId, badges.id))
    .where(eq(userBadges.userId, userId))
    .orderBy(desc(userBadges.earnedAt));

  return { totalPoints, badges: earnedBadges.map(({ badge, earnedAt }) => ({ ...badge, earnedAt })) };
}

async function getLeaderboardForRoles(roles: UserRole[]) {
  const rows = await db
    .select({
      userId: users.id,
      name: users.name,
      totalPoints: sql<number>`coalesce(sum(${pointsLedger.points}), 0)::int`,
    })
    .from(users)
    .leftJoin(pointsLedger, eq(pointsLedger.userId, users.id))
    .where(inArray(users.role, roles))
    .groupBy(users.id, users.name)
    .orderBy(desc(sql`coalesce(sum(${pointsLedger.points}), 0)`))
    .limit(20);

  return rows;
}

export function getEmployeeLeaderboard() {
  return getLeaderboardForRoles(EMPLOYEE_ROLES);
}

export function getFranchiseLeaderboard() {
  return getLeaderboardForRoles(FRANCHISE_ROLES);
}
