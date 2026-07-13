import { Router } from "express";
import { authenticate } from "../../middleware/authenticate.js";
import { asyncHandler } from "../../utils/asyncHandler.js";
import * as gamificationService from "./gamification.service.js";

export const gamificationRouter = Router();

gamificationRouter.use(authenticate);

gamificationRouter.get(
  "/me",
  asyncHandler(async (req, res) => {
    res.json(await gamificationService.getMyGamificationSummary(req.user!.sub));
  }),
);

gamificationRouter.get(
  "/leaderboard/employee",
  asyncHandler(async (_req, res) => {
    res.json(await gamificationService.getEmployeeLeaderboard());
  }),
);

gamificationRouter.get(
  "/leaderboard/franchise",
  asyncHandler(async (_req, res) => {
    res.json(await gamificationService.getFranchiseLeaderboard());
  }),
);
