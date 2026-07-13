import { useEffect, useState } from "react";
import { useFranchises } from "../../features/org.js";
import {
  useAllAnnouncements,
  useAnnouncementReadStatus,
  useCreateAnnouncement,
  useDeleteAnnouncement,
  useMarkAnnouncementRead,
  useMyAnnouncements,
} from "../../features/announcement.js";
import { useAuth } from "../../lib/authContext.js";
import type { UserRole } from "../../lib/authContext.js";

const MANAGER_ROLES: UserRole[] = ["super_admin", "admin", "trainer"];

function ManagerView() {
  const { data: announcements } = useAllAnnouncements();
  const { data: franchises } = useFranchises();
  const create = useCreateAnnouncement();
  const del = useDeleteAnnouncement();
  const [statusId, setStatusId] = useState<string | null>(null);
  const { data: readStatus } = useAnnouncementReadStatus(statusId);

  const [form, setForm] = useState<{
    title: string;
    body: string;
    targetType: "all" | "role" | "franchise";
    targetRole: UserRole;
    targetFranchiseId: string;
  }>({ title: "", body: "", targetType: "all", targetRole: "employee", targetFranchiseId: "" });

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    await create.mutateAsync({
      title: form.title,
      body: form.body,
      targetType: form.targetType,
      targetRole: form.targetType === "role" ? form.targetRole : undefined,
      targetFranchiseId: form.targetType === "franchise" ? form.targetFranchiseId : undefined,
    });
    setForm({ title: "", body: "", targetType: "all", targetRole: "employee", targetFranchiseId: "" });
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-slate-800">Announcements</h1>
      <form onSubmit={handleCreate} className="bg-white rounded-lg border border-slate-200 p-4 space-y-2">
        <input
          placeholder="Title"
          required
          value={form.title}
          onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
          className="w-full rounded-md border border-slate-300 px-3 py-1.5 text-sm"
        />
        <textarea
          placeholder="Message"
          required
          value={form.body}
          onChange={(e) => setForm((f) => ({ ...f, body: e.target.value }))}
          className="w-full rounded-md border border-slate-300 px-3 py-1.5 text-sm"
          rows={2}
        />
        <div className="flex gap-2">
          <select
            value={form.targetType}
            onChange={(e) => setForm((f) => ({ ...f, targetType: e.target.value as "all" | "role" | "franchise" }))}
            className="rounded-md border border-slate-300 px-3 py-1.5 text-sm"
          >
            <option value="all">Everyone</option>
            <option value="role">Specific role</option>
            <option value="franchise">Specific franchise</option>
          </select>
          {form.targetType === "role" && (
            <select
              value={form.targetRole}
              onChange={(e) => setForm((f) => ({ ...f, targetRole: e.target.value as UserRole }))}
              className="rounded-md border border-slate-300 px-3 py-1.5 text-sm"
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
              className="rounded-md border border-slate-300 px-3 py-1.5 text-sm"
            >
              <option value="">Select franchise…</option>
              {franchises?.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.name}
                </option>
              ))}
            </select>
          )}
          <button className="rounded-md bg-astra text-white px-4 py-1.5 text-sm">Post</button>
        </div>
      </form>

      <div className="space-y-2">
        {announcements?.map((a) => (
          <div key={a.id} className="bg-white rounded-lg border border-slate-200 p-4">
            <div className="flex justify-between items-start">
              <div>
                <div className="font-medium">{a.title}</div>
                <div className="text-sm text-slate-600">{a.body}</div>
                <div className="text-xs text-slate-400 mt-1">
                  {a.targetType === "all" ? "Everyone" : a.targetType === "role" ? `Role: ${a.targetRole}` : "Specific franchise"}
                </div>
              </div>
              <div className="flex gap-2 text-xs">
                <button onClick={() => setStatusId(statusId === a.id ? null : a.id)} className="text-astra">
                  Read status
                </button>
                <button onClick={() => del.mutate(a.id)} className="text-red-500">
                  Remove
                </button>
              </div>
            </div>
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
  const markRead = useMarkAnnouncementRead();

  useEffect(() => {
    announcements?.filter((a) => !a.isRead).forEach((a) => markRead.mutate(a.id));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [announcements?.map((a) => a.id).join(",")]);

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold text-slate-800">Announcements</h1>
      {announcements?.length === 0 && <p className="text-slate-400">No announcements right now.</p>}
      <div className="space-y-2">
        {announcements?.map((a) => (
          <div key={a.id} className="bg-white rounded-lg border border-slate-200 p-4">
            <div className="font-medium">{a.title}</div>
            <div className="text-sm text-slate-600">{a.body}</div>
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
