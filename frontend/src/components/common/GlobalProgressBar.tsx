import { useIsFetching, useIsMutating } from "@tanstack/react-query";
import { useEffect, useState } from "react";

/** A thin animated bar at the very top of the screen whenever the user is actually waiting on
 * something — covers every page load, button click, and file upload in one place instead of each
 * page needing its own "Loading…" text.
 *
 * Two things it deliberately does NOT react to, both of which made it flash constantly before:
 * - Silent background polling (notifications/tickets/assignments refetch every 5-20s) — only a
 *   query with no cached data yet counts as "loading"; a refetch of data already on screen doesn't.
 * - Requests that resolve in well under 150ms — shown after a short delay so instant actions don't
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
    const timer = setTimeout(() => setVisible(true), 150);
    return () => clearTimeout(timer);
  }, [active]);

  if (!visible) return null;

  return (
    <div className="fixed top-0 left-0 right-0 h-1 z-[300] bg-orange-100 overflow-hidden animate-fade-in">
      <div className="h-full w-1/3 bg-astra animate-loading-bar" />
    </div>
  );
}
