import { AlertTriangle, BookOpen, ClipboardCheck, GraduationCap, Megaphone, Ticket, type LucideIcon } from "lucide-react";
import { Link } from "react-router-dom";
import { useAuth } from "../../lib/authContext.js";
import { useOverdueAssignments } from "../../features/training.js";

type QuickLink = { to: string; label: string; description: string; icon: LucideIcon };

// Trainings and Content Library are the two things a trainer opens most — sized larger (span-6)
// than the other three (span-4) instead of five identical boxes, per Bento's varied-size mosaic.
const PRIMARY_LINKS: QuickLink[] = [
  { to: "/trainings", label: "Trainings", description: "Build training sequences, add quizzes, publish and assign", icon: GraduationCap },
  { to: "/content", label: "Content Library", description: "Upload videos, PDFs, PPTs, Word and Excel files", icon: BookOpen },
];

const SECONDARY_LINKS: QuickLink[] = [
  { to: "/assessments", label: "Assessments", description: "Create standalone assessments and assign with a deadline", icon: ClipboardCheck },
  { to: "/tickets", label: "Support Tickets", description: "Reply to franchise owner and employee questions", icon: Ticket },
  { to: "/announcements", label: "Announcements", description: "Broadcast updates to your team", icon: Megaphone },
];

export function TrainerDashboard() {
  const { user } = useAuth();
  const { data: overdue } = useOverdueAssignments();

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-bold text-slate-800">Welcome, {user?.name}</h1>

      {overdue && overdue.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-xl overflow-hidden">
          <div className="flex items-center gap-2 px-4 py-3">
            <AlertTriangle className="w-4 h-4 text-red-700 shrink-0" />
            <h2 className="font-semibold text-red-700">
              {overdue.length} overdue mandatory assignment{overdue.length === 1 ? "" : "s"}
            </h2>
          </div>
          <div className="border-t border-red-200 divide-y divide-red-200/70">
            {overdue.map((o) => (
              <div key={`${o.userId}-${o.trainingId}`} className="flex items-center justify-between gap-3 px-4 py-2.5 text-sm">
                <span className="text-red-800 min-w-0 truncate">
                  <span className="font-medium">{o.userName}</span> hasn't completed "{o.trainingTitle}"
                </span>
                <span className="text-red-600 text-xs shrink-0">was due {new Date(o.dueAt).toLocaleString("en-IN")}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {PRIMARY_LINKS.map((link) => (
            <Link key={link.to} to={link.to} className="hover-lift flex items-start gap-4 bg-white rounded-xl shadow-clay p-5">
              <span className="inline-flex items-center justify-center w-11 h-11 rounded-md bg-astra-soft text-astra-dark shrink-0">
                <link.icon className="w-5 h-5" />
              </span>
              <div>
                <div className="font-display font-semibold text-slate-800">{link.label}</div>
                <div className="text-sm text-slate-500 mt-1">{link.description}</div>
              </div>
            </Link>
          ))}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {SECONDARY_LINKS.map((link) => (
            <Link key={link.to} to={link.to} className="hover-lift flex items-start gap-3 bg-white rounded-xl shadow-clay-sm p-4">
              <span className="inline-flex items-center justify-center w-9 h-9 rounded-md bg-astra-soft text-astra-dark shrink-0">
                <link.icon className="w-4 h-4" />
              </span>
              <div className="min-w-0">
                <div className="font-medium text-slate-800">{link.label}</div>
                <div className="text-xs text-slate-500 mt-0.5">{link.description}</div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
