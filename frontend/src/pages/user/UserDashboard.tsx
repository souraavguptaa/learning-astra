import { Link } from "react-router-dom";
import { AdPopup } from "../../components/common/AdPopup.js";
import { useMyGamification } from "../../features/gamification.js";
import { useAssignedTrainings } from "../../features/training.js";
import { useAuth } from "../../lib/authContext.js";

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
        <div className="bg-white rounded-lg border border-slate-200 p-4 flex items-center gap-6">
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
            {inProgress.map(({ training }) => (
              <Link
                key={training.id}
                to={`/learning/${training.id}`}
                className="block bg-white border border-slate-200 rounded-lg p-4 hover:border-astra"
              >
                <div className="font-medium">{training.title}</div>
                <div className="text-xs text-slate-400">{training.isMandatory ? "Mandatory" : "Optional"}</div>
              </Link>
            ))}
          </div>
        </section>
      )}

      <section>
        <h2 className="font-semibold text-slate-700 mb-2">Assigned Trainings</h2>
        {notStarted.length === 0 && <p className="text-slate-400 text-sm">Nothing new assigned right now.</p>}
        <div className="space-y-2">
          {notStarted.map(({ training }) => (
            <Link
              key={training.id}
              to={`/learning/${training.id}`}
              className="block bg-white border border-slate-200 rounded-lg p-4 hover:border-astra"
            >
              <div className="font-medium">{training.title}</div>
              <div className="text-xs text-slate-400">{training.isMandatory ? "Mandatory" : "Optional"}</div>
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
                className="block bg-white border border-slate-200 rounded-lg p-4 opacity-70"
              >
                <div className="font-medium">✓ {training.title}</div>
              </Link>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
