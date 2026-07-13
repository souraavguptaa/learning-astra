import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "../lib/api.js";
import type { UserRole } from "../lib/authContext.js";
import type { ContentItem } from "./content.js";

export interface Training {
  id: string;
  title: string;
  description: string;
  status: "draft" | "published";
  isMandatory: boolean;
  versionMajor: number;
  versionMinor: number;
  npsEnabled: boolean;
  trainerId: string;
  publishedAt: string | null;
}

export interface TrainingItem {
  id: string;
  trainingId: string;
  itemOrder: number;
  itemType: "content" | "assessment";
  contentId: string | null;
  assessmentId: string | null;
}

export interface AssessmentSummary {
  id: string;
  title: string;
  trainingId: string;
  passPercentage: number;
  maxAttempts: number;
}

export interface TrainingAssignment {
  id: string;
  trainingId: string;
  assigneeType: "user" | "role" | "franchise";
  userId: string | null;
  role: UserRole | null;
  franchiseId: string | null;
}

export interface TrainingProgress {
  id: string;
  userId: string;
  trainingId: string;
  currentItemOrder: number;
  completed: boolean;
  completedAt: string | null;
  requiresRecompletion: boolean;
}

export interface ContentProgress {
  id: string;
  userId: string;
  contentId: string;
  highestPointSeconds: string;
  lastPositionSeconds: string;
  completed: boolean;
  completedAt: string | null;
}

export interface AssessmentResultSummary {
  id: string;
  userId: string;
  assessmentId: string;
  attemptsUsed: number;
  bestScorePercentage: string | null;
  passed: boolean;
}

export function useTrainings() {
  return useQuery({
    queryKey: ["trainings"],
    queryFn: async () => (await api.get<Training[]>("/trainings")).data,
  });
}

export function useTrainingDetail(trainingId: string | null) {
  return useQuery({
    queryKey: ["training", trainingId],
    queryFn: async () =>
      (
        await api.get<{
          training: Training;
          items: { item: TrainingItem; content: ContentItem | null; assessment: AssessmentSummary | null }[];
          assignments: TrainingAssignment[];
        }>(`/trainings/${trainingId}`)
      ).data,
    enabled: !!trainingId,
  });
}

type TrainingDetail = {
  training: Training;
  items: { item: TrainingItem; content: ContentItem | null; assessment: AssessmentSummary | null }[];
  assignments: TrainingAssignment[];
};

export function useUpdateTraining(trainingId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: Partial<{ title: string; description: string; isMandatory: boolean; npsEnabled: boolean }>) =>
      (await api.put<Training>(`/trainings/${trainingId}`, input)).data,
    // Optimistic: flip the UI instantly instead of waiting on a round-trip, roll back on failure.
    onMutate: async (input) => {
      await qc.cancelQueries({ queryKey: ["training", trainingId] });
      const previous = qc.getQueryData<TrainingDetail>(["training", trainingId]);
      if (previous) {
        qc.setQueryData<TrainingDetail>(["training", trainingId], {
          ...previous,
          training: { ...previous.training, ...input },
        });
      }
      return { previous };
    },
    onError: (_err, _input, context) => {
      if (context?.previous) qc.setQueryData(["training", trainingId], context.previous);
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: ["training", trainingId] });
      qc.invalidateQueries({ queryKey: ["trainings"] });
    },
  });
}

export function useCreateTraining() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { title: string; description: string; isMandatory: boolean }) =>
      (await api.post<Training>("/trainings", input)).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["trainings"] }),
  });
}

export function useAddTrainingItem(trainingId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (contentId: string) =>
      (await api.post<TrainingItem>(`/trainings/${trainingId}/items`, { contentId })).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["training", trainingId] }),
  });
}

export function useReorderTrainingItems(trainingId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (itemIds: string[]) =>
      (await api.put(`/trainings/${trainingId}/items/reorder`, { itemIds })).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["training", trainingId] }),
  });
}

export function useRemoveTrainingItem(trainingId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (itemId: string) => api.delete(`/trainings/${trainingId}/items/${itemId}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["training", trainingId] }),
  });
}

export function usePublishTraining(trainingId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async () => (await api.post<Training>(`/trainings/${trainingId}/publish`)).data,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["training", trainingId] });
      qc.invalidateQueries({ queryKey: ["trainings"] });
    },
  });
}

export function useBumpVersion(trainingId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (changeType: "minor" | "major") =>
      (await api.post<Training>(`/trainings/${trainingId}/version`, { changeType })).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["training", trainingId] }),
  });
}

export function useAssignTraining(trainingId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      assigneeType: "user" | "role" | "franchise";
      userId?: string;
      role?: UserRole;
      franchiseId?: string;
    }) => (await api.post<TrainingAssignment>(`/trainings/${trainingId}/assign`, input)).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["training", trainingId] }),
  });
}

export function useRemoveAssignment(trainingId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (assignmentId: string) => api.delete(`/trainings/${trainingId}/assign/${assignmentId}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["training", trainingId] }),
  });
}

export function useAssignedTrainings() {
  return useQuery({
    queryKey: ["assigned-trainings"],
    queryFn: async () =>
      (await api.get<{ training: Training; progress: TrainingProgress | null }[]>("/trainings/assigned")).data,
  });
}

export function useTrainingForUser(trainingId: string | null) {
  return useQuery({
    queryKey: ["training-for-user", trainingId],
    queryFn: async () =>
      (
        await api.get<{
          training: Training;
          items: {
            item: TrainingItem;
            content: ContentItem | null;
            assessment: AssessmentSummary | null;
            progress: (ContentProgress & { passed?: undefined }) | (AssessmentResultSummary & { completed?: undefined }) | null;
            unlocked: boolean;
          }[];
        }>(`/trainings/${trainingId}/for-user`)
      ).data,
    enabled: !!trainingId,
  });
}
