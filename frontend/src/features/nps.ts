import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "../lib/api.js";

export function useNpsStatus(trainingId: string | null) {
  return useQuery({
    queryKey: ["nps-status", trainingId],
    queryFn: async () => (await api.get<{ submitted: boolean; rating: number | null }>(`/trainings/${trainingId}/nps-status`)).data,
    enabled: !!trainingId,
  });
}

export function useSubmitNps(trainingId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (rating: number) => (await api.post(`/trainings/${trainingId}/nps`, { rating })).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["nps-status", trainingId] }),
  });
}

export interface NpsReport {
  responseCount: number;
  average: number | null;
  distribution: Record<string, number>;
}

export function useNpsReport(trainingId: string | null) {
  return useQuery({
    queryKey: ["nps-report", trainingId],
    queryFn: async () => (await api.get<NpsReport>(`/trainings/${trainingId}/nps-report`)).data,
    enabled: !!trainingId,
  });
}
