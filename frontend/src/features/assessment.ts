import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "../lib/api.js";

export interface AssessmentQuestionInput {
  questionText: string;
  type: "mcq" | "true_false";
  options: { optionText: string; isCorrect: boolean }[];
}

export function useCreateAssessment(trainingId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      title: string;
      passPercentage: number;
      maxAttempts: number;
      questions: AssessmentQuestionInput[];
    }) => (await api.post("/assessments", { trainingId, ...input })).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["training", trainingId] }),
  });
}

export interface AssessmentForUser {
  assessment: { id: string; title: string; passPercentage: number; maxAttempts: number };
  questions: { id: string; questionText: string; type: string; options: { id: string; optionText: string }[] }[];
  result: { attemptsUsed: number; bestScorePercentage: string | null; passed: boolean } | null;
}

export function useAssessmentForUser(assessmentId: string | null) {
  return useQuery({
    queryKey: ["assessment-for-user", assessmentId],
    queryFn: async () => (await api.get<AssessmentForUser>(`/assessments/${assessmentId}/for-user`)).data,
    enabled: !!assessmentId,
  });
}

export interface AssessmentSubmitResult {
  scorePercentage: number;
  passed: boolean;
  attemptsUsed: number;
  maxAttempts: number;
  breakdown: { questionId: string; selectedOptionId: string | null; correctOptionId: string | null; isCorrect: boolean }[];
  certificate: { id: string; certificateNumber: string } | null;
}

export function useSubmitAssessment(assessmentId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (answers: { questionId: string; selectedOptionId: string }[]) =>
      (await api.post<AssessmentSubmitResult>(`/assessments/${assessmentId}/submit`, { answers })).data,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["assessment-for-user", assessmentId] });
      qc.invalidateQueries({ queryKey: ["my-certificates"] });
    },
  });
}

export interface Certificate {
  id: string;
  certificateNumber: string;
  trainingId: string;
  trainingTitle: string;
  scorePercentage: string;
  issuedAt: string;
}

export function useMyCertificates() {
  return useQuery({
    queryKey: ["my-certificates"],
    queryFn: async () => (await api.get<Certificate[]>("/certificates/mine")).data,
  });
}

export function useCertificateDownloadUrl() {
  return useMutation({
    mutationFn: async (certificateId: string) =>
      (await api.get<{ url: string }>(`/certificates/${certificateId}/download-url`)).data,
  });
}
