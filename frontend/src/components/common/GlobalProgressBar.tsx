import { useIsFetching, useIsMutating } from "@tanstack/react-query";

/** A thin animated bar at the very top of the screen whenever any request is in flight —
 * covers every page load, button click, and file upload in one place instead of each
 * page needing its own "Loading…" text to make something visible as happening. */
export function GlobalProgressBar() {
  const isFetching = useIsFetching();
  const isMutating = useIsMutating();
  const active = isFetching + isMutating > 0;

  if (!active) return null;

  return (
    <div className="fixed top-0 left-0 right-0 h-1 z-[300] bg-blue-100 overflow-hidden">
      <div className="h-full w-1/3 bg-astra animate-loading-bar" />
    </div>
  );
}
