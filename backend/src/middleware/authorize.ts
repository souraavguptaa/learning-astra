import type { NextFunction, Request, Response } from "express";
import { ApiError } from "./errorHandler.js";
import type { UserRole } from "../utils/jwt.js";

/** Gate a route to specific roles. Must run after `authenticate`. */
export function authorize(...allowedRoles: UserRole[]) {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (!req.user) {
      throw new ApiError(401, "Not authenticated");
    }
    if (!allowedRoles.includes(req.user.role)) {
      throw new ApiError(403, "You do not have permission to perform this action");
    }
    next();
  };
}
