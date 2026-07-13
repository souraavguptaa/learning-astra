import { useQuery } from "@tanstack/react-query";
import { api } from "../lib/api.js";
import { useAuth } from "../lib/authContext.js";

export interface Badge {
  id: string;
  code: string;
  name: string;
  description: string;
  icon: string;
  earnedAt: string;
}

export interface GamificationSummary {
  totalPoints: number;
  badges: Badge[];
}

export function useMyGamification() {
  return useQuery({
    queryKey: ["my-gamification"],
    queryFn: async () => (await api.get<GamificationSummary>("/gamification/me")).data,
  });
}

export interface LeaderboardEntry {
  userId: string;
  name: string;
  totalPoints: number;
}

export function useLeaderboard() {
  const { user } = useAuth();
  const category = user?.role === "employee" ? "employee" : "franchise";
  return useQuery({
    queryKey: ["leaderboard", category],
    queryFn: async () => (await api.get<LeaderboardEntry[]>(`/gamification/leaderboard/${category}`)).data,
    enabled: !!user,
  });
}
