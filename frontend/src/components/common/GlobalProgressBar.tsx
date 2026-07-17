import { useIsFetching, useIsMutating } from "@tanstack/react-query";
import { useEffect, useState } from "react";

/** A small spinner + "Loading…" label shown next to the page title whenever the user is actually
 * waiting on something — covers every page load, button click, and file upload in one place.
 *
 * Replaced an earlier full-width sliding bar across the top of the screen: it read as decoration
 * rather than a loading state to people unfamiliar with that convention, and gave no sense of
 * whether the app was working or stuck. A spinner next to the current page name is the one loading
 * signal almost everyone already recognizes, and it sits where people are already looking.
 *
 * Two things it deliberately does NOT react to, both of which made it flash constantly before:
 * - Silent background polling (notifications/tickets/assignments refetch every 5-20s) — only a
 *   query with no cached data yet counts as "loading"; a refetch of data already on screen doesn't.
 * - Requests that resolve in well under 400ms — shown after a short delay so instant actions don't
 *   produce a one-frame flash. */
export function GlobalProgressBar() {
  const isFetching = useIsFetching({ predicate: (query) => query.state.data === undefined });
  const isMutating = useIsMutating();
  const active = isFetching + isMutating > 0;
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!active) {
      setVisible(false);
      return;
    }
    const timer = setTimeout(() => setVisible(true), 400);
    return () => clearTimeout(timer);
  }, [active]);

  if (!visible) return null;

  return (
    <span className="inline-flex items-center gap-1.5 text-xs text-slate-400 animate-fade-in">
      <span className="w-3.5 h-3.5 rounded-full border-2 border-slate-200 border-t-astra animate-spin" />
      Loading…
    </span>
  );
}
