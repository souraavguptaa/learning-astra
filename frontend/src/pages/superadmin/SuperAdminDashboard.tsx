import { Bot, CheckCircle2, HelpCircle, MessageSquare, Target, Ticket, TrendingUp, Users, type LucideIcon } from "lucide-react";
import { Link } from "react-router-dom";
import { useAuth } from "../../lib/authContext.js";
import { useAnalyticsOverview, type AnalyticsOverview } from "../../features/analytics.js";

type Tile = {
  key: keyof AnalyticsOverview;
  label: string;
  icon: LucideIcon;
  suffix?: string;
  to?: string;
  /** Flags this metric red/amber when non-zero — for things that mean "needs attention", not "good". */
  attentionWhenPositive?: boolean;
};

const TILES: Tile[] = [
  { key: "totalUsers", label: "Total Users", icon: Users, to: "/users" },
  { key: "activeUsers", label: "Active Users", icon: CheckCircle2, to: "/users" },
  { key: "trainingCompletionRate", label: "Training Completion", icon: TrendingUp, suffix: "%" },
  { key: "assessmentPassRate", label: "Assessment Pass Rate", icon: Target, suffix: "%" },
  { key: "averageNps", label: "Average NPS", icon: MessageSquare },
  { key: "aiSupportQueries", label: "AI Support Queries", icon: Bot },
  { key: "unansweredQueries", label: "Unanswered Queries", icon: HelpCircle, attentionWhenPositive: true },
  { key: "openTickets", label: "Open Tickets", icon: Ticket, to: "/tickets", attentionWhenPositive: true },
];

export function SuperAdminDashboard() {
  const { user } = useAuth();
  const { data, isLoading } = useAnalyticsOverview();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">Good to see you, {user?.name?.split(" ")[0]}</h1>
        <p className="text-sm text-slate-500 mt-1">Here's how Learning Astra is doing across the org.</p>
      </div>

      {isLoading && <p className="text-slate-400">Loading…</p>}

      <div className="grid grid-cols-4 gap-4">
        {data &&
          TILES.map((tile) => {
            const value = data[tile.key];
            const hasValue = value !== null && value !== undefined;
            const needsAttention = tile.attentionWhenPositive && hasValue && Number(value) > 0;
            const content = (
              <div
                className={`hover-lift bg-white rounded-lg shadow-clay p-4 h-full ${
                  needsAttention ? "ring-2 ring-red-200" : ""
                }`}
              >
                <div className="flex items-center justify-between">
                  <tile.icon className="w-5 h-5 text-astra" />
                  {needsAttention && <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />}
                </div>
                <div className={`text-2xl font-bold mt-2 ${needsAttention ? "text-red-600" : "text-astra"}`}>
                  {hasValue ? value : "—"}
                  {hasValue && tile.suffix}
                </div>
                <div className="text-xs text-slate-500 mt-1">{tile.label}</div>
              </div>
            );
            return tile.to ? (
              <Link key={tile.key} to={tile.to}>
                {content}
              </Link>
            ) : (
              <div key={tile.key}>{content}</div>
            );
          })}
      </div>
    </div>
  );
}
