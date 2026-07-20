import { CheckCircle2, Lock, Pause, Play } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useAuth } from "../../lib/authContext.js";
import { useVideoProgress } from "./useVideoProgress.js";

function formatTime(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) return "0:00";
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export function VideoPlayer({ contentId, src, onComplete }: { contentId: string; src: string; onComplete?: () => void }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const { progress, ready, runHeartbeat, startHeartbeat, stopHeartbeat } = useVideoProgress(contentId, videoRef);
  const { user } = useAuth();

  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [seeded, setSeeded] = useState(false);
  const wasCompletedRef = useRef(false);

  const highestPoint = progress?.highestPointSeconds ?? 0;
  const completed = progress?.completed ?? false;

  useEffect(() => {
    if (completed && !wasCompletedRef.current) {
      wasCompletedRef.current = true;
      onComplete?.();
    }
  }, [completed, onComplete]);

  function handleLoadedMetadata() {
    const video = videoRef.current;
    if (!video || !ready || seeded) return;
    video.currentTime = progress?.lastPositionSeconds ?? 0;
    setDuration(video.duration);
    setSeeded(true);
  }

  function togglePlay() {
    const video = videoRef.current;
    if (!video) return;
    if (video.paused) {
      video.play();
    } else {
      video.pause();
    }
  }

  function handlePlay() {
    const video = videoRef.current;
    if (video) video.playbackRate = 1;
    setIsPlaying(true);
    startHeartbeat();
  }

  function handlePause() {
    setIsPlaying(false);
    stopHeartbeat();
    runHeartbeat();
  }

  function handleTimeUpdate() {
    const video = videoRef.current;
    if (!video) return;
    setCurrentTime(video.currentTime);
    if (video.playbackRate !== 1) video.playbackRate = 1;
  }

  function handleSeeking() {
    const video = videoRef.current;
    if (!video || completed) return;
    // Defense in depth: the server never trusts the client, but snap the UI back immediately
    // so a forward-seek attempt beyond the validated highest point doesn't even look like it worked.
    if (video.currentTime > highestPoint + 0.5) {
      video.currentTime = highestPoint;
    }
  }

  function handleSeekBarClick(e: React.MouseEvent<HTMLDivElement>) {
    const video = videoRef.current;
    if (!video || !duration) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const ratio = (e.clientX - rect.left) / rect.width;
    const target = ratio * duration;
    const maxAllowed = completed ? duration : highestPoint;
    video.currentTime = Math.min(target, maxAllowed);
  }

  const progressRatio = duration ? Math.min(currentTime / duration, 1) : 0;
  const unlockedRatio = duration ? Math.min(highestPoint / duration, 1) : 0;

  return (
    <div className="w-full select-none" onContextMenu={(e) => e.preventDefault()}>
      <div className="relative">
        <video
          ref={videoRef}
          src={src}
          className="w-full rounded bg-black"
          controls={false}
          onLoadedMetadata={handleLoadedMetadata}
          onPlay={handlePlay}
          onPause={handlePause}
          onTimeUpdate={handleTimeUpdate}
          onSeeking={handleSeeking}
          onEnded={() => runHeartbeat()}
          disablePictureInPicture
          playsInline
        />
        {user && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none overflow-hidden">
            <span className="text-white/25 text-sm font-medium -rotate-[20deg] whitespace-nowrap">
              {user.name} · {user.email}
            </span>
          </div>
        )}
      </div>
      <div className="flex flex-wrap items-center gap-3 mt-2 bg-slate-100 rounded px-3 py-2">
        <button
          onClick={togglePlay}
          className="w-8 h-8 flex items-center justify-center rounded-full bg-astra text-white text-sm shrink-0"
        >
          {isPlaying ? <Pause className="w-4 h-4" fill="currentColor" /> : <Play className="w-4 h-4" fill="currentColor" />}
        </button>
        <span className="text-xs text-slate-500 w-20 tabular-nums shrink-0">
          {formatTime(currentTime)} / {formatTime(duration)}
        </span>
        {/* Taller click area than the visible bar itself — an 8px-tall strip is nearly
            impossible to tap precisely on a phone. */}
        <div
          className="relative flex-1 min-w-[80px] py-3 -my-3 cursor-pointer"
          onClick={handleSeekBarClick}
          title={completed ? "Seek freely" : "Locked until you finish watching once"}
        >
          <div className="relative h-2 bg-slate-300 rounded">
            {!completed && (
              <div
                className="absolute inset-y-0 left-0 bg-slate-400/50 rounded"
                style={{ width: `${unlockedRatio * 100}%` }}
              />
            )}
            <div className="absolute inset-y-0 left-0 bg-astra rounded" style={{ width: `${progressRatio * 100}%` }} />
          </div>
        </div>
        {!completed && (
          <span className="text-xs text-slate-400 inline-flex items-center gap-1 shrink-0">
            <Lock className="w-3.5 h-3.5" /> 1x, no skip
          </span>
        )}
        {completed && (
          <span className="text-xs text-emerald-600 inline-flex items-center gap-1 shrink-0">
            <CheckCircle2 className="w-3.5 h-3.5" /> Completed
          </span>
        )}
      </div>
    </div>
  );
}
