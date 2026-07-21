import { Megaphone, Paperclip } from "lucide-react";
import { useState } from "react";
import { Spinner } from "../../components/common/Spinner.js";
import { useInView } from "../../hooks/useInView.js";
import { useFranchises } from "../../features/org.js";
import {
  uploadAnnouncementAttachment,
  useAllAnnouncements,
  useAnnouncementReadStatus,
  useCreateAnnouncement,
  useDeleteAnnouncement,
  useMyAnnouncements,
  useUpdateAnnouncement,
  type Announcement,
} from "../../features/announcement.js";
import { useAuth } from "../../lib/authContext.js";
import type { UserRole } from "../../lib/authContext.js";
import { api } from "../../lib/api.js";

const MANAGER_ROLES: UserRole[] = ["super_admin", "admin", "trainer"];

function AttachmentLink({ fileKey }: { fileKey: string | null }) {
  if (!fileKey) return null;
  async function open() {
    const { data } = await api.get<{ url: string }>("/files/download-url", { params: { key: fileKey } });
    window.open(data.url, "_blank");
  }
  return (
    <button onClick={open} className="text-xs text-astra underline mt-1 inline-flex items-center gap-1">
      <Paperclip className="w-3.5 h-3.5" /> View attachment
    </button>
  );
}

function ManagerView() {
  const { data: announcements } = useAllAnnouncements();
  const { data: franchises } = useFranchises();
  const create = useCreateAnnouncement();
  const del = useDeleteAnnouncement();
  const [statusId, setStatusId] = useState<string | null>(null);
  const { data: readStatus } = useAnnouncementReadStatus(statusId);
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({ title: "", body: "" });
  const update = useUpdateAnnouncement(editingId ?? "");

  const [form, setForm] = useState<{
    title: string;
    body: string;
    targetType: "all" | "role" | "franchise";
    targetRole: UserRole;
    targetFranchiseId: string;
  }>({ title: "", body: "", targetType: "all", targetRole: "employee", targetFranchiseId: "" });

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setUploading(true);
    try {
      const attachmentFileKey = file ? await uploadAnnouncementAttachment(file) : undefined;
      await create.mutateAsync({
        title: form.title,
        body: form.body,
        targetType: form.targetType,
        targetRole: form.targetType === "role" ? form.targetRole : undefined,
        targetFranchiseId: form.targetType === "franchise" ? form.targetFranchiseId : undefined,
        attachmentFileKey,
      });
      setForm({ title: "", body: "", targetType: "all", targetRole: "employee", targetFranchiseId: "" });
      setFile(null);
    } finally {
      setUploading(false);
    }
  }

  function openEdit(a: Announcement) {
    setEditingId(a.id);
    setEditForm({ title: a.title, body: a.body });
  }

  async function handleSaveEdit(e: React.FormEvent) {
    e.preventDefault();
    await update.mutateAsync(editForm);
    setEditingId(null);
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-slate-800">Announcements</h1>
      <form onSubmit={handleCreate} className="bg-white rounded-lg shadow-clay p-4 space-y-2">
        <input
          placeholder="Title"
          required
          value={form.title}
          onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
          className="w-full rounded-md shadow-clay-inset px-3 py-1.5 text-sm"
        />
        <textarea
          placeholder="Message"
          required
          value={form.body}
          onChange={(e) => setForm((f) => ({ ...f, body: e.target.value }))}
          className="w-full rounded-md shadow-clay-inset px-3 py-1.5 text-sm"
          rows={2}
        />
        <input type="file" onChange={(e) => setFile(e.target.files?.[0] ?? null)} className="text-xs" />
        <div className="flex gap-2">
          <select
            value={form.targetType}
            onChange={(e) => setForm((f) => ({ ...f, targetType: e.target.value as "all" | "role" | "franchise" }))}
            className="rounded-md shadow-clay-inset px-3 py-1.5 text-sm"
          >
            <option value="all">Everyone</option>
            <option value="role">Specific role</option>
            <option value="franchise">Specific franchise</option>
          </select>
          {form.targetType === "role" && (
            <select
              value={form.targetRole}
              onChange={(e) => setForm((f) => ({ ...f, targetRole: e.target.value as UserRole }))}
              className="rounded-md shadow-clay-inset px-3 py-1.5 text-sm"
            >
              <option value="franchise_owner">Franchise Owner</option>
              <option value="operator">Operator</option>
              <option value="employee">Employee</option>
              <option value="trainer">Trainer</option>
              <option value="admin">Admin</option>
            </select>
          )}
          {form.targetType === "franchise" && (
            <select
              value={form.targetFranchiseId}
              onChange={(e) => setForm((f) => ({ ...f, targetFranchiseId: e.target.value }))}
              className="rounded-md shadow-clay-inset px-3 py-1.5 text-sm"
            >
              <option value="">Select franchise…</option>
              {franchises?.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.name}
                </option>
              ))}
            </select>
          )}
          <button disabled={uploading} className="rounded-md bg-astra text-white shadow-clay-sm px-4 py-1.5 text-sm disabled:opacity-60">
            {uploading ? "Posting…" : "Post"}
          </button>
        </div>
      </form>

      <div className="space-y-3">
        {announcements?.map((a, i) => {
          const removing = del.isPending && del.variables === a.id;
          return (
          <div
            key={a.id}
            style={{ animationDelay: `${Math.min(i, 8) * 40}ms`, animationFillMode: "backwards" }}
            className={`page-enter bg-white rounded-xl shadow-clay overflow-hidden transition-opacity ${removing ? "opacity-50" : ""}`}
          >
            {editingId === a.id ? (
              <form onSubmit={handleSaveEdit} className="space-y-2 p-4">
                <input
                  value={editForm.title}
                  onChange={(e) => setEditForm((f) => ({ ...f, title: e.target.value }))}
                  className="w-full rounded-md shadow-clay-inset px-3 py-1.5 text-sm font-medium"
                />
                <textarea
                  value={editForm.body}
                  onChange={(e) => setEditForm((f) => ({ ...f, body: e.target.value }))}
                  className="w-full rounded-md shadow-clay-inset px-3 py-1.5 text-sm"
                  rows={2}
                />
                <div className="flex gap-2 text-xs">
                  <button type="submit" disabled={update.isPending} className="rounded-md bg-astra text-white shadow-clay-sm px-3 py-1 disabled:opacity-60">
                    {update.isPending ? "Saving…" : "Save"}
                  </button>
                  <button type="button" onClick={() => setEditingId(null)} className="text-slate-500">
                    Cancel
                  </button>
                </div>
              </form>
            ) : (
              <>
                {/* Header row: icon-shape badge + title, per cards.md — then a divider before the
                    body, matching the widget-shell header/divider/body/divider/footer rhythm. */}
                <div className="flex items-start gap-3 px-4 py-3">
                  <span className="inline-flex items-center justify-center w-9 h-9 rounded-md bg-astra-soft text-astra-dark shrink-0">
                    <Megaphone className="w-4 h-4" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="font-medium">{a.title}</div>
                    <div className="text-sm text-slate-600 mt-0.5">{a.body}</div>
                    <AttachmentLink fileKey={a.attachmentFileKey} />
                  </div>
                </div>
                <div className="border-t border-black/[0.06] dark:border-white/10" />
                <div className="flex items-center justify-between gap-2 px-4 py-2 text-xs">
                  <span className="text-slate-400">
                    {a.targetType === "all" ? "Everyone" : a.targetType === "role" ? `Role: ${a.targetRole}` : "Specific franchise"}
                  </span>
                  <div className="flex gap-3">
                    <button onClick={() => setStatusId(statusId === a.id ? null : a.id)} className="text-astra">
                      Read status
                    </button>
                    <button onClick={() => openEdit(a)} className="text-astra">
                      Edit
                    </button>
                    <button
                      onClick={() => {
                        if (window.confirm(`Remove the announcement "${a.title}"?`)) del.mutate(a.id);
                      }}
                      disabled={removing}
                      className="text-red-500 disabled:opacity-60 inline-flex items-center gap-1"
                    >
                      {removing && <Spinner className="w-3 h-3" />}
                      {removing ? "Removing…" : "Remove"}
                    </button>
                  </div>
                </div>
              </>
            )}
            {statusId === a.id && readStatus && (
              <div className="text-xs text-slate-500 border-t border-black/[0.06] dark:border-white/10 px-4 py-2">
                Read by {readStatus.filter((r) => r.readAt).length} / {readStatus.length}
              </div>
            )}
          </div>
          );
        })}
      </div>
    </div>
  );
}

function AnnouncementCard({ a, index }: { a: Announcement; index: number }) {
  const { ref, inView } = useInView<HTMLDivElement>();
  return (
    <div
      ref={ref}
      style={{ transitionDelay: inView ? `${Math.min(index, 8) * 50}ms` : "0ms" }}
      className={`reveal ${inView ? "in-view" : ""} bg-white rounded-xl shadow-clay overflow-hidden`}
    >
      <div className="flex items-start gap-3 px-4 py-3">
        <span className="inline-flex items-center justify-center w-9 h-9 rounded-md bg-astra-soft text-astra-dark shrink-0">
          <Megaphone className="w-4 h-4" />
        </span>
        <div className="min-w-0 flex-1">
          <div className="font-medium">{a.title}</div>
          <div className="text-sm text-slate-600 mt-0.5">{a.body}</div>
          <AttachmentLink fileKey={a.attachmentFileKey} />
        </div>
      </div>
      <div className="border-t border-black/[0.06] dark:border-white/10 px-4 py-2 text-xs text-slate-400">
        {new Date(a.createdAt).toLocaleString()}
      </div>
    </div>
  );
}

function EndUserView() {
  const { data: announcements } = useMyAnnouncements();

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold text-slate-800">Announcements</h1>
      {announcements?.length === 0 && <p className="text-slate-400">No announcements right now.</p>}
      <div className="space-y-3">
        {announcements?.map((a, i) => (
          <AnnouncementCard key={a.id} a={a} index={i} />
        ))}
      </div>
    </div>
  );
}

export function AnnouncementsPage() {
  const { user } = useAuth();
  if (!user) return null;
  return MANAGER_ROLES.includes(user.role) ? <ManagerView /> : <EndUserView />;
}
