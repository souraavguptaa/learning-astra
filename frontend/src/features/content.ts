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

export function useUploadContent() {
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
      const { data: uploadInfo } = await api.post<{ uploadUrl: string; fileKey: string }>("/content/upload-url", {
        filename: file.name,
        contentType: file.type || "application/octet-stream",
      });

      const putRes = await fetch(uploadInfo.uploadUrl, {
        method: "PUT",
        headers: { "Content-Type": file.type || "application/octet-stream" },
        body: file,
      });
      if (!putRes.ok) {
        throw new Error(`File upload to storage failed (${putRes.status}). Check your connection and try again.`);
      }

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
