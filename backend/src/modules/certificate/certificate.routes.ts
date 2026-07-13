import { Router } from "express";
import { authenticate } from "../../middleware/authenticate.js";
import { asyncHandler } from "../../utils/asyncHandler.js";
import * as certificateService from "./certificate.service.js";

export const certificateRouter = Router();

certificateRouter.use(authenticate);

certificateRouter.get(
  "/mine",
  asyncHandler(async (req, res) => {
    res.json(await certificateService.listMyCertificates(req.user!.sub));
  }),
);

certificateRouter.get(
  "/:id/download-url",
  asyncHandler(async (req, res) => {
    res.json(await certificateService.getCertificateDownloadUrl(req.params.id, req.user!.sub));
  }),
);
