import { BookOpen, CheckCircle2, Play, Trophy } from "lucide-react";
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
    <span className={`rounded-pill px-2 py-0.5 text-[11px] font-medium shrink-0 ${cls}`}>
      {overdue ? "Overdue — was due" : "Due"} {due.toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
    </span>
  );
}

function TrainingRow({
  title,
  isMandatory,
  dueAt,
  href,
  icon: Icon,
  iconClassName,
}: {
  title: string;
  isMandatory: boolean;
  dueAt?: string | null;
  href: string;
  icon: typeof Play;
  iconClassName: string;
}) {
  return (
    <Link to={href} className="hover-lift flex items-center justify-between gap-3 bg-white shadow-clay-sm rounded-lg p-4">
      <div className="flex items-center gap-3 min-w-0">
        <span className={`inline-flex items-center justify-center w-9 h-9 rounded-md shrink-0 ${iconClassName}`}>
          <Icon className="w-4 h-4" />
        </span>
        <div className="min-w-0">
          <div className="font-medium truncate">{title}</div>
          <span
            className={`inline-block mt-1 rounded-pill px-2 py-0.5 text-[11px] font-medium ${
              isMandatory ? "bg-astra-soft text-astra-dark" : "bg-slate-100 text-slate-500"
            }`}
          >
            {isMandatory ? "Mandatory" : "Optional"}
          </span>
        </div>
      </div>
      {dueAt !== undefined && <DueBadge dueAt={dueAt} />}
    </Link>
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
        <div className="bg-white rounded-xl shadow-clay overflow-hidden">
          <div className="flex items-center gap-4 px-5 py-4">
            <span className="inline-flex items-center justify-center w-11 h-11 rounded-md bg-astra-soft text-astra-dark shrink-0">
              <Trophy className="w-5 h-5" />
            </span>
            <div>
              <div className="text-2xl font-display font-semibold tabular-nums text-slate-800">{gamification.totalPoints}</div>
              <div className="text-xs text-slate-400">points earned</div>
            </div>
          </div>
          {gamification.badges.length > 0 && (
            <>
              <div className="border-t border-black/[0.06] dark:border-white/10" />
              <div className="flex gap-2 flex-wrap px-5 py-3">
                {gamification.badges.map((b) => (
                  <span
                    key={b.id}
                    title={b.description}
                    className="inline-flex items-center gap-1 bg-amber-50 text-amber-800 px-2 py-1 rounded-pill text-xs"
                  >
                    {b.icon} {b.name}
                  </span>
                ))}
              </div>
            </>
          )}
          {gamification.badges.length === 0 && (
            <div className="px-5 py-3 text-sm text-slate-400 border-t border-black/[0.06] dark:border-white/10">
              Complete a training to earn your first badge.
            </div>
          )}
        </div>
      )}

      {isLoading && <p className="text-slate-400">Loading your trainings…</p>}

      {/* Continue Learning + Assigned are the two actionable lists — placed side by side on wide
          screens instead of stacked full-width, so both are visible without scrolling. */}
      {(inProgress.length > 0 || notStarted.length > 0) && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {inProgress.length > 0 && (
            <section>
              <h2 className="font-semibold text-slate-700 mb-2">Continue Learning</h2>
              <div className="space-y-2">
                {inProgress.map(({ training, isMandatory, dueAt }) => (
                  <TrainingRow
                    key={training.id}
                    title={training.title}
                    isMandatory={isMandatory}
                    dueAt={dueAt}
                    href={`/learning/${training.id}`}
                    icon={Play}
                    iconClassName="bg-astra-soft text-astra-dark"
                  />
                ))}
              </div>
            </section>
          )}
          <section>
            <h2 className="font-semibold text-slate-700 mb-2">Assigned Trainings</h2>
            {!isLoading && notStarted.length === 0 && <p className="text-slate-400 text-sm">Nothing new assigned right now.</p>}
            <div className="space-y-2">
              {notStarted.map(({ training, isMandatory, dueAt }) => (
                <TrainingRow
                  key={training.id}
                  title={training.title}
                  isMandatory={isMandatory}
                  dueAt={dueAt}
                  href={`/learning/${training.id}`}
                  icon={BookOpen}
                  iconClassName="bg-slate-100 text-slate-500"
                />
              ))}
            </div>
          </section>
        </div>
      )}

      {/* Completed trainings carry the least priority — a compact two-column grid instead of
          full-width rows keeps them lower visual weight than the actionable lists above. */}
      {completed.length > 0 && (
        <section>
          <h2 className="font-semibold text-slate-700 mb-2">Completed</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {completed.map(({ training }) => (
              <Link
                key={training.id}
                to={`/learning/${training.id}`}
                className="hover-lift flex items-center gap-3 bg-white shadow-clay-sm rounded-lg px-4 py-2.5 opacity-70"
              >
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <div className="font-medium text-sm truncate">{training.title}</div>
              </Link>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
