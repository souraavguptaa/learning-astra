import { useState } from "react";
import { Link, NavLink, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "../../lib/authContext.js";
import { AnnouncementBanner } from "./AnnouncementBanner.js";
import { ChangePasswordModal } from "./ChangePasswordModal.js";
import { NotificationBell } from "./NotificationBell.js";

const NAV_BY_ROLE: Record<string, { label: string; path: string }[]> = {
  super_admin: [
    { label: "Overview", path: "/" },
    { label: "Users & Org", path: "/users" },
    { label: "Content", path: "/content" },
    { label: "Trainings", path: "/trainings" },
    { label: "Assessments", path: "/assessments" },
    { label: "Tickets", path: "/tickets" },
    { label: "KB Review", path: "/kb-review" },
    { label: "Announcements", path: "/announcements" },
    { label: "Ads", path: "/ads" },
    { label: "Partner Videos", path: "/videos" },
    { label: "Reports", path: "/reports" },
  ],
  admin: [
    { label: "Overview", path: "/" },
    { label: "Users & Org", path: "/users" },
    { label: "Content", path: "/content" },
    { label: "Trainings", path: "/trainings" },
    { label: "Assessments", path: "/assessments" },
    { label: "Tickets", path: "/tickets" },
    { label: "Announcements", path: "/announcements" },
    { label: "Ads", path: "/ads" },
    { label: "Partner Videos", path: "/videos" },
  ],
  trainer: [
    { label: "Overview", path: "/" },
    { label: "Content", path: "/content" },
    { label: "Trainings", path: "/trainings" },
    { label: "Assessments", path: "/assessments" },
    { label: "Tickets", path: "/tickets" },
    { label: "Announcements", path: "/announcements" },
    { label: "Partner Videos", path: "/videos" },
  ],
  franchise_owner: [
    { label: "My Learning", path: "/" },
    { label: "AI Support", path: "/support" },
    { label: "My Tickets", path: "/my-tickets" },
    { label: "Certificates", path: "/certificates" },
    { label: "Partner Videos", path: "/videos" },
    { label: "Announcements", path: "/announcements" },
  ],
  operator: [
    { label: "My Learning", path: "/" },
    { label: "AI Support", path: "/support" },
    { label: "My Tickets", path: "/my-tickets" },
    { label: "Certificates", path: "/certificates" },
    { label: "Leaderboard", path: "/leaderboard" },
    { label: "Partner Videos", path: "/videos" },
    { label: "Announcements", path: "/announcements" },
  ],
  employee: [
    { label: "My Learning", path: "/" },
    { label: "AI Support", path: "/support" },
    { label: "My Tickets", path: "/my-tickets" },
    { label: "Certificates", path: "/certificates" },
    { label: "Leaderboard", path: "/leaderboard" },
    { label: "Partner Videos", path: "/videos" },
    { label: "Announcements", path: "/announcements" },
  ],
};

export function AppLayout() {
  const { user, logout } = useAuth();
  const nav = user ? NAV_BY_ROLE[user.role] ?? [] : [];
  const location = useLocation();
  const currentLabel = nav.find((item) => (item.path === "/" ? location.pathname === "/" : location.pathname.startsWith(item.path)))?.label;
  const [showChangePassword, setShowChangePassword] = useState(false);
  const mustChangePassword = !!user?.mustChangePassword;

  return (
    <div className="min-h-screen flex bg-slate-50">
      <aside className="w-60 bg-white border-r border-slate-200 flex flex-col">
        <Link to="/" className="block px-5 py-4 border-b border-slate-200 hover:bg-slate-50">
          <div className="font-bold text-astra">Learning Astra</div>
          <div className="text-xs text-slate-400">SastaSundar Learning Dashboard</div>
        </Link>
        <nav className="flex-1 py-3">
          {nav.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              end={item.path === "/"}
              className={({ isActive }) =>
                `block px-5 py-2 text-sm border-l-2 ${
                  isActive
                    ? "border-astra bg-blue-50 text-astra font-medium"
                    : "border-transparent text-slate-600 hover:bg-slate-100 hover:text-astra"
                }`
              }
            >
              {item.label}
            </NavLink>
          ))}
        </nav>
        <div className="px-5 py-4 border-t border-slate-200 text-sm">
          <div className="font-medium text-slate-700">{user?.name}</div>
          <div className="text-xs text-slate-400 mb-2 capitalize">{user?.role.replace("_", " ")}</div>
          <div className="flex items-center gap-3">
            <button onClick={() => setShowChangePassword(true)} className="text-xs text-astra hover:underline">
              Change password
            </button>
            <button onClick={() => logout()} className="text-xs text-red-500 hover:underline">
              Sign out
            </button>
          </div>
        </div>
        <div className="px-5 py-3 text-[10px] text-slate-300">Created by Sourav Gupta</div>
      </aside>
      {(showChangePassword || mustChangePassword) && (
        <ChangePasswordModal onClose={() => setShowChangePassword(false)} forced={mustChangePassword} />
      )}
      <div className="flex-1 flex flex-col min-w-0">
        <AnnouncementBanner />
        <header className="flex justify-between items-center px-8 py-3 border-b border-slate-200 bg-white">
          <span className="text-sm font-medium text-slate-500">{currentLabel}</span>
          <NotificationBell />
        </header>
        <main className="flex-1 p-8 overflow-x-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
