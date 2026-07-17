import { and, asc, eq } from "drizzle-orm";
import { db } from "../../db/client.js";
import { companies, franchises, users } from "../../db/schema/index.js";
import { ApiError } from "../../middleware/errorHandler.js";
import { generateTempPassword, hashPassword } from "../../utils/password.js";
import type { UserRole } from "../../utils/jwt.js";

const SUPER_ADMIN_CREATABLE: UserRole[] = ["trainer", "admin"];
const ADMIN_CREATABLE: UserRole[] = ["franchise_owner", "operator", "employee"];

function assertCanCreateRole(creatorRole: UserRole, targetRole: UserRole) {
  if (creatorRole === "super_admin" && SUPER_ADMIN_CREATABLE.includes(targetRole)) return;
  if (creatorRole === "admin" && ADMIN_CREATABLE.includes(targetRole)) return;
  throw new ApiError(403, `A ${creatorRole.replace("_", " ")} cannot create a ${targetRole.replace("_", " ")} account`);
}

export async function listFranchises() {
  return db.select().from(franchises);
}

export async function createFranchise(input: { name: string; code?: string; location?: string }) {
  const [company] = await db.select().from(companies).limit(1);
  if (!company) throw new ApiError(500, "No company record exists — run the seed script first");
  const [franchise] = await db
    .insert(franchises)
    .values({ companyId: company.id, name: input.name, code: input.code, location: input.location })
    .returning();
  return franchise;
}

export async function listUsers(filter: { role?: UserRole; franchiseId?: string }) {
  const conditions = [];
  if (filter.role) conditions.push(eq(users.role, filter.role));
  if (filter.franchiseId) conditions.push(eq(users.franchiseId, filter.franchiseId));

  const rows = await db
    .select()
    .from(users)
    .where(conditions.length ? and(...conditions) : undefined)
    .orderBy(asc(users.name)); // stable order — without this, the list can visibly reshuffle after
  // any update (e.g. Deactivate), which is a real risk of misclicking the wrong row next
  return rows.map(({ passwordHash: _passwordHash, ...rest }) => rest);
}

export async function createUser(
  creator: { id: string; role: UserRole },
  input: { name: string; email: string; role: UserRole; franchiseId?: string; location?: string },
) {
  assertCanCreateRole(creator.role, input.role);

  const [existing] = await db.select().from(users).where(eq(users.email, input.email)).limit(1);
  if (existing) throw new ApiError(409, "A user with this email already exists");

  const tempPassword = generateTempPassword();
  const [user] = await db
    .insert(users)
    .values({
      name: input.name,
      email: input.email,
      role: input.role,
      franchiseId: input.franchiseId ?? null,
      location: input.location,
      passwordHash: await hashPassword(tempPassword),
      mustChangePassword: true,
      createdBy: creator.id,
    })
    .returning();

  const { passwordHash: _passwordHash, ...safeUser } = user;
  return { user: safeUser, tempPassword };
}

export async function updateUserFranchise(userId: string, franchiseId: string | null) {
  const [user] = await db.update(users).set({ franchiseId }).where(eq(users.id, userId)).returning();
  if (!user) throw new ApiError(404, "User not found");
  const { passwordHash: _passwordHash, ...safeUser } = user;
  return safeUser;
}

export async function setUserActive(userId: string, isActive: boolean) {
  const [user] = await db.update(users).set({ isActive }).where(eq(users.id, userId)).returning();
  if (!user) throw new ApiError(404, "User not found");
  const { passwordHash: _passwordHash, ...safeUser } = user;
  return safeUser;
}

// Hard delete — cascades to the user's own progress/certificates/tickets/notifications, while
// anything they merely *created* (content, trainings, franchises) is kept and just loses its
// creator reference (schema uses onDelete: set null for those FKs, cascade for the user's own data).
export async function deleteUser(requesterId: string, userId: string) {
  if (requesterId === userId) {
    throw new ApiError(400, "You can't delete your own account — there's no one left to undo it if that's a mistake.");
  }
  const [deleted] = await db.delete(users).where(eq(users.id, userId)).returning();
  if (!deleted) throw new ApiError(404, "User not found");
  return { id: deleted.id };
}

export async function resetPassword(userId: string) {
  const tempPassword = generateTempPassword();
  const [user] = await db
    .update(users)
    .set({ passwordHash: await hashPassword(tempPassword), mustChangePassword: true })
    .where(eq(users.id, userId))
    .returning();
  if (!user) throw new ApiError(404, "User not found");
  return { email: user.email, tempPassword };
}

export async function orgTree() {
  const [company] = await db.select().from(companies).limit(1);
  const allFranchises = await db.select().from(franchises);
  const allUsers = await listUsers({});

  return {
    company,
    franchises: allFranchises.map((f) => ({
      ...f,
      users: allUsers.filter((u) => u.franchiseId === f.id),
    })),
    unassignedUsers: allUsers.filter((u) => !u.franchiseId),
  };
}
