import { api } from "../../lib/api.js";
import { useMarkAnnouncementRead, useMyAnnouncements } from "../../features/announcement.js";

export function AnnouncementBanner() {
  const { data: announcements } = useMyAnnouncements();
  const markRead = useMarkAnnouncementRead();

  const unread = announcements?.find((a) => !a.isRead);
  if (!unread) return null;

  async function openAttachment() {
    if (!unread!.attachmentFileKey) return;
    const { data } = await api.get<{ url: string }>("/files/download-url", { params: { key: unread!.attachmentFileKey } });
    window.open(data.url, "_blank");
  }

  return (
    <div className="bg-astra text-white px-6 py-3 flex items-center gap-4">
      <span className="text-lg">📢</span>
      <div className="flex-1 min-w-0">
        <div className="font-semibold text-sm">{unread.title}</div>
        <div className="text-sm text-white/90">{unread.body}</div>
        {unread.attachmentFileKey && (
          <button onClick={openAttachment} className="text-xs underline text-white/90 mt-0.5">
            📎 View attachment
          </button>
        )}
      </div>
      <button
        onClick={() => markRead.mutate(unread.id)}
        disabled={markRead.isPending}
        className="shrink-0 rounded-md bg-white text-astra px-4 py-1.5 text-sm font-medium disabled:opacity-60"
      >
        Understood
      </button>
    </div>
  );
}
