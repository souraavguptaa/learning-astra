import { useState } from "react";
import { useAddTicketMessage, useTicketDetail } from "../../features/ticket.js";

const STATUS_BADGE: Record<string, string> = {
  open: "bg-amber-50 text-amber-700",
  in_progress: "bg-blue-50 text-blue-700",
  resolved: "bg-emerald-50 text-emerald-700",
};

export function TicketThread({ ticketId, children }: { ticketId: string; children?: React.ReactNode }) {
  const { data } = useTicketDetail(ticketId);
  const addMessage = useAddTicketMessage(ticketId);
  const [reply, setReply] = useState("");

  if (!data) return <p className="text-slate-400 text-sm">Loading…</p>;
  const { ticket, messages } = data;

  async function handleReply(e: React.FormEvent) {
    e.preventDefault();
    if (!reply.trim()) return;
    await addMessage.mutateAsync(reply.trim());
    setReply("");
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-semibold">{ticket.subject}</h3>
          <p className="text-sm text-slate-500">{ticket.description}</p>
        </div>
        <span className={`px-2 py-0.5 rounded text-xs ${STATUS_BADGE[ticket.status]}`}>{ticket.status}</span>
      </div>

      {children}

      <div className="space-y-2 max-h-64 overflow-y-auto">
        {messages.map((m) => (
          <div key={m.id} className="bg-slate-50 rounded p-2 text-sm">
            <div className="text-xs text-slate-400 mb-0.5">
              {m.senderName} · {new Date(m.createdAt).toLocaleString()}
            </div>
            {m.message}
          </div>
        ))}
        {messages.length === 0 && <p className="text-sm text-slate-400">No replies yet.</p>}
      </div>

      <form onSubmit={handleReply} className="flex gap-2">
        <input
          value={reply}
          onChange={(e) => setReply(e.target.value)}
          placeholder="Write a reply…"
          className="flex-1 rounded-md border border-slate-300 px-3 py-1.5 text-sm"
        />
        <button className="rounded-md bg-astra text-white px-3 py-1.5 text-sm" disabled={addMessage.isPending}>
          Send
        </button>
      </form>
    </div>
  );
}
