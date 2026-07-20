import { CheckCircle2, Search } from "lucide-react";
import { lazy, Suspense, useMemo, useState } from "react";
import { RowActionsMenu } from "../../components/common/RowActionsMenu.js";
import {
  useContentList,
  useContentPlaybackUrl,
  useCreateMasterTopic,
  useDeleteContent,
  useMasterTopics,
  useRetryConversion,
  useUpdateContent,
  useUploadContent,
  type ContentItem,
} from "../../features/content.js";
import type { UserRole } from "../../lib/authContext.js";
import { isAxiosError } from "axios";

const DocumentViewer = lazy(() =>
  import("../../components/documentViewer/DocumentViewer.js").then((m) => ({ default: m.DocumentViewer })),
);

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
  const [uploadPct, setUploadPct] = useState<number | null>(null);
  const upload = useUploadContent((pct) => setUploadPct(pct === -1 ? null : pct));

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
  const [success, setSuccess] = useState<string | null>(null);
  const [previewId, setPreviewId] = useState<string | null>(null);
  const [newTopicTitle, setNewTopicTitle] = useState("");
  const [editingItem, setEditingItem] = useState<ContentItem | null>(null);
  const [editForm, setEditForm] = useState({ title: "", description: "", topic: "", language: "" });
  const [editFile, setEditFile] = useState<File | null>(null);
  const [editError, setEditError] = useState<string | null>(null);
  const updateContent = useUpdateContent(editingItem?.id ?? "");
  const deleteContent = useDeleteContent();
  const retryConversion = useRetryConversion();
  const [librarySearch, setLibrarySearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | ContentItem["status"]>("all");

  const { data: playback } = useContentPlaybackUrl(previewId);

  const visibleContent = useMemo(() => {
    const q = librarySearch.trim().toLowerCase();
    return (content ?? [])
      .filter((c) => (statusFilter === "all" ? true : c.status === statusFilter))
      .filter((c) => !q || c.title.toLowerCase().includes(q) || c.topic.toLowerCase().includes(q));
  }, [content, librarySearch, statusFilter]);

  function toggleRole(role: UserRole) {
    setSelectedRoles((prev) => (prev.includes(role) ? prev.filter((r) => r !== role) : [...prev, role]));
  }

  async function handleUpload(e: React.FormEvent) {
    e.preventDefault();
    if (!file) return;
    setWarning(null);
    setSuccess(null);
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
      else setSuccess(`"${result.item.title}" uploaded successfully.`);
      setForm({ title: "", description: "", topic: "", language: "Hindi", masterTopicId: "" });
      setFile(null);
      (document.getElementById("file-input") as HTMLInputElement | null)?.value &&
        ((document.getElementById("file-input") as HTMLInputElement).value = "");
    } catch (err) {
      setWarning(err instanceof Error ? err.message : "Upload failed. Please try again.");
    }
  }

  function openEdit(item: ContentItem) {
    setEditingItem(item);
    setEditForm({ title: item.title, description: item.description, topic: item.topic, language: item.language });
    setEditFile(null);
    setEditError(null);
  }

  async function handleSaveEdit(e: React.FormEvent) {
    e.preventDefault();
    if (!editingItem) return;
    setEditError(null);
    try {
      await updateContent.mutateAsync({ ...editForm, file: editFile ?? undefined });
      setEditingItem(null);
    } catch (err) {
      setEditError(err instanceof Error ? err.message : "Could not save changes. Please try again.");
    }
  }

  async function handleDelete(item: ContentItem) {
    setWarning(null);
    setSuccess(null);
    try {
      await deleteContent.mutateAsync(item.id);
      setSuccess(`"${item.title}" deleted.`);
    } catch (err) {
      setWarning(
        isAxiosError(err) && err.response?.data?.error
          ? err.response.data.error
          : "Could not delete this content. Please try again.",
      );
    }
  }

  async function handleRetryConversion(item: ContentItem) {
    setWarning(null);
    setSuccess(null);
    try {
      const result = await retryConversion.mutateAsync(item.id);
      if (result.warning) setWarning(result.warning);
      else setSuccess(`"${item.title}" converted successfully.`);
    } catch (err) {
      setWarning(
        isAxiosError(err) && err.response?.data?.error
          ? err.response.data.error
          : "Retry failed. Please try again.",
      );
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
      {success && (
        <div className="rounded-md bg-emerald-50 border border-emerald-200 px-4 py-3 text-sm text-emerald-800 flex items-center gap-1.5">
          <CheckCircle2 className="w-4 h-4 shrink-0" /> {success}
          <button className="ml-3 underline" onClick={() => setSuccess(null)}>
            dismiss
          </button>
        </div>
      )}

      <section className="bg-white rounded-lg shadow-clay p-5">
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
              className="rounded-md shadow-clay-inset px-3 py-1.5 text-sm flex-1 min-w-[180px]"
            />
          </div>
          <textarea
            placeholder="Description"
            required
            value={form.description}
            onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
            className="w-full rounded-md shadow-clay-inset px-3 py-1.5 text-sm"
            rows={2}
          />
          <div className="flex flex-wrap gap-2 items-center">
            <input
              placeholder="Topic (e.g. Customer Registration)"
              required
              value={form.topic}
              onChange={(e) => setForm((f) => ({ ...f, topic: e.target.value }))}
              className="rounded-md shadow-clay-inset px-3 py-1.5 text-sm"
            />
            <select
              value={form.language}
              onChange={(e) => setForm((f) => ({ ...f, language: e.target.value }))}
              className="rounded-md shadow-clay-inset px-3 py-1.5 text-sm"
            >
              <option>Hindi</option>
              <option>English</option>
              <option>Bengali</option>
            </select>
            <select
              value={form.masterTopicId}
              onChange={(e) => setForm((f) => ({ ...f, masterTopicId: e.target.value }))}
              className="rounded-md shadow-clay-inset px-3 py-1.5 text-sm"
              title="Groups the same lesson uploaded in different languages together, so a learner can switch language and land on the matching video/document. Leave as standalone if this content has no other-language versions."
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
              className="rounded-md shadow-clay-inset px-3 py-1.5 text-sm"
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
            className="rounded-md bg-astra text-white shadow-clay-sm px-4 py-1.5 text-sm font-medium disabled:opacity-60"
          >
            {upload.isPending ? `Uploading… ${uploadPct ?? 0}%` : "Upload"}
          </button>
          {upload.isPending && (
            <div className="w-full h-2 bg-slate-200 rounded overflow-hidden">
              <div
                className="h-full bg-astra transition-all"
                style={{ width: `${uploadPct ?? 0}%` }}
              />
            </div>
          )}
        </form>
      </section>

      <section className="bg-white rounded-lg shadow-clay p-5">
        <h2 className="font-semibold text-slate-700 mb-3">Library</h2>

        <div className="relative mb-3">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            placeholder="Search by title or topic…"
            value={librarySearch}
            onChange={(e) => setLibrarySearch(e.target.value)}
            className="w-full rounded-md shadow-clay-inset pl-9 pr-3 py-1.5 text-sm"
          />
        </div>
        <div className="flex items-center gap-1 mb-3 text-sm">
          <span className="text-slate-500 mr-1">Show only:</span>
          {(["all", "ready", "processing", "failed"] as const).map((s) => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`px-3 py-1 rounded-pill capitalize ${
                statusFilter === s ? "bg-astra-soft text-astra-dark font-medium" : "text-slate-500 hover:bg-slate-100"
              }`}
            >
              {s}
            </button>
          ))}
        </div>

        <div className="rounded-md border border-black/[0.06] dark:border-white/10 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-slate-500 bg-slate-50">
                <th className="py-2 px-3 font-medium">Title</th>
                <th className="py-2 px-3 font-medium">Type</th>
                <th className="py-2 px-3 font-medium">Topic</th>
                <th className="py-2 px-3 font-medium">Language</th>
                <th className="py-2 px-3 font-medium">Status</th>
                <th className="py-2 px-3 font-medium w-9" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading && (
                <tr>
                  <td colSpan={6} className="py-3 px-3 text-slate-400">
                    Loading…
                  </td>
                </tr>
              )}
              {visibleContent.map((c) => (
                <tr key={c.id}>
                  <td className="py-2 px-3 whitespace-nowrap max-w-[260px] truncate">{c.title}</td>
                  <td className="py-2 px-3 uppercase text-xs text-slate-500 whitespace-nowrap">{c.type}</td>
                  <td className="py-2 px-3 whitespace-nowrap max-w-[160px] truncate">{c.topic}</td>
                  <td className="py-2 px-3 whitespace-nowrap">{c.language}</td>
                  <td className="py-2 px-3 whitespace-nowrap">
                    <span className={`rounded-pill px-2 py-0.5 text-xs font-medium ${STATUS_BADGE[c.status]}`}>{c.status}</span>
                  </td>
                  <td className="py-1 px-1 text-right">
                    <RowActionsMenu
                      actions={[
                        ...(c.status === "ready" ? [{ label: "Preview", onClick: () => setPreviewId(c.id) }] : []),
                        ...(c.status === "failed" ? [{ label: "Retry conversion", onClick: () => handleRetryConversion(c) }] : []),
                        { label: "Edit", onClick: () => openEdit(c) },
                        { label: "Delete", danger: true, disabled: deleteContent.isPending, onClick: () => handleDelete(c) },
                      ]}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="mt-2 text-xs text-slate-400">
          {visibleContent.length} of {content?.length ?? 0} items
        </div>
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
            {playback && playback.type !== "video" && (
              <Suspense fallback={<p className="text-slate-400 text-sm">Loading viewer…</p>}>
                <DocumentViewer fileUrl={playback.url} />
              </Suspense>
            )}
          </div>
        </div>
      )}

      {editingItem && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-6">
          <div className="bg-white rounded-lg max-w-lg w-full p-5">
            <div className="flex justify-between items-center mb-3">
              <h3 className="font-semibold">Edit "{editingItem.title}"</h3>
              <button className="text-slate-500" onClick={() => setEditingItem(null)}>
                Close
              </button>
            </div>
            <form onSubmit={handleSaveEdit} className="space-y-2">
              <input
                placeholder="Title"
                required
                value={editForm.title}
                onChange={(e) => setEditForm((f) => ({ ...f, title: e.target.value }))}
                className="w-full rounded-md shadow-clay-inset px-3 py-1.5 text-sm"
              />
              <textarea
                placeholder="Description"
                required
                value={editForm.description}
                onChange={(e) => setEditForm((f) => ({ ...f, description: e.target.value }))}
                className="w-full rounded-md shadow-clay-inset px-3 py-1.5 text-sm"
                rows={2}
              />
              <div className="flex gap-2">
                <input
                  placeholder="Topic"
                  required
                  value={editForm.topic}
                  onChange={(e) => setEditForm((f) => ({ ...f, topic: e.target.value }))}
                  className="flex-1 rounded-md shadow-clay-inset px-3 py-1.5 text-sm"
                />
                <select
                  value={editForm.language}
                  onChange={(e) => setEditForm((f) => ({ ...f, language: e.target.value }))}
                  className="rounded-md shadow-clay-inset px-3 py-1.5 text-sm"
                >
                  <option>Hindi</option>
                  <option>English</option>
                  <option>Bengali</option>
                </select>
              </div>
              <label className="block text-xs text-slate-500">
                Replace file (optional — leave blank to keep the current one)
                <input type="file" onChange={(e) => setEditFile(e.target.files?.[0] ?? null)} className="block mt-1 text-sm" />
              </label>
              {editError && <p className="text-xs text-red-600">{editError}</p>}
              <div className="flex gap-2 pt-1">
                <button
                  type="submit"
                  disabled={updateContent.isPending}
                  className="rounded-md bg-astra text-white shadow-clay-sm px-4 py-1.5 text-sm font-medium disabled:opacity-60"
                >
                  {updateContent.isPending ? "Saving…" : "Save changes"}
                </button>
                <button type="button" onClick={() => setEditingItem(null)} className="text-sm text-slate-500">
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
