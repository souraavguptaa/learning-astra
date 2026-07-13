import { useAuth } from "../../lib/authContext.js";
import { useLeaderboard } from "../../features/gamification.js";

export function LeaderboardPage() {
  const { user } = useAuth();
  const { data: leaderboard, isLoading } = useLeaderboard();

  return (
    <div className="space-y-4 max-w-lg">
      <h1 className="text-2xl font-bold text-slate-800">Leaderboard</h1>
      <p className="text-sm text-slate-500">
        {user?.role === "employee" ? "Employees" : "Franchise Owners & Operators"} ranked by points earned.
      </p>
      {isLoading && <p className="text-slate-400">Loading…</p>}
      <div className="bg-white rounded-lg border border-slate-200 divide-y divide-slate-100">
        {leaderboard?.map((entry, idx) => (
          <div key={entry.userId} className="flex items-center gap-3 px-4 py-3">
            <span className="w-6 text-center font-bold text-slate-400">{idx + 1}</span>
            <span className={`flex-1 ${entry.userId === user?.id ? "font-semibold text-astra" : ""}`}>
              {entry.name}
              {entry.userId === user?.id && " (you)"}
            </span>
            <span className="font-medium">{entry.totalPoints} pts</span>
          </div>
        ))}
      </div>
    </div>
  );
}
