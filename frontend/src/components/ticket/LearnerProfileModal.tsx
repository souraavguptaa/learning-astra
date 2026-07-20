import { X } from "lucide-react";
import { useUserProgress } from "../../features/analytics.js";

/** Opened from a support ticket so a trainer/admin can check what this person has actually
 * completed, started, or never touched — instead of just taking their word for it. */
export function LearnerProfileModal({ userId, onClose }: { userId: string; onClose: () => void }) {
  const { data, isLoading } = useUserProgress(userId);

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-6" onClick={onClose}>
      <div className="bg-white rounded-lg max-w-lg w-full p-5 max-h-[85vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="flex justify-between items-center mb-3">
          <h3 className="font-semibold">{data ? data.user.name : "Learner profile"}</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <X className="w-4 h-4" />
          </button>
        </div>

        {isLoading && <p className="text-slate-400 text-sm">Loading…</p>}

        {data && (
          <div className="space-y-4">
            <p className="text-xs text-slate-400">
              {data.user.email} · {data.user.role.replace("_", " ")}
            </p>

            <div>
              <h4 className="text-xs font-semibold text-slate-500 uppercase mb-1">Trainings &amp; assessments</h4>
              {data.trainings.length === 0 && <p className="text-sm text-slate-400">Nothing assigned.</p>}
              <div className="space-y-1">
                {data.trainings.map((t) => (
                  <div key={t.trainingTitle} className="flex items-center justify-between text-sm bg-slate-50 rounded px-2 py-1.5">
                    <span>{t.trainingTitle}</span>
                    <span
                      className={`text-xs px-2 py-0.5 rounded shrink-0 ml-2 ${
                        t.completed
                          ? "bg-emerald-50 text-emerald-700"
                          : t.startedAt
                            ? "bg-amber-50 text-amber-700"
                            : "bg-slate-200 text-slate-500"
                      }`}
                    >
                      {t.completed ? "Completed" : t.startedAt ? "In progress" : "Not started"}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {data.assessments.length > 0 && (
              <div>
                <h4 className="text-xs font-semibold text-slate-500 uppercase mb-1">Quiz results</h4>
                <div className="space-y-1">
                  {data.assessments.map((a, i) => (
                    <div key={i} className="flex items-center justify-between text-sm bg-slate-50 rounded px-2 py-1.5">
                      <span>{a.title}</span>
                      <span className={a.passed ? "text-emerald-700 text-xs" : "text-red-500 text-xs"}>
                        {a.bestScore ? `${Math.round(Number(a.bestScore))}%` : "—"} · {a.passed ? "Passed" : "Not passed"} ·{" "}
                        {a.attemptsUsed} attempt{a.attemptsUsed === 1 ? "" : "s"}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {data.certificates.length > 0 && (
              <div>
                <h4 className="text-xs font-semibold text-slate-500 uppercase mb-1">Certificates earned</h4>
                <div className="space-y-1">
                  {data.certificates.map((c) => (
                    <div key={c.certificateNumber} className="text-sm bg-slate-50 rounded px-2 py-1.5">
                      {c.certificateNumber} — {Math.round(Number(c.scorePercentage))}% ·{" "}
                      {new Date(c.issuedAt).toLocaleDateString()}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
