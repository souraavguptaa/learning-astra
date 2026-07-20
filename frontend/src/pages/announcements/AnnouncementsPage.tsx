import { Paperclip } from "lucide-react";
import { useState } from "react";
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

      <div className="space-y-2">
        {announcements?.map((a) => (
          <div key={a.id} className="bg-white rounded-lg shadow-clay p-4">
            {editingId === a.id ? (
              <form onSubmit={handleSaveEdit} className="space-y-2">
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
              <div className="flex justify-between items-start">
                <div>
                  <div className="font-medium">{a.title}</div>
                  <div className="text-sm text-slate-600">{a.body}</div>
                  <AttachmentLink fileKey={a.attachmentFileKey} />
                  <div className="text-xs text-slate-400 mt-1">
                    {a.targetType === "all" ? "Everyone" : a.targetType === "role" ? `Role: ${a.targetRole}` : "Specific franchise"}
                  </div>
                </div>
                <div className="flex gap-2 text-xs">
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
                    className="text-red-500"
                  >
                    Remove
                  </button>
                </div>
              </div>
            )}
            {statusId === a.id && readStatus && (
              <div className="mt-2 text-xs text-slate-500 border-t border-slate-100 pt-2">
                Read by {readStatus.filter((r) => r.readAt).length} / {readStatus.length}
              </div>
            )}
          </div>
        ))}
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
      <div className="space-y-2">
        {announcements?.map((a) => (
          <div key={a.id} className="bg-white rounded-lg shadow-clay p-4">
            <div className="font-medium">{a.title}</div>
            <div className="text-sm text-slate-600">{a.body}</div>
            <AttachmentLink fileKey={a.attachmentFileKey} />
            <div className="text-xs text-slate-400 mt-1">{new Date(a.createdAt).toLocaleString()}</div>
          </div>
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
