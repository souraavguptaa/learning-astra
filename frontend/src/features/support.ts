import { useMutation } from "@tanstack/react-query";
import { api } from "../lib/api.js";

export interface SupportMatch {
  type: "content" | "announcement" | "ad";
  id: string;
  title: string;
  deepLink: string;
}

export interface SupportAskResult {
  confident: boolean;
  answer: string | null;
  message: string | null;
  matches: SupportMatch[];
}

export function useAskSupport() {
  return useMutation({
    mutationFn: async (query: string) => (await api.post<SupportAskResult>("/support/ask", { query })).data,
  });
}
