import { Link } from "react-router-dom";
import { useAuth } from "../../lib/authContext.js";

const QUICK_LINKS = [
  { to: "/users", label: "Users & Org", description: "Create Franchise Owners, Operators, Employees and manage stores" },
  { to: "/content", label: "Content Library", description: "Upload and manage videos, PDFs, PPTs and more" },
  { to: "/trainings", label: "Trainings", description: "Build training sequences, quizzes and assign them" },
  { to: "/announcements", label: "Announcements", description: "Broadcast updates to your team" },
];

export function AdminDashboard() {
  const { user } = useAuth();
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-slate-800">Welcome, {user?.name}</h1>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {QUICK_LINKS.map((link) => (
          <Link key={link.to} to={link.to} className="hover-lift block bg-white rounded-lg shadow-clay p-4">
            <div className="font-semibold text-slate-800">{link.label}</div>
            <div className="text-sm text-slate-500 mt-1">{link.description}</div>
          </Link>
        ))}
      </div>
    </div>
  );
}
