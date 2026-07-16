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
  createdAt: string | null;
}

export function useTrainingCompletionReport(filter: { franchiseId?: string }) {
  return useQuery({
    queryKey: ["training-completion-report", filter],
    queryFn: async () => (await api.get<TrainingCompletionRow[]>("/analytics/training-completion", { params: filter })).data,
  });
}

export interface UserLearningProgress {
  user: { id: string; name: string; email: string; role: string; franchiseId: string | null };
  trainings: {
    trainingTitle: string;
    isStandaloneAssessment: boolean;
    completed: boolean;
    completedAt: string | null;
    startedAt: string | null;
  }[];
  assessments: {
    title: string;
    bestScore: string | null;
    passed: boolean;
    attemptsUsed: number;
    lastAttemptedAt: string | null;
  }[];
  certificates: { certificateNumber: string; scorePercentage: string; issuedAt: string }[];
}

export function useUserProgress(userId: string | null) {
  return useQuery({
    queryKey: ["user-progress", userId],
    queryFn: async () => (await api.get<UserLearningProgress>(`/analytics/users/${userId}/progress`)).data,
    enabled: !!userId,
  });
}
