import {
  Award,
  BarChart3,
  BookOpen,
  ChevronDown,
  ClipboardCheck,
  FileSearch,
  GraduationCap,
  Image as ImageIcon,
  KeyRound,
  LayoutDashboard,
  LifeBuoy,
  LogOut,
  Megaphone,
  Menu,
  Ticket,
  Trophy,
  Users,
  Video,
  X,
  type LucideIcon,
} from "lucide-react";
import { useState } from "react";
import { Link, NavLink, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "../../lib/authContext.js";
import { AnnouncementBanner } from "./AnnouncementBanner.js";
import { ChangePasswordModal } from "./ChangePasswordModal.js";
import { GlobalProgressBar } from "./GlobalProgressBar.js";
import { NotificationBell } from "./NotificationBell.js";
import { ThemeToggle } from "./ThemeToggle.js";

type NavItem = { label: string; path: string; icon: LucideIcon };
type NavSection = { heading?: string; items: NavItem[] };

// Bento's sidebar pattern groups a long primary nav into labeled, collapsible sections with a
// leading icon per row — a flat 9-11 item list (the old shape) is exactly what that pattern
// exists to fix. Short learner-role lists (6-7 items) stay a single ungrouped section — grouping
// those would just be chrome for chrome's sake.
const NAV_BY_ROLE: Record<string, NavSection[]> = {
  super_admin: [
    { items: [{ label: "Overview", path: "/", icon: LayoutDashboard }] },
    { heading: "People", items: [{ label: "Users & Org", path: "/users", icon: Users }] },
    {
      heading: "Learning",
      items: [
        { label: "Content", path: "/content", icon: BookOpen },
        { label: "Trainings", path: "/trainings", icon: GraduationCap },
        { label: "Assessments", path: "/assessments", icon: ClipboardCheck },
      ],
    },
    {
      heading: "Support",
      items: [
        { label: "Tickets", path: "/tickets", icon: Ticket },
        { label: "KB Review", path: "/kb-review", icon: FileSearch },
      ],
    },
    {
      heading: "Engagement",
      items: [
        { label: "Announcements", path: "/announcements", icon: Megaphone },
        { label: "Ads", path: "/ads", icon: ImageIcon },
        { label: "Partner Videos", path: "/videos", icon: Video },
      ],
    },
    { heading: "Insights", items: [{ label: "Reports", path: "/reports", icon: BarChart3 }] },
  ],
  admin: [
    { items: [{ label: "Overview", path: "/", icon: LayoutDashboard }] },
    { heading: "People", items: [{ label: "Users & Org", path: "/users", icon: Users }] },
    {
      heading: "Learning",
      items: [
        { label: "Content", path: "/content", icon: BookOpen },
        { label: "Trainings", path: "/trainings", icon: GraduationCap },
        { label: "Assessments", path: "/assessments", icon: ClipboardCheck },
      ],
    },
    { heading: "Support", items: [{ label: "Tickets", path: "/tickets", icon: Ticket }] },
    {
      heading: "Engagement",
      items: [
        { label: "Announcements", path: "/announcements", icon: Megaphone },
        { label: "Ads", path: "/ads", icon: ImageIcon },
        { label: "Partner Videos", path: "/videos", icon: Video },
      ],
    },
  ],
  trainer: [
    { items: [{ label: "Overview", path: "/", icon: LayoutDashboard }] },
    {
      heading: "Learning",
      items: [
        { label: "Content", path: "/content", icon: BookOpen },
        { label: "Trainings", path: "/trainings", icon: GraduationCap },
        { label: "Assessments", path: "/assessments", icon: ClipboardCheck },
      ],
    },
    { heading: "Support", items: [{ label: "Tickets", path: "/tickets", icon: Ticket }] },
    {
      heading: "Engagement",
      items: [
        { label: "Announcements", path: "/announcements", icon: Megaphone },
        { label: "Partner Videos", path: "/videos", icon: Video },
      ],
    },
  ],
  franchise_owner: [
    {
      items: [
        { label: "My Learning", path: "/", icon: LayoutDashboard },
        { label: "AI Support", path: "/support", icon: LifeBuoy },
        { label: "My Tickets", path: "/my-tickets", icon: Ticket },
        { label: "Certificates", path: "/certificates", icon: Award },
        { label: "Partner Videos", path: "/videos", icon: Video },
        { label: "Announcements", path: "/announcements", icon: Megaphone },
      ],
    },
  ],
  operator: [
    {
      items: [
        { label: "My Learning", path: "/", icon: LayoutDashboard },
        { label: "AI Support", path: "/support", icon: LifeBuoy },
        { label: "My Tickets", path: "/my-tickets", icon: Ticket },
        { label: "Certificates", path: "/certificates", icon: Award },
        { label: "Leaderboard", path: "/leaderboard", icon: Trophy },
        { label: "Partner Videos", path: "/videos", icon: Video },
        { label: "Announcements", path: "/announcements", icon: Megaphone },
      ],
    },
  ],
  employee: [
    {
      items: [
        { label: "My Learning", path: "/", icon: LayoutDashboard },
        { label: "AI Support", path: "/support", icon: LifeBuoy },
        { label: "My Tickets", path: "/my-tickets", icon: Ticket },
        { label: "Certificates", path: "/certificates", icon: Award },
        { label: "Leaderboard", path: "/leaderboard", icon: Trophy },
        { label: "Partner Videos", path: "/videos", icon: Video },
        { label: "Announcements", path: "/announcements", icon: Megaphone },
      ],
    },
  ],
};

function flattenNav(sections: NavSection[]): NavItem[] {
  return sections.flatMap((s) => s.items);
}

function NavRow({ item, onNavigate }: { item: NavItem; onNavigate: () => void }) {
  return (
    <NavLink
      to={item.path}
      end={item.path === "/"}
      onClick={onNavigate}
      className={({ isActive }) =>
        `group flex items-center gap-3 pl-3 pr-4 py-2 rounded-md text-sm border-l-2 transition-colors ${
          isActive
            ? "border-astra bg-astra-soft text-astra-dark font-medium"
            : "border-transparent text-slate-600 hover:bg-slate-100 hover:text-astra"
        }`
      }
    >
      <item.icon className="w-4 h-4 shrink-0" />
      <span className="truncate">{item.label}</span>
    </NavLink>
  );
}

function NavGroup({ section, isActiveSection, onNavigate }: { section: NavSection; isActiveSection: boolean; onNavigate: () => void }) {
  const [open, setOpen] = useState(true);

  if (!section.heading) {
    return (
      <div className="space-y-0.5">
        {section.items.map((item) => (
          <NavRow key={item.path} item={item} onNavigate={onNavigate} />
        ))}
      </div>
    );
  }

  return (
    <div>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className={`w-full flex items-center justify-between px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wide ${
          isActiveSection ? "text-astra" : "text-slate-400"
        }`}
      >
        {section.heading}
        <ChevronDown className={`w-3.5 h-3.5 transition-transform ${open ? "" : "-rotate-90"}`} />
      </button>
      {open && (
        <div className="space-y-0.5 mb-1">
          {section.items.map((item) => (
            <NavRow key={item.path} item={item} onNavigate={onNavigate} />
          ))}
        </div>
      )}
    </div>
  );
}

export function AppLayout() {
  const { user, logout } = useAuth();
  const sections = user ? NAV_BY_ROLE[user.role] ?? [] : [];
  const flatNav = flattenNav(sections);
  const location = useLocation();
  const currentItem = flatNav.find((item) =>
    item.path === "/" ? location.pathname === "/" : location.pathname.startsWith(item.path),
  );
  const currentLabel = currentItem?.label ?? (location.pathname.startsWith("/learning/") ? "Training" : "Learning Astra");
  const [showChangePassword, setShowChangePassword] = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const mustChangePassword = !!user?.mustChangePassword;

  const closeMobileNav = () => setMobileNavOpen(false);

  return (
    <div className="min-h-screen flex bg-clay-bg">
      {mobileNavOpen && (
        <div className="fixed inset-0 bg-black/40 z-30 md:hidden" onClick={closeMobileNav} />
      )}

      {/* Full-height, edge-anchored panel — not a floating rounded island — per Bento's
          fixed-application-sidebar-navigation pattern. Off-canvas below md, toggled by the
          hamburger in the header. */}
      <aside
        className={`fixed md:sticky top-0 left-0 z-40 h-screen w-64 shrink-0 flex flex-col bg-white border-r border-black/[0.06] dark:border-white/10 transition-transform md:translate-x-0 ${
          mobileNavOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <Link to="/" onClick={closeMobileNav} className="flex items-center justify-between px-5 py-4">
          <span>
            <img src="/images/sastasundar-logo.png" alt="SastaSundar" className="h-7 w-auto mb-1" />
            <span className="font-display font-semibold text-astra flex items-center gap-1.5">
              <img src="/images/learning-astra-logo.png" alt="" className="h-5 w-5 rounded-full" />
              Learning Astra
            </span>
            <span className="block text-xs text-slate-400">SastaSundar Learning Dashboard</span>
          </span>
          <button type="button" onClick={closeMobileNav} className="md:hidden text-slate-400 hover:text-slate-600 shrink-0">
            <X className="w-5 h-5" />
          </button>
        </Link>
        <div className="border-t border-black/[0.06] dark:border-white/10" />

        <nav className="flex-1 overflow-y-auto py-3 px-3 space-y-2">
          {sections.map((section, idx) => (
            <NavGroup
              key={section.heading ?? idx}
              section={section}
              isActiveSection={section.items.some((i) => i.path === currentItem?.path)}
              onNavigate={closeMobileNav}
            />
          ))}
        </nav>

        <div className="border-t border-black/[0.06] dark:border-white/10" />

        {/* Secondary utility group — same icon+label row pattern as primary nav, distinct
            category (account controls), separated by the divider above. */}
        <div className="px-3 py-3 space-y-2">
          <div className="px-3 py-1.5">
            <div className="text-sm font-medium text-slate-700 truncate">{user?.name}</div>
            <div className="text-[11px] uppercase tracking-wide text-slate-400">{user?.role.replace("_", " ")}</div>
          </div>
          <div className="space-y-0.5">
            <button
              onClick={() => setShowChangePassword(true)}
              className="w-full flex items-center gap-3 pl-3 pr-4 py-2 rounded-md text-sm text-slate-600 hover:bg-slate-100 hover:text-astra"
            >
              <KeyRound className="w-4 h-4 shrink-0" />
              Change password
            </button>
            <button
              onClick={() => logout()}
              className="w-full flex items-center gap-3 pl-3 pr-4 py-2 rounded-md text-sm text-red-500 hover:bg-red-50"
            >
              <LogOut className="w-4 h-4 shrink-0" />
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
        <header className="sticky top-0 z-20 flex justify-between items-center gap-3 px-4 md:px-8 py-3 bg-white border-b border-black/[0.06] dark:border-white/10">
          <span className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              onClick={() => setMobileNavOpen(true)}
              className="md:hidden text-slate-500 hover:text-astra shrink-0"
            >
              <Menu className="w-5 h-5" />
            </button>
            <span className="flex items-center gap-3 text-sm font-medium text-slate-500 truncate">
              {currentLabel}
              <GlobalProgressBar />
            </span>
          </span>
          <div className="flex items-center gap-4 shrink-0">
            <ThemeToggle />
            <NotificationBell />
          </div>
        </header>
        <main className="flex-1 p-4 md:p-8 overflow-x-auto">
          <div key={location.pathname} className="page-enter">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
