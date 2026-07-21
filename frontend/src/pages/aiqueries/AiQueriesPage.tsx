import { Search } from "lucide-react";
import { useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useAiQueries } from "../../features/analytics.js";

type Filter = "all" | "answered" | "unanswered";

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString([], { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
}

export function AiQueriesPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const initialFilter = searchParams.get("filter") === "unanswered" ? "unanswered" : searchParams.get("filter") === "answered" ? "answered" : "all";
  const [filter, setFilter] = useState<Filter>(initialFilter);
  const [search, setSearch] = useState("");

  const answered = filter === "all" ? undefined : filter === "answered";
  const { data: rows, isLoading } = useAiQueries(answered);

  const visibleRows = useMemo(() => {
    const q = search.trim().toLowerCase();
    return (rows ?? []).filter((r) => !q || r.queryText.toLowerCase().includes(q) || r.userName.toLowerCase().includes(q));
  }, [rows, search]);

  function changeFilter(f: Filter) {
    setFilter(f);
    setSearchParams(f === "all" ? {} : { filter: f });
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">AI Support Queries</h1>
        <p className="text-slate-500 mt-1">Every question people have asked AI Support, and whether it found a confident answer.</p>
      </div>

      <div className="bg-white rounded-lg shadow-clay p-5">
        <div className="flex flex-wrap items-center gap-2 mb-4">
          <div className="flex rounded-md shadow-clay-inset overflow-hidden text-xs">
            {([
              ["all", "All"],
              ["unanswered", "Unanswered"],
              ["answered", "Answered"],
            ] as const).map(([key, label]) => (
              <button
                key={key}
                onClick={() => changeFilter(key)}
                className={`px-3 py-1.5 ${filter === key ? "bg-astra text-white" : "text-slate-500 hover:bg-slate-50"}`}
              >
                {label}
              </button>
            ))}
          </div>
          <div className="relative flex-1 min-w-[200px]">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              placeholder="Search questions or people…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-md shadow-clay-inset pl-9 pr-3 h-9 text-sm"
            />
          </div>
        </div>

        <div className="space-y-2">
          {isLoading && <p className="text-slate-400 text-sm">Loading…</p>}
          {!isLoading && visibleRows.length === 0 && <p className="text-slate-400 text-sm">No queries match.</p>}
          {visibleRows.map((r) => (
            <div key={r.id} className="rounded-md border border-black/[0.06] dark:border-white/10 p-3">
              <div className="flex items-start justify-between gap-3 flex-wrap">
                <p className="text-sm font-medium text-slate-800">{r.queryText}</p>
                <span
                  className={`shrink-0 text-[11px] font-medium px-2 py-0.5 rounded-pill ${
                    r.hadConfidentMatch
                      ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300"
                      : "bg-red-50 text-red-600 dark:bg-red-500/10 dark:text-red-300"
                  }`}
                >
                  {r.hadConfidentMatch ? "Answered" : "No confident match"}
                </span>
              </div>
              {r.answerText && <p className="text-xs text-slate-500 mt-1.5">{r.answerText}</p>}
              <div className="flex items-center gap-3 text-[11px] text-slate-400 mt-2">
                <span>{r.userName}</span>
                <span>{formatDateTime(r.createdAt)}</span>
                {r.similarityScore && <span>match {Math.round(Number(r.similarityScore) * 100)}%</span>}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
