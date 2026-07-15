import { Router } from "express";
import { z } from "zod";
import { authenticate } from "../../middleware/authenticate.js";
import { authorize } from "../../middleware/authorize.js";
import { validateBody } from "../../middleware/validate.js";
import { asyncHandler } from "../../utils/asyncHandler.js";
import * as npsService from "../nps/nps.service.js";
import * as trainingService from "./training.service.js";

export const trainingRouter = Router();

trainingRouter.use(authenticate);

const MANAGERS = ["super_admin", "admin", "trainer"] as const;
const roleValues = ["super_admin", "admin", "trainer", "franchise_owner", "operator", "employee"] as const;

const createTrainingSchema = z.object({
  title: z.string().min(1),
  description: z.string().min(1),
  isMandatory: z.boolean().default(false),
  isStandaloneAssessment: z.boolean().default(false),
});

trainingRouter.post(
  "/",
  authorize(...MANAGERS),
  validateBody(createTrainingSchema),
  asyncHandler(async (req, res) => {
    res.status(201).json(await trainingService.createTraining(req.user!.sub, req.body));
  }),
);

trainingRouter.get(
  "/",
  authorize(...MANAGERS),
  asyncHandler(async (req, res) => {
    const kind = req.query.kind as "course" | "assessment" | undefined;
    res.json(await trainingService.listTrainings(kind));
  }),
);

trainingRouter.get(
  "/assigned",
  asyncHandler(async (req, res) => {
    res.json(
      await trainingService.listAssignedTrainings({
        id: req.user!.sub,
        role: req.user!.role,
        franchiseId: req.user!.franchiseId,
      }),
    );
  }),
);

trainingRouter.get(
  "/overdue",
  authorize(...MANAGERS),
  asyncHandler(async (req, res) => {
    res.json(await trainingService.getOverdueAssignments({ id: req.user!.sub, role: req.user!.role }));
  }),
);

trainingRouter.get(
  "/:id",
  authorize(...MANAGERS),
  asyncHandler(async (req, res) => {
    res.json(await trainingService.getTrainingDetail(req.params.id));
  }),
);

trainingRouter.delete(
  "/:id",
  authorize(...MANAGERS),
  asyncHandler(async (req, res) => {
    await trainingService.deleteTraining(req.params.id);
    res.json({ success: true });
  }),
);

trainingRouter.get(
  "/:id/for-user",
  asyncHandler(async (req, res) => {
    res.json(await trainingService.getTrainingForUser(req.user!.sub, req.params.id));
  }),
);

const updateTrainingSchema = z.object({
  title: z.string().min(1).optional(),
  description: z.string().min(1).optional(),
  isMandatory: z.boolean().optional(),
  npsEnabled: z.boolean().optional(),
});

trainingRouter.put(
  "/:id",
  authorize(...MANAGERS),
  validateBody(updateTrainingSchema),
  asyncHandler(async (req, res) => {
    res.json(await trainingService.updateTraining(req.params.id, req.body));
  }),
);

const addItemSchema = z.object({ contentId: z.string().uuid() });

trainingRouter.post(
  "/:id/items",
  authorize(...MANAGERS),
  validateBody(addItemSchema),
  asyncHandler(async (req, res) => {
    res.status(201).json(await trainingService.addItem(req.params.id, req.body.contentId));
  }),
);

const reorderSchema = z.object({ itemIds: z.array(z.string().uuid()).min(1) });

trainingRouter.put(
  "/:id/items/reorder",
  authorize(...MANAGERS),
  validateBody(reorderSchema),
  asyncHandler(async (req, res) => {
    res.json(await trainingService.reorderItems(req.params.id, req.body.itemIds));
  }),
);

trainingRouter.delete(
  "/:id/items/:itemId",
  authorize(...MANAGERS),
  asyncHandler(async (req, res) => {
    await trainingService.removeItem(req.params.id, req.params.itemId);
    res.status(204).send();
  }),
);

trainingRouter.post(
  "/:id/publish",
  authorize(...MANAGERS),
  asyncHandler(async (req, res) => {
    res.json(await trainingService.publishTraining(req.params.id, req.user!.sub));
  }),
);

const versionSchema = z.object({ changeType: z.enum(["minor", "major"]) });

trainingRouter.post(
  "/:id/version",
  authorize(...MANAGERS),
  validateBody(versionSchema),
  asyncHandler(async (req, res) => {
    res.json(await trainingService.bumpVersion(req.params.id, req.user!.sub, req.body.changeType));
  }),
);

const assignSchema = z.object({
  assigneeType: z.enum(["user", "role", "franchise"]),
  userId: z.string().uuid().optional(),
  role: z.enum(roleValues).optional(),
  franchiseId: z.string().uuid().optional(),
  dueAt: z.string().datetime().optional(),
  isMandatory: z.boolean().default(true),
});

trainingRouter.post(
  "/:id/assign",
  authorize(...MANAGERS),
  validateBody(assignSchema),
  asyncHandler(async (req, res) => {
    res.status(201).json(await trainingService.assignTraining(req.params.id, req.body));
  }),
);

trainingRouter.delete(
  "/:id/assign/:assignmentId",
  authorize(...MANAGERS),
  asyncHandler(async (req, res) => {
    await trainingService.removeAssignment(req.params.id, req.params.assignmentId);
    res.status(204).send();
  }),
);

const npsSubmitSchema = z.object({ rating: z.number().int().min(0).max(10) });

trainingRouter.post(
  "/:id/nps",
  validateBody(npsSubmitSchema),
  asyncHandler(async (req, res) => {
    res.status(201).json(await npsService.submitNps(req.user!.sub, req.params.id, req.body.rating));
  }),
);

trainingRouter.get(
  "/:id/nps-status",
  asyncHandler(async (req, res) => {
    res.json(await npsService.getMyNpsStatus(req.user!.sub, req.params.id));
  }),
);

trainingRouter.get(
  "/:id/nps-report",
  authorize(...MANAGERS),
  asyncHandler(async (req, res) => {
    res.json(await npsService.getNpsReport(req.params.id));
  }),
);
