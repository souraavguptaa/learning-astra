import { useMutation } from "@tanstack/react-query";
import { api } from "../lib/api.js";

export function useChangePassword() {
  return useMutation({
    mutationFn: async (input: { currentPassword: string; newPassword: string }) =>
      (await api.put("/auth/change-password", input)).data,
  });
}
