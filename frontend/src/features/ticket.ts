import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "../lib/api.js";

export interface Attachment {
  fileKey: string;
  fileName: string;
}

export interface Ticket {
  id: string;
  userId: string;
  subject: string;
  description: string;
  status: "open" | "in_progress" | "resolved";
  assignedTrainerId: string | null;
  attachments: Attachment[];
  resolvedAt: string | null;
  createdAt: string;
  requesterName?: string;
  requesterEmail?: string;
}

export interface TicketMessage {
  id: string;
  ticketId: string;
  senderId: string;
  senderName: string;
  senderRole: string;
  message: string;
  attachments: Attachment[];
  createdAt: string;
}

export interface KbSubmission {
  id: string;
  ticketId: string;
  trainerId: string;
  proposedContent: { title: string; description: string; topic: string; language: string };
  status: "pending" | "approved" | "edited_approved" | "rejected";
  reviewNotes: string | null;
}

export function useMyTickets() {
  return useQuery({
    queryKey: ["my-tickets"],
    queryFn: async () => (await api.get<Ticket[]>("/tickets/mine")).data,
  });
}

export function useTicketQueue(status?: string) {
  return useQuery({
    queryKey: ["ticket-queue", status],
    queryFn: async () => (await api.get<Ticket[]>("/tickets", { params: status ? { status } : {} })).data,
  });
}

export function useTicketDetail(ticketId: string | null) {
  return useQuery({
    queryKey: ["ticket", ticketId],
    queryFn: async () =>
      (await api.get<{ ticket: Ticket; messages: TicketMessage[]; kbSubmissions: KbSubmission[] }>(`/tickets/${ticketId}`)).data,
    enabled: !!ticketId,
  });
}

export function useCreateTicket() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { subject: string; description: string; attachments?: Attachment[] }) =>
      (await api.post<Ticket>("/tickets", input)).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["my-tickets"] }),
  });
}

export function useAddTicketMessage(ticketId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (message: string) => (await api.post(`/tickets/${ticketId}/messages`, { message })).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["ticket", ticketId] }),
  });
}

export function useSetTicketStatus(ticketId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (status: "open" | "in_progress" | "resolved") =>
      (await api.patch<Ticket>(`/tickets/${ticketId}/status`, { status })).data,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["ticket", ticketId] });
      qc.invalidateQueries({ queryKey: ["ticket-queue"] });
    },
  });
}

export function useSubmitKbSolution(ticketId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { title: string; description: string; topic: string; language: string }) =>
      (await api.post(`/tickets/${ticketId}/kb-submission`, input)).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["ticket", ticketId] }),
  });
}

export function usePendingKbSubmissions() {
  return useQuery({
    queryKey: ["kb-submissions"],
    queryFn: async () => (await api.get<(KbSubmission & { ticketSubject: string; trainerName: string })[]>("/kb-submissions")).data,
  });
}

export function useReviewKbSubmission() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      ...input
    }: {
      id: string;
      action: "approve" | "edit_approve" | "reject";
      editedContent?: { title: string; description: string; topic: string; language: string };
      reviewNotes?: string;
    }) => (await api.post(`/kb-submissions/${id}/review`, input)).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["kb-submissions"] }),
  });
}
