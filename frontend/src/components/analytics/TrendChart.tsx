import { useState } from "react";
import { Area, AreaChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { useAnalyticsTrends } from "../../features/analytics.js";

function formatPeriod(iso: string, granularity: "day" | "month"): string {
  const d = new Date(iso);
  return granularity === "month" ? d.toLocaleDateString([], { month: "short", year: "2-digit" }) : d.toLocaleDateString([], { month: "short", day: "numeric" });
}

export function TrendChart() {
  const [granularity, setGranularity] = useState<"day" | "month">("day");
  const { data, isLoading } = useAnalyticsTrends({ granularity });
  const points = (data ?? []).map((p) => ({ ...p, label: formatPeriod(p.period, granularity) }));

  return (
    <div className="bg-white rounded-xl shadow-clay p-5">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="font-semibold text-slate-800">Activity over time</h2>
          <p className="text-xs text-slate-500 mt-0.5">Completions, quiz passes, and active learners</p>
        </div>
        <div className="flex rounded-md shadow-clay-inset overflow-hidden text-xs">
          {(["day", "month"] as const).map((g) => (
            <button
              key={g}
              onClick={() => setGranularity(g)}
              className={`px-3 py-1.5 capitalize ${granularity === g ? "bg-astra text-white" : "text-slate-500 hover:bg-slate-50"}`}
            >
              {g}
            </button>
          ))}
        </div>
      </div>

      {isLoading && <p className="text-slate-400 text-sm">Loading…</p>}
      {!isLoading && points.length === 0 && <p className="text-slate-400 text-sm">No activity recorded yet.</p>}
      {!isLoading && points.length > 0 && (
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={points} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="fillCompletions" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="var(--astra)" stopOpacity={0.35} />
                  <stop offset="100%" stopColor="var(--astra)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="currentColor" className="text-slate-100 dark:text-white/10" />
              <XAxis dataKey="label" tick={{ fontSize: 11, fill: "currentColor" }} className="text-slate-400" axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: "currentColor" }} className="text-slate-400" axisLine={false} tickLine={false} allowDecimals={false} />
              <Tooltip
                contentStyle={{ borderRadius: 10, border: "1px solid var(--border-default)", fontSize: 13 }}
                labelStyle={{ fontWeight: 600 }}
              />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Area type="monotone" dataKey="completions" name="Completions" stroke="var(--astra)" fill="url(#fillCompletions)" strokeWidth={2} />
              <Area type="monotone" dataKey="quizPasses" name="Quiz passes" stroke="#0f7a5c" fill="transparent" strokeWidth={2} />
              <Area type="monotone" dataKey="activeLearners" name="Active learners" stroke="#8a8a94" fill="transparent" strokeWidth={1.5} strokeDasharray="4 3" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}
