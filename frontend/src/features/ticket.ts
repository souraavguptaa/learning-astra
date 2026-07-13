import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api, uploadToR2 } from "../lib/api.js";
import { useAuth } from "../lib/authContext.js";

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
    refetchInterval: 15000,
  });
}

export function useTicketQueue(status?: string) {
  return useQuery({
    queryKey: ["ticket-queue", status],
    queryFn: async () => (await api.get<Ticket[]>("/tickets", { params: status ? { status } : {} })).data,
    refetchInterval: 15000,
  });
}

export function useTicketDetail(ticketId: string | null) {
  return useQuery({
    queryKey: ["ticket", ticketId],
    queryFn: async () =>
      (await api.get<{ ticket: Ticket; messages: TicketMessage[]; kbSubmissions: KbSubmission[] }>(`/tickets/${ticketId}`)).data,
    enabled: !!ticketId,
    refetchInterval: ticketId ? 5000 : false, // poll so replies show up without a manual reload
  });
}

export async function uploadTicketAttachment(file: File): Promise<Attachment> {
  const { data } = await api.post<{ uploadUrl: string; fileKey: string }>("/tickets/attachment-upload-url", {
    filename: file.name,
    contentType: file.type || "application/octet-stream",
  });
  await uploadToR2(data.uploadUrl, file);
  return { fileKey: data.fileKey, fileName: file.name };
}

export function useCreateTicket() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { subject: string; description: string; attachments?: Attachment[] }) =>
      (await api.post<Ticket>("/tickets", input)).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["my-tickets"] }),
  });
}

type TicketDetail = { ticket: Ticket; messages: TicketMessage[]; kbSubmissions: KbSubmission[] };

export function useAddTicketMessage(ticketId: string) {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (input: { message: string; attachments?: Attachment[] }) =>
      (await api.post(`/tickets/${ticketId}/messages`, input)).data,
    // Optimistic: show the sender's own message immediately instead of waiting on a poll cycle.
    onMutate: async (input) => {
      await qc.cancelQueries({ queryKey: ["ticket", ticketId] });
      const previous = qc.getQueryData<TicketDetail>(["ticket", ticketId]);
      if (previous && user) {
        const optimisticMessage: TicketMessage = {
          id: `optimistic-${Date.now()}`,
          ticketId,
          senderId: user.id,
          senderName: user.name,
          senderRole: user.role,
          message: input.message,
          attachments: input.attachments ?? [],
          createdAt: new Date().toISOString(),
        };
        qc.setQueryData<TicketDetail>(["ticket", ticketId], {
          ...previous,
          messages: [...previous.messages, optimisticMessage],
        });
      }
      return { previous };
    },
    onError: (_err, _input, context) => {
      if (context?.previous) qc.setQueryData(["ticket", ticketId], context.previous);
    },
    onSettled: () => qc.invalidateQueries({ queryKey: ["ticket", ticketId] }),
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
