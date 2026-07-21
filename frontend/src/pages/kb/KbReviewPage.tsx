import { useState } from "react";
import { Spinner } from "../../components/common/Spinner.js";
import { usePendingKbSubmissions, useReviewKbSubmission } from "../../features/ticket.js";

export function KbReviewPage() {
  const { data: submissions } = usePendingKbSubmissions();
  const review = useReviewKbSubmission();
  const [editing, setEditing] = useState<Record<string, { title: string; description: string; topic: string; language: string }>>({});

  function startEdit(id: string, current: { title: string; description: string; topic: string; language: string }) {
    setEditing((e) => ({ ...e, [id]: current }));
  }

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold text-slate-800">Knowledge Base Review</h1>
      <p className="text-sm text-slate-500">
        Solutions submitted by trainers from resolved tickets, pending your approval before they become part of the
        knowledge base.
      </p>
      {submissions?.length === 0 && <p className="text-slate-400">Nothing pending review.</p>}
      <div className="space-y-3">
        {submissions?.map((s) => {
          const edit = editing[s.id];
          const pending = review.isPending && review.variables?.id === s.id;
          return (
            <div key={s.id} className={`bg-white rounded-lg shadow-clay p-4 space-y-2 transition-opacity ${pending ? "opacity-50" : ""}`}>
              <div className="text-xs text-slate-400">
                From ticket "{s.ticketSubject}" · submitted by {s.trainerName}
              </div>
              {!edit && (
                <>
                  <div className="font-medium">{s.proposedContent.title}</div>
                  <div className="text-sm text-slate-600">{s.proposedContent.description}</div>
                  <div className="text-xs text-slate-400">
                    Topic: {s.proposedContent.topic} · {s.proposedContent.language}
                  </div>
                </>
              )}
              {edit && (
                <div className="space-y-2">
                  <input
                    value={edit.title}
                    onChange={(e) => setEditing((prev) => ({ ...prev, [s.id]: { ...edit, title: e.target.value } }))}
                    className="w-full rounded-md shadow-clay-inset px-3 py-1.5 text-sm"
                  />
                  <textarea
                    value={edit.description}
                    onChange={(e) => setEditing((prev) => ({ ...prev, [s.id]: { ...edit, description: e.target.value } }))}
                    className="w-full rounded-md shadow-clay-inset px-3 py-1.5 text-sm"
                    rows={2}
                  />
                </div>
              )}
              <div className="flex gap-2 pt-2">
                {!edit && (
                  <>
                    <button
                      onClick={() => review.mutate({ id: s.id, action: "approve" })}
                      disabled={pending}
                      className="rounded-md bg-emerald-600 text-white px-3 py-1.5 text-sm disabled:opacity-60 inline-flex items-center gap-1.5"
                    >
                      {pending && <Spinner className="w-3.5 h-3.5" />}
                      {pending ? "Approving…" : "Approve"}
                    </button>
                    <button
                      onClick={() => startEdit(s.id, s.proposedContent)}
                      disabled={pending}
                      className="rounded-md shadow-clay-inset px-3 py-1.5 text-sm disabled:opacity-60"
                    >
                      Edit & Approve
                    </button>
                    <button
                      onClick={() => review.mutate({ id: s.id, action: "reject" })}
                      disabled={pending}
                      className="rounded-md border border-red-300 text-red-600 px-3 py-1.5 text-sm disabled:opacity-60 inline-flex items-center gap-1.5"
                    >
                      {pending && <Spinner className="w-3.5 h-3.5" />}
                      {pending ? "Rejecting…" : "Reject"}
                    </button>
                  </>
                )}
                {edit && (
                  <>
                    <button
                      onClick={() => review.mutate({ id: s.id, action: "edit_approve", editedContent: edit })}
                      disabled={pending}
                      className="rounded-md bg-emerald-600 text-white px-3 py-1.5 text-sm disabled:opacity-60 inline-flex items-center gap-1.5"
                    >
                      {pending && <Spinner className="w-3.5 h-3.5" />}
                      {pending ? "Saving…" : "Save & Approve"}
                    </button>
                    <button
                      onClick={() => setEditing((prev) => { const { [s.id]: _, ...rest } = prev; return rest; })}
                      disabled={pending}
                      className="text-sm text-slate-500 disabled:opacity-60"
                    >
                      Cancel edit
                    </button>
                  </>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
