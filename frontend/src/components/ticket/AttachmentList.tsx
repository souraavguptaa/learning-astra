import { api } from "../../lib/api.js";
import type { Attachment } from "../../features/ticket.js";

export function AttachmentList({ attachments }: { attachments?: Attachment[] }) {
  if (!attachments || attachments.length === 0) return null;

  async function open(fileKey: string) {
    const { data } = await api.get<{ url: string }>("/files/download-url", { params: { key: fileKey } });
    window.open(data.url, "_blank");
  }

  return (
    <div className="flex flex-wrap gap-2 mt-1">
      {attachments.map((a) => (
        <button
          key={a.fileKey}
          onClick={() => open(a.fileKey)}
          className="text-xs text-astra underline flex items-center gap-1"
        >
          📎 {a.fileName}
        </button>
      ))}
    </div>
  );
}
