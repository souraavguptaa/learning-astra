import { Router } from "express";
import { authenticate } from "../../middleware/authenticate.js";
import { asyncHandler } from "../../utils/asyncHandler.js";
import * as notificationService from "./notification.service.js";

export const notificationRouter = Router();

notificationRouter.use(authenticate);

notificationRouter.get(
  "/mine",
  asyncHandler(async (req, res) => {
    res.json(await notificationService.listMyNotifications(req.user!.sub));
  }),
);

notificationRouter.patch(
  "/:id/read",
  asyncHandler(async (req, res) => {
    await notificationService.markRead(req.params.id, req.user!.sub);
    res.json({ success: true });
  }),
);

notificationRouter.patch(
  "/read-all",
  asyncHandler(async (req, res) => {
    await notificationService.markAllRead(req.user!.sub);
    res.json({ success: true });
  }),
);
