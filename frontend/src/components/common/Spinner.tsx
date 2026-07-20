/** Shared loading spinner — replaces bare "Loading…" text scattered across the app.
 * Tailwind's built-in animate-spin, no custom keyframes needed. */
export function Spinner({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={`animate-spin ${className}`} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle className="opacity-20" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
      <path d="M22 12a10 10 0 0 0-10-10" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}

export function LoadingState({ label = "Loading…", className = "" }: { label?: string; className?: string }) {
  return (
    <div className={`flex items-center gap-2 text-slate-400 text-sm ${className}`}>
      <Spinner />
      {label}
    </div>
  );
}
