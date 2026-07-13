import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "../lib/api.js";
import type { UserRole } from "../lib/authContext.js";

export interface Franchise {
  id: string;
  companyId: string;
  name: string;
  code: string | null;
  location: string | null;
}

export interface OrgUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  franchiseId: string | null;
  location: string | null;
  isActive: boolean;
}

export function useFranchises() {
  return useQuery({
    queryKey: ["franchises"],
    queryFn: async () => (await api.get<Franchise[]>("/org/franchises")).data,
  });
}

export function useCreateFranchise() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { name: string; code?: string; location?: string }) =>
      (await api.post<Franchise>("/org/franchises", input)).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["franchises"] }),
  });
}

export function useUsers(params?: { role?: UserRole; franchiseId?: string }) {
  return useQuery({
    queryKey: ["users", params],
    queryFn: async () => (await api.get<OrgUser[]>("/org/users", { params })).data,
  });
}

export function useCreateUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      name: string;
      email: string;
      role: UserRole;
      franchiseId?: string;
      location?: string;
    }) => (await api.post<{ user: OrgUser; tempPassword: string }>("/org/users", input)).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["users"] }),
  });
}

export function useSetUserActive() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, isActive }: { id: string; isActive: boolean }) =>
      (await api.patch<OrgUser>(`/org/users/${id}/active`, { isActive })).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["users"] }),
  });
}

export function useResetPassword() {
  return useMutation({
    mutationFn: async (id: string) =>
      (await api.post<{ email: string; tempPassword: string }>(`/org/users/${id}/reset-password`)).data,
  });
}
