import { Router } from "express";
import { z } from "zod";
import { authenticate } from "../../middleware/authenticate.js";
import { validateBody } from "../../middleware/validate.js";
import { asyncHandler } from "../../utils/asyncHandler.js";
import * as progressService from "./progress.service.js";

export const progressRouter = Router();

progressRouter.use(authenticate);

progressRouter.get(
  "/content/:contentId",
  asyncHandler(async (req, res) => {
    res.json(await progressService.getProgress(req.user!.sub, req.params.contentId));
  }),
);

const heartbeatSchema = z.object({
  currentTime: z.number().min(0),
  durationSeconds: z.number().min(0).optional(),
});

progressRouter.post(
  "/content/:contentId/heartbeat",
  validateBody(heartbeatSchema),
  asyncHandler(async (req, res) => {
    res.json(await progressService.heartbeat(req.user!.sub, req.params.contentId, req.body));
  }),
);

progressRouter.post(
  "/content/:contentId/view",
  asyncHandler(async (req, res) => {
    res.json(await progressService.markViewed(req.user!.sub, req.params.contentId));
  }),
);
