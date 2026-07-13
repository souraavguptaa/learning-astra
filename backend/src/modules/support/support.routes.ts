import { Router } from "express";
import { z } from "zod";
import { authenticate } from "../../middleware/authenticate.js";
import { authorize } from "../../middleware/authorize.js";
import { validateBody } from "../../middleware/validate.js";
import { asyncHandler } from "../../utils/asyncHandler.js";
import * as supportService from "./support.service.js";

export const supportRouter = Router();

supportRouter.use(authenticate);

const askSchema = z.object({ query: z.string().min(1) });

supportRouter.post(
  "/ask",
  validateBody(askSchema),
  asyncHandler(async (req, res) => {
    res.json(await supportService.ask(req.user!.sub, req.body.query));
  }),
);

supportRouter.post(
  "/reembed-all",
  authorize("super_admin"),
  asyncHandler(async (_req, res) => {
    res.json(await supportService.reembedAll());
  }),
);
