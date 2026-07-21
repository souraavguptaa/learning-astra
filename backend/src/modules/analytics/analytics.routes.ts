import ExcelJS from "exceljs";
import { Router } from "express";
import { authenticate } from "../../middleware/authenticate.js";
import { authorize } from "../../middleware/authorize.js";
import { asyncHandler } from "../../utils/asyncHandler.js";
import * as analyticsService from "./analytics.service.js";

export const analyticsRouter = Router();

analyticsRouter.use(authenticate);

// Admin already has write access to users/content/trainings for the whole org — read-only
// analytics visibility is strictly lower-risk than that, so it gets the same access as super_admin
// everywhere in this router rather than being locked out of the dashboard it needs to do its job.
analyticsRouter.get(
  "/overview",
  authorize("super_admin", "admin"),
  asyncHandler(async (_req, res) => {
    res.json(await analyticsService.getOverview());
  }),
);

analyticsRouter.get(
  "/trends",
  authorize("super_admin", "admin"),
  asyncHandler(async (req, res) => {
    res.json(
      await analyticsService.getTrends({
        from: req.query.from ? new Date(req.query.from as string) : undefined,
        to: req.query.to ? new Date(req.query.to as string) : undefined,
        granularity: req.query.granularity === "month" ? "month" : "day",
      }),
    );
  }),
);

analyticsRouter.get(
  "/segments",
  authorize("super_admin", "admin"),
  asyncHandler(async (_req, res) => {
    res.json(await analyticsService.getSegments());
  }),
);

analyticsRouter.get(
  "/trainers",
  authorize("super_admin", "admin"),
  asyncHandler(async (_req, res) => {
    res.json(await analyticsService.getTrainerPerformance());
  }),
);

analyticsRouter.get(
  "/trainings",
  authorize("super_admin", "admin"),
  asyncHandler(async (_req, res) => {
    res.json(await analyticsService.getTrainingPerformance());
  }),
);

analyticsRouter.get(
  "/ai-queries",
  authorize("super_admin", "admin"),
  asyncHandler(async (req, res) => {
    const answered = req.query.answered === "true" ? true : req.query.answered === "false" ? false : undefined;
    res.json(await analyticsService.getAiQueries({ answered }));
  }),
);

analyticsRouter.get(
  "/training-completion",
  authorize("super_admin", "admin", "trainer"),
  asyncHandler(async (req, res) => {
    const rows = await analyticsService.getTrainingCompletionReport({
      franchiseId: req.query.franchiseId as string | undefined,
      from: req.query.from as string | undefined,
      to: req.query.to as string | undefined,
    });

    if (req.query.format === "xlsx") {
      const workbook = new ExcelJS.Workbook();
      const sheet = workbook.addWorksheet("Training Completion");
      sheet.columns = [
        { header: "Training", key: "trainingTitle", width: 30 },
        { header: "User", key: "userName", width: 20 },
        { header: "Email", key: "userEmail", width: 28 },
        { header: "Role", key: "role", width: 16 },
        { header: "Franchise", key: "franchiseName", width: 22 },
        { header: "Completed", key: "completed", width: 12 },
        { header: "Completed At", key: "completedAt", width: 22 },
        { header: "Assigned/Started At", key: "createdAt", width: 22 },
      ];
      sheet.addRows(rows);
      res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
      res.setHeader("Content-Disposition", "attachment; filename=training-completion.xlsx");
      await workbook.xlsx.write(res);
      res.end();
      return;
    }

    res.json(rows);
  }),
);

analyticsRouter.get(
  "/users/:userId/progress",
  authorize("super_admin", "admin", "trainer"),
  asyncHandler(async (req, res) => {
    res.json(await analyticsService.getUserLearningProgress(req.params.userId));
  }),
);
