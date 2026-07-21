import { Router } from "express";
import { authenticate } from "../../middleware/authenticate.js";
import { ApiError } from "../../middleware/errorHandler.js";
import { asyncHandler } from "../../utils/asyncHandler.js";
import { getDownloadUrl } from "../../services/r2Service.js";

export const fileRouter = Router();

fileRouter.use(authenticate);

// Generic signed-download-URL lookup for ticket/announcement attachments — the fileKey is a
// random UUID path only ever surfaced to users who already have legitimate access to the
// ticket/announcement it's attached to, so gating on auth-only (not per-resource ownership) is fine.
fileRouter.get(
  "/download-url",
  asyncHandler(async (req, res) => {
    const key = req.query.key as string | undefined;
    const isAllowed =
      !!key &&
      (key.startsWith("tickets/") ||
        key.startsWith("announcements/") ||
        key.startsWith("ads/") ||
        key.startsWith("assessment-questions/"));
    if (!isAllowed) {
      throw new ApiError(400, "Invalid file key");
    }
    res.json({ url: await getDownloadUrl(key) });
  }),
);
