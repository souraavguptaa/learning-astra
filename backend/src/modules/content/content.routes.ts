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

const updateContentSchema = z.object({
  title: z.string().min(1).optional(),
  description: z.string().min(1).optional(),
  topic: z.string().min(1).optional(),
  language: z.string().min(1).optional(),
  targetRoles: z.array(z.enum(roleValues)).min(1).optional(),
  masterTopicId: z.string().uuid().nullable().optional(),
  fileKey: z.string().min(1).optional(),
  mimeType: z.string().min(1).optional(),
});

contentRouter.put(
  "/:id",
  authorize(...CONTENT_MANAGERS),
  validateBody(updateContentSchema),
  asyncHandler(async (req, res) => {
    res.json(await contentService.updateContentItem(req.params.id, req.body));
  }),
);

contentRouter.post(
  "/:id/retry-conversion",
  authorize(...CONTENT_MANAGERS),
  asyncHandler(async (req, res) => {
    res.json(await contentService.retryConversion(req.params.id));
  }),
);

contentRouter.delete(
  "/:id",
  authorize(...CONTENT_MANAGERS),
  asyncHandler(async (req, res) => {
    await contentService.deleteContentItem(req.params.id);
    res.status(204).send();
  }),
);
