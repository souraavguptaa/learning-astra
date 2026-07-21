import { Clock } from "lucide-react";
import { useAttendanceStatus, useEndBreak, useStartBreak } from "../../features/attendance.js";

function formatClock(iso: string): string {
  return new Date(iso).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}

export function AttendanceWidget() {
  const { data: status } = useAttendanceStatus();
  const startBreak = useStartBreak();
  const endBreak = useEndBreak();

  if (!status?.clockedIn) return null;

  return (
    <div className="hidden sm:flex items-center gap-2 text-xs">
      <span
        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-pill ${
          status.onBreak
            ? "bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-300"
            : "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300"
        }`}
      >
        <Clock className="w-3.5 h-3.5" />
        {status.onBreak ? `On break since ${formatClock(status.breakStartAt!)}` : `Clocked in since ${formatClock(status.clockInAt!)}`}
      </span>
      <button
        type="button"
        onClick={() => (status.onBreak ? endBreak.mutate() : startBreak.mutate())}
        disabled={startBreak.isPending || endBreak.isPending}
        className="text-astra hover:underline disabled:opacity-50"
      >
        {status.onBreak ? "End break" : "Take a break"}
      </button>
    </div>
  );
}
