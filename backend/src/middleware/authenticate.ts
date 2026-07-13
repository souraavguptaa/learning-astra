import type { NextFunction, Request, Response } from "express";
import { ApiError } from "./errorHandler.js";
import { verifyAccessToken, type AccessTokenPayload } from "../utils/jwt.js";

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: AccessTokenPayload;
    }
  }
}

export function authenticate(req: Request, _res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  // navigator.sendBeacon (used for the video "final position on tab close" ping) can't set headers,
  // so it passes the token as a query param instead. Only used for that one best-effort call.
  const queryToken = typeof req.query.token === "string" ? req.query.token : undefined;
  const token = header?.startsWith("Bearer ") ? header.slice("Bearer ".length) : queryToken;

  if (!token) {
    throw new ApiError(401, "Missing or invalid Authorization header");
  }
  try {
    req.user = verifyAccessToken(token);
    next();
  } catch {
    throw new ApiError(401, "Invalid or expired access token");
  }
}
