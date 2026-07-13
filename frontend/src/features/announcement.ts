import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "../lib/api.js";
import type { UserRole } from "../lib/authContext.js";

export interface Announcement {
  id: string;
  title: string;
  body: string;
  attachmentFileKey: string | null;
  trainingLinkId: string | null;
  targetType: "all" | "role" | "franchise";
  targetRole: UserRole | null;
  targetFranchiseId: string | null;
  createdAt: string;
  isRead?: boolean;
}

export function useMyAnnouncements() {
  return useQuery({
    queryKey: ["announcements-mine"],
    queryFn: async () => (await api.get<Announcement[]>("/announcements/mine")).data,
  });
}

export function useAllAnnouncements() {
  return useQuery({
    queryKey: ["announcements-all"],
    queryFn: async () => (await api.get<Announcement[]>("/announcements/all")).data,
  });
}

export function useCreateAnnouncement() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      title: string;
      body: string;
      targetType: "all" | "role" | "franchise";
      targetRole?: UserRole;
      targetFranchiseId?: string;
    }) => (await api.post<Announcement>("/announcements", input)).data,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["announcements-all"] });
      qc.invalidateQueries({ queryKey: ["announcements-mine"] });
    },
  });
}

export function useMarkAnnouncementRead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => api.post(`/announcements/${id}/read`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["announcements-mine"] }),
  });
}

export function useDeleteAnnouncement() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => api.delete(`/announcements/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["announcements-all"] }),
  });
}

export function useAnnouncementReadStatus(id: string | null) {
  return useQuery({
    queryKey: ["announcement-read-status", id],
    queryFn: async () => (await api.get<{ userId: string; name: string; readAt: string | null }[]>(`/announcements/${id}/read-status`)).data,
    enabled: !!id,
  });
}
