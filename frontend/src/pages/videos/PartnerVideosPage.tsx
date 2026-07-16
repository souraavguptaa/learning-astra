import { useState } from "react";
import { useAuth } from "../../lib/authContext.js";
import {
  extractYoutubeId,
  useCreatePartnerVideo,
  useDeletePartnerVideo,
  usePartnerVideos,
} from "../../features/promo.js";

const MANAGER_ROLES = ["super_admin", "admin", "trainer"];

function VideoCard({ title, videoId }: { title: string; videoId: string }) {
  const [playing, setPlaying] = useState(false);

  if (playing) {
    return (
      <iframe
        src={`https://www.youtube.com/embed/${videoId}?autoplay=1`}
        title={title}
        className="w-full aspect-video"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        allowFullScreen
      />
    );
  }

  return (
    <button onClick={() => setPlaying(true)} className="relative w-full aspect-video block group">
      <img src={`https://img.youtube.com/vi/${videoId}/hqdefault.jpg`} alt={title} className="w-full h-full object-cover" />
      <span className="absolute inset-0 flex items-center justify-center bg-black/20 group-hover:bg-black/30 transition-colors">
        <span className="w-14 h-14 rounded-full bg-red-600 flex items-center justify-center text-white text-2xl">▶</span>
      </span>
    </button>
  );
}

export function PartnerVideosPage() {
  const { user } = useAuth();
  const { data: videos, isLoading } = usePartnerVideos();
  const createVideo = useCreatePartnerVideo();
  const deleteVideo = useDeletePartnerVideo();
  const [form, setForm] = useState({ title: "", youtubeUrl: "" });
  const [error, setError] = useState<string | null>(null);

  const canManage = !!user && MANAGER_ROLES.includes(user.role);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!extractYoutubeId(form.youtubeUrl)) {
      setError("That doesn't look like a valid YouTube video URL.");
      return;
    }
    await createVideo.mutateAsync(form);
    setForm({ title: "", youtubeUrl: "" });
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">Partner Videos</h1>
        <p className="text-slate-500 mt-1">Videos from the SastaSundar YouTube channel. Click a thumbnail to play it right here.</p>
      </div>

      {canManage && (
        <section className="bg-white rounded-lg shadow-clay p-5">
          <h2 className="font-semibold text-slate-700 mb-3">Add Video</h2>
          <form onSubmit={handleCreate} className="flex flex-wrap gap-2">
            <input
              placeholder="Title"
              required
              value={form.title}
              onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
              className="rounded-md shadow-clay-inset px-3 py-1.5 text-sm"
            />
            <input
              placeholder="https://www.youtube.com/watch?v=..."
              required
              value={form.youtubeUrl}
              onChange={(e) => setForm((f) => ({ ...f, youtubeUrl: e.target.value }))}
              className="flex-1 min-w-[240px] rounded-md shadow-clay-inset px-3 py-1.5 text-sm"
            />
            <button
              type="submit"
              disabled={createVideo.isPending}
              className="rounded-md bg-astra text-white shadow-clay-sm px-4 py-1.5 text-sm font-medium disabled:opacity-60"
            >
              Add video
            </button>
          </form>
          {error && <p className="text-sm text-red-500 mt-2">{error}</p>}
        </section>
      )}

      {isLoading && <p className="text-slate-400">Loading…</p>}
      {videos?.length === 0 && <p className="text-slate-400">No videos yet.</p>}
      <div className="grid grid-cols-2 gap-4">
        {videos?.map((v) => {
          const videoId = extractYoutubeId(v.youtubeUrl);
          return (
            <div key={v.id} className="bg-white rounded-lg shadow-clay overflow-hidden">
              {videoId && <VideoCard title={v.title} videoId={videoId} />}
              <div className="p-3 flex items-center justify-between">
                <span className="text-sm font-medium">{v.title}</span>
                {canManage && (
                  <button onClick={() => deleteVideo.mutate(v.id)} className="text-red-500 text-xs hover:underline">
                    Delete
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
