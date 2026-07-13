import { DndContext, closestCenter, type DragEndEvent } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { useEffect, useState } from "react";
import { AssessmentBuilderForm } from "../../components/assessment/AssessmentBuilderForm.js";
import { SortableItemRow } from "../../components/trainingBuilder/SortableItemRow.js";
import { useContentList } from "../../features/content.js";
import { useNpsReport } from "../../features/nps.js";
import {
  useAddTrainingItem,
  useAssignTraining,
  useBumpVersion,
  useCreateTraining,
  usePublishTraining,
  useRemoveAssignment,
  useRemoveTrainingItem,
  useReorderTrainingItems,
  useTrainingDetail,
  useTrainings,
  useUpdateTraining,
} from "../../features/training.js";
import { useFranchises, useUsers } from "../../features/org.js";
import type { UserRole } from "../../lib/authContext.js";

type AssigneeType = "role" | "franchise" | "users";

export function TrainingBuilderPage({ kind = "course" }: { kind?: "course" | "assessment" }) {
  const noun = kind === "assessment" ? "Assessment" : "Training";
  const { data: trainings } = useTrainings(kind);
  const { data: contentList } = useContentList();
  const { data: franchises } = useFranchises();
  const { data: allUsers } = useUsers();
  const createTraining = useCreateTraining();

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [form, setForm] = useState({ title: "", description: "", isMandatory: false });
  const [pickedContentId, setPickedContentId] = useState("");
  const [showAssessmentForm, setShowAssessmentForm] = useState(false);
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
  const [editForm, setEditForm] = useState({ title: "", description: "" });
  const [justSaved, setJustSaved] = useState<string | null>(null);

  const { data: detail } = useTrainingDetail(selectedId);
  const addItem = useAddTrainingItem(selectedId ?? "");
  const reorderItems = useReorderTrainingItems(selectedId ?? "");
  const removeItem = useRemoveTrainingItem(selectedId ?? "");
  const publish = usePublishTraining(selectedId ?? "");
  const bumpVersion = useBumpVersion(selectedId ?? "");
  const assign = useAssignTraining(selectedId ?? "");
  const removeAssignment = useRemoveAssignment(selectedId ?? "");
  const updateTraining = useUpdateTraining(selectedId ?? "");
  const { data: npsReport } = useNpsReport(detail?.training.npsEnabled ? selectedId : null);

  const endUsers = allUsers?.filter((u) => ["franchise_owner", "operator", "employee"].includes(u.role)) ?? [];

  useEffect(() => {
    if (detail) setEditForm({ title: detail.training.title, description: detail.training.description });
  }, [detail?.training.id]);

  function flashSaved(label: string) {
    setJustSaved(label);
    setTimeout(() => setJustSaved(null), 2000);
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    const training = await createTraining.mutateAsync({ ...form, isStandaloneAssessment: kind === "assessment" });
    setForm({ title: "", description: "", isMandatory: false });
    setSelectedId(training.id);
  }

  async function handleSaveDetails(e: React.FormEvent) {
    e.preventDefault();
    await updateTraining.mutateAsync({ title: editForm.title, description: editForm.description });
    flashSaved("Saved");
  }

  async function handleAddItem() {
    if (!pickedContentId) return;
    await addItem.mutateAsync(pickedContentId);
    setPickedContentId("");
  }

  function handleDragEnd(event: DragEndEvent) {
    if (!detail) return;
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const ids = detail.items.map((i) => i.item.id);
    const oldIndex = ids.indexOf(active.id as string);
    const newIndex = ids.indexOf(over.id as string);
    const reordered = [...ids];
    reordered.splice(oldIndex, 1);
    reordered.splice(newIndex, 0, active.id as string);
    reorderItems.mutate(reordered);
  }

  async function handlePublish() {
    await publish.mutateAsync();
    flashSaved("Published");
  }

  async function handleBumpVersion(changeType: "minor" | "major") {
    await bumpVersion.mutateAsync(changeType);
    flashSaved(changeType === "major" ? "Major update sent — everyone must redo this training" : "Minor update saved");
  }

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
      flashSaved("Assigned");
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

  return (
    <div className="grid grid-cols-3 gap-6">
      <div className="col-span-1 space-y-4">
        <h1 className="text-xl font-bold text-slate-800">{kind === "assessment" ? "Assessments" : "Trainings"}</h1>
        <form onSubmit={handleCreate} className="bg-white rounded-lg border border-slate-200 p-4 space-y-2">
          <input
            placeholder="Title"
            required
            value={form.title}
            onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
            className="w-full rounded-md border border-slate-300 px-3 py-1.5 text-sm"
          />
          <textarea
            placeholder={`Description / notes for this ${noun.toLowerCase()}`}
            required
            value={form.description}
            onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
            className="w-full rounded-md border border-slate-300 px-3 py-1.5 text-sm"
            rows={2}
          />
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={form.isMandatory}
              onChange={(e) => setForm((f) => ({ ...f, isMandatory: e.target.checked }))}
            />
            Mandatory for everyone it's assigned to
          </label>
          <button className="w-full rounded-md bg-astra text-white py-1.5 text-sm font-medium">
            Create {noun.toLowerCase()}
          </button>
        </form>
        <div className="space-y-1">
          {trainings?.map((t) => (
            <button
              key={t.id}
              onClick={() => setSelectedId(t.id)}
              className={`w-full text-left px-3 py-2 rounded text-sm border ${
                selectedId === t.id ? "border-astra bg-blue-50" : "border-slate-200 bg-white"
              }`}
            >
              <div className="font-medium">{t.title}</div>
              <div className="text-xs text-slate-400">
                {t.status} · v{t.versionMajor}.{t.versionMinor} {t.isMandatory && "· mandatory"}
              </div>
            </button>
          ))}
        </div>
      </div>

      <div className="col-span-2">
        {!detail && <p className="text-slate-400">Select or create {kind === "assessment" ? "an assessment" : "a training"} to edit it.</p>}
        {detail && (
          <div className="space-y-6">
            {justSaved && (
              <div className="rounded-md bg-emerald-50 border border-emerald-200 px-3 py-2 text-sm text-emerald-800">
                ✓ {justSaved}
              </div>
            )}

            <section className="bg-white rounded-lg border border-slate-200 p-4">
              <div className="flex items-center justify-between mb-3">
                <p className="text-sm text-slate-500">
                  {detail.training.status} · v{detail.training.versionMajor}.{detail.training.versionMinor}
                </p>
                <div className="flex gap-2">
                  {detail.training.status === "draft" && (
                    <button
                      onClick={handlePublish}
                      disabled={publish.isPending}
                      className="rounded-md bg-astra text-white px-3 py-1.5 text-sm disabled:opacity-60"
                    >
                      {publish.isPending ? "Publishing…" : "Publish"}
                    </button>
                  )}
                  {detail.training.status === "published" && (
                    <>
                      <button
                        onClick={() => handleBumpVersion("minor")}
                        disabled={bumpVersion.isPending}
                        className="rounded-md border border-slate-300 px-3 py-1.5 text-sm disabled:opacity-60"
                        title="Small tweak — people who already completed it don't need to redo it"
                      >
                        {bumpVersion.isPending ? "Saving…" : "Minor update"}
                      </button>
                      <button
                        onClick={() => handleBumpVersion("major")}
                        disabled={bumpVersion.isPending}
                        className="rounded-md border border-red-300 text-red-600 px-3 py-1.5 text-sm disabled:opacity-60"
                        title="Big change — everyone who already completed it must redo it"
                      >
                        {bumpVersion.isPending ? "Saving…" : "Major update"}
                      </button>
                    </>
                  )}
                </div>
              </div>
              <form onSubmit={handleSaveDetails} className="space-y-2">
                <input
                  value={editForm.title}
                  onChange={(e) => setEditForm((f) => ({ ...f, title: e.target.value }))}
                  className="w-full rounded-md border border-slate-300 px-3 py-1.5 text-lg font-bold"
                />
                <textarea
                  value={editForm.description}
                  onChange={(e) => setEditForm((f) => ({ ...f, description: e.target.value }))}
                  placeholder="Add any information trainees should know about this training…"
                  className="w-full rounded-md border border-slate-300 px-3 py-1.5 text-sm"
                  rows={3}
                />
                <div className="flex items-center gap-4">
                  <button
                    type="submit"
                    disabled={updateTraining.isPending}
                    className="rounded-md bg-astra text-white px-3 py-1.5 text-sm disabled:opacity-60"
                  >
                    {updateTraining.isPending ? "Saving…" : "Save details"}
                  </button>
                  <label className="text-xs text-slate-500 flex items-center gap-1">
                    <input
                      type="checkbox"
                      checked={detail.training.isMandatory}
                      onChange={(e) => updateTraining.mutate({ isMandatory: e.target.checked })}
                    />
                    Mandatory for everyone assigned
                  </label>
                  <label className="text-xs text-slate-500 flex items-center gap-1">
                    <input
                      type="checkbox"
                      checked={detail.training.npsEnabled}
                      onChange={(e) => updateTraining.mutate({ npsEnabled: e.target.checked })}
                    />
                    Collect NPS feedback
                  </label>
                </div>
              </form>
            </section>

            <section className="bg-white rounded-lg border border-slate-200 p-4">
              <h3 className="font-semibold text-slate-700 mb-3">Items (drag to reorder)</h3>
              <DndContext collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                <SortableContext items={detail.items.map((i) => i.item.id)} strategy={verticalListSortingStrategy}>
                  <div className="space-y-2">
                    {detail.items.map(({ item, content, assessment }) => (
                      <SortableItemRow
                        key={item.id}
                        item={item}
                        content={content}
                        assessment={assessment}
                        onRemove={() => removeItem.mutate(item.id)}
                      />
                    ))}
                  </div>
                </SortableContext>
              </DndContext>
              <div className="flex gap-2 mt-3">
                {kind !== "assessment" && (
                  <>
                    <select
                      value={pickedContentId}
                      onChange={(e) => setPickedContentId(e.target.value)}
                      className="flex-1 rounded-md border border-slate-300 px-3 py-1.5 text-sm"
                    >
                      <option value="">Select content to add…</option>
                      {contentList
                        ?.filter((c) => c.status === "ready")
                        .map((c) => (
                          <option key={c.id} value={c.id}>
                            [{c.type}] {c.title}
                          </option>
                        ))}
                    </select>
                    <button onClick={handleAddItem} className="rounded-md bg-astra text-white px-3 py-1.5 text-sm">
                      Add content
                    </button>
                  </>
                )}
                {!showAssessmentForm && (
                  <button
                    onClick={() => setShowAssessmentForm(true)}
                    className="rounded-md border border-astra text-astra px-3 py-1.5 text-sm"
                  >
                    + Add quiz
                  </button>
                )}
              </div>
              {showAssessmentForm && (
                <div className="mt-3">
                  <AssessmentBuilderForm trainingId={detail.training.id} onDone={() => setShowAssessmentForm(false)} />
                </div>
              )}
            </section>

            <section className="bg-white rounded-lg border border-slate-200 p-4">
              <h3 className="font-semibold text-slate-700 mb-1">Who is this assigned to?</h3>
              <p className="text-xs text-slate-400 mb-3">
                Pick a whole role, everyone at one franchise, or specific people — you can add as many of each as you like.
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
                  <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto border border-slate-200 rounded p-2">
                    {endUsers.length === 0 && <span className="text-xs text-slate-400">No users yet.</span>}
                    {endUsers.map((u) => (
                      <label key={u.id} className="flex items-center gap-1 text-xs bg-slate-50 px-2 py-1 rounded">
                        <input
                          type="checkbox"
                          checked={assignForm.userIds.includes(u.id)}
                          onChange={() => toggleAssignUser(u.id)}
                        />
                        {u.name}
                      </label>
                    ))}
                  </div>
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
                      {a.dueAt && (
                        <span className="ml-2 text-[10px] text-slate-400">
                          due {new Date(a.dueAt).toLocaleString("en-IN")}
                        </span>
                      )}
                    </span>
                    <button
                      onClick={() => removeAssignment.mutate(a.id)}
                      className="text-red-500 text-xs hover:underline"
                    >
                      Remove
                    </button>
                  </li>
                ))}
              </ul>
            </section>

            {detail.training.npsEnabled && npsReport && (
              <section className="bg-white rounded-lg border border-slate-200 p-4">
                <h3 className="font-semibold text-slate-700 mb-3">NPS Feedback</h3>
                {npsReport.responseCount === 0 && <p className="text-sm text-slate-400">No responses yet.</p>}
                {npsReport.responseCount > 0 && (
                  <>
                    <p className="text-sm mb-2">
                      Average: <span className="font-bold">{npsReport.average}</span> · {npsReport.responseCount} response
                      {npsReport.responseCount === 1 ? "" : "s"}
                    </p>
                    <div className="flex gap-1 items-end h-16">
                      {Object.entries(npsReport.distribution).map(([rating, count]) => (
                        <div key={rating} className="flex-1 flex flex-col items-center gap-1">
                          <div
                            className="w-full bg-astra rounded-t"
                            style={{ height: `${Math.max(4, (count / Math.max(1, npsReport.responseCount)) * 56)}px` }}
                          />
                          <span className="text-[10px] text-slate-400">{rating}</span>
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </section>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
