import { Search } from "lucide-react";
import { useMemo, useState } from "react";
import { useAttendanceReport } from "../../features/attendance.js";

function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.round((seconds % 3600) / 60);
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString([], { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
}

const ROLE_LABELS: Record<string, string> = { trainer: "Trainer", admin: "Admin", employee: "Employee" };

export function AttendancePage() {
  const [search, setSearch] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const { data: rows, isLoading } = useAttendanceReport({
    from: from ? new Date(from).toISOString() : undefined,
    to: to ? new Date(`${to}T23:59:59`).toISOString() : undefined,
  });

  const visibleRows = useMemo(() => {
    const q = search.trim().toLowerCase();
    return (rows ?? []).filter((r) => !q || r.userName.toLowerCase().includes(q));
  }, [rows, search]);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">Login Hours</h1>
        <p className="text-slate-500 mt-1">Clock-in/out and break time for trainers, admins, and employees.</p>
      </div>

      <div className="bg-white rounded-lg shadow-clay p-5">
        <div className="flex flex-wrap gap-2 mb-4">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              placeholder="Search by name…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-md shadow-clay-inset pl-9 pr-3 h-9 text-sm"
            />
          </div>
          <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="rounded-md shadow-clay-inset px-3 h-9 text-sm" />
          <input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="rounded-md shadow-clay-inset px-3 h-9 text-sm" />
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-slate-500 border-b border-slate-200">
                <th className="py-2 pr-3">Name</th>
                <th className="py-2 pr-3">Role</th>
                <th className="py-2 pr-3">Clocked in</th>
                <th className="py-2 pr-3">Clocked out</th>
                <th className="py-2 pr-3">Break time</th>
                <th className="py-2 pr-3">Worked</th>
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
              {!isLoading && visibleRows.length === 0 && (
                <tr>
                  <td colSpan={6} className="py-3 text-slate-400">
                    No sessions found.
                  </td>
                </tr>
              )}
              {visibleRows.map((r) => (
                <tr key={r.sessionId} className="border-b border-slate-100">
                  <td className="py-2 pr-3">{r.userName}</td>
                  <td className="py-2 pr-3">{ROLE_LABELS[r.userRole] ?? r.userRole}</td>
                  <td className="py-2 pr-3">{formatDateTime(r.clockInAt)}</td>
                  <td className="py-2 pr-3">{r.clockOutAt ? formatDateTime(r.clockOutAt) : <span className="text-emerald-600">Still in</span>}</td>
                  <td className="py-2 pr-3">{r.breakSeconds > 0 ? formatDuration(r.breakSeconds) : "—"}</td>
                  <td className="py-2 pr-3 font-medium">{r.workedSeconds !== null ? formatDuration(r.workedSeconds) : "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
