import { Search } from "lucide-react";
import { useMemo, useState } from "react";
import { useTrainingCompletionReport } from "../../features/analytics.js";
import { useFranchises } from "../../features/org.js";
import { api } from "../../lib/api.js";

type StatusFilter = "all" | "completed" | "in_progress" | "not_started";

function rowStatus(r: { completed: boolean; createdAt?: string | null }): Exclude<StatusFilter, "all"> {
  return r.completed ? "completed" : r.createdAt ? "in_progress" : "not_started";
}

export function ReportsPage() {
  const [franchiseId, setFranchiseId] = useState("");
  const [exportError, setExportError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const { data: franchises } = useFranchises();
  const { data: rows, isLoading } = useTrainingCompletionReport({ franchiseId: franchiseId || undefined });

  const visibleRows = useMemo(() => {
    const q = search.trim().toLowerCase();
    return (rows ?? [])
      .filter((r) => (statusFilter === "all" ? true : rowStatus(r) === statusFilter))
      .filter((r) => !q || r.trainingTitle.toLowerCase().includes(q) || r.userName.toLowerCase().includes(q));
  }, [rows, search, statusFilter]);

  async function handleExport() {
    setExportError(null);
    try {
      // Routed through the shared `api` client (not a raw fetch) so an expired access token gets
      // silently refreshed and retried the same way every other request in the app does.
      const res = await api.get("/analytics/training-completion", {
        params: { format: "xlsx", ...(franchiseId ? { franchiseId } : {}) },
        responseType: "blob",
      });
      const url = URL.createObjectURL(res.data);
      const a = document.createElement("a");
      a.href = url;
      a.download = "training-completion.xlsx";
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      setExportError("Could not export the report. Please try again.");
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-800">Reports</h1>
        <button onClick={handleExport} className="rounded-md bg-astra text-white shadow-clay-sm px-4 py-1.5 text-sm">
          Export to Excel
        </button>
      </div>
      {exportError && <p className="text-sm text-red-600">{exportError}</p>}

      <div className="bg-white rounded-lg shadow-clay p-5">
        <div className="flex flex-wrap gap-2 mb-3">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              placeholder="Search by training or user…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-md shadow-clay-inset pl-9 pr-3 py-1.5 text-sm"
            />
          </div>
          <select
            value={franchiseId}
            onChange={(e) => setFranchiseId(e.target.value)}
            className="rounded-md shadow-clay-inset px-3 py-1.5 text-sm"
          >
            <option value="">All franchises</option>
            {franchises?.map((f) => (
              <option key={f.id} value={f.id}>
                {f.name}
              </option>
            ))}
          </select>
        </div>
        <div className="flex items-center gap-1 mb-3 text-sm">
          <span className="text-slate-500 mr-1">Show only:</span>
          {(
            [
              ["all", "All"],
              ["completed", "Completed"],
              ["in_progress", "In progress"],
              ["not_started", "Not started"],
            ] as const
          ).map(([value, label]) => (
            <button
              key={value}
              onClick={() => setStatusFilter(value)}
              className={`px-3 py-1 rounded-pill ${
                statusFilter === value ? "bg-astra-soft text-astra-dark font-medium" : "text-slate-500 hover:bg-slate-100"
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        <div className="rounded-md border border-black/[0.06] dark:border-white/10 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-slate-500 bg-slate-50">
                <th className="py-2 px-3 font-medium">Training</th>
                <th className="py-2 px-3 font-medium">User</th>
                <th className="py-2 px-3 font-medium">Role</th>
                <th className="py-2 px-3 font-medium">Franchise</th>
                <th className="py-2 px-3 font-medium">Status</th>
                <th className="py-2 px-3 font-medium">Completed At</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading && (
                <tr>
                  <td colSpan={6} className="py-3 px-3 text-slate-400">
                    Loading…
                  </td>
                </tr>
              )}
              {visibleRows.map((r, i) => {
                const status = rowStatus(r);
                return (
                  <tr key={i}>
                    <td className="py-2 px-3 whitespace-nowrap max-w-[240px] truncate">{r.trainingTitle}</td>
                    <td className="py-2 px-3 whitespace-nowrap max-w-[180px] truncate">{r.userName}</td>
                    <td className="py-2 px-3 whitespace-nowrap">{r.role}</td>
                    <td className="py-2 px-3 whitespace-nowrap">{r.franchiseName ?? "—"}</td>
                    <td className="py-2 px-3 whitespace-nowrap">
                      <span
                        className={`rounded-pill px-2 py-0.5 text-xs font-medium ${
                          status === "completed"
                            ? "bg-emerald-50 text-emerald-700"
                            : status === "in_progress"
                              ? "bg-amber-50 text-amber-700"
                              : "bg-slate-100 text-slate-500"
                        }`}
                      >
                        {status === "completed" ? "Completed" : status === "in_progress" ? "In progress" : "Not started"}
                      </span>
                    </td>
                    <td className="py-2 px-3 whitespace-nowrap tabular-nums">
                      {r.completedAt ? new Date(r.completedAt).toLocaleDateString() : "—"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <div className="mt-2 text-xs text-slate-400">
          {visibleRows.length} of {rows?.length ?? 0} rows
        </div>
      </div>
    </div>
  );
}
