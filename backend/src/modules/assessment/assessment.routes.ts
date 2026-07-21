import { Router } from "express";
import { z } from "zod";
import { authenticate } from "../../middleware/authenticate.js";
import { authorize } from "../../middleware/authorize.js";
import { validateBody } from "../../middleware/validate.js";
import { asyncHandler } from "../../utils/asyncHandler.js";
import { buildFileKey, getUploadUrl } from "../../services/r2Service.js";
import * as assessmentService from "./assessment.service.js";

export const assessmentRouter = Router();

assessmentRouter.use(authenticate);

const MANAGERS = ["super_admin", "admin", "trainer"] as const;

const optionSchema = z.object({ optionText: z.string().min(1), isCorrect: z.boolean() });
const questionSchema = z.object({
  questionText: z.string().min(1),
  type: z.enum(["mcq", "true_false"]),
  options: z.array(optionSchema).min(2),
  imageFileKey: z.string().min(1).optional().nullable(),
});

const createAssessmentSchema = z.object({
  trainingId: z.string().uuid(),
  title: z.string().min(1),
  linkedContentId: z.string().uuid().optional(),
  passPercentage: z.number().min(1).max(100).default(70),
  maxAttempts: z.number().min(1).max(20).default(3),
  questions: z.array(questionSchema).min(1),
});

assessmentRouter.post(
  "/",
  authorize(...MANAGERS),
  validateBody(createAssessmentSchema),
  asyncHandler(async (req, res) => {
    res.status(201).json(await assessmentService.createAssessment(req.user!.sub, req.body));
  }),
);

const uploadUrlSchema = z.object({ filename: z.string().min(1), contentType: z.string().min(1) });

// Same-shape helper as the ads upload-url endpoint — trainers attach an optional image per
// question in both the Quiz (in-training) and Assessment (standalone) builders, which share this
// one form component.
assessmentRouter.post(
  "/questions/upload-url",
  authorize(...MANAGERS),
  validateBody(uploadUrlSchema),
  asyncHandler(async (req, res) => {
    const fileKey = buildFileKey("assessment-questions", req.body.filename);
    const uploadUrl = await getUploadUrl(fileKey, req.body.contentType);
    res.json({ uploadUrl, fileKey });
  }),
);

assessmentRouter.get(
  "/:id",
  authorize(...MANAGERS),
  asyncHandler(async (req, res) => {
    res.json(await assessmentService.getAssessmentForManagement(req.params.id));
  }),
);

assessmentRouter.get(
  "/:id/for-user",
  asyncHandler(async (req, res) => {
    res.json(await assessmentService.getAssessmentForUser(req.params.id, req.user!.sub));
  }),
);

const submitSchema = z.object({
  answers: z.array(z.object({ questionId: z.string().uuid(), selectedOptionId: z.string().uuid() })),
});

assessmentRouter.post(
  "/:id/submit",
  validateBody(submitSchema),
  asyncHandler(async (req, res) => {
    res.json(await assessmentService.submitAttempt(req.user!.sub, req.params.id, req.body.answers));
  }),
);
