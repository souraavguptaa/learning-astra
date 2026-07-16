import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAskSupport, type SupportAskResult } from "../../features/support.js";

const SpeechRecognitionCtor: any =
  typeof window !== "undefined" ? (window as any).SpeechRecognition ?? (window as any).webkitSpeechRecognition : undefined;
const speechSynthesisSupported = typeof window !== "undefined" && "speechSynthesis" in window;

export function AiSupportPage() {
  const navigate = useNavigate();
  const ask = useAskSupport();
  const [query, setQuery] = useState("");
  const [askedQuery, setAskedQuery] = useState("");
  const [result, setResult] = useState<SupportAskResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [listening, setListening] = useState(false);
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    if (!SpeechRecognitionCtor) return;
    const recognition = new SpeechRecognitionCtor();
    recognition.lang = navigator.language || "en-IN";
    recognition.interimResults = false;
    recognition.onresult = (e: any) => setQuery(e.results[0][0].transcript);
    recognition.onend = () => setListening(false);
    recognition.onerror = () => setListening(false);
    recognitionRef.current = recognition;
    return () => recognition.stop();
  }, []);

  function toggleListening() {
    if (!recognitionRef.current) return;
    if (listening) {
      recognitionRef.current.stop();
      setListening(false);
    } else {
      setQuery("");
      recognitionRef.current.start();
      setListening(true);
    }
  }

  function speak(text: string) {
    if (!speechSynthesisSupported) return;
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(new SpeechSynthesisUtterance(text));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const asked = query.trim();
    if (!asked) return;
    setError(null);
    setAskedQuery(asked);
    try {
      const res = await ask.mutateAsync(asked);
      setResult(res);
      if (res.confident && res.answer) speak(res.answer);
    } catch {
      setResult(null);
      setError("Couldn't reach AI Support — check your connection and try again.");
    }
  }

  function raiseTicket() {
    navigate("/my-tickets", {
      state: { prefillSubject: askedQuery, prefillDescription: `I asked AI Support: "${askedQuery}" and it couldn't find an answer.` },
    });
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">AI Support</h1>
        <p className="text-slate-500 mt-1">
          Ask a question in any language, by typing or speaking. I'll search every video, document, and announcement
          in Learning Astra for a verified answer — if I can't find one, you can raise a ticket in one click.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="flex gap-2">
        <input
          placeholder={listening ? "Listening…" : "Ask a question…"}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="flex-1 rounded-md shadow-clay-inset px-4 py-2 text-sm"
        />
        {SpeechRecognitionCtor && (
          <button
            type="button"
            onClick={toggleListening}
            title={listening ? "Stop listening" : "Ask by voice"}
            className={`rounded-md px-3 py-2 text-sm border ${
              listening ? "bg-red-500 text-white border-red-500 animate-pulse" : "border-slate-300 text-slate-600"
            }`}
          >
            🎤
          </button>
        )}
        <button
          type="submit"
          disabled={ask.isPending || !query.trim()}
          className="rounded-md bg-astra text-white shadow-clay-sm px-5 py-2 text-sm font-medium disabled:opacity-60"
        >
          {ask.isPending ? "Searching…" : "Ask"}
        </button>
      </form>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-sm text-red-700">{error}</div>
      )}

      {result && (
        <div className="bg-white rounded-lg shadow-clay p-5 space-y-4">
          {result.confident ? (
            <>
              <div className="flex items-start justify-between gap-2">
                <p className="text-slate-700 whitespace-pre-wrap flex-1">{result.answer}</p>
                {speechSynthesisSupported && result.answer && (
                  <button
                    onClick={() => speak(result.answer!)}
                    title="Listen"
                    className="shrink-0 text-slate-400 hover:text-astra text-lg"
                  >
                    🔊
                  </button>
                )}
              </div>
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
                        className="text-xs bg-teal-50 text-astra px-2 py-1 rounded hover:underline"
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
                className="rounded-md bg-astra text-white shadow-clay-sm px-4 py-1.5 text-sm font-medium"
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
