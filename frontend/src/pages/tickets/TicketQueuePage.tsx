import { useState } from "react";
import { TicketThread } from "../../components/ticket/TicketThread.js";
import { useSetTicketStatus, useSubmitKbSolution, useTicketDetail, useTicketQueue } from "../../features/ticket.js";

export function TicketQueuePage() {
  const [statusFilter, setStatusFilter] = useState<string>("");
  const { data: tickets } = useTicketQueue(statusFilter || undefined);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const setStatus = useSetTicketStatus(selectedId ?? "");
  const submitKb = useSubmitKbSolution(selectedId ?? "");
  const { data: detail } = useTicketDetail(selectedId);
  const [showKbForm, setShowKbForm] = useState(false);
  const [kbForm, setKbForm] = useState({ title: "", description: "", topic: "", language: "English" });

  async function handleKbSubmit(e: React.FormEvent) {
    e.preventDefault();
    await submitKb.mutateAsync(kbForm);
    setShowKbForm(false);
    setKbForm({ title: "", description: "", topic: "", language: "English" });
  }

  return (
    <div className="grid grid-cols-3 gap-6">
      <div className="col-span-1 space-y-4">
        <h1 className="text-xl font-bold text-slate-800">Support Tickets</h1>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="w-full rounded-md shadow-clay-inset px-3 py-1.5 text-sm"
        >
          <option value="">All statuses</option>
          <option value="open">Open</option>
          <option value="in_progress">In Progress</option>
          <option value="resolved">Resolved</option>
        </select>
        <div className="space-y-1">
          {tickets?.map((t) => (
            <button
              key={t.id}
              onClick={() => setSelectedId(t.id)}
              className={`w-full text-left px-3 py-2 rounded text-sm border ${
                selectedId === t.id ? "border-astra bg-orange-50" : "border-slate-200 bg-white"
              }`}
            >
              <div className="font-medium">{t.subject}</div>
              <div className="text-xs text-slate-400">
                {t.ticketNumber} · {t.requesterName} · {t.status}
              </div>
            </button>
          ))}
        </div>
      </div>
      <div className="col-span-2">
        {!selectedId && <p className="text-slate-400">Select a ticket.</p>}
        {selectedId && (
          <div className="bg-white rounded-lg shadow-clay p-4 space-y-4">
            <TicketThread ticketId={selectedId}>
              <div className="flex gap-2">
                <select
                  value={detail?.ticket.status ?? "open"}
                  onChange={(e) => setStatus.mutate(e.target.value as "open" | "in_progress" | "resolved")}
                  className="rounded-md shadow-clay-inset px-2 py-1 text-sm"
                >
                  <option value="open">Open</option>
                  <option value="in_progress">In Progress</option>
                  <option value="resolved">Resolved</option>
                </select>
                {!showKbForm && detail?.kbSubmissions.length === 0 && (
                  <button onClick={() => setShowKbForm(true)} className="text-astra text-sm underline">
                    Add solution to Knowledge Base
                  </button>
                )}
              </div>
            </TicketThread>

            {detail?.kbSubmissions.map((kb) => (
              <div key={kb.id} className="bg-slate-50 rounded p-3 text-sm">
                <div className="font-medium">{kb.proposedContent.title}</div>
                <div className="text-xs text-slate-500">Review status: {kb.status}</div>
              </div>
            ))}

            {showKbForm && (
              <form onSubmit={handleKbSubmit} className="bg-slate-50 rounded p-3 space-y-2">
                <input
                  placeholder="Title"
                  required
                  value={kbForm.title}
                  onChange={(e) => setKbForm((f) => ({ ...f, title: e.target.value }))}
                  className="w-full rounded-md shadow-clay-inset px-3 py-1.5 text-sm"
                />
                <textarea
                  placeholder="Solution text"
                  required
                  value={kbForm.description}
                  onChange={(e) => setKbForm((f) => ({ ...f, description: e.target.value }))}
                  className="w-full rounded-md shadow-clay-inset px-3 py-1.5 text-sm"
                  rows={2}
                />
                <div className="flex gap-2">
                  <input
                    placeholder="Topic"
                    required
                    value={kbForm.topic}
                    onChange={(e) => setKbForm((f) => ({ ...f, topic: e.target.value }))}
                    className="flex-1 rounded-md shadow-clay-inset px-3 py-1.5 text-sm"
                  />
                  <select
                    value={kbForm.language}
                    onChange={(e) => setKbForm((f) => ({ ...f, language: e.target.value }))}
                    className="rounded-md shadow-clay-inset px-3 py-1.5 text-sm"
                  >
                    <option>Hindi</option>
                    <option>English</option>
                    <option>Bengali</option>
                  </select>
                </div>
                <div className="flex gap-2">
                  <button className="rounded-md bg-astra text-white shadow-clay-sm px-3 py-1.5 text-sm">Submit for review</button>
                  <button type="button" onClick={() => setShowKbForm(false)} className="text-sm text-slate-500">
                    Cancel
                  </button>
                </div>
              </form>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
