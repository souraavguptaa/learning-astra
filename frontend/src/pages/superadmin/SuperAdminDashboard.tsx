import {
  Bot,
  CheckCircle2,
  ChevronRight,
  HelpCircle,
  MessageSquare,
  Target,
  Ticket,
  TrendingUp,
  Users,
  type LucideIcon,
} from "lucide-react";
import { Link } from "react-router-dom";
import { AnalyticsSection } from "../../components/analytics/AnalyticsSection.js";
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

// Headline row (larger tiles, span-4 of 12) then a secondary row (span-3 of 12) — a Bento mosaic
// varies tile size by importance instead of one uniform grid of identical boxes (content.md:
// "avoid repeating identical card sizes... feature cards should vary height to create rhythm").
const HEADLINE_TILES: Tile[] = [
  { key: "totalUsers", label: "Total Users", icon: Users, to: "/users" },
  { key: "activeUsers", label: "Active Users", icon: CheckCircle2, to: "/users" },
  { key: "trainingCompletionRate", label: "Training Completion", icon: TrendingUp, suffix: "%" },
];

const SECONDARY_TILES: Tile[] = [
  { key: "assessmentPassRate", label: "Assessment Pass Rate", icon: Target, suffix: "%" },
  { key: "averageNps", label: "Average NPS", icon: MessageSquare },
  { key: "aiSupportQueries", label: "AI Support Queries", icon: Bot },
  { key: "unansweredQueries", label: "Unanswered Queries", icon: HelpCircle, attentionWhenPositive: true },
];

const CTA_TILE: Tile = { key: "openTickets", label: "Open Tickets", icon: Ticket, to: "/tickets", attentionWhenPositive: true };

function IconBadge({ icon: Icon, size, attention }: { icon: LucideIcon; size: 28 | 36; attention: boolean }) {
  const dim = size === 36 ? "w-9 h-9" : "w-7 h-7";
  return (
    <span
      className={`inline-flex items-center justify-center ${dim} rounded-md border ${
        attention ? "bg-red-50 border-red-100 text-red-600" : "bg-astra-soft border-transparent text-astra-dark"
      }`}
    >
      <Icon className={size === 36 ? "w-[18px] h-[18px]" : "w-4 h-4"} />
    </span>
  );
}

function HeadlineTile({ tile, value, hasValue }: { tile: Tile; value: unknown; hasValue: boolean }) {
  const needsAttention = tile.attentionWhenPositive && hasValue && Number(value) > 0;
  const body = (
    <div className={`hover-lift bg-white rounded-xl shadow-clay p-5 h-full flex flex-col ${needsAttention ? "ring-1 ring-red-200" : ""}`}>
      <div className="flex items-center justify-between">
        <IconBadge icon={tile.icon} size={36} attention={!!needsAttention} />
        {needsAttention && <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />}
      </div>
      <div className="border-t border-black/[0.06] dark:border-white/10 my-3" />
      <div className={`text-3xl font-display font-semibold tabular-nums ${needsAttention ? "text-red-600" : "text-slate-800"}`}>
        {hasValue ? String(value) : "—"}
        {hasValue && tile.suffix}
      </div>
      <div className="text-sm text-slate-500 mt-1">{tile.label}</div>
    </div>
  );
  return tile.to ? <Link to={tile.to}>{body}</Link> : body;
}

function SecondaryTile({ tile, value, hasValue }: { tile: Tile; value: unknown; hasValue: boolean }) {
  const needsAttention = tile.attentionWhenPositive && hasValue && Number(value) > 0;
  const body = (
    <div className={`hover-lift bg-white rounded-xl shadow-clay-sm p-4 h-full ${needsAttention ? "ring-1 ring-red-200" : ""}`}>
      <div className="flex items-center gap-2.5">
        <IconBadge icon={tile.icon} size={28} attention={!!needsAttention} />
        <div className="min-w-0">
          <div className={`text-xl font-display font-semibold tabular-nums leading-tight ${needsAttention ? "text-red-600" : "text-slate-800"}`}>
            {hasValue ? String(value) : "—"}
            {hasValue && tile.suffix}
          </div>
          <div className="text-xs text-slate-500 truncate">{tile.label}</div>
        </div>
        {needsAttention && <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse ml-auto shrink-0" />}
      </div>
    </div>
  );
  return tile.to ? <Link to={tile.to}>{body}</Link> : body;
}

function CtaTile({ tile, value, hasValue }: { tile: Tile; value: unknown; hasValue: boolean }) {
  const needsAttention = tile.attentionWhenPositive && hasValue && Number(value) > 0;
  return (
    <Link
      to={tile.to!}
      className={`hover-lift flex items-center justify-between gap-4 bg-white rounded-xl shadow-clay p-5 ${
        needsAttention ? "ring-1 ring-red-200" : ""
      }`}
    >
      <div className="flex items-center gap-4">
        <IconBadge icon={tile.icon} size={36} attention={!!needsAttention} />
        <div>
          <div className={`text-2xl font-display font-semibold tabular-nums leading-tight ${needsAttention ? "text-red-600" : "text-slate-800"}`}>
            {hasValue ? String(value) : "—"}
          </div>
          <div className="text-sm text-slate-500">{tile.label}</div>
        </div>
      </div>
      <span className="flex items-center gap-1 text-sm font-medium text-astra shrink-0">
        View queue <ChevronRight className="w-4 h-4" />
      </span>
    </Link>
  );
}

export function SuperAdminDashboard() {
  const { user } = useAuth();
  const { data, isLoading } = useAnalyticsOverview();

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">Good to see you, {user?.name?.split(" ")[0]}</h1>
        <p className="text-sm text-slate-500 mt-1">Here's how Learning Astra is doing across the org.</p>
      </div>

      {isLoading && <p className="text-slate-400">Loading…</p>}

      {data && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {HEADLINE_TILES.map((tile) => {
              const value = data[tile.key];
              return <HeadlineTile key={tile.key} tile={tile} value={value} hasValue={value !== null && value !== undefined} />;
            })}
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {SECONDARY_TILES.map((tile) => {
              const value = data[tile.key];
              return <SecondaryTile key={tile.key} tile={tile} value={value} hasValue={value !== null && value !== undefined} />;
            })}
          </div>
          <CtaTile tile={CTA_TILE} value={data[CTA_TILE.key]} hasValue={data[CTA_TILE.key] !== null && data[CTA_TILE.key] !== undefined} />
        </div>
      )}

      <AnalyticsSection />
    </div>
  );
}
