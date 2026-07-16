import { useState } from "react";
import { useAddTicketMessage, useTicketDetail, type Attachment } from "../../features/ticket.js";
import { useAuth } from "../../lib/authContext.js";
import { AttachmentList } from "./AttachmentList.js";
import { LearnerProfileModal } from "./LearnerProfileModal.js";

const MANAGER_ROLES = ["super_admin", "admin", "trainer"];

const STATUS_BADGE: Record<string, string> = {
  open: "bg-amber-50 text-amber-700",
  in_progress: "bg-blue-50 text-blue-700",
  resolved: "bg-emerald-50 text-emerald-700",
};

export function TicketThread({ ticketId, children }: { ticketId: string; children?: React.ReactNode }) {
  const { user } = useAuth();
  const { data } = useTicketDetail(ticketId);
  const addMessage = useAddTicketMessage(ticketId);
  const [reply, setReply] = useState("");
  const [showProfile, setShowProfile] = useState(false);

  if (!data) return <p className="text-slate-400 text-sm">Loading…</p>;
  const { ticket, messages } = data;
  const isManager = !!user && MANAGER_ROLES.includes(user.role);

  async function handleReply(e: React.FormEvent) {
    e.preventDefault();
    if (!reply.trim()) return;
    await addMessage.mutateAsync({ message: reply.trim() });
    setReply("");
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="font-semibold">{ticket.subject}</h3>
            <span className="text-xs text-slate-400 font-mono">{ticket.ticketNumber}</span>
          </div>
          {isManager && ticket.requesterName && (
            <p className="text-xs text-slate-500 mt-0.5">
              Replying to <span className="font-medium">{ticket.requesterName}</span> ({ticket.requesterEmail}){" "}
              <button onClick={() => setShowProfile(true)} className="text-astra hover:underline">
                View learner profile →
              </button>
            </p>
          )}
          <p className="text-sm text-slate-500 mt-1">{ticket.description}</p>
          <AttachmentList attachments={ticket.attachments as Attachment[]} />
        </div>
        <span className={`px-2 py-0.5 rounded text-xs shrink-0 ${STATUS_BADGE[ticket.status]}`}>{ticket.status}</span>
      </div>

      {children}

      <div className="space-y-2 max-h-64 overflow-y-auto">
        {messages.map((m) => (
          <div key={m.id} className="bg-slate-50 rounded p-2 text-sm">
            <div className="text-xs text-slate-400 mb-0.5">
              {m.senderName} · {new Date(m.createdAt).toLocaleString()}
            </div>
            {m.message}
            <AttachmentList attachments={m.attachments} />
          </div>
        ))}
        {messages.length === 0 && <p className="text-sm text-slate-400">No replies yet.</p>}
      </div>

      <form onSubmit={handleReply} className="flex gap-2">
        <input
          value={reply}
          onChange={(e) => setReply(e.target.value)}
          placeholder={isManager && ticket.requesterName ? `Reply to ${ticket.requesterName}…` : "Write a reply…"}
          className="flex-1 rounded-md border border-slate-300 px-3 py-1.5 text-sm"
        />
        <button className="rounded-md bg-astra text-white px-3 py-1.5 text-sm" disabled={addMessage.isPending}>
          Send
        </button>
      </form>

      {showProfile && <LearnerProfileModal userId={ticket.userId} onClose={() => setShowProfile(false)} />}
    </div>
  );
}
