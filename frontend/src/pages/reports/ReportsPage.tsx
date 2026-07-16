import { useState } from "react";
import { useTrainingCompletionReport } from "../../features/analytics.js";
import { useFranchises } from "../../features/org.js";
import { api } from "../../lib/api.js";

export function ReportsPage() {
  const [franchiseId, setFranchiseId] = useState("");
  const [exportError, setExportError] = useState<string | null>(null);
  const { data: franchises } = useFranchises();
  const { data: rows, isLoading } = useTrainingCompletionReport({ franchiseId: franchiseId || undefined });

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
      <div className="bg-white rounded-lg shadow-clay overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-slate-500 border-b border-slate-200">
              <th className="py-2 px-3">Training</th>
              <th className="py-2 px-3">User</th>
              <th className="py-2 px-3">Role</th>
              <th className="py-2 px-3">Franchise</th>
              <th className="py-2 px-3">Status</th>
              <th className="py-2 px-3">Completed At</th>
            </tr>
          </thead>
          <tbody>
            {isLoading && (
              <tr>
                <td colSpan={6} className="py-3 px-3 text-slate-400">
                  Loading…
                </td>
              </tr>
            )}
            {rows?.map((r, i) => (
              <tr key={i} className="border-b border-slate-100">
                <td className="py-1.5 px-3">{r.trainingTitle}</td>
                <td className="py-1.5 px-3">{r.userName}</td>
                <td className="py-1.5 px-3">{r.role}</td>
                <td className="py-1.5 px-3">{r.franchiseName ?? "—"}</td>
                <td className="py-1.5 px-3">{r.completed ? "Completed" : r.createdAt ? "In progress" : "Not started"}</td>
                <td className="py-1.5 px-3">{r.completedAt ? new Date(r.completedAt).toLocaleDateString() : "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
