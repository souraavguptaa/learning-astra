import { Router } from "express";
import { authenticate } from "../../middleware/authenticate.js";
import { authorize } from "../../middleware/authorize.js";
import { asyncHandler } from "../../utils/asyncHandler.js";
import * as attendanceService from "./attendance.service.js";

export const attendanceRouter = Router();

attendanceRouter.use(authenticate);

attendanceRouter.get(
  "/status",
  asyncHandler(async (req, res) => {
    res.json(await attendanceService.getStatus(req.user!.sub));
  }),
);

attendanceRouter.post(
  "/break/start",
  asyncHandler(async (req, res) => {
    await attendanceService.startBreak(req.user!.sub);
    res.json({ success: true });
  }),
);

attendanceRouter.post(
  "/break/end",
  asyncHandler(async (req, res) => {
    await attendanceService.endBreak(req.user!.sub);
    res.json({ success: true });
  }),
);

attendanceRouter.get(
  "/report",
  authorize("super_admin", "admin"),
  asyncHandler(async (req, res) => {
    res.json(
      await attendanceService.getReport({
        from: req.query.from ? new Date(req.query.from as string) : undefined,
        to: req.query.to ? new Date(req.query.to as string) : undefined,
        userId: (req.query.userId as string) || undefined,
      }),
    );
  }),
);
