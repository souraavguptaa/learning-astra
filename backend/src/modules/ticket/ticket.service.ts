import { randomUUID } from "node:crypto";
import { and, desc, eq } from "drizzle-orm";
import { db } from "../../db/client.js";
import { kbSubmissions, supportTickets, ticketMessages, users } from "../../db/schema/index.js";
import { ApiError } from "../../middleware/errorHandler.js";
import { notify } from "../notification/notification.service.js";
import { buildFileKey, getUploadUrl } from "../../services/r2Service.js";

// Same shape as certificate numbers (LA-2026-XXXXXXXX) — an 8-char hex suffix from a UUID is
// collision-safe enough at this scale without a uniqueness-retry loop.
export function buildTicketNumber(): string {
  const year = new Date().getFullYear();
  const suffix = randomUUID().replace(/-/g, "").slice(0, 8).toUpperCase();
  return `TKT-${year}-${suffix}`;
}

export async function createAttachmentUploadUrl(originalFilename: string, contentType: string) {
  const fileKey = buildFileKey("tickets", originalFilename);
  const uploadUrl = await getUploadUrl(fileKey, contentType);
  return { uploadUrl, fileKey };
}

export async function createTicket(
  userId: string,
  input: { subject: string; description: string; attachments?: { fileKey: string; fileName: string }[] },
) {
  const [ticket] = await db
    .insert(supportTickets)
    .values({
      ticketNumber: buildTicketNumber(),
      userId,
      subject: input.subject,
      description: input.description,
      attachments: input.attachments ?? [],
    })
    .returning();

  const [requester] = await db.select({ name: users.name }).from(users).where(eq(users.id, userId)).limit(1);
  const trainers = await db.select({ id: users.id }).from(users).where(eq(users.role, "trainer"));
  for (const t of trainers) {
    await notify(t.id, "ticket_created", "New Support Ticket", `${requester?.name ?? "Someone"} raised: "${ticket.subject}"`, "/tickets");
  }

  return ticket;
}

export async function listMyTickets(userId: string) {
  return db.select().from(supportTickets).where(eq(supportTickets.userId, userId)).orderBy(desc(supportTickets.createdAt));
}

export async function listTicketQueue(status?: "open" | "in_progress" | "resolved") {
  const rows = await db
    .select({ ticket: supportTickets, requester: users })
    .from(supportTickets)
    .innerJoin(users, eq(supportTickets.userId, users.id))
    .where(status ? eq(supportTickets.status, status) : undefined)
    .orderBy(desc(supportTickets.createdAt));
  return rows.map(({ ticket, requester }) => ({ ...ticket, requesterName: requester.name, requesterEmail: requester.email }));
}

export async function getTicketDetail(ticketId: string) {
  const [row] = await db
    .select({ ticket: supportTickets, requester: users })
    .from(supportTickets)
    .innerJoin(users, eq(supportTickets.userId, users.id))
    .where(eq(supportTickets.id, ticketId))
    .limit(1);
  if (!row) throw new ApiError(404, "Ticket not found");

  const messages = await db
    .select({ message: ticketMessages, sender: users })
    .from(ticketMessages)
    .innerJoin(users, eq(ticketMessages.senderId, users.id))
    .where(eq(ticketMessages.ticketId, ticketId))
    .orderBy(ticketMessages.createdAt);

  const kb = await db.select().from(kbSubmissions).where(eq(kbSubmissions.ticketId, ticketId));

  return {
    ticket: { ...row.ticket, requesterName: row.requester.name, requesterEmail: row.requester.email, requesterRole: row.requester.role },
    messages: messages.map(({ message, sender }) => ({ ...message, senderName: sender.name, senderRole: sender.role })),
    kbSubmissions: kb,
  };
}

export async function addMessage(
  ticketId: string,
  senderId: string,
  input: { message: string; attachments?: { fileKey: string; fileName: string }[] },
) {
  const [msg] = await db
    .insert(ticketMessages)
    .values({ ticketId, senderId, message: input.message, attachments: input.attachments ?? [] })
    .returning();

  const [ticket] = await db.select().from(supportTickets).where(eq(supportTickets.id, ticketId)).limit(1);
  if (ticket) {
    // A requester replying to a resolved ticket reopens it — otherwise their follow-up sits
    // invisibly on a "resolved" ticket no trainer is watching anymore.
    if (senderId === ticket.userId && ticket.status === "resolved") {
      await db.update(supportTickets).set({ status: "open", resolvedAt: null }).where(eq(supportTickets.id, ticketId));
    }
    const recipientId = senderId === ticket.userId ? ticket.assignedTrainerId : ticket.userId;
    if (recipientId) {
      await notify(recipientId, "ticket_reply", "New Ticket Reply", `New reply on "${ticket.subject}".`, `/tickets`);
    }
  }

  return msg;
}

export async function setTicketStatus(ticketId: string, trainerId: string, status: "open" | "in_progress" | "resolved") {
  const [ticket] = await db
    .update(supportTickets)
    .set({
      status,
      assignedTrainerId: trainerId,
      resolvedAt: status === "resolved" ? new Date() : null,
    })
    .where(eq(supportTickets.id, ticketId))
    .returning();
  if (!ticket) throw new ApiError(404, "Ticket not found");
  return ticket;
}

export async function submitKbSolution(
  ticketId: string,
  trainerId: string,
  proposedContent: { title: string; description: string; topic: string; language: string },
) {
  const [submission] = await db
    .insert(kbSubmissions)
    .values({ ticketId, trainerId, proposedContent })
    .returning();
  return submission;
}

export async function listPendingKbSubmissions() {
  const rows = await db
    .select({ submission: kbSubmissions, ticket: supportTickets, trainer: users })
    .from(kbSubmissions)
    .innerJoin(supportTickets, eq(kbSubmissions.ticketId, supportTickets.id))
    .innerJoin(users, eq(kbSubmissions.trainerId, users.id))
    .where(eq(kbSubmissions.status, "pending"))
    .orderBy(desc(kbSubmissions.createdAt));
  return rows.map(({ submission, ticket, trainer }) => ({
    ...submission,
    ticketSubject: ticket.subject,
    trainerName: trainer.name,
  }));
}

export async function reviewKbSubmission(
  submissionId: string,
  reviewedBy: string,
  input: {
    action: "approve" | "edit_approve" | "reject";
    editedContent?: { title: string; description: string; topic: string; language: string };
    reviewNotes?: string;
  },
) {
  const [existing] = await db.select().from(kbSubmissions).where(eq(kbSubmissions.id, submissionId)).limit(1);
  if (!existing) throw new ApiError(404, "KB submission not found");
  if (existing.status !== "pending") throw new ApiError(400, "This submission has already been reviewed");

  const statusMap = { approve: "approved", edit_approve: "edited_approved", reject: "rejected" } as const;

  const [updated] = await db
    .update(kbSubmissions)
    .set({
      status: statusMap[input.action],
      proposedContent: input.action === "edit_approve" && input.editedContent ? input.editedContent : existing.proposedContent,
      reviewedBy,
      reviewedAt: new Date(),
      reviewNotes: input.reviewNotes,
    })
    .where(eq(kbSubmissions.id, submissionId))
    .returning();

  // NOTE: once AI Support (Phase 8, pending a Gemini API key) is wired up, an approved/edited-approved
  // submission here should also create a searchable content_items entry and trigger re-embedding.
  return updated;
}

export async function assertTicketAccess(ticketId: string, userId: string, role: string) {
  const [ticket] = await db.select().from(supportTickets).where(eq(supportTickets.id, ticketId)).limit(1);
  if (!ticket) throw new ApiError(404, "Ticket not found");
  const isManager = ["super_admin", "admin", "trainer"].includes(role);
  if (!isManager && ticket.userId !== userId) {
    throw new ApiError(403, "You do not have access to this ticket");
  }
  return ticket;
}
