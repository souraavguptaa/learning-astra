import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { useAnalyticsSegments } from "../../features/analytics.js";

const SEGMENT_LABELS: Record<string, string> = {
  franchise_owner: "Franchise Owners",
  operator: "Operators",
  employee: "Employees",
};

export function SegmentBreakdown() {
  const { data, isLoading } = useAnalyticsSegments();
  const rows = (data ?? []).map((s) => ({ ...s, label: SEGMENT_LABELS[s.role] ?? s.role }));

  return (
    <div className="bg-white rounded-xl shadow-clay p-5">
      <h2 className="font-semibold text-slate-800">By segment</h2>
      <p className="text-xs text-slate-500 mt-0.5 mb-4">Franchise partners vs. employees — completion and quiz pass rate</p>

      {isLoading && <p className="text-slate-400 text-sm">Loading…</p>}
      {!isLoading && (
        <>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={rows} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="currentColor" className="text-slate-100 dark:text-white/10" />
                <XAxis dataKey="label" tick={{ fontSize: 11, fill: "currentColor" }} className="text-slate-400" axisLine={false} tickLine={false} />
                <YAxis
                  tick={{ fontSize: 11, fill: "currentColor" }}
                  className="text-slate-400"
                  axisLine={false}
                  tickLine={false}
                  unit="%"
                  domain={[0, 100]}
                />
                <Tooltip
                  contentStyle={{ borderRadius: 10, border: "1px solid var(--border-default)", fontSize: 13 }}
                  formatter={(value: number, name: string) => [`${value}%`, name]}
                />
                <Bar dataKey="completionRate" name="Completion rate" fill="var(--astra)" radius={[6, 6, 0, 0]} />
                <Bar dataKey="quizPassRate" name="Quiz pass rate" fill="#0f7a5c" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="grid grid-cols-3 gap-3 mt-4">
            {rows.map((s) => (
              <div key={s.role} className="rounded-md border border-black/[0.06] dark:border-white/10 p-3">
                <div className="text-xs text-slate-500">{s.label}</div>
                <div className="text-lg font-display font-semibold tabular-nums text-slate-800 mt-0.5">{s.learnerCount}</div>
                <div className="text-[11px] text-slate-400">{s.totalWatchHours}h watched</div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
