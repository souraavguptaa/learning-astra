import { Medal } from "lucide-react";
import { useAuth } from "../../lib/authContext.js";
import { useLeaderboard } from "../../features/gamification.js";

const MEDAL_COLORS = ["text-amber-500", "text-slate-400", "text-amber-700"];

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
      {!isLoading && leaderboard?.length === 0 && (
        <p className="text-slate-400 text-sm">No points earned yet — complete a training to get on the board.</p>
      )}
      {!!leaderboard?.length && (
      <div className="bg-white rounded-lg shadow-clay divide-y divide-slate-100">
        {leaderboard.map((entry, idx) => (
          <div key={entry.userId} className="flex items-center gap-3 px-4 py-3">
            <span className="w-6 flex justify-center font-bold text-slate-400">
              {idx < 3 ? <Medal className={`w-5 h-5 ${MEDAL_COLORS[idx]}`} /> : idx + 1}
            </span>
            <span className={`flex-1 ${entry.userId === user?.id ? "font-semibold text-astra" : ""}`}>
              {entry.name}
              {entry.userId === user?.id && " (you)"}
            </span>
            <span className="font-medium">{entry.totalPoints} pts</span>
          </div>
        ))}
      </div>
      )}
    </div>
  );
}
