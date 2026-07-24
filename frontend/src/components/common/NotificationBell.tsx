import { Bell, GraduationCap, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../lib/authContext.js";
import {
  useMarkAllNotificationsRead,
  useMarkNotificationRead,
  useMyNotifications,
  type Notification,
} from "../../features/notification.js";

function playPing() {
  const Ctx = window.AudioContext || (window as any).webkitAudioContext;
  if (!Ctx) return;
  const ctx = new Ctx();
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.frequency.value = 880;
  gain.gain.setValueAtTime(0.15, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);
  osc.connect(gain).connect(ctx.destination);
  osc.start();
  osc.stop(ctx.currentTime + 0.3);
}

// Distinct sound for new support tickets so a trainer notices it over the generic ping.
function playTicketAlert() {
  const audio = new Audio("/sounds/ticket-alert.wav");
  audio.play().catch(() => playPing());
}

export function NotificationBell() {
  const { user } = useAuth();
  const { data: notifications } = useMyNotifications();
  const markRead = useMarkNotificationRead();
  const markAllRead = useMarkAllNotificationsRead();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [toast, setToast] = useState<Notification | null>(null);
  // A brand-new assignment gets its own prominent, non-auto-dismissing modal instead of the small
  // corner toast — mandatory compliance training is easy to miss in an 8-second popup, and the
  // whole point is landing directly on the assigned item without going through the bell dropdown.
  const [assignmentAlert, setAssignmentAlert] = useState<Notification | null>(null);

  const unreadCount = notifications?.filter((n) => !n.isRead).length ?? 0;

  // Toast only for notifications we haven't already shown, tracked in localStorage so a page
  // reload (or the SPA remounting this component) doesn't re-toast every already-seen unread item.
  const seenIds = useRef<Set<string> | null>(null);
  useEffect(() => {
    if (!notifications || !user) return;
    const storageKey = `notif-seen-${user.id}`;
    if (seenIds.current === null) {
      const stored = localStorage.getItem(storageKey);
      seenIds.current = new Set<string>(stored ? JSON.parse(stored) : []);
      for (const n of notifications) if (!n.isRead) seenIds.current.add(n.id);
      localStorage.setItem(storageKey, JSON.stringify([...seenIds.current]));
      return;
    }
    const fresh = notifications.filter((n) => !n.isRead && !seenIds.current!.has(n.id));
    if (fresh.length > 0) {
      if (fresh.some((n) => n.type === "ticket_created")) playTicketAlert();
      else playPing();
      for (const n of fresh) seenIds.current.add(n.id);
      localStorage.setItem(storageKey, JSON.stringify([...seenIds.current]));

      const freshAssignment = fresh.find((n) => n.type === "training_assigned");
      const freshOther = fresh.find((n) => n.type !== "training_assigned");
      if (freshAssignment) setAssignmentAlert(freshAssignment);
      if (freshOther) setToast(freshOther);

      // A new assignment used to only appear once the notification's own 15s poll happened to
      // land — a learner staring at "My Learning" saw nothing change until they clicked into the
      // notification (which navigates away and forces a fresh fetch on remount). Tying the
      // dashboard's refetch directly to notification arrival makes it show up the moment the app
      // learns about it, not on a second, unrelated timer.
      if (freshAssignment) {
        qc.invalidateQueries({ queryKey: ["assigned-trainings"] });
      }
    }
  }, [notifications, user, qc]);

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), 8000);
    return () => clearTimeout(timer);
  }, [toast]);

  function handleClick(id: string, deepLink: string | null) {
    markRead.mutate(id);
    setOpen(false);
    setToast(null);
    if (deepLink) navigate(deepLink);
  }

  function handleAssignmentAction() {
    if (!assignmentAlert) return;
    markRead.mutate(assignmentAlert.id);
    if (assignmentAlert.deepLink) navigate(assignmentAlert.deepLink);
    setAssignmentAlert(null);
  }

  return (
    <div className="relative">
      <button onClick={() => setOpen((o) => !o)} className="relative text-slate-500 hover:text-astra">
        <Bell className="w-5 h-5" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] rounded-full w-4 h-4 flex items-center justify-center animate-pulse">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>
      {open && <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />}
      {open && (
        <div className="absolute right-0 mt-2 w-80 bg-white border border-slate-200 rounded-lg shadow-lg z-50 max-h-96 overflow-y-auto">
          <div className="flex items-center justify-between px-3 py-2 border-b border-slate-100">
            <span className="text-sm font-medium">Notifications</span>
            {unreadCount > 0 && (
              <button
                onClick={() => markAllRead.mutate()}
                disabled={markAllRead.isPending}
                className="text-xs text-astra disabled:opacity-60"
              >
                {markAllRead.isPending ? "Marking…" : "Mark all read"}
              </button>
            )}
          </div>
          {notifications?.length === 0 && <p className="text-sm text-slate-400 p-3">No notifications yet.</p>}
          {notifications?.map((n) => (
            <button
              key={n.id}
              onClick={() => handleClick(n.id, n.deepLink)}
              className={`w-full text-left px-3 py-2 text-sm border-b border-slate-50 hover:bg-slate-50 ${
                !n.isRead ? "bg-blue-50/50" : ""
              }`}
            >
              <div className="font-medium">{n.title}</div>
              <div className="text-xs text-slate-500">{n.message}</div>
              <div className="text-[10px] text-slate-400 mt-0.5">{new Date(n.createdAt).toLocaleString()}</div>
            </button>
          ))}
        </div>
      )}

      {toast && (
        <div className="fixed top-16 right-6 w-80 bg-white border border-astra rounded-lg shadow-2xl z-[200] p-3">
          <div className="flex items-start justify-between gap-2">
            <button onClick={() => handleClick(toast.id, toast.deepLink)} className="text-left flex-1">
              <div className="font-medium text-sm inline-flex items-center gap-1.5">
                <Bell className="w-4 h-4" /> {toast.title}
              </div>
              <div className="text-xs text-slate-500 mt-0.5">{toast.message}</div>
            </button>
            <button onClick={() => setToast(null)} className="text-slate-400 hover:text-slate-600 shrink-0">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {assignmentAlert && (
        <div className="fixed inset-0 z-[300] flex items-center justify-center bg-black/40 p-4">
          <div className="modal-panel w-full max-w-sm bg-white rounded-xl shadow-2xl p-6 text-center">
            <div className="w-14 h-14 rounded-full bg-astra-soft text-astra-dark flex items-center justify-center mx-auto mb-4">
              <GraduationCap className="w-7 h-7" />
            </div>
            <div className="text-xs font-semibold uppercase tracking-wide text-astra mb-1">New assignment</div>
            <h2 className="text-lg font-bold text-slate-800 mb-1">{assignmentAlert.title}</h2>
            <p className="text-sm text-slate-500 mb-5">{assignmentAlert.message}</p>
            <button
              onClick={handleAssignmentAction}
              className="w-full rounded-md bg-astra hover:bg-astra-dark text-white py-2.5 font-medium mb-2"
            >
              Open now
            </button>
            <button
              onClick={() => setAssignmentAlert(null)}
              className="w-full rounded-md text-slate-500 hover:text-slate-700 py-1.5 text-sm"
            >
              Remind me later
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
