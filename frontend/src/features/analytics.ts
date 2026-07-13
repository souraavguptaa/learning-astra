import { useQuery } from "@tanstack/react-query";
import { api } from "../lib/api.js";

export interface AnalyticsOverview {
  totalUsers: number;
  activeUsers: number;
  trainingCompletionRate: number | null;
  assessmentPassRate: number | null;
  averageNps: number | null;
  aiSupportQueries: number;
  unansweredQueries: number;
  openTickets: number;
}

export function useAnalyticsOverview() {
  return useQuery({
    queryKey: ["analytics-overview"],
    queryFn: async () => (await api.get<AnalyticsOverview>("/analytics/overview")).data,
  });
}

export interface TrainingCompletionRow {
  trainingTitle: string;
  userName: string;
  userEmail: string;
  role: string;
  franchiseName: string | null;
  completed: boolean;
  completedAt: string | null;
  createdAt: string;
}

export function useTrainingCompletionReport(filter: { franchiseId?: string }) {
  return useQuery({
    queryKey: ["training-completion-report", filter],
    queryFn: async () => (await api.get<TrainingCompletionRow[]>("/analytics/training-completion", { params: filter })).data,
  });
}

export function trainingCompletionExportUrl(filter: { franchiseId?: string }) {
  const params = new URLSearchParams({ format: "xlsx", ...(filter.franchiseId ? { franchiseId: filter.franchiseId } : {}) });
  return `/api/analytics/training-completion?${params.toString()}`;
}
