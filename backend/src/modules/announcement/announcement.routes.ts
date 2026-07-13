import { Router } from "express";
import { z } from "zod";
import { authenticate } from "../../middleware/authenticate.js";
import { authorize } from "../../middleware/authorize.js";
import { validateBody } from "../../middleware/validate.js";
import { asyncHandler } from "../../utils/asyncHandler.js";
import * as announcementService from "./announcement.service.js";

export const announcementRouter = Router();

announcementRouter.use(authenticate);

const MANAGERS = ["super_admin", "admin", "trainer"] as const;
const roleValues = ["super_admin", "admin", "trainer", "franchise_owner", "operator", "employee"] as const;

const uploadUrlSchema = z.object({ filename: z.string().min(1), contentType: z.string().min(1) });

announcementRouter.post(
  "/attachment-upload-url",
  authorize(...MANAGERS),
  validateBody(uploadUrlSchema),
  asyncHandler(async (req, res) => {
    res.json(await announcementService.createAttachmentUploadUrl(req.body.filename, req.body.contentType));
  }),
);

const createSchema = z.object({
  title: z.string().min(1),
  body: z.string().min(1),
  attachmentFileKey: z.string().optional(),
  trainingLinkId: z.string().uuid().optional(),
  targetType: z.enum(["all", "role", "franchise"]),
  targetRole: z.enum(roleValues).optional(),
  targetFranchiseId: z.string().uuid().optional(),
});

announcementRouter.post(
  "/",
  authorize(...MANAGERS),
  validateBody(createSchema),
  asyncHandler(async (req, res) => {
    res.status(201).json(await announcementService.createAnnouncement(req.user!.sub, req.body));
  }),
);

announcementRouter.get(
  "/all",
  authorize(...MANAGERS),
  asyncHandler(async (_req, res) => {
    res.json(await announcementService.listAllAnnouncements());
  }),
);

announcementRouter.get(
  "/mine",
  asyncHandler(async (req, res) => {
    res.json(
      await announcementService.listForUser({
        id: req.user!.sub,
        role: req.user!.role,
        franchiseId: req.user!.franchiseId,
      }),
    );
  }),
);

announcementRouter.post(
  "/:id/read",
  asyncHandler(async (req, res) => {
    await announcementService.markAnnouncementRead(req.params.id, req.user!.sub);
    res.json({ success: true });
  }),
);

announcementRouter.get(
  "/:id/read-status",
  authorize(...MANAGERS),
  asyncHandler(async (req, res) => {
    res.json(await announcementService.getReadStatus(req.params.id));
  }),
);

announcementRouter.delete(
  "/:id",
  authorize(...MANAGERS),
  asyncHandler(async (req, res) => {
    await announcementService.deleteAnnouncement(req.params.id);
    res.status(204).send();
  }),
);
