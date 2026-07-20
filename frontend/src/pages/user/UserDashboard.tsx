import { BookOpen, CheckCircle2, Play } from "lucide-react";
import { Link } from "react-router-dom";
import { AdPopup } from "../../components/common/AdPopup.js";
import { useMyGamification } from "../../features/gamification.js";
import { useAssignedTrainings } from "../../features/training.js";
import { useAuth } from "../../lib/authContext.js";

function DueBadge({ dueAt }: { dueAt: string | null }) {
  if (!dueAt) return null;
  const due = new Date(dueAt);
  const overdue = due.getTime() < Date.now();
  const soon = !overdue && due.getTime() - Date.now() < 3 * 24 * 60 * 60 * 1000; // within 3 days
  const cls = overdue ? "bg-red-50 text-red-700" : soon ? "bg-amber-50 text-amber-700" : "bg-slate-100 text-slate-500";
  return (
    <span className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${cls}`}>
      {overdue ? "Overdue — was due" : "Due"} {due.toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
    </span>
  );
}

export function UserDashboard() {
  const { user } = useAuth();
  const { data: assigned, isLoading } = useAssignedTrainings();
  const { data: gamification } = useMyGamification();

  const inProgress = assigned?.filter((a) => a.progress && !a.progress.completed) ?? [];
  const notStarted = assigned?.filter((a) => !a.progress) ?? [];
  const completed = assigned?.filter((a) => a.progress?.completed) ?? [];

  return (
    <div className="space-y-8">
      <AdPopup />
      <h1 className="text-2xl font-bold text-slate-800">Welcome, {user?.name}</h1>

      {gamification && (
        <div className="bg-white rounded-lg shadow-clay p-4 flex items-center gap-6">
          <div>
            <div className="text-2xl font-bold text-astra">{gamification.totalPoints}</div>
            <div className="text-xs text-slate-400">points</div>
          </div>
          <div className="flex-1 flex gap-2 flex-wrap">
            {gamification.badges.length === 0 && (
              <span className="text-sm text-slate-400">Complete a training to earn your first badge.</span>
            )}
            {gamification.badges.map((b) => (
              <span
                key={b.id}
                title={b.description}
                className="inline-flex items-center gap-1 bg-amber-50 text-amber-800 px-2 py-1 rounded text-xs"
              >
                {b.icon} {b.name}
              </span>
            ))}
          </div>
        </div>
      )}

      {isLoading && <p className="text-slate-400">Loading your trainings…</p>}

      {inProgress.length > 0 && (
        <section>
          <h2 className="font-semibold text-slate-700 mb-2">Continue Learning</h2>
          <div className="space-y-2">
            {inProgress.map(({ training, isMandatory, dueAt }) => (
              <Link
                key={training.id}
                to={`/learning/${training.id}`}
                className="hover-lift flex items-center justify-between gap-3 bg-white shadow-clay-sm rounded-lg p-4"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <Play className="w-5 h-5 shrink-0 text-astra" />
                  <div className="min-w-0">
                    <div className="font-medium truncate">{training.title}</div>
                    <span
                      className={`inline-block mt-1 rounded-full px-2 py-0.5 text-[11px] font-medium ${
                        isMandatory ? "bg-astra-soft text-astra-dark" : "bg-slate-100 text-slate-500"
                      }`}
                    >
                      {isMandatory ? "Mandatory" : "Optional"}
                    </span>
                  </div>
                </div>
                <DueBadge dueAt={dueAt} />
              </Link>
            ))}
          </div>
        </section>
      )}

      <section>
        <h2 className="font-semibold text-slate-700 mb-2">Assigned Trainings</h2>
        {!isLoading && notStarted.length === 0 && <p className="text-slate-400 text-sm">Nothing new assigned right now.</p>}
        <div className="space-y-2">
          {notStarted.map(({ training, isMandatory, dueAt }) => (
            <Link
              key={training.id}
              to={`/learning/${training.id}`}
              className="hover-lift flex items-center justify-between gap-3 bg-white shadow-clay-sm rounded-lg p-4"
            >
              <div className="flex items-center gap-3 min-w-0">
                <BookOpen className="w-5 h-5 shrink-0 text-astra" />
                <div className="min-w-0">
                  <div className="font-medium truncate">{training.title}</div>
                  <span
                    className={`inline-block mt-1 rounded-full px-2 py-0.5 text-[11px] font-medium ${
                      isMandatory ? "bg-astra-soft text-astra-dark" : "bg-slate-100 text-slate-500"
                    }`}
                  >
                    {isMandatory ? "Mandatory" : "Optional"}
                  </span>
                </div>
              </div>
              <DueBadge dueAt={dueAt} />
            </Link>
          ))}
        </div>
      </section>

      {completed.length > 0 && (
        <section>
          <h2 className="font-semibold text-slate-700 mb-2">Completed</h2>
          <div className="space-y-2">
            {completed.map(({ training }) => (
              <Link
                key={training.id}
                to={`/learning/${training.id}`}
                className="hover-lift flex items-center gap-3 bg-white shadow-clay-sm rounded-lg p-4 opacity-70"
              >
                <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                <div className="font-medium truncate">{training.title}</div>
              </Link>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
