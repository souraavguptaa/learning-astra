import type { NextFunction, Request, Response } from "express";
import type { ZodSchema } from "zod";
import { ApiError } from "./errorHandler.js";

export function validateBody(schema: ZodSchema) {
  return (req: Request, _res: Response, next: NextFunction) => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      throw new ApiError(400, result.error.issues.map((i) => i.message).join("; "));
    }
    req.body = result.data;
    next();
  };
}
