import { DndContext, closestCenter, type DragEndEvent } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CheckCircle2, Search, Send } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { isAxiosError } from "axios";
import { AssessmentBuilderForm } from "../../components/assessment/AssessmentBuilderForm.js";
import { AssignmentPanel } from "../../components/trainingBuilder/AssignmentPanel.js";
import { QuickAssignModal } from "../../components/trainingBuilder/QuickAssignModal.js";
import { SortableItemRow } from "../../components/trainingBuilder/SortableItemRow.js";
import { useContentList } from "../../features/content.js";
import { useNpsReport } from "../../features/nps.js";
import { useAuth } from "../../lib/authContext.js";
import {
  useAddTrainingItem,
  useBumpVersion,
  useCreateTraining,
  useDeleteTraining,
  usePublishTraining,
  useRemoveTrainingItem,
  useReorderTrainingItems,
  useTrainingDetail,
  useTrainings,
  useUpdateTraining,
} from "../../features/training.js";

type Tab = "build" | "assign";

export function TrainingBuilderPage({ kind = "course" }: { kind?: "course" | "assessment" }) {
  const noun = kind === "assessment" ? "Assessment" : "Training";
  const { user } = useAuth();
  const isSuperAdmin = user?.role === "super_admin";
  const { data: trainings } = useTrainings(kind);
  const { data: contentList } = useContentList();
  const createTraining = useCreateTraining();

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<Tab>("build");
  const [quickAssign, setQuickAssign] = useState<{ id: string; title: string } | null>(null);
  const [form, setForm] = useState({ title: "", description: "" });
  const [pickedContentId, setPickedContentId] = useState("");
  const [showAssessmentForm, setShowAssessmentForm] = useState(false);
  const [editForm, setEditForm] = useState({ title: "", description: "" });
  const [justSaved, setJustSaved] = useState<string | null>(null);
  const [publishError, setPublishError] = useState<string | null>(null);
  const [listSearch, setListSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "draft" | "published">("all");

  const visibleTrainings = useMemo(() => {
    const q = listSearch.trim().toLowerCase();
    return (trainings ?? [])
      .filter((t) => (statusFilter === "all" ? true : t.status === statusFilter))
      .filter((t) => !q || t.title.toLowerCase().includes(q));
  }, [trainings, listSearch, statusFilter]);

  const { data: detail } = useTrainingDetail(selectedId);
  const addItem = useAddTrainingItem(selectedId ?? "");
  const reorderItems = useReorderTrainingItems(selectedId ?? "");
  const removeItem = useRemoveTrainingItem(selectedId ?? "");
  const publish = usePublishTraining(selectedId ?? "");
  const deleteTraining = useDeleteTraining();
  const bumpVersion = useBumpVersion(selectedId ?? "");
  const updateTraining = useUpdateTraining(selectedId ?? "");
  const { data: npsReport } = useNpsReport(detail?.training.npsEnabled ? selectedId : null);

  useEffect(() => {
    if (detail) setEditForm({ title: detail.training.title, description: detail.training.description });
  }, [detail?.training.id]);

  useEffect(() => {
    setActiveTab("build");
    setPublishError(null); // a delete/publish error from the previously-selected item must not bleed into this one
  }, [selectedId]);

  function flashSaved(label: string) {
    setJustSaved(label);
    setTimeout(() => setJustSaved(null), 2000);
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    const training = await createTraining.mutateAsync({ ...form, isMandatory: false, isStandaloneAssessment: kind === "assessment" });
    setForm({ title: "", description: "" });
    setSelectedId(training.id);
    flashSaved(`${noun} created — add content below, then Publish when ready.`);
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
    flashSaved("Content added");
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
    setPublishError(null);
    try {
      await publish.mutateAsync();
      flashSaved("Published");
    } catch (err) {
      setPublishError(isAxiosError(err) && err.response?.data?.error ? err.response.data.error : "Could not publish. Please try again.");
    }
  }

  async function handleDelete() {
    if (!selectedId || !detail) return;
    if (!window.confirm(`Delete "${detail.training.title}"? This can't be undone.`)) return;
    setPublishError(null);
    try {
      await deleteTraining.mutateAsync({ trainingId: selectedId });
      setSelectedId(null);
      return;
    } catch (err) {
      const message = isAxiosError(err) && err.response?.data?.error ? err.response.data.error : "Could not delete. Please try again.";
      const blockedByGuard = isAxiosError(err) && err.response?.status === 400 && message.includes("learner progress");

      if (blockedByGuard && isSuperAdmin) {
        const typed = window.prompt(
          `"${detail.training.title}" has real learner progress and/or certificates. Force-deleting it permanently destroys ` +
            `that progress and any certificates already earned from it — this cannot be undone.\n\n` +
            `Type DELETE to confirm.`,
        );
        if (typed === "DELETE") {
          try {
            await deleteTraining.mutateAsync({ trainingId: selectedId, force: true });
            setSelectedId(null);
            return;
          } catch (err2) {
            setPublishError(isAxiosError(err2) && err2.response?.data?.error ? err2.response.data.error : "Could not force-delete. Please try again.");
            return;
          }
        }
        return;
      }

      setPublishError(message);
    }
  }

  async function handleBumpVersion(changeType: "minor" | "major") {
    await bumpVersion.mutateAsync(changeType);
    flashSaved(changeType === "major" ? "Major update sent — everyone must redo this training" : "Minor update saved");
  }

  return (
    <div className="grid grid-cols-3 gap-6">
      <div className="col-span-1 space-y-4">
        <h1 className="text-xl font-bold text-slate-800">{kind === "assessment" ? "Assessments" : "Trainings"}</h1>
        <form onSubmit={handleCreate} className="bg-white rounded-lg shadow-clay p-4 space-y-3">
          <label className="block">
            <span className="block text-xs font-medium text-slate-600 mb-1">Title</span>
            <input
              required
              value={form.title}
              onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
              className="w-full rounded-md shadow-clay-inset px-3 h-11 text-sm"
            />
          </label>
          <label className="block">
            <span className="block text-xs font-medium text-slate-600 mb-1">Description</span>
            <textarea
              placeholder={`Notes for this ${noun.toLowerCase()}`}
              required
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              className="w-full rounded-md shadow-clay-inset px-3 py-2 text-sm"
              rows={2}
            />
          </label>
          <button disabled={createTraining.isPending} className="w-full rounded-md bg-astra text-white shadow-clay-sm h-11 text-sm font-medium disabled:opacity-60">
            {createTraining.isPending ? "Creating…" : `Create ${noun.toLowerCase()}`}
          </button>
        </form>
        <p className="text-xs text-slate-400 px-1">
          Build it once below, then hit "Assign" any time you want to hand it to someone — no need to
          recreate it.
        </p>
        {trainings && trainings.length > 5 && (
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              placeholder={`Search ${kind === "assessment" ? "assessments" : "trainings"}…`}
              value={listSearch}
              onChange={(e) => setListSearch(e.target.value)}
              className="w-full rounded-md shadow-clay-inset pl-9 pr-3 py-1.5 text-sm"
            />
          </div>
        )}
        {trainings && trainings.length > 5 && (
          <div className="flex items-center gap-1 text-xs">
            <span className="text-slate-500 mr-0.5">Show:</span>
            {(["all", "draft", "published"] as const).map((s) => (
              <button
                key={s}
                onClick={() => setStatusFilter(s)}
                className={`px-2.5 py-1 rounded-pill capitalize ${
                  statusFilter === s ? "bg-astra-soft text-astra-dark font-medium" : "text-slate-500 hover:bg-slate-100"
                }`}
              >
                {s}
              </button>
            ))}
          </div>
        )}
        <div className="space-y-1">
          {visibleTrainings.map((t) => (
            <div
              key={t.id}
              className={`flex items-center gap-2 rounded-md border pl-3 pr-2 py-2 text-sm ${
                selectedId === t.id ? "border-astra bg-astra-soft" : "border-black/[0.06] dark:border-white/10 bg-white"
              }`}
            >
              <button onClick={() => setSelectedId(t.id)} className="flex-1 min-w-0 text-left">
                <div className="font-medium truncate">{t.title}</div>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <span
                    className={`rounded-pill px-1.5 py-0.5 text-[10px] font-medium ${
                      t.status === "published" ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-500"
                    }`}
                  >
                    {t.status}
                  </span>
                  <span className="text-[11px] text-slate-400">
                    v{t.versionMajor}.{t.versionMinor}
                  </span>
                </div>
              </button>
              {t.status === "published" && (
                <button
                  onClick={() => setQuickAssign({ id: t.id, title: t.title })}
                  title="Assign"
                  className="shrink-0 w-8 h-8 flex items-center justify-center rounded-md text-astra hover:bg-white"
                >
                  <Send className="w-4 h-4" />
                </button>
              )}
            </div>
          ))}
        </div>
      </div>

      <div className="col-span-2">
        {!detail && <p className="text-slate-400">Select or create {kind === "assessment" ? "an assessment" : "a training"} to edit it.</p>}
        {detail && (
          <div className="space-y-4">
            {justSaved && (
              <div className="rounded-md bg-emerald-50 border border-emerald-200 px-3 py-2 text-sm text-emerald-800 flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4" /> {justSaved}
              </div>
            )}
            {publishError && (
              <div className="rounded-md bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-700">{publishError}</div>
            )}

            <div className="flex items-center justify-between">
              <div className="flex gap-1 bg-slate-100 rounded-md p-1">
                <button
                  onClick={() => setActiveTab("build")}
                  className={`px-4 py-1.5 rounded text-sm font-medium ${activeTab === "build" ? "bg-white shadow text-astra" : "text-slate-500"}`}
                >
                  Build
                </button>
                <button
                  onClick={() => setActiveTab("assign")}
                  className={`px-4 py-1.5 rounded text-sm font-medium ${activeTab === "assign" ? "bg-white shadow text-astra" : "text-slate-500"}`}
                >
                  Assign
                </button>
              </div>
              <p className="text-sm text-slate-500">
                {detail.training.status} · v{detail.training.versionMajor}.{detail.training.versionMinor}
              </p>
            </div>

            {activeTab === "assign" && (
              <section className="bg-white rounded-lg shadow-clay p-4">
                <AssignmentPanel trainingId={detail.training.id} />
              </section>
            )}

            {activeTab === "build" && (
              <>
                <section className="bg-white rounded-lg shadow-clay p-4">
                  <div className="flex items-center justify-between mb-3 gap-2">
                    <h3 className="font-semibold text-slate-700">1. Details</h3>
                    <div className="flex gap-2">
                      {detail.training.status === "draft" && (
                        <button
                          onClick={handlePublish}
                          disabled={publish.isPending}
                          className="rounded-md bg-astra text-white shadow-clay-sm px-3 py-1.5 text-sm disabled:opacity-60"
                        >
                          {publish.isPending ? "Publishing…" : "Publish"}
                        </button>
                      )}
                      {detail.training.status === "published" && (
                        <>
                          <button
                            onClick={() => handleBumpVersion("minor")}
                            disabled={bumpVersion.isPending}
                            className="rounded-md shadow-clay-inset px-3 py-1.5 text-sm disabled:opacity-60"
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
                      <button
                        onClick={handleDelete}
                        disabled={deleteTraining.isPending}
                        className="rounded-md border border-red-300 text-red-600 px-3 py-1.5 text-sm disabled:opacity-60"
                      >
                        {deleteTraining.isPending ? "Deleting…" : "Delete"}
                      </button>
                    </div>
                  </div>
                  <form onSubmit={handleSaveDetails} className="space-y-3">
                    <label className="block">
                      <span className="block text-xs font-medium text-slate-500 mb-1">Title</span>
                      <input
                        value={editForm.title}
                        onChange={(e) => setEditForm((f) => ({ ...f, title: e.target.value }))}
                        className="w-full rounded-md shadow-clay-inset px-3 py-1.5 text-lg font-bold"
                      />
                    </label>
                    <label className="block">
                      <span className="block text-xs font-medium text-slate-500 mb-1">Description</span>
                      <textarea
                        value={editForm.description}
                        onChange={(e) => setEditForm((f) => ({ ...f, description: e.target.value }))}
                        placeholder="Add any information trainees should know about this training…"
                        className="w-full rounded-md shadow-clay-inset px-3 py-1.5 text-sm"
                        rows={3}
                      />
                    </label>
                    <div className="flex items-center gap-4">
                      <button
                        type="submit"
                        disabled={updateTraining.isPending}
                        className="rounded-md bg-astra text-white shadow-clay-sm px-3 py-1.5 text-sm disabled:opacity-60"
                      >
                        {updateTraining.isPending ? "Saving…" : "Save details"}
                      </button>
                      <label
                        className="text-xs text-slate-500 flex items-center gap-1"
                        title="Asks each learner to rate this training 0–10 after they finish, so you can see how well it landed"
                      >
                        <input
                          type="checkbox"
                          checked={detail.training.npsEnabled}
                          onChange={(e) => updateTraining.mutate({ npsEnabled: e.target.checked })}
                        />
                        Collect NPS feedback (a satisfaction rating from learners)
                      </label>
                    </div>
                  </form>
                </section>

                <section className="bg-white rounded-lg shadow-clay p-4">
                  <h3 className="font-semibold text-slate-700 mb-3">2. Content &amp; Quiz (drag to reorder)</h3>
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
                  <div className="flex gap-2 mt-3 items-center">
                    {kind !== "assessment" && (
                      <>
                        <select
                          value={pickedContentId}
                          onChange={(e) => setPickedContentId(e.target.value)}
                          className="flex-1 rounded-md shadow-clay-inset px-3 py-1.5 text-sm"
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
                        <button
                          onClick={handleAddItem}
                          disabled={addItem.isPending || !pickedContentId}
                          className="rounded-md bg-astra text-white shadow-clay-sm px-3 py-1.5 text-sm disabled:opacity-60"
                        >
                          {addItem.isPending ? "Adding…" : "Add content"}
                        </button>
                        <Link to="/content" className="text-xs text-astra hover:underline whitespace-nowrap">
                          + upload new file
                        </Link>
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

                {detail.training.status === "draft" && detail.items.length > 0 && (
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm text-blue-800">
                    Ready? Hit <strong>Publish</strong> above, then switch to the <strong>Assign</strong> tab to hand
                    it out.
                  </div>
                )}

                {detail.training.npsEnabled && npsReport && (
                  <section className="bg-white rounded-lg shadow-clay p-4">
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
              </>
            )}
          </div>
        )}
      </div>

      {quickAssign && (
        <QuickAssignModal trainingId={quickAssign.id} title={quickAssign.title} onClose={() => setQuickAssign(null)} />
      )}
    </div>
  );
}
