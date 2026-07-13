import { eq } from "drizzle-orm";
import { db } from "../../db/client.js";
import { refreshTokens, users } from "../../db/schema/index.js";
import { ApiError } from "../../middleware/errorHandler.js";
import { hashPassword, verifyPassword } from "../../utils/password.js";
import {
  refreshTokenExpiryDate,
  signAccessToken,
  signRefreshToken,
  verifyRefreshToken,
} from "../../utils/jwt.js";

async function issueTokens(user: typeof users.$inferSelect) {
  const accessToken = signAccessToken({
    sub: user.id,
    role: user.role,
    franchiseId: user.franchiseId,
  });
  const refreshToken = signRefreshToken({ sub: user.id });

  await db.insert(refreshTokens).values({
    userId: user.id,
    tokenHash: await hashPassword(refreshToken),
    expiresAt: refreshTokenExpiryDate(),
  });

  return { accessToken, refreshToken };
}

export async function login(email: string, password: string) {
  const [user] = await db.select().from(users).where(eq(users.email, email)).limit(1);
  if (!user || !user.isActive) {
    throw new ApiError(401, "Invalid email or password");
  }
  const ok = await verifyPassword(password, user.passwordHash);
  if (!ok) {
    throw new ApiError(401, "Invalid email or password");
  }
  const tokens = await issueTokens(user);
  return {
    ...tokens,
    user: { id: user.id, name: user.name, email: user.email, role: user.role, franchiseId: user.franchiseId },
  };
}

export async function refresh(refreshToken: string) {
  let payload;
  try {
    payload = verifyRefreshToken(refreshToken);
  } catch {
    throw new ApiError(401, "Invalid or expired refresh token");
  }

  const [user] = await db.select().from(users).where(eq(users.id, payload.sub)).limit(1);
  if (!user || !user.isActive) {
    throw new ApiError(401, "User not found or inactive");
  }

  const candidates = await db
    .select()
    .from(refreshTokens)
    .where(eq(refreshTokens.userId, user.id));

  let matched = false;
  for (const candidate of candidates) {
    if (candidate.revokedAt) continue;
    if (candidate.expiresAt < new Date()) continue;
    // eslint-disable-next-line no-await-in-loop
    if (await verifyPassword(refreshToken, candidate.tokenHash)) {
      matched = true;
      await db.update(refreshTokens).set({ revokedAt: new Date() }).where(eq(refreshTokens.id, candidate.id));
      break;
    }
  }
  if (!matched) {
    throw new ApiError(401, "Refresh token not recognized");
  }

  return issueTokens(user);
}

export async function logout(userId: string) {
  await db
    .update(refreshTokens)
    .set({ revokedAt: new Date() })
    .where(eq(refreshTokens.userId, userId));
}
