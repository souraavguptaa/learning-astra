import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "../lib/api.js";
import type { UserRole } from "../lib/authContext.js";

export interface AttendanceStatus {
  clockedIn: boolean;
  clockInAt?: string;
  onBreak?: boolean;
  breakStartAt?: string | null;
}

export interface AttendanceReportRow {
  sessionId: string;
  userId: string;
  userName: string;
  userRole: UserRole;
  clockInAt: string;
  clockOutAt: string | null;
  breakSeconds: number;
  workedSeconds: number | null;
}

export function useAttendanceStatus() {
  return useQuery({
    queryKey: ["attendance-status"],
    queryFn: async () => (await api.get<AttendanceStatus>("/attendance/status")).data,
    refetchInterval: 30000, // keep the header widget's elapsed time roughly in sync
  });
}

export function useStartBreak() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async () => api.post("/attendance/break/start"),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["attendance-status"] }),
  });
}

export function useEndBreak() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async () => api.post("/attendance/break/end"),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["attendance-status"] }),
  });
}

export function useAttendanceReport(params?: { from?: string; to?: string; userId?: string }) {
  return useQuery({
    queryKey: ["attendance-report", params],
    queryFn: async () => (await api.get<AttendanceReportRow[]>("/attendance/report", { params })).data,
  });
}
