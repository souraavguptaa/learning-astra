import { Router } from "express";
import { z } from "zod";
import { authenticate } from "../../middleware/authenticate.js";
import { authorize } from "../../middleware/authorize.js";
import { validateBody } from "../../middleware/validate.js";
import { asyncHandler } from "../../utils/asyncHandler.js";
import * as promoService from "./promo.service.js";

export const adRouter = Router();
export const videoRouter = Router();

adRouter.use(authenticate);
videoRouter.use(authenticate);

const MANAGERS = ["super_admin", "admin"] as const;

const uploadUrlSchema = z.object({ filename: z.string().min(1), contentType: z.string().min(1) });

adRouter.post(
  "/upload-url",
  authorize(...MANAGERS),
  validateBody(uploadUrlSchema),
  asyncHandler(async (req, res) => {
    res.json(await promoService.createAdUploadUrl(req.body.filename, req.body.contentType));
  }),
);

const createAdSchema = z.object({
  title: z.string().min(1),
  imageFileKey: z.string().min(1),
  linkUrl: z.string().url(),
});

adRouter.post(
  "/",
  authorize(...MANAGERS),
  validateBody(createAdSchema),
  asyncHandler(async (req, res) => {
    res.status(201).json(await promoService.createAd(req.user!.sub, req.body));
  }),
);

adRouter.get(
  "/active",
  asyncHandler(async (_req, res) => {
    res.json(await promoService.listActiveAds());
  }),
);

adRouter.get(
  "/all",
  authorize(...MANAGERS),
  asyncHandler(async (_req, res) => {
    res.json(await promoService.listAllAds());
  }),
);

const setActiveSchema = z.object({ isActive: z.boolean() });

adRouter.patch(
  "/:id/active",
  authorize(...MANAGERS),
  validateBody(setActiveSchema),
  asyncHandler(async (req, res) => {
    res.json(await promoService.setAdActive(req.params.id, req.body.isActive));
  }),
);

adRouter.delete(
  "/:id",
  authorize(...MANAGERS),
  asyncHandler(async (req, res) => {
    await promoService.deleteAd(req.params.id);
    res.status(204).send();
  }),
);

const createVideoSchema = z.object({
  title: z.string().min(1),
  youtubeUrl: z.string().url(),
});

const VIDEO_MANAGERS = ["super_admin", "admin", "trainer"] as const;

videoRouter.post(
  "/",
  authorize(...VIDEO_MANAGERS),
  validateBody(createVideoSchema),
  asyncHandler(async (req, res) => {
    res.status(201).json(await promoService.createPartnerVideo(req.user!.sub, req.body));
  }),
);

videoRouter.get(
  "/",
  asyncHandler(async (_req, res) => {
    res.json(await promoService.listPartnerVideos());
  }),
);

videoRouter.delete(
  "/:id",
  authorize(...VIDEO_MANAGERS),
  asyncHandler(async (req, res) => {
    await promoService.deletePartnerVideo(req.params.id);
    res.status(204).send();
  }),
);
