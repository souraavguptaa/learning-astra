import { useQueryClient } from "@tanstack/react-query";
import { CheckCircle2, Lock, Play } from "lucide-react";
import { lazy, Suspense, useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { AssessmentRunner } from "../../components/assessment/AssessmentRunner.js";
import { NpsPrompt } from "../../components/common/NpsPrompt.js";
import { VideoPlayer } from "../../components/video/VideoPlayer.js";
import { useContentPlaybackUrl } from "../../features/content.js";
import { markViewed } from "../../features/progress.js";
import { useTrainingForUser } from "../../features/training.js";

const DocumentViewer = lazy(() =>
  import("../../components/documentViewer/DocumentViewer.js").then((m) => ({ default: m.DocumentViewer })),
);

function isItemComplete(entry: { item: { itemType: string }; progress: { completed?: boolean; passed?: boolean } | null }): boolean {
  if (!entry.progress) return false;
  return entry.item.itemType === "assessment" ? !!entry.progress.passed : !!entry.progress.completed;
}

export function TrainingPlayerPage() {
  const { trainingId } = useParams<{ trainingId: string }>();
  const { data, refetch } = useTrainingForUser(trainingId ?? null);
  const qc = useQueryClient();
  const [activeItemId, setActiveItemId] = useState<string | null>(null);

  useEffect(() => {
    if (!data) return;
    if (activeItemId && data.items.some((i) => i.item.id === activeItemId)) return;
    const firstIncomplete = data.items.find((i) => i.unlocked && !isItemComplete(i));
    setActiveItemId((firstIncomplete ?? data.items[0])?.item.id ?? null);
  }, [data, activeItemId]);

  const activeEntry = data?.items.find((i) => i.item.id === activeItemId);
  const isAssessmentItem = activeEntry?.item.itemType === "assessment";
  const { data: playback } = useContentPlaybackUrl(!isAssessmentItem ? (activeEntry?.content?.id ?? null) : null);

  useEffect(() => {
    if (!activeEntry?.content || activeEntry.content.type === "video") return;
    if (activeEntry.progress?.completed) return;
    markViewed(activeEntry.content.id).then(() => {
      refetch();
    });
  }, [activeEntry, refetch]);

  if (!data) return <p className="text-slate-400">Loading…</p>;

  const allItemsComplete = data.items.length > 0 && data.items.every((entry) => isItemComplete(entry));

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div className="lg:col-span-1 space-y-2">
        <h1 className="text-lg font-bold text-slate-800 mb-2">{data.training.title}</h1>
        {data.items.map((entry, idx) => {
          const { item, content, assessment, unlocked } = entry;
          const complete = isItemComplete(entry);
          return (
            <button
              key={item.id}
              onClick={() => setActiveItemId(item.id)}
              className={`w-full text-left px-3 py-2 rounded text-sm border flex items-center gap-2 ${
                activeItemId === item.id ? "border-astra bg-blue-50" : "border-slate-200 bg-white"
              } ${!unlocked ? "opacity-50" : ""}`}
            >
              <span>
                {complete ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                ) : unlocked ? (
                  <Play className="w-4 h-4 text-astra" />
                ) : (
                  <Lock className="w-4 h-4 text-slate-400" />
                )}
              </span>
              <span className="flex-1">
                {idx + 1}. {item.itemType === "assessment" ? (assessment?.title ?? "Quiz") : (content?.title ?? "Untitled")}
              </span>
            </button>
          );
        })}
      </div>

      <div className="lg:col-span-2">
        {data.items.length === 0 && (
          <p className="text-slate-400">This training doesn't have any content yet. Check back later or contact your trainer.</p>
        )}
        {data.items.length > 0 && !activeEntry && <p className="text-slate-400">Select an item to begin.</p>}
        {activeEntry && !activeEntry.unlocked && (
          <div className="bg-white rounded-lg shadow-clay p-4 flex items-start gap-3">
            <Lock className="w-5 h-5 text-slate-400 shrink-0 mt-0.5" />
            <div>
              <p className="font-medium text-slate-700">This item is locked</p>
              <p className="text-slate-500 text-sm mt-0.5">
                {(() => {
                  const idx = data.items.findIndex((i) => i.item.id === activeEntry.item.id);
                  const prev = idx > 0 ? data.items[idx - 1] : null;
                  const prevTitle = prev ? (prev.item.itemType === "assessment" ? (prev.assessment?.title ?? "the previous quiz") : (prev.content?.title ?? "the previous item")) : null;
                  return prevTitle
                    ? `Complete "${prevTitle}" first to unlock this.`
                    : "Complete the previous item to unlock this one.";
                })()}
              </p>
            </div>
          </div>
        )}
        {activeEntry?.unlocked && isAssessmentItem && activeEntry.assessment && (
          <div className="bg-white rounded-lg shadow-clay p-4">
            <h2 className="font-semibold mb-3">{activeEntry.assessment.title}</h2>
            <AssessmentRunner
              assessmentId={activeEntry.assessment.id}
              onPassed={() => {
                qc.invalidateQueries({ queryKey: ["training-for-user", trainingId] });
                qc.invalidateQueries({ queryKey: ["assigned-trainings"] });
              }}
            />
          </div>
        )}
        {activeEntry?.unlocked && !isAssessmentItem && activeEntry.content && (
          <div className="bg-white rounded-lg shadow-clay p-4">
            <h2 className="font-semibold mb-3">{activeEntry.content.title}</h2>
            {!playback && <p className="text-slate-400 text-sm">Loading…</p>}
            {playback && activeEntry.content.type === "video" && (
              <VideoPlayer
                contentId={activeEntry.content.id}
                src={playback.url}
                onComplete={() => qc.invalidateQueries({ queryKey: ["training-for-user", trainingId] })}
              />
            )}
            {playback && activeEntry.content.type !== "video" && (
              <Suspense fallback={<p className="text-slate-400 text-sm">Loading viewer…</p>}>
                <DocumentViewer fileUrl={playback.url} />
              </Suspense>
            )}
          </div>
        )}
        {allItemsComplete && data.training.npsEnabled && trainingId && <NpsPrompt trainingId={trainingId} />}
      </div>
    </div>
  );
}
