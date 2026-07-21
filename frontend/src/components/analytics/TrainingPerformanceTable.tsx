import { Search } from "lucide-react";
import { useMemo, useState } from "react";
import { useTrainingPerformance } from "../../features/analytics.js";

function Rate({ value }: { value: number | null }) {
  if (value === null) return <span className="text-slate-400">—</span>;
  const color = value >= 70 ? "text-emerald-600" : value >= 40 ? "text-amber-600" : "text-red-500";
  return <span className={`font-medium ${color}`}>{value}%</span>;
}

export function TrainingPerformanceTable() {
  const { data: rows, isLoading } = useTrainingPerformance();
  const [search, setSearch] = useState("");

  const visibleRows = useMemo(() => {
    const q = search.trim().toLowerCase();
    return (rows ?? []).filter((r) => !q || r.title.toLowerCase().includes(q) || r.trainerName.toLowerCase().includes(q));
  }, [rows, search]);

  return (
    <div className="bg-white rounded-xl shadow-clay p-5">
      <div className="flex items-center justify-between gap-3 mb-1 flex-wrap">
        <div>
          <h2 className="font-semibold text-slate-800">By training</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Who took it, how many attempted the quiz, and how many passed
          </p>
        </div>
        <div className="relative min-w-[200px]">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            placeholder="Search trainings or trainers…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-md shadow-clay-inset pl-9 pr-3 h-9 text-sm"
          />
        </div>
      </div>

      <div className="overflow-x-auto mt-3">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-slate-500 border-b border-slate-200">
              <th className="py-2 pr-3">Training</th>
              <th className="py-2 pr-3">Trainer</th>
              <th className="py-2 pr-3">Assigned</th>
              <th className="py-2 pr-3">Took it</th>
              <th className="py-2 pr-3">Completed</th>
              <th className="py-2 pr-3">Completion rate</th>
              <th className="py-2 pr-3">Quiz attempted</th>
              <th className="py-2 pr-3">Quiz pass rate</th>
            </tr>
          </thead>
          <tbody>
            {isLoading && (
              <tr>
                <td colSpan={8} className="py-3 text-slate-400">
                  Loading…
                </td>
              </tr>
            )}
            {!isLoading && visibleRows.length === 0 && (
              <tr>
                <td colSpan={8} className="py-3 text-slate-400">
                  No trainings match.
                </td>
              </tr>
            )}
            {visibleRows.map((r) => (
              <tr key={r.trainingId} className="border-b border-slate-100">
                <td className="py-2 pr-3 font-medium text-slate-700">{r.title}</td>
                <td className="py-2 pr-3">{r.trainerName}</td>
                <td className="py-2 pr-3 tabular-nums">{r.assignedCount}</td>
                <td className="py-2 pr-3 tabular-nums">{r.startedCount}</td>
                <td className="py-2 pr-3 tabular-nums">{r.completedCount}</td>
                <td className="py-2 pr-3">
                  <Rate value={r.completionRate} />
                </td>
                <td className="py-2 pr-3 tabular-nums">{r.quizAttemptedCount}</td>
                <td className="py-2 pr-3">
                  <Rate value={r.quizPassRate} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
