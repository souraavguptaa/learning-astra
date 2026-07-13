import { Link } from "react-router-dom";
import { useAuth } from "../../lib/authContext.js";
import { useOverdueAssignments } from "../../features/training.js";

const QUICK_LINKS = [
  { to: "/content", label: "Content Library", description: "Upload videos, PDFs, PPTs, Word and Excel files" },
  { to: "/trainings", label: "Trainings", description: "Build training sequences, add quizzes, publish and assign" },
  { to: "/assessments", label: "Assessments", description: "Create standalone assessments and assign with a deadline" },
  { to: "/tickets", label: "Support Tickets", description: "Reply to franchise owner and employee questions" },
  { to: "/announcements", label: "Announcements", description: "Broadcast updates to your team" },
];

export function TrainerDashboard() {
  const { user } = useAuth();
  const { data: overdue } = useOverdueAssignments();

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-slate-800">Welcome, {user?.name}</h1>

      {overdue && overdue.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <h2 className="font-semibold text-red-700 mb-2">⚠️ {overdue.length} overdue mandatory assignment{overdue.length === 1 ? "" : "s"}</h2>
          <ul className="text-sm text-red-800 space-y-1">
            {overdue.map((o) => (
              <li key={`${o.userId}-${o.trainingId}`}>
                {o.userName} hasn't completed "{o.trainingTitle}" — was due {new Date(o.dueAt).toLocaleString("en-IN")}
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="grid grid-cols-2 gap-4">
        {QUICK_LINKS.map((link) => (
          <Link
            key={link.to}
            to={link.to}
            className="bg-white rounded-lg border border-slate-200 p-4 hover:border-astra transition-colors"
          >
            <div className="font-semibold text-slate-800">{link.label}</div>
            <div className="text-sm text-slate-500 mt-1">{link.description}</div>
          </Link>
        ))}
      </div>
    </div>
  );
}
