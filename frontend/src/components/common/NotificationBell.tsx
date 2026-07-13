import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useMarkAllNotificationsRead, useMarkNotificationRead, useMyNotifications } from "../../features/notification.js";

export function NotificationBell() {
  const { data: notifications } = useMyNotifications();
  const markRead = useMarkNotificationRead();
  const markAllRead = useMarkAllNotificationsRead();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);

  const unreadCount = notifications?.filter((n) => !n.isRead).length ?? 0;

  function handleClick(id: string, deepLink: string | null) {
    markRead.mutate(id);
    setOpen(false);
    if (deepLink) navigate(deepLink);
  }

  return (
    <div className="relative">
      <button onClick={() => setOpen((o) => !o)} className="relative text-slate-500 hover:text-astra">
        🔔
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] rounded-full w-4 h-4 flex items-center justify-center">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>
      {open && (
        <div className="absolute right-0 mt-2 w-80 bg-white border border-slate-200 rounded-lg shadow-lg z-50 max-h-96 overflow-y-auto">
          <div className="flex items-center justify-between px-3 py-2 border-b border-slate-100">
            <span className="text-sm font-medium">Notifications</span>
            {unreadCount > 0 && (
              <button onClick={() => markAllRead.mutate()} className="text-xs text-astra">
                Mark all read
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
    </div>
  );
}
