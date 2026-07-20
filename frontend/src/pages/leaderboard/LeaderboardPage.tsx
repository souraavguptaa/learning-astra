import { Medal } from "lucide-react";
import { useAuth } from "../../lib/authContext.js";
import { useLeaderboard } from "../../features/gamification.js";

const MEDAL_COLORS = ["text-amber-500", "text-slate-400", "text-amber-700"];
const MEDAL_BG = ["bg-amber-50", "bg-slate-100", "bg-amber-50/60"];

export function LeaderboardPage() {
  const { user } = useAuth();
  const { data: leaderboard, isLoading } = useLeaderboard();

  const podium = leaderboard?.slice(0, 3) ?? [];
  const rest = leaderboard?.slice(3) ?? [];

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

      {/* Top 3 get their own visually distinct "podium" cards — bigger rank badge, tinted
          background — instead of the same row treatment as everyone else (cards.md's tiering
          principle: don't flatten every card to identical visual weight). */}
      {podium.length > 0 && (
        <div className="space-y-2">
          {podium.map((entry, idx) => (
            <div
              key={entry.userId}
              className={`hover-lift flex items-center gap-3 rounded-xl shadow-clay p-4 ${MEDAL_BG[idx]} ${
                entry.userId === user?.id ? "ring-1 ring-astra" : ""
              }`}
            >
              <span className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-white shrink-0">
                <Medal className={`w-5 h-5 ${MEDAL_COLORS[idx]}`} />
              </span>
              <span className={`flex-1 font-semibold ${entry.userId === user?.id ? "text-astra" : "text-slate-800"}`}>
                {entry.name}
                {entry.userId === user?.id && " (you)"}
              </span>
              <span className="font-display font-semibold tabular-nums text-slate-800">{entry.totalPoints} pts</span>
            </div>
          ))}
        </div>
      )}

      {/* Rank 4+ stays a compact metadata list — lower visual weight than the podium above. */}
      {rest.length > 0 && (
        <div className="bg-white rounded-xl shadow-clay-sm divide-y divide-slate-100">
          {rest.map((entry, idx) => (
            <div key={entry.userId} className="flex items-center gap-3 px-4 py-2.5 text-sm">
              <span className="w-5 text-center text-slate-400 tabular-nums">{idx + 4}</span>
              <span className={`flex-1 ${entry.userId === user?.id ? "font-semibold text-astra" : "text-slate-700"}`}>
                {entry.name}
                {entry.userId === user?.id && " (you)"}
              </span>
              <span className="font-medium tabular-nums text-slate-600">{entry.totalPoints} pts</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
