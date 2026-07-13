import { useState } from "react";
import { TicketThread } from "../../components/ticket/TicketThread.js";
import { useCreateTicket, useMyTickets, uploadTicketAttachment, type Attachment } from "../../features/ticket.js";

export function MyTicketsPage() {
  const { data: tickets } = useMyTickets();
  const createTicket = useCreateTicket();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [form, setForm] = useState({ subject: "", description: "" });
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setUploading(true);
    setError(null);
    try {
      let attachments: Attachment[] | undefined;
      if (file) attachments = [await uploadTicketAttachment(file)];
      const ticket = await createTicket.mutateAsync({ ...form, attachments });
      setForm({ subject: "", description: "" });
      setFile(null);
      setSelectedId(ticket.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not create ticket. Please try again.");
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="grid grid-cols-3 gap-6">
      <div className="col-span-1 space-y-4">
        <h1 className="text-xl font-bold text-slate-800">My Tickets</h1>
        <form onSubmit={handleCreate} className="bg-white rounded-lg border border-slate-200 p-4 space-y-2">
          <input
            placeholder="Subject"
            required
            value={form.subject}
            onChange={(e) => setForm((f) => ({ ...f, subject: e.target.value }))}
            className="w-full rounded-md border border-slate-300 px-3 py-1.5 text-sm"
          />
          <textarea
            placeholder="Describe your issue…"
            required
            value={form.description}
            onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
            className="w-full rounded-md border border-slate-300 px-3 py-1.5 text-sm"
            rows={3}
          />
          <input type="file" onChange={(e) => setFile(e.target.files?.[0] ?? null)} className="text-xs" />
          {error && <p className="text-xs text-red-600">{error}</p>}
          <button
            disabled={uploading}
            className="w-full rounded-md bg-astra text-white py-1.5 text-sm font-medium disabled:opacity-60"
          >
            {uploading ? "Creating…" : "Create ticket"}
          </button>
        </form>
        <div className="space-y-1">
          {tickets?.map((t) => (
            <button
              key={t.id}
              onClick={() => setSelectedId(t.id)}
              className={`w-full text-left px-3 py-2 rounded text-sm border ${
                selectedId === t.id ? "border-astra bg-blue-50" : "border-slate-200 bg-white"
              }`}
            >
              <div className="font-medium">{t.subject}</div>
              <div className="text-xs text-slate-400">{t.status}</div>
            </button>
          ))}
        </div>
      </div>
      <div className="col-span-2">
        {!selectedId && <p className="text-slate-400">Select a ticket to view the conversation.</p>}
        {selectedId && (
          <div className="bg-white rounded-lg border border-slate-200 p-4">
            <TicketThread ticketId={selectedId} />
          </div>
        )}
      </div>
    </div>
  );
}
