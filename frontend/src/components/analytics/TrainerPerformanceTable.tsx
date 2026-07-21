import { useTrainerPerformance } from "../../features/analytics.js";

function Rate({ value }: { value: number | null }) {
  if (value === null) return <span className="text-slate-400">—</span>;
  const color = value >= 70 ? "text-emerald-600" : value >= 40 ? "text-amber-600" : "text-red-500";
  return <span className={`font-medium ${color}`}>{value}%</span>;
}

export function TrainerPerformanceTable() {
  const { data: rows, isLoading } = useTrainerPerformance();

  return (
    <div className="bg-white rounded-xl shadow-clay p-5">
      <h2 className="font-semibold text-slate-800">By trainer</h2>
      <p className="text-xs text-slate-500 mt-0.5 mb-4">Trainings created and how learners are doing on them</p>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-slate-500 border-b border-slate-200">
              <th className="py-2 pr-3">Trainer</th>
              <th className="py-2 pr-3">Trainings</th>
              <th className="py-2 pr-3">Assigned</th>
              <th className="py-2 pr-3">Completed</th>
              <th className="py-2 pr-3">Completion rate</th>
              <th className="py-2 pr-3">Quiz pass rate</th>
            </tr>
          </thead>
          <tbody>
            {isLoading && (
              <tr>
                <td colSpan={6} className="py-3 text-slate-400">
                  Loading…
                </td>
              </tr>
            )}
            {!isLoading && (rows ?? []).length === 0 && (
              <tr>
                <td colSpan={6} className="py-3 text-slate-400">
                  No published trainings yet.
                </td>
              </tr>
            )}
            {rows?.map((r) => (
              <tr key={r.trainerId} className="border-b border-slate-100">
                <td className="py-2 pr-3">{r.trainerName}</td>
                <td className="py-2 pr-3 tabular-nums">{r.trainingsCreated}</td>
                <td className="py-2 pr-3 tabular-nums">{r.totalAssigned}</td>
                <td className="py-2 pr-3 tabular-nums">{r.totalCompleted}</td>
                <td className="py-2 pr-3">
                  <Rate value={r.completionRate} />
                </td>
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
