import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api, uploadToR2 } from "../lib/api.js";

export interface Ad {
  id: string;
  title: string;
  imageFileKey: string;
  linkUrl: string;
  isActive: boolean;
  createdAt: string;
}

export function useActiveAds() {
  return useQuery({
    queryKey: ["ads-active"],
    queryFn: async () => (await api.get<Ad[]>("/ads/active")).data,
  });
}

export function useAllAds() {
  return useQuery({
    queryKey: ["ads-all"],
    queryFn: async () => (await api.get<Ad[]>("/ads/all")).data,
  });
}

export async function uploadAdImage(file: File): Promise<string> {
  const { data } = await api.post<{ uploadUrl: string; fileKey: string }>("/ads/upload-url", {
    filename: file.name,
    contentType: file.type || "application/octet-stream",
  });
  await uploadToR2(data.uploadUrl, file);
  return data.fileKey;
}

export function useCreateAd() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { title: string; imageFileKey: string; linkUrl: string }) =>
      (await api.post<Ad>("/ads", input)).data,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["ads-all"] });
      qc.invalidateQueries({ queryKey: ["ads-active"] });
    },
  });
}

export function useSetAdActive() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, isActive }: { id: string; isActive: boolean }) =>
      (await api.patch<Ad>(`/ads/${id}/active`, { isActive })).data,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["ads-all"] });
      qc.invalidateQueries({ queryKey: ["ads-active"] });
    },
  });
}

export function useDeleteAd() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => api.delete(`/ads/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["ads-all"] });
      qc.invalidateQueries({ queryKey: ["ads-active"] });
    },
  });
}

export interface PartnerVideo {
  id: string;
  title: string;
  youtubeUrl: string;
  createdAt: string;
}

export function usePartnerVideos() {
  return useQuery({
    queryKey: ["partner-videos"],
    queryFn: async () => (await api.get<PartnerVideo[]>("/videos")).data,
  });
}

export function useCreatePartnerVideo() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { title: string; youtubeUrl: string }) =>
      (await api.post<PartnerVideo>("/videos", input)).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["partner-videos"] }),
  });
}

export function useDeletePartnerVideo() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => api.delete(`/videos/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["partner-videos"] }),
  });
}

/** Extracts an 11-char YouTube video ID from any common URL shape (watch, youtu.be, shorts, embed). */
export function extractYoutubeId(url: string): string | null {
  const match = url.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|shorts\/))([\w-]{11})/);
  return match ? match[1] : null;
}
