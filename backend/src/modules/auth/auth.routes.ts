import { Router } from "express";
import { z } from "zod";
import { authenticate } from "../../middleware/authenticate.js";
import { validateBody } from "../../middleware/validate.js";
import { asyncHandler } from "../../utils/asyncHandler.js";
import * as authService from "./auth.service.js";

export const authRouter = Router();

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

authRouter.post(
  "/login",
  validateBody(loginSchema),
  asyncHandler(async (req, res) => {
    const { email, password } = req.body;
    const result = await authService.login(email, password);
    res.json(result);
  }),
);

const refreshSchema = z.object({
  refreshToken: z.string().min(1),
});

authRouter.post(
  "/refresh",
  validateBody(refreshSchema),
  asyncHandler(async (req, res) => {
    const { refreshToken } = req.body;
    const result = await authService.refresh(refreshToken);
    res.json(result);
  }),
);

authRouter.post(
  "/logout",
  authenticate,
  asyncHandler(async (req, res) => {
    await authService.logout(req.user!.sub);
    res.json({ success: true });
  }),
);

authRouter.get(
  "/me",
  authenticate,
  asyncHandler(async (req, res) => {
    res.json({ user: req.user });
  }),
);

const changePasswordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(8, "New password must be at least 8 characters"),
});

authRouter.put(
  "/change-password",
  authenticate,
  validateBody(changePasswordSchema),
  asyncHandler(async (req, res) => {
    await authService.changePassword(req.user!.sub, req.body.currentPassword, req.body.newPassword);
    res.json({ success: true });
  }),
);
