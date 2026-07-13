import { useState } from "react";
import { DocumentViewer } from "../../components/documentViewer/DocumentViewer.js";
import {
  useContentList,
  useContentPlaybackUrl,
  useCreateMasterTopic,
  useMasterTopics,
  useUploadContent,
  type ContentItem,
} from "../../features/content.js";
import type { UserRole } from "../../lib/authContext.js";

const ROLE_OPTIONS: { value: UserRole; label: string }[] = [
  { value: "franchise_owner", label: "Franchise Owner" },
  { value: "operator", label: "Operator" },
  { value: "employee", label: "Employee" },
];

const STATUS_BADGE: Record<ContentItem["status"], string> = {
  ready: "bg-emerald-50 text-emerald-700",
  processing: "bg-amber-50 text-amber-700",
  failed: "bg-red-50 text-red-700",
};

export function ContentLibraryPage() {
  const { data: content, isLoading } = useContentList();
  const { data: masterTopics } = useMasterTopics();
  const createMasterTopic = useCreateMasterTopic();
  const upload = useUploadContent();

  const [form, setForm] = useState({
    title: "",
    description: "",
    topic: "",
    language: "Hindi",
    masterTopicId: "",
  });
  const [selectedRoles, setSelectedRoles] = useState<UserRole[]>(["franchise_owner", "operator", "employee"]);
  const [file, setFile] = useState<File | null>(null);
  const [warning, setWarning] = useState<string | null>(null);
  const [previewId, setPreviewId] = useState<string | null>(null);
  const [newTopicTitle, setNewTopicTitle] = useState("");

  const { data: playback } = useContentPlaybackUrl(previewId);

  function toggleRole(role: UserRole) {
    setSelectedRoles((prev) => (prev.includes(role) ? prev.filter((r) => r !== role) : [...prev, role]));
  }

  async function handleUpload(e: React.FormEvent) {
    e.preventDefault();
    if (!file) return;
    setWarning(null);
    try {
      const result = await upload.mutateAsync({
        file,
        title: form.title,
        description: form.description,
        topic: form.topic,
        language: form.language,
        targetRoles: selectedRoles,
        masterTopicId: form.masterTopicId || undefined,
      });
      if (result.warning) setWarning(result.warning);
      setForm({ title: "", description: "", topic: "", language: "Hindi", masterTopicId: "" });
      setFile(null);
      (document.getElementById("file-input") as HTMLInputElement | null)?.value &&
        ((document.getElementById("file-input") as HTMLInputElement).value = "");
    } catch (err) {
      setWarning(err instanceof Error ? err.message : "Upload failed. Please try again.");
    }
  }

  async function handleCreateTopic() {
    if (!newTopicTitle.trim()) return;
    await createMasterTopic.mutateAsync({ title: newTopicTitle.trim() });
    setNewTopicTitle("");
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">Content Library</h1>
        <p className="text-slate-500 mt-1">
          Upload videos, PDFs, PPT, Word and Excel. PPT/Word/Excel are converted to PDF automatically for in-app
          viewing.
        </p>
      </div>

      {warning && (
        <div className="rounded-md bg-amber-50 border border-amber-200 px-4 py-3 text-sm text-amber-800">
          {warning}
          <button className="ml-3 underline" onClick={() => setWarning(null)}>
            dismiss
          </button>
        </div>
      )}

      <section className="bg-white rounded-lg border border-slate-200 p-5">
        <h2 className="font-semibold text-slate-700 mb-3">Upload Content</h2>
        <form onSubmit={handleUpload} className="space-y-3">
          <div className="flex flex-wrap gap-2">
            <input
              id="file-input"
              type="file"
              required
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              className="text-sm"
            />
            <input
              placeholder="Title"
              required
              value={form.title}
              onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
              className="rounded-md border border-slate-300 px-3 py-1.5 text-sm flex-1 min-w-[180px]"
            />
          </div>
          <textarea
            placeholder="Description"
            required
            value={form.description}
            onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
            className="w-full rounded-md border border-slate-300 px-3 py-1.5 text-sm"
            rows={2}
          />
          <div className="flex flex-wrap gap-2 items-center">
            <input
              placeholder="Topic (e.g. Customer Registration)"
              required
              value={form.topic}
              onChange={(e) => setForm((f) => ({ ...f, topic: e.target.value }))}
              className="rounded-md border border-slate-300 px-3 py-1.5 text-sm"
            />
            <select
              value={form.language}
              onChange={(e) => setForm((f) => ({ ...f, language: e.target.value }))}
              className="rounded-md border border-slate-300 px-3 py-1.5 text-sm"
            >
              <option>Hindi</option>
              <option>English</option>
              <option>Bengali</option>
            </select>
            <select
              value={form.masterTopicId}
              onChange={(e) => setForm((f) => ({ ...f, masterTopicId: e.target.value }))}
              className="rounded-md border border-slate-300 px-3 py-1.5 text-sm"
            >
              <option value="">No master topic (standalone)</option>
              {masterTopics?.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.title}
                </option>
              ))}
            </select>
            <input
              placeholder="New master topic name"
              value={newTopicTitle}
              onChange={(e) => setNewTopicTitle(e.target.value)}
              className="rounded-md border border-slate-300 px-3 py-1.5 text-sm"
            />
            <button
              type="button"
              onClick={handleCreateTopic}
              className="text-astra text-sm underline"
              disabled={createMasterTopic.isPending}
            >
              + create topic
            </button>
          </div>
          <div className="flex flex-wrap gap-3 items-center text-sm">
            <span className="text-slate-500">Visible to:</span>
            {ROLE_OPTIONS.map((r) => (
              <label key={r.value} className="flex items-center gap-1">
                <input
                  type="checkbox"
                  checked={selectedRoles.includes(r.value)}
                  onChange={() => toggleRole(r.value)}
                />
                {r.label}
              </label>
            ))}
          </div>
          <button
            type="submit"
            disabled={upload.isPending}
            className="rounded-md bg-astra text-white px-4 py-1.5 text-sm font-medium disabled:opacity-60"
          >
            {upload.isPending ? "Uploading…" : "Upload"}
          </button>
        </form>
      </section>

      <section className="bg-white rounded-lg border border-slate-200 p-5">
        <h2 className="font-semibold text-slate-700 mb-3">Library</h2>
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-slate-500 border-b border-slate-200">
              <th className="py-1.5">Title</th>
              <th className="py-1.5">Type</th>
              <th className="py-1.5">Topic</th>
              <th className="py-1.5">Language</th>
              <th className="py-1.5">Status</th>
              <th className="py-1.5">Preview</th>
            </tr>
          </thead>
          <tbody>
            {isLoading && (
              <tr>
                <td colSpan={6} className="py-3 text-slate-400">
                  Loading…
                </td>
              </tr>
            )}
            {content?.map((c) => (
              <tr key={c.id} className="border-b border-slate-100">
                <td className="py-1.5">{c.title}</td>
                <td className="py-1.5 uppercase text-xs text-slate-500">{c.type}</td>
                <td className="py-1.5">{c.topic}</td>
                <td className="py-1.5">{c.language}</td>
                <td className="py-1.5">
                  <span className={`px-2 py-0.5 rounded text-xs ${STATUS_BADGE[c.status]}`}>{c.status}</span>
                </td>
                <td className="py-1.5">
                  {c.status === "ready" && (
                    <button className="text-astra hover:underline" onClick={() => setPreviewId(c.id)}>
                      Preview
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      {previewId && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-6">
          <div className="bg-white rounded-lg max-w-3xl w-full max-h-[90vh] overflow-auto p-5">
            <div className="flex justify-between items-center mb-3">
              <h3 className="font-semibold">Preview</h3>
              <button className="text-slate-500" onClick={() => setPreviewId(null)}>
                Close
              </button>
            </div>
            {!playback && <p className="text-slate-400 text-sm">Loading preview…</p>}
            {playback?.type === "video" && (
              <video src={playback.url} controls className="w-full rounded" controlsList="nodownload" />
            )}
            {playback && playback.type !== "video" && <DocumentViewer fileUrl={playback.url} />}
          </div>
        </div>
      )}
    </div>
  );
}
