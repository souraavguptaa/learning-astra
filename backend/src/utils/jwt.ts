import jwt from "jsonwebtoken";
import { env } from "../config/env.js";

export type UserRole = "super_admin" | "admin" | "trainer" | "franchise_owner" | "operator" | "employee";

export interface AccessTokenPayload {
  sub: string; // user id
  role: UserRole;
  franchiseId: string | null;
}

const ACCESS_TOKEN_TTL = "8h"; // ponytail: internal tool, not bank-grade — long TTL avoids mid-form 401s. Shorten if abuse shows up.
const REFRESH_TOKEN_TTL = "30d";

export function signAccessToken(payload: AccessTokenPayload): string {
  return jwt.sign(payload, env.jwtSecret, { expiresIn: ACCESS_TOKEN_TTL });
}

export function signRefreshToken(payload: { sub: string }): string {
  return jwt.sign(payload, env.jwtRefreshSecret, { expiresIn: REFRESH_TOKEN_TTL });
}

export function verifyAccessToken(token: string): AccessTokenPayload {
  return jwt.verify(token, env.jwtSecret) as AccessTokenPayload;
}

export function verifyRefreshToken(token: string): { sub: string } {
  return jwt.verify(token, env.jwtRefreshSecret) as { sub: string };
}

export function refreshTokenExpiryDate(): Date {
  const d = new Date();
  d.setDate(d.getDate() + 30);
  return d;
}
