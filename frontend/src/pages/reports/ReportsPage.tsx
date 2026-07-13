import { useState } from "react";
import { useTrainingCompletionReport } from "../../features/analytics.js";
import { useFranchises } from "../../features/org.js";
import { API_BASE_URL, tokenStore } from "../../lib/api.js";

export function ReportsPage() {
  const [franchiseId, setFranchiseId] = useState("");
  const { data: franchises } = useFranchises();
  const { data: rows, isLoading } = useTrainingCompletionReport({ franchiseId: franchiseId || undefined });

  async function handleExport() {
    const params = new URLSearchParams({ format: "xlsx", ...(franchiseId ? { franchiseId } : {}) });
    const res = await fetch(`${API_BASE_URL}/analytics/training-completion?${params.toString()}`, {
      headers: { Authorization: `Bearer ${tokenStore.getAccess()}` },
    });
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "training-completion.xlsx";
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-800">Reports</h1>
        <button onClick={handleExport} className="rounded-md bg-astra text-white px-4 py-1.5 text-sm">
          Export to Excel
        </button>
      </div>
      <select
        value={franchiseId}
        onChange={(e) => setFranchiseId(e.target.value)}
        className="rounded-md border border-slate-300 px-3 py-1.5 text-sm"
      >
        <option value="">All franchises</option>
        {franchises?.map((f) => (
          <option key={f.id} value={f.id}>
            {f.name}
          </option>
        ))}
      </select>
      <div className="bg-white rounded-lg border border-slate-200 overflow-x-auto">
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
                <td className="py-1.5 px-3">{r.completed ? "Completed" : "In progress"}</td>
                <td className="py-1.5 px-3">{r.completedAt ? new Date(r.completedAt).toLocaleDateString() : "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
