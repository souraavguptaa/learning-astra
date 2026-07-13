import { DndContext, closestCenter, type DragEndEvent } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { useState } from "react";
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
  useRemoveTrainingItem,
  useReorderTrainingItems,
  useTrainingDetail,
  useTrainings,
  useUpdateTraining,
} from "../../features/training.js";
import { useFranchises } from "../../features/org.js";
import type { UserRole } from "../../lib/authContext.js";

export function TrainingBuilderPage() {
  const { data: trainings } = useTrainings();
  const { data: contentList } = useContentList();
  const { data: franchises } = useFranchises();
  const createTraining = useCreateTraining();

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [form, setForm] = useState({ title: "", description: "", isMandatory: false });
  const [pickedContentId, setPickedContentId] = useState("");
  const [showAssessmentForm, setShowAssessmentForm] = useState(false);
  const [assignForm, setAssignForm] = useState<{ assigneeType: "role" | "franchise"; role: UserRole; franchiseId: string }>({
    assigneeType: "role",
    role: "employee",
    franchiseId: "",
  });

  const { data: detail } = useTrainingDetail(selectedId);
  const addItem = useAddTrainingItem(selectedId ?? "");
  const reorderItems = useReorderTrainingItems(selectedId ?? "");
  const removeItem = useRemoveTrainingItem(selectedId ?? "");
  const publish = usePublishTraining(selectedId ?? "");
  const bumpVersion = useBumpVersion(selectedId ?? "");
  const assign = useAssignTraining(selectedId ?? "");
  const updateTraining = useUpdateTraining(selectedId ?? "");
  const { data: npsReport } = useNpsReport(detail?.training.npsEnabled ? selectedId : null);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    const training = await createTraining.mutateAsync(form);
    setForm({ title: "", description: "", isMandatory: false });
    setSelectedId(training.id);
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

  async function handleAssign(e: React.FormEvent) {
    e.preventDefault();
    if (assignForm.assigneeType === "role") {
      await assign.mutateAsync({ assigneeType: "role", role: assignForm.role });
    } else {
      await assign.mutateAsync({ assigneeType: "franchise", franchiseId: assignForm.franchiseId });
    }
  }

  return (
    <div className="grid grid-cols-3 gap-6">
      <div className="col-span-1 space-y-4">
        <h1 className="text-xl font-bold text-slate-800">Trainings</h1>
        <form onSubmit={handleCreate} className="bg-white rounded-lg border border-slate-200 p-4 space-y-2">
          <input
            placeholder="Title"
            required
            value={form.title}
            onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
            className="w-full rounded-md border border-slate-300 px-3 py-1.5 text-sm"
          />
          <textarea
            placeholder="Description"
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
            Mandatory
          </label>
          <button className="w-full rounded-md bg-astra text-white py-1.5 text-sm font-medium">
            Create training
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
        {!detail && <p className="text-slate-400">Select or create a training to edit it.</p>}
        {detail && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold">{detail.training.title}</h2>
                <p className="text-sm text-slate-500">
                  {detail.training.status} · v{detail.training.versionMajor}.{detail.training.versionMinor}
                </p>
                <label className="text-xs text-slate-500 flex items-center gap-1 mt-1">
                  <input
                    type="checkbox"
                    checked={detail.training.npsEnabled}
                    onChange={(e) => updateTraining.mutate({ npsEnabled: e.target.checked })}
                  />
                  Collect NPS feedback for this training
                </label>
              </div>
              <div className="flex gap-2">
                {detail.training.status === "draft" && (
                  <button
                    onClick={() => publish.mutate()}
                    className="rounded-md bg-astra text-white px-3 py-1.5 text-sm"
                  >
                    Publish
                  </button>
                )}
                {detail.training.status === "published" && (
                  <>
                    <button
                      onClick={() => bumpVersion.mutate("minor")}
                      className="rounded-md border border-slate-300 px-3 py-1.5 text-sm"
                    >
                      Minor update
                    </button>
                    <button
                      onClick={() => bumpVersion.mutate("major")}
                      className="rounded-md border border-red-300 text-red-600 px-3 py-1.5 text-sm"
                    >
                      Major update
                    </button>
                  </>
                )}
              </div>
            </div>

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
              <h3 className="font-semibold text-slate-700 mb-3">Assign to</h3>
              <form onSubmit={handleAssign} className="flex gap-2 items-center">
                <select
                  value={assignForm.assigneeType}
                  onChange={(e) => setAssignForm((f) => ({ ...f, assigneeType: e.target.value as "role" | "franchise" }))}
                  className="rounded-md border border-slate-300 px-3 py-1.5 text-sm"
                >
                  <option value="role">Role</option>
                  <option value="franchise">Franchise</option>
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
                <button className="rounded-md bg-astra text-white px-3 py-1.5 text-sm">Assign</button>
              </form>
              <ul className="mt-3 text-sm text-slate-500 space-y-1">
                {detail.assignments.map((a) => (
                  <li key={a.id}>
                    {a.assigneeType === "role" && `Role: ${a.role}`}
                    {a.assigneeType === "franchise" && `Franchise: ${franchises?.find((f) => f.id === a.franchiseId)?.name ?? a.franchiseId}`}
                    {a.assigneeType === "user" && `User: ${a.userId}`}
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
