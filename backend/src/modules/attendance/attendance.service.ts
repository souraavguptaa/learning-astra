import { and, desc, eq, gte, isNull, lte } from "drizzle-orm";
import { db } from "../../db/client.js";
import { users, workBreaks, workSessions } from "../../db/schema/index.js";
import { ApiError } from "../../middleware/errorHandler.js";
import type { UserRole } from "../../utils/jwt.js";

// Franchise owners/operators run their own store, not SastaSundar staff on the clock — attendance
// tracking only applies to the roles that are actually employees.
export const ATTENDANCE_TRACKED_ROLES: UserRole[] = ["trainer", "admin", "employee"];

export function isAttendanceTracked(role: UserRole): boolean {
  return ATTENDANCE_TRACKED_ROLES.includes(role);
}

/** Called on login. Auto-closes any session left open from a browser that never logged out. */
export async function clockIn(userId: string) {
  const [stale] = await db
    .select({ id: workSessions.id })
    .from(workSessions)
    .where(and(eq(workSessions.userId, userId), isNull(workSessions.clockOutAt)))
    .limit(1);
  if (stale) {
    await closeSession(stale.id);
  }
  await db.insert(workSessions).values({ userId });
}

async function closeSession(sessionId: string) {
  const now = new Date();
  await db
    .update(workBreaks)
    .set({ breakEndAt: now })
    .where(and(eq(workBreaks.workSessionId, sessionId), isNull(workBreaks.breakEndAt)));
  await db.update(workSessions).set({ clockOutAt: now }).where(eq(workSessions.id, sessionId));
}

/** Called on logout. No-op if there's no open session (e.g. role isn't tracked). */
export async function clockOut(userId: string) {
  const [open] = await db
    .select({ id: workSessions.id })
    .from(workSessions)
    .where(and(eq(workSessions.userId, userId), isNull(workSessions.clockOutAt)))
    .limit(1);
  if (open) await closeSession(open.id);
}

async function getOpenSession(userId: string) {
  const [session] = await db
    .select()
    .from(workSessions)
    .where(and(eq(workSessions.userId, userId), isNull(workSessions.clockOutAt)))
    .limit(1);
  return session ?? null;
}

export async function startBreak(userId: string) {
  const session = await getOpenSession(userId);
  if (!session) throw new ApiError(400, "You're not clocked in right now.");
  const [openBreak] = await db
    .select({ id: workBreaks.id })
    .from(workBreaks)
    .where(and(eq(workBreaks.workSessionId, session.id), isNull(workBreaks.breakEndAt)))
    .limit(1);
  if (openBreak) throw new ApiError(400, "You're already on a break.");
  await db.insert(workBreaks).values({ workSessionId: session.id });
}

export async function endBreak(userId: string) {
  const session = await getOpenSession(userId);
  if (!session) throw new ApiError(400, "You're not clocked in right now.");
  const [openBreak] = await db
    .select({ id: workBreaks.id })
    .from(workBreaks)
    .where(and(eq(workBreaks.workSessionId, session.id), isNull(workBreaks.breakEndAt)))
    .limit(1);
  if (!openBreak) throw new ApiError(400, "You're not on a break.");
  await db.update(workBreaks).set({ breakEndAt: new Date() }).where(eq(workBreaks.id, openBreak.id));
}

export async function getStatus(userId: string) {
  const session = await getOpenSession(userId);
  if (!session) return { clockedIn: false as const };
  const [openBreak] = await db
    .select()
    .from(workBreaks)
    .where(and(eq(workBreaks.workSessionId, session.id), isNull(workBreaks.breakEndAt)))
    .limit(1);
  return {
    clockedIn: true as const,
    clockInAt: session.clockInAt,
    onBreak: !!openBreak,
    breakStartAt: openBreak?.breakStartAt ?? null,
  };
}

export interface AttendanceReportRow {
  sessionId: string;
  userId: string;
  userName: string;
  userRole: UserRole;
  clockInAt: Date;
  clockOutAt: Date | null;
  breakSeconds: number;
  workedSeconds: number | null;
}

/** Sessions in range, with per-session break time totaled and worked time computed. Still-open
 * sessions/breaks compute against "now" so an admin can see today's in-progress hours. */
export async function getReport(params: { from?: Date; to?: Date; userId?: string }): Promise<AttendanceReportRow[]> {
  const conditions = [];
  if (params.from) conditions.push(gte(workSessions.clockInAt, params.from));
  if (params.to) conditions.push(lte(workSessions.clockInAt, params.to));
  if (params.userId) conditions.push(eq(workSessions.userId, params.userId));

  const sessions = await db
    .select({
      sessionId: workSessions.id,
      userId: workSessions.userId,
      userName: users.name,
      userRole: users.role,
      clockInAt: workSessions.clockInAt,
      clockOutAt: workSessions.clockOutAt,
    })
    .from(workSessions)
    .innerJoin(users, eq(users.id, workSessions.userId))
    .where(conditions.length ? and(...conditions) : undefined)
    .orderBy(desc(workSessions.clockInAt));

  const now = new Date();
  const rows: AttendanceReportRow[] = [];
  for (const session of sessions) {
    const breaks = await db
      .select({ breakStartAt: workBreaks.breakStartAt, breakEndAt: workBreaks.breakEndAt })
      .from(workBreaks)
      .where(eq(workBreaks.workSessionId, session.sessionId));
    const breakSeconds = breaks.reduce((sum, b) => {
      const end = b.breakEndAt ?? now;
      return sum + Math.max(0, (end.getTime() - b.breakStartAt.getTime()) / 1000);
    }, 0);
    const sessionEnd = session.clockOutAt ?? now;
    const totalSeconds = Math.max(0, (sessionEnd.getTime() - session.clockInAt.getTime()) / 1000);
    rows.push({
      ...session,
      breakSeconds,
      workedSeconds: Math.max(0, totalSeconds - breakSeconds),
    });
  }
  return rows;
}
