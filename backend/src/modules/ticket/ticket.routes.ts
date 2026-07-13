import { Router } from "express";
import { z } from "zod";
import { authenticate } from "../../middleware/authenticate.js";
import { authorize } from "../../middleware/authorize.js";
import { validateBody } from "../../middleware/validate.js";
import { asyncHandler } from "../../utils/asyncHandler.js";
import * as ticketService from "./ticket.service.js";

export const ticketRouter = Router();
export const kbSubmissionRouter = Router();

ticketRouter.use(authenticate);
kbSubmissionRouter.use(authenticate);

const MANAGERS = ["super_admin", "admin", "trainer"] as const;
const attachmentSchema = z.object({ fileKey: z.string(), fileName: z.string() });

const uploadUrlSchema = z.object({ filename: z.string().min(1), contentType: z.string().min(1) });

ticketRouter.post(
  "/attachment-upload-url",
  validateBody(uploadUrlSchema),
  asyncHandler(async (req, res) => {
    res.json(await ticketService.createAttachmentUploadUrl(req.body.filename, req.body.contentType));
  }),
);

const createTicketSchema = z.object({
  subject: z.string().min(1),
  description: z.string().min(1),
  attachments: z.array(attachmentSchema).optional(),
});

ticketRouter.post(
  "/",
  validateBody(createTicketSchema),
  asyncHandler(async (req, res) => {
    res.status(201).json(await ticketService.createTicket(req.user!.sub, req.body));
  }),
);

ticketRouter.get(
  "/mine",
  asyncHandler(async (req, res) => {
    res.json(await ticketService.listMyTickets(req.user!.sub));
  }),
);

ticketRouter.get(
  "/",
  authorize(...MANAGERS),
  asyncHandler(async (req, res) => {
    const status = req.query.status as "open" | "in_progress" | "resolved" | undefined;
    res.json(await ticketService.listTicketQueue(status));
  }),
);

ticketRouter.get(
  "/:id",
  asyncHandler(async (req, res) => {
    await ticketService.assertTicketAccess(req.params.id, req.user!.sub, req.user!.role);
    res.json(await ticketService.getTicketDetail(req.params.id));
  }),
);

const addMessageSchema = z.object({
  message: z.string().min(1),
  attachments: z.array(attachmentSchema).optional(),
});

ticketRouter.post(
  "/:id/messages",
  validateBody(addMessageSchema),
  asyncHandler(async (req, res) => {
    await ticketService.assertTicketAccess(req.params.id, req.user!.sub, req.user!.role);
    res.status(201).json(await ticketService.addMessage(req.params.id, req.user!.sub, req.body));
  }),
);

const statusSchema = z.object({ status: z.enum(["open", "in_progress", "resolved"]) });

ticketRouter.patch(
  "/:id/status",
  authorize(...MANAGERS),
  validateBody(statusSchema),
  asyncHandler(async (req, res) => {
    res.json(await ticketService.setTicketStatus(req.params.id, req.user!.sub, req.body.status));
  }),
);

const kbSolutionSchema = z.object({
  title: z.string().min(1),
  description: z.string().min(1),
  topic: z.string().min(1),
  language: z.string().min(1),
});

ticketRouter.post(
  "/:id/kb-submission",
  authorize(...MANAGERS),
  validateBody(kbSolutionSchema),
  asyncHandler(async (req, res) => {
    res.status(201).json(await ticketService.submitKbSolution(req.params.id, req.user!.sub, req.body));
  }),
);

kbSubmissionRouter.get(
  "/",
  authorize("super_admin"),
  asyncHandler(async (_req, res) => {
    res.json(await ticketService.listPendingKbSubmissions());
  }),
);

const reviewSchema = z.object({
  action: z.enum(["approve", "edit_approve", "reject"]),
  editedContent: kbSolutionSchema.optional(),
  reviewNotes: z.string().optional(),
});

kbSubmissionRouter.post(
  "/:id/review",
  authorize("super_admin"),
  validateBody(reviewSchema),
  asyncHandler(async (req, res) => {
    res.json(await ticketService.reviewKbSubmission(req.params.id, req.user!.sub, req.body));
  }),
);
