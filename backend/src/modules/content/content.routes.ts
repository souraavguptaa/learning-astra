import { Router } from "express";
import { z } from "zod";
import { authenticate } from "../../middleware/authenticate.js";
import { authorize } from "../../middleware/authorize.js";
import { validateBody } from "../../middleware/validate.js";
import { asyncHandler } from "../../utils/asyncHandler.js";
import * as contentService from "./content.service.js";

export const contentRouter = Router();

contentRouter.use(authenticate);

const CONTENT_MANAGERS = ["super_admin", "admin", "trainer"] as const;

const uploadUrlSchema = z.object({
  filename: z.string().min(1),
  contentType: z.string().min(1),
});

contentRouter.post(
  "/upload-url",
  authorize(...CONTENT_MANAGERS),
  validateBody(uploadUrlSchema),
  asyncHandler(async (req, res) => {
    const result = await contentService.createUploadUrl(req.body.filename, req.body.contentType);
    res.json(result);
  }),
);

const roleValues = ["super_admin", "admin", "trainer", "franchise_owner", "operator", "employee"] as const;

const createContentSchema = z.object({
  type: z.enum(["video", "pdf", "ppt", "word", "excel"]),
  title: z.string().min(1),
  description: z.string().min(1),
  topic: z.string().min(1),
  language: z.string().min(1),
  targetRoles: z.array(z.enum(roleValues)).min(1),
  fileKey: z.string().min(1),
  mimeType: z.string().min(1),
  masterTopicId: z.string().uuid().optional(),
  durationSeconds: z.number().optional(),
});

contentRouter.post(
  "/",
  authorize(...CONTENT_MANAGERS),
  validateBody(createContentSchema),
  asyncHandler(async (req, res) => {
    const result = await contentService.createContentItem(req.user!.sub, req.body);
    res.status(201).json(result);
  }),
);

contentRouter.get(
  "/",
  authorize(...CONTENT_MANAGERS),
  asyncHandler(async (_req, res) => {
    res.json(await contentService.listContent());
  }),
);

contentRouter.get(
  "/master-topics",
  authorize(...CONTENT_MANAGERS),
  asyncHandler(async (_req, res) => {
    res.json(await contentService.listMasterTopics());
  }),
);

const createMasterTopicSchema = z.object({
  title: z.string().min(1),
  category: z.string().optional(),
});

contentRouter.post(
  "/master-topics",
  authorize(...CONTENT_MANAGERS),
  validateBody(createMasterTopicSchema),
  asyncHandler(async (req, res) => {
    res.status(201).json(await contentService.createMasterTopic(req.body));
  }),
);

contentRouter.get(
  "/:id/playback-url",
  asyncHandler(async (req, res) => {
    res.json(await contentService.getContentPlaybackUrl(req.params.id));
  }),
);
