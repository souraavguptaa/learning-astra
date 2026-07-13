import { useCallback, useEffect, useRef, useState } from "react";
import { beaconFinalPosition, fetchProgress, sendHeartbeat, type ProgressState } from "../../features/progress.js";

const HEARTBEAT_INTERVAL_MS = 5000;

export function useVideoProgress(contentId: string, videoRef: React.RefObject<HTMLVideoElement>) {
  const [progress, setProgress] = useState<ProgressState | null>(null);
  const [ready, setReady] = useState(false);
  const heartbeatTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  const progressRef = useRef<ProgressState | null>(null);

  progressRef.current = progress;

  useEffect(() => {
    let cancelled = false;
    fetchProgress(contentId).then((p) => {
      if (!cancelled) {
        setProgress(p);
        setReady(true);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [contentId]);

  const runHeartbeat = useCallback(async () => {
    const video = videoRef.current;
    if (!video) return;
    const result = await sendHeartbeat(contentId, video.currentTime, video.duration || undefined);
    setProgress(result);
  }, [contentId, videoRef]);

  const startHeartbeat = useCallback(() => {
    if (heartbeatTimer.current) return;
    heartbeatTimer.current = setInterval(runHeartbeat, HEARTBEAT_INTERVAL_MS);
  }, [runHeartbeat]);

  const stopHeartbeat = useCallback(() => {
    if (heartbeatTimer.current) {
      clearInterval(heartbeatTimer.current);
      heartbeatTimer.current = null;
    }
  }, []);

  useEffect(() => {
    function handleVisibilityChange() {
      const video = videoRef.current;
      if (document.hidden && video && !video.paused) {
        video.pause();
      }
    }
    function handlePageHide() {
      const video = videoRef.current;
      if (video) beaconFinalPosition(contentId, video.currentTime, video.duration || undefined);
    }
    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("pagehide", handlePageHide);
    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("pagehide", handlePageHide);
      stopHeartbeat();
    };
  }, [contentId, videoRef, stopHeartbeat]);

  return { progress, ready, runHeartbeat, startHeartbeat, stopHeartbeat };
}
