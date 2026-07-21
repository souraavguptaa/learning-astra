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

export interface TrendPoint {
  period: string;
  completions: number;
  quizPasses: number;
  activeLearners: number;
}

export function useAnalyticsTrends(params: { from?: string; to?: string; granularity: "day" | "month" }) {
  return useQuery({
    queryKey: ["analytics-trends", params],
    queryFn: async () => (await api.get<TrendPoint[]>("/analytics/trends", { params })).data,
  });
}

export interface SegmentRow {
  role: "franchise_owner" | "operator" | "employee";
  learnerCount: number;
  totalWatchHours: number;
  completionRate: number | null;
  quizPassRate: number | null;
}

export function useAnalyticsSegments() {
  return useQuery({
    queryKey: ["analytics-segments"],
    queryFn: async () => (await api.get<SegmentRow[]>("/analytics/segments")).data,
  });
}

export interface TrainerPerformanceRow {
  trainerId: string;
  trainerName: string;
  trainingsCreated: number;
  totalAssigned: number;
  totalCompleted: number;
  completionRate: number | null;
  quizPassRate: number | null;
}

export function useTrainerPerformance() {
  return useQuery({
    queryKey: ["analytics-trainers"],
    queryFn: async () => (await api.get<TrainerPerformanceRow[]>("/analytics/trainers")).data,
  });
}

export interface TrainingPerformanceRow {
  trainingId: string;
  title: string;
  trainerName: string;
  assignedCount: number;
  startedCount: number;
  completedCount: number;
  completionRate: number | null;
  quizAttemptedCount: number;
  quizAttemptRate: number | null;
  quizPassedCount: number;
  quizPassRate: number | null;
}

export function useTrainingPerformance() {
  return useQuery({
    queryKey: ["analytics-trainings"],
    queryFn: async () => (await api.get<TrainingPerformanceRow[]>("/analytics/trainings")).data,
  });
}
