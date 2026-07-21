import { useEffect, useState } from "react";
import { api } from "../../lib/api.js";

/** Resolves a private R2 file key to a signed URL and renders it — shared between the builder's
 * preview (with a remove button layered on top) and the learner-facing quiz view (plain). */
export function QuestionImage({ fileKey, className = "max-h-48 rounded-md border border-slate-200" }: { fileKey: string; className?: string }) {
  const [url, setUrl] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setUrl(null);
    api.get<{ url: string }>("/files/download-url", { params: { key: fileKey } }).then(({ data }) => {
      if (!cancelled) setUrl(data.url);
    });
    return () => {
      cancelled = true;
    };
  }, [fileKey]);

  if (!url) return <div className="w-32 h-24 rounded-md bg-slate-100 animate-pulse" />;
  return <img src={url} alt="Question" className={className} />;
}
