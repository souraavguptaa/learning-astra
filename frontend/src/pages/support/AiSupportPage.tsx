import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAskSupport, type SupportAskResult } from "../../features/support.js";

export function AiSupportPage() {
  const navigate = useNavigate();
  const ask = useAskSupport();
  const [query, setQuery] = useState("");
  const [result, setResult] = useState<SupportAskResult | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!query.trim()) return;
    const res = await ask.mutateAsync(query.trim());
    setResult(res);
  }

  function raiseTicket() {
    navigate("/my-tickets", { state: { prefillSubject: query, prefillDescription: `I asked AI Support: "${query}" and it couldn't find an answer.` } });
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">AI Support</h1>
        <p className="text-slate-500 mt-1">
          Ask a question in any language. I'll search every video, document, and announcement in Learning Astra for
          a verified answer — if I can't find one, you can raise a ticket in one click.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="flex gap-2">
        <input
          placeholder="Ask a question…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="flex-1 rounded-md border border-slate-300 px-4 py-2 text-sm"
        />
        <button
          type="submit"
          disabled={ask.isPending || !query.trim()}
          className="rounded-md bg-astra text-white px-5 py-2 text-sm font-medium disabled:opacity-60"
        >
          {ask.isPending ? "Searching…" : "Ask"}
        </button>
      </form>

      {result && (
        <div className="bg-white rounded-lg border border-slate-200 p-5 space-y-4">
          {result.confident ? (
            <>
              <p className="text-slate-700 whitespace-pre-wrap">{result.answer}</p>
              {result.matches.length > 0 && (
                <div>
                  <div className="text-xs font-medium text-slate-400 mb-1">Sources</div>
                  <div className="flex flex-wrap gap-2">
                    {result.matches.map((m) => (
                      <Link
                        key={`${m.type}-${m.id}`}
                        to={m.deepLink.startsWith("/") ? m.deepLink : "#"}
                        onClick={(e) => {
                          if (!m.deepLink.startsWith("/")) {
                            e.preventDefault();
                            window.open(m.deepLink, "_blank");
                          }
                        }}
                        className="text-xs bg-blue-50 text-astra px-2 py-1 rounded hover:underline"
                      >
                        📎 {m.title}
                      </Link>
                    ))}
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="space-y-3">
              <p className="text-slate-600">{result.message}</p>
              <button
                onClick={raiseTicket}
                className="rounded-md bg-astra text-white px-4 py-1.5 text-sm font-medium"
              >
                Create a support ticket
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
