import { Router } from "express";
import { z } from "zod";
import { authenticate } from "../../middleware/authenticate.js";
import { authorize } from "../../middleware/authorize.js";
import { validateBody } from "../../middleware/validate.js";
import { asyncHandler } from "../../utils/asyncHandler.js";
import * as orgService from "./org.service.js";

export const orgRouter = Router();

orgRouter.use(authenticate);

orgRouter.get(
  "/franchises",
  authorize("super_admin", "admin", "trainer"),
  asyncHandler(async (_req, res) => {
    res.json(await orgService.listFranchises());
  }),
);

const createFranchiseSchema = z.object({
  name: z.string().min(1),
  code: z.string().optional(),
  location: z.string().optional(),
});

orgRouter.post(
  "/franchises",
  authorize("super_admin", "admin"),
  validateBody(createFranchiseSchema),
  asyncHandler(async (req, res) => {
    res.status(201).json(await orgService.createFranchise(req.body));
  }),
);

const userRoleValues = ["trainer", "admin", "franchise_owner", "operator", "employee"] as const;

orgRouter.get(
  "/users",
  authorize("super_admin", "admin", "trainer"),
  asyncHandler(async (req, res) => {
    const role = req.query.role as (typeof userRoleValues)[number] | undefined;
    const franchiseId = req.query.franchiseId as string | undefined;
    res.json(await orgService.listUsers({ role, franchiseId }));
  }),
);

const createUserSchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  role: z.enum(userRoleValues),
  franchiseId: z.string().uuid().optional(),
  location: z.string().optional(),
});

orgRouter.post(
  "/users",
  authorize("super_admin", "admin"),
  validateBody(createUserSchema),
  asyncHandler(async (req, res) => {
    const result = await orgService.createUser({ id: req.user!.sub, role: req.user!.role }, req.body);
    res.status(201).json(result);
  }),
);

const setActiveSchema = z.object({ isActive: z.boolean() });

orgRouter.patch(
  "/users/:id/active",
  authorize("super_admin", "admin"),
  validateBody(setActiveSchema),
  asyncHandler(async (req, res) => {
    res.json(await orgService.setUserActive(req.params.id, req.body.isActive));
  }),
);

orgRouter.post(
  "/users/:id/reset-password",
  authorize("super_admin", "admin"),
  asyncHandler(async (req, res) => {
    res.json(await orgService.resetPassword(req.params.id));
  }),
);

orgRouter.get(
  "/tree",
  authorize("super_admin", "admin"),
  asyncHandler(async (_req, res) => {
    res.json(await orgService.orgTree());
  }),
);
