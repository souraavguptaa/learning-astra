import { useEffect, useState } from "react";
import { api } from "../../lib/api.js";
import { useMarkAnnouncementRead, useMyAnnouncements } from "../../features/announcement.js";

export function AnnouncementBanner() {
  const { data: announcements } = useMyAnnouncements();
  const markRead = useMarkAnnouncementRead();
  const [imageUrl, setImageUrl] = useState<string | null>(null);

  const unread = announcements?.find((a) => !a.isRead);

  useEffect(() => {
    setImageUrl(null);
    if (!unread?.attachmentFileKey) return;
    let cancelled = false;
    api
      .get<{ url: string }>("/files/download-url", { params: { key: unread.attachmentFileKey } })
      .then(({ data }) => {
        if (!cancelled) setImageUrl(data.url);
      });
    return () => {
      cancelled = true;
    };
  }, [unread?.attachmentFileKey]);

  if (!unread) return null;

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[100] p-6">
      <div className="bg-white rounded-xl max-w-lg w-full p-6 shadow-2xl">
        <div className="text-3xl mb-2">📢</div>
        <h2 className="text-2xl font-bold text-slate-800 mb-2">{unread.title}</h2>
        <p className="text-slate-600 whitespace-pre-wrap mb-4">{unread.body}</p>
        {imageUrl && (
          <img src={imageUrl} alt="" className="w-full max-h-96 object-contain rounded-lg mb-4 border border-slate-200" />
        )}
        <button
          onClick={() => markRead.mutate(unread.id)}
          disabled={markRead.isPending}
          className="w-full rounded-md bg-astra text-white py-2.5 text-sm font-medium disabled:opacity-60"
        >
          {markRead.isPending ? "…" : "I understand"}
        </button>
      </div>
    </div>
  );
}
