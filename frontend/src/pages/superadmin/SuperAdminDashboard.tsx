import { useAnalyticsOverview, type AnalyticsOverview } from "../../features/analytics.js";

const TILES: { key: keyof AnalyticsOverview; label: string; suffix?: string }[] = [
  { key: "totalUsers", label: "Total Users" },
  { key: "activeUsers", label: "Active Users" },
  { key: "trainingCompletionRate", label: "Training Completion", suffix: "%" },
  { key: "assessmentPassRate", label: "Assessment Pass Rate", suffix: "%" },
  { key: "averageNps", label: "Average NPS" },
  { key: "aiSupportQueries", label: "AI Support Queries" },
  { key: "unansweredQueries", label: "Unanswered Queries" },
  { key: "openTickets", label: "Open Tickets" },
];

export function SuperAdminDashboard() {
  const { data, isLoading } = useAnalyticsOverview();

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-slate-800">Super Admin Overview</h1>
      {isLoading && <p className="text-slate-400">Loading…</p>}
      <div className="grid grid-cols-4 gap-4">
        {data &&
          TILES.map((tile) => {
            const value = data[tile.key];
            return (
              <div key={tile.key} className="bg-white rounded-lg border border-slate-200 p-4">
                <div className="text-2xl font-bold text-astra">
                  {value === null || value === undefined ? "—" : value}
                  {value !== null && value !== undefined && tile.suffix}
                </div>
                <div className="text-xs text-slate-500 mt-1">{tile.label}</div>
              </div>
            );
          })}
      </div>
    </div>
  );
}
