import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "../lib/api.js";
import type { UserRole } from "../lib/authContext.js";

export type ContentType = "video" | "pdf" | "ppt" | "word" | "excel";

export interface ContentItem {
  id: string;
  masterTopicId: string | null;
  type: ContentType;
  title: string;
  description: string;
  topic: string;
  language: string;
  targetRoles: UserRole[];
  fileKey: string;
  convertedPdfKey: string | null;
  mimeType: string;
  status: "processing" | "ready" | "failed";
  createdAt: string;
}

export interface MasterTopic {
  id: string;
  title: string;
  category: string | null;
}

export function useContentList() {
  return useQuery({
    queryKey: ["content"],
    queryFn: async () => (await api.get<ContentItem[]>("/content")).data,
  });
}

export function useMasterTopics() {
  return useQuery({
    queryKey: ["master-topics"],
    queryFn: async () => (await api.get<MasterTopic[]>("/content/master-topics")).data,
  });
}

export function useCreateMasterTopic() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { title: string; category?: string }) =>
      (await api.post<MasterTopic>("/content/master-topics", input)).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["master-topics"] }),
  });
}

function inferContentType(file: File): ContentType {
  const ext = file.name.split(".").pop()?.toLowerCase();
  if (file.type.startsWith("video/")) return "video";
  if (ext === "pdf") return "pdf";
  if (ext === "ppt" || ext === "pptx") return "ppt";
  if (ext === "doc" || ext === "docx") return "word";
  if (ext === "xls" || ext === "xlsx") return "excel";
  return "pdf";
}

/** XHR (not fetch) because it's the only way to get upload progress events natively. */
function putWithProgress(url: string, file: File, onProgress: (pct: number) => void): Promise<void> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("PUT", url);
    xhr.setRequestHeader("Content-Type", file.type || "application/octet-stream");
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) onProgress(Math.round((e.loaded / e.total) * 100));
    };
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) resolve();
      else reject(new Error(`File upload to storage failed (${xhr.status}). Check your connection and try again.`));
    };
    xhr.onerror = () => reject(new Error("File upload to storage failed. Check your connection and try again."));
    xhr.send(file);
  });
}

export function useUploadContent(onProgress?: (pct: number) => void) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      file: File;
      title: string;
      description: string;
      topic: string;
      language: string;
      targetRoles: UserRole[];
      masterTopicId?: string;
    }) => {
      const { file } = input;
      onProgress?.(0);
      const { data: uploadInfo } = await api.post<{ uploadUrl: string; fileKey: string }>("/content/upload-url", {
        filename: file.name,
        contentType: file.type || "application/octet-stream",
      });

      await putWithProgress(uploadInfo.uploadUrl, file, (pct) => onProgress?.(pct));
      onProgress?.(100);

      const { data } = await api.post("/content", {
        type: inferContentType(file),
        title: input.title,
        description: input.description,
        topic: input.topic,
        language: input.language,
        targetRoles: input.targetRoles,
        fileKey: uploadInfo.fileKey,
        mimeType: file.type || "application/octet-stream",
        masterTopicId: input.masterTopicId || undefined,
      });
      return data as { item: ContentItem; warning: string | null };
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["content"] }),
    onSettled: () => onProgress?.(-1),
  });
}

export function useUpdateContent(contentId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      title?: string;
      description?: string;
      topic?: string;
      language?: string;
      targetRoles?: UserRole[];
      masterTopicId?: string | null;
      file?: File;
    }) => {
      const { file, ...rest } = input;
      let fileKey: string | undefined;
      let mimeType: string | undefined;
      if (file) {
        const { data: uploadInfo } = await api.post<{ uploadUrl: string; fileKey: string }>("/content/upload-url", {
          filename: file.name,
          contentType: file.type || "application/octet-stream",
        });
        await putWithProgress(uploadInfo.uploadUrl, file, () => {});
        fileKey = uploadInfo.fileKey;
        mimeType = file.type || "application/octet-stream";
      }
      const { data } = await api.put(`/content/${contentId}`, { ...rest, fileKey, mimeType });
      return data as { item: ContentItem; warning: string | null };
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["content"] }),
  });
}

export function useRetryConversion() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (contentId: string) => (await api.post(`/content/${contentId}/retry-conversion`)).data as { item: ContentItem; warning: string | null },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["content"] }),
  });
}

export function useDeleteContent() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (contentId: string) => api.delete(`/content/${contentId}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["content"] }),
  });
}

export function useContentPlaybackUrl(contentId: string | null) {
  return useQuery({
    queryKey: ["content-playback", contentId],
    queryFn: async () =>
      (await api.get<{ url: string; type: ContentType; viewedAsPdf: boolean }>(`/content/${contentId}/playback-url`))
        .data,
    enabled: !!contentId,
  });
}
