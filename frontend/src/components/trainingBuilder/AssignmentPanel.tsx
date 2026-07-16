import { useState } from "react";
import { useFranchises, useUsers } from "../../features/org.js";
import { useAssignTraining, useRemoveAssignment, useTrainingDetail } from "../../features/training.js";
import type { UserRole } from "../../lib/authContext.js";

type AssigneeType = "role" | "franchise" | "users";

/** Self-contained assign form + current-assignments list for one training/assessment — used both
 * inline in the builder's Assign tab and in the quick-assign modal opened straight from the list,
 * so assigning something that already exists never requires opening the builder at all. */
export function AssignmentPanel({ trainingId }: { trainingId: string }) {
  const { data: detail } = useTrainingDetail(trainingId);
  const { data: franchises } = useFranchises();
  const { data: allUsers } = useUsers();
  const assign = useAssignTraining(trainingId);
  const removeAssignment = useRemoveAssignment(trainingId);

  const [assignForm, setAssignForm] = useState<{
    assigneeType: AssigneeType;
    role: UserRole;
    franchiseId: string;
    userIds: string[];
    dueDate: string;
    dueTime: string;
    mandatory: boolean;
  }>({ assigneeType: "role", role: "employee", franchiseId: "", userIds: [], dueDate: "", dueTime: "", mandatory: true });
  const [assigning, setAssigning] = useState(false);
  const [userSearch, setUserSearch] = useState("");

  const endUsers = allUsers?.filter((u) => ["franchise_owner", "operator", "employee"].includes(u.role)) ?? [];
  const filteredEndUsers = endUsers.filter((u) => u.name.toLowerCase().includes(userSearch.toLowerCase()));

  async function handleAssign(e: React.FormEvent) {
    e.preventDefault();
    setAssigning(true);
    try {
      const dueAt = assignForm.dueDate
        ? new Date(`${assignForm.dueDate}T${assignForm.dueTime || "23:59"}`).toISOString()
        : undefined;
      const common = { dueAt, isMandatory: assignForm.mandatory };
      if (assignForm.assigneeType === "role") {
        await assign.mutateAsync({ assigneeType: "role", role: assignForm.role, ...common });
      } else if (assignForm.assigneeType === "franchise") {
        await assign.mutateAsync({ assigneeType: "franchise", franchiseId: assignForm.franchiseId, ...common });
      } else {
        for (const userId of assignForm.userIds) {
          await assign.mutateAsync({ assigneeType: "user", userId, ...common });
        }
      }
      setAssignForm((f) => ({ ...f, userIds: [] }));
    } finally {
      setAssigning(false);
    }
  }

  function toggleAssignUser(userId: string) {
    setAssignForm((f) => ({
      ...f,
      userIds: f.userIds.includes(userId) ? f.userIds.filter((id) => id !== userId) : [...f.userIds, userId],
    }));
  }

  function describeAssignment(a: { assigneeType: string; role: string | null; franchiseId: string | null; userId: string | null }) {
    if (a.assigneeType === "role") return `Everyone with role: ${a.role}`;
    if (a.assigneeType === "franchise") return `Everyone at: ${franchises?.find((f) => f.id === a.franchiseId)?.name ?? "Unknown franchise"}`;
    return allUsers?.find((u) => u.id === a.userId)?.name ?? "Unknown user";
  }

  if (!detail) return <p className="text-slate-400 text-sm">Loading…</p>;

  if (detail.training.status !== "published") {
    return (
      <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 text-sm text-amber-800">
        This is still a draft. Publish it first — a draft can't be assigned, since nobody would be able
        to see it yet.
      </div>
    );
  }

  return (
    <div>
      <p className="text-xs text-slate-400 mb-3">
        Pick a whole role, everyone at one franchise, or specific people — you can add as many of each as
        you like, whenever you like. No need to touch the content or build anything again.
      </p>
      <form onSubmit={handleAssign} className="space-y-2">
        <div className="flex gap-2">
          <select
            value={assignForm.assigneeType}
            onChange={(e) => setAssignForm((f) => ({ ...f, assigneeType: e.target.value as AssigneeType }))}
            className="rounded-md border border-slate-300 px-3 py-1.5 text-sm"
          >
            <option value="role">A whole role</option>
            <option value="franchise">Everyone at a franchise</option>
            <option value="users">Specific people</option>
          </select>
          {assignForm.assigneeType === "role" && (
            <select
              value={assignForm.role}
              onChange={(e) => setAssignForm((f) => ({ ...f, role: e.target.value as UserRole }))}
              className="rounded-md border border-slate-300 px-3 py-1.5 text-sm"
            >
              <option value="franchise_owner">Franchise Owner</option>
              <option value="operator">Operator</option>
              <option value="employee">Employee</option>
            </select>
          )}
          {assignForm.assigneeType === "franchise" && (
            <select
              value={assignForm.franchiseId}
              onChange={(e) => setAssignForm((f) => ({ ...f, franchiseId: e.target.value }))}
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
          <button
            disabled={
              assigning ||
              (assignForm.assigneeType === "franchise" && !assignForm.franchiseId) ||
              (assignForm.assigneeType === "users" && assignForm.userIds.length === 0)
            }
            className="rounded-md bg-astra text-white px-3 py-1.5 text-sm disabled:opacity-60"
          >
            {assigning ? "Assigning…" : "Assign"}
          </button>
        </div>
        {assignForm.assigneeType === "users" && (
          <>
            <input
              placeholder="Search people…"
              value={userSearch}
              onChange={(e) => setUserSearch(e.target.value)}
              className="w-full rounded-md border border-slate-300 px-3 py-1.5 text-sm"
            />
            <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto border border-slate-200 rounded p-2">
              {filteredEndUsers.length === 0 && <span className="text-xs text-slate-400">No matching users.</span>}
              {filteredEndUsers.map((u) => (
                <label key={u.id} className="flex items-center gap-1 text-xs bg-slate-50 px-2 py-1 rounded">
                  <input type="checkbox" checked={assignForm.userIds.includes(u.id)} onChange={() => toggleAssignUser(u.id)} />
                  {u.name}
                </label>
              ))}
            </div>
          </>
        )}
        <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
          <span>Due by (optional):</span>
          <input
            type="date"
            value={assignForm.dueDate}
            onChange={(e) => setAssignForm((f) => ({ ...f, dueDate: e.target.value }))}
            className="rounded-md border border-slate-300 px-2 py-1 text-xs"
          />
          <input
            type="time"
            value={assignForm.dueTime}
            onChange={(e) => setAssignForm((f) => ({ ...f, dueTime: e.target.value }))}
            disabled={!assignForm.dueDate}
            className="rounded-md border border-slate-300 px-2 py-1 text-xs disabled:opacity-50"
          />
          <label className="flex items-center gap-1">
            <input
              type="checkbox"
              checked={assignForm.mandatory}
              onChange={(e) => setAssignForm((f) => ({ ...f, mandatory: e.target.checked }))}
            />
            Mandatory for these people
          </label>
        </div>
      </form>
      <ul className="mt-3 text-sm space-y-1">
        {detail.assignments.length === 0 && <li className="text-slate-400">Not assigned to anyone yet.</li>}
        {detail.assignments.map((a) => (
          <li key={a.id} className="flex items-center justify-between bg-slate-50 rounded px-2 py-1">
            <span>
              {describeAssignment(a)}
              {a.isMandatory && <span className="ml-2 text-[10px] text-red-500">mandatory</span>}
              {a.dueAt && <span className="ml-2 text-[10px] text-slate-400">due {new Date(a.dueAt).toLocaleString("en-IN")}</span>}
            </span>
            <button onClick={() => removeAssignment.mutate(a.id)} className="text-red-500 text-xs hover:underline">
              Remove
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
