import { api, tokenStore } from "../lib/api.js";

export interface ProgressState {
  lastPositionSeconds: number;
  highestPointSeconds: number;
  completed: boolean;
}

export async function fetchProgress(contentId: string): Promise<ProgressState> {
  return (await api.get<ProgressState>(`/progress/content/${contentId}`)).data;
}

export async function sendHeartbeat(
  contentId: string,
  currentTime: number,
  durationSeconds?: number,
): Promise<ProgressState> {
  return (await api.post<ProgressState>(`/progress/content/${contentId}/heartbeat`, { currentTime, durationSeconds }))
    .data;
}

export async function markViewed(contentId: string): Promise<{ completed: boolean }> {
  return (await api.post<{ completed: boolean }>(`/progress/content/${contentId}/view`)).data;
}

/** Best-effort final position save on tab close — uses sendBeacon so it fires even mid-unload. */
export function beaconFinalPosition(contentId: string, currentTime: number, durationSeconds?: number) {
  const token = tokenStore.getAccess();
  if (!token) return;
  const blob = new Blob([JSON.stringify({ currentTime, durationSeconds })], { type: "application/json" });
  // sendBeacon can't set custom headers, so we pass the token via query string for this one best-effort call.
  navigator.sendBeacon?.(`/api/progress/content/${contentId}/heartbeat?token=${encodeURIComponent(token)}`, blob);
}
