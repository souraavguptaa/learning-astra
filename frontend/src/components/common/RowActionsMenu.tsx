import { MoreVertical } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Spinner } from "./Spinner.js";

export type RowAction = { label: string; onClick: () => void; danger?: boolean; disabled?: boolean };

/** Bento's table pattern collapses per-row actions behind a single 36x36 ellipsis trigger instead
 * of a cluster of always-visible text links — see filterable-management-data-table in the
 * installed design skill. Shared across every data table page.
 *
 * The menu itself closes the instant an action is clicked, so it can't show progress — pass
 * `pending` (computed by the caller from whichever mutation targets this row) to swap the trigger
 * icon for a spinner and lock it closed until the action settles, so it's clear something is
 * happening instead of the row just silently sitting there. */
export function RowActionsMenu({ actions, pending = false }: { actions: RowAction[]; pending?: boolean }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div className="relative inline-block" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        disabled={pending}
        aria-label={pending ? "Working…" : "Row actions"}
        className="w-9 h-9 flex items-center justify-center rounded-md text-slate-400 transition-transform hover:bg-slate-100 hover:text-slate-600 hover:scale-105 disabled:hover:scale-100"
      >
        {pending ? <Spinner className="w-4 h-4" /> : <MoreVertical className="w-4 h-4" />}
      </button>
      {open && !pending && (
        <div className="menu-pop absolute right-0 mt-1 w-44 bg-white border border-black/[0.06] dark:border-white/10 rounded-md shadow-lg z-30 p-1">
          {actions.map((a) => (
            <button
              key={a.label}
              type="button"
              disabled={a.disabled}
              onClick={() => {
                setOpen(false);
                a.onClick();
              }}
              className={`w-full text-left px-2 py-1.5 rounded text-sm disabled:opacity-50 ${
                a.danger ? "text-red-600 hover:bg-red-50" : "text-slate-700 hover:bg-slate-100"
              }`}
            >
              {a.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
