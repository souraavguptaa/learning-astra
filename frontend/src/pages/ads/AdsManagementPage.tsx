import { useState } from "react";
import { Spinner } from "../../components/common/Spinner.js";
import { api } from "../../lib/api.js";
import { useAllAds, useCreateAd, useDeleteAd, useSetAdActive, uploadAdImage } from "../../features/promo.js";

export function AdsManagementPage() {
  const { data: ads, isLoading } = useAllAds();
  const createAd = useCreateAd();
  const setActive = useSetAdActive();
  const deleteAd = useDeleteAd();

  const [form, setForm] = useState({ title: "", linkUrl: "" });
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!file) {
      setError("Choose an image before creating the ad.");
      return;
    }
    setUploading(true);
    setError(null);
    try {
      const imageFileKey = await uploadAdImage(file);
      await createAd.mutateAsync({ title: form.title, linkUrl: form.linkUrl, imageFileKey });
      setForm({ title: "", linkUrl: "" });
      setFile(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not create ad. Please try again.");
    } finally {
      setUploading(false);
    }
  }

  async function openImage(fileKey: string) {
    const { data } = await api.get<{ url: string }>("/files/download-url", { params: { key: fileKey } });
    window.open(data.url, "_blank");
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">Ads</h1>
        <p className="text-slate-500 mt-1">
          Active ads rotate as a popup on the learner home screen every 15 seconds. Clicking one opens its link. New
          ads start inactive — hit "Activate" below when you're ready for it to go live.
        </p>
      </div>

      <section className="bg-white rounded-lg shadow-clay p-5">
        <h2 className="font-semibold text-slate-700 mb-3">Create Ad</h2>
        <form onSubmit={handleCreate} className="flex flex-wrap gap-2 items-center">
          <input type="file" accept="image/*" required onChange={(e) => setFile(e.target.files?.[0] ?? null)} className="text-sm" />
          <input
            placeholder="Title"
            required
            value={form.title}
            onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
            className="rounded-md shadow-clay-inset px-3 py-1.5 text-sm"
          />
          <input
            placeholder="https://... link when clicked"
            type="url"
            required
            value={form.linkUrl}
            onChange={(e) => setForm((f) => ({ ...f, linkUrl: e.target.value }))}
            className="flex-1 min-w-[220px] rounded-md shadow-clay-inset px-3 py-1.5 text-sm"
          />
          <button
            type="submit"
            disabled={uploading}
            className="rounded-md bg-astra text-white shadow-clay-sm px-4 py-1.5 text-sm font-medium disabled:opacity-60"
          >
            {uploading ? "Uploading…" : "Create ad"}
          </button>
        </form>
        {error && <p className="text-sm text-red-500 mt-2">{error}</p>}
      </section>

      <section className="bg-white rounded-lg shadow-clay p-5">
        <h2 className="font-semibold text-slate-700 mb-3">All Ads</h2>
        {isLoading && <p className="text-slate-400">Loading…</p>}
        <div className="space-y-2">
          {ads?.map((ad) => {
            const togglingActive = setActive.isPending && setActive.variables?.id === ad.id;
            const deleting = deleteAd.isPending && deleteAd.variables === ad.id;
            return (
              <div
                key={ad.id}
                className={`flex items-center justify-between bg-slate-50 rounded px-3 py-2 text-sm transition-opacity ${deleting ? "opacity-50" : ""}`}
              >
                <div>
                  <button onClick={() => openImage(ad.imageFileKey)} className="font-medium text-astra hover:underline">
                    {ad.title}
                  </button>
                  <div className="text-xs text-slate-400">{ad.linkUrl}</div>
                </div>
                <div className="flex items-center gap-3">
                  <span className={ad.isActive ? "text-emerald-600 text-xs" : "text-slate-400 text-xs"}>
                    {ad.isActive ? "Active" : "Inactive"}
                  </span>
                  <button
                    onClick={() => setActive.mutate({ id: ad.id, isActive: !ad.isActive })}
                    disabled={togglingActive}
                    className="text-astra text-xs hover:underline disabled:opacity-60 inline-flex items-center gap-1"
                  >
                    {togglingActive && <Spinner className="w-3 h-3" />}
                    {togglingActive ? "…" : ad.isActive ? "Deactivate" : "Activate"}
                  </button>
                  <button
                    onClick={() => {
                      if (window.confirm(`Delete the ad "${ad.title}"? This can't be undone.`)) deleteAd.mutate(ad.id);
                    }}
                    disabled={deleting}
                    className="text-red-500 text-xs hover:underline disabled:opacity-60 inline-flex items-center gap-1"
                  >
                    {deleting && <Spinner className="w-3 h-3" />}
                    {deleting ? "Deleting…" : "Delete"}
                  </button>
                </div>
              </div>
            );
          })}
          {ads?.length === 0 && <p className="text-slate-400 text-sm">No ads yet.</p>}
        </div>
      </section>
    </div>
  );
}
