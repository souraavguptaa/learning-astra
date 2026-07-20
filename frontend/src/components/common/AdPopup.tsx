import { X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { api } from "../../lib/api.js";
import { useActiveAds, type Ad } from "../../features/promo.js";

const ROTATE_MS = 8000;
const CROSSFADE_MS = 500;

/** Preloads the next ad's image before swapping to it, so the crossfade never shows a blank or
 * half-loaded frame — the actual cause of a "blinking" banner most of the time isn't the fade
 * itself, it's swapping `src` before the browser has the new image ready. */
function usePreloadedUrl(fileKey: string | undefined) {
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    if (!fileKey) return;
    let cancelled = false;
    api.get<{ url: string }>("/files/download-url", { params: { key: fileKey } }).then(({ data }) => {
      const img = new Image();
      img.onload = () => {
        if (!cancelled) setUrl(data.url);
      };
      img.src = data.url;
    });
    return () => {
      cancelled = true;
    };
  }, [fileKey]);
  return url;
}

export function AdPopup() {
  const { data: ads } = useActiveAds();
  const [index, setIndex] = useState(0);
  const [dismissed, setDismissed] = useState(false);
  const indexRef = useRef(0);

  const current: Ad | null = ads && ads.length > 0 ? ads[index % ads.length] : null;
  const nextUrl = usePreloadedUrl(current?.imageFileKey);
  // Keep showing the previous ad's already-loaded image until the next one finishes preloading,
  // so the banner is never briefly empty between rotations — a persistent banner that never hides
  // is the fix for "blinking", not a faster fade.
  const [shownUrl, setShownUrl] = useState<string | null>(null);
  const [shownAd, setShownAd] = useState<Ad | null>(null);
  useEffect(() => {
    if (nextUrl && current) {
      setShownUrl(nextUrl);
      setShownAd(current);
    }
  }, [nextUrl, current]);

  useEffect(() => {
    if (!ads || ads.length <= 1) return;
    const timer = setInterval(() => {
      indexRef.current += 1;
      setIndex(indexRef.current);
    }, ROTATE_MS);
    return () => clearInterval(timer);
  }, [ads]);

  if (dismissed || !shownAd || !shownUrl) return null;

  return (
    <div className="fixed inset-x-0 bottom-0 z-[150] flex justify-center pb-2 px-4 pointer-events-none">
      {/* Standard IAB banner sizes — 468x60 full banner by default, 728x90 leaderboard from the md
          breakpoint up. aspect-ratio (not fixed px) keeps it correctly proportioned and lets it
          shrink gracefully on very narrow phones instead of overflowing. */}
      <div className="pointer-events-auto relative mx-auto w-full max-w-[468px] aspect-[468/60] md:max-w-[728px] md:aspect-[728/90] bg-white border border-black/[0.06] dark:border-white/10 rounded-md shadow-2xl overflow-hidden">
        <button
          onClick={() => setDismissed(true)}
          aria-label="Close ad"
          className="absolute top-1 right-1 z-10 bg-black/40 text-white rounded-full w-5 h-5 flex items-center justify-center"
        >
          <X className="w-3 h-3" />
        </button>
        <span className="absolute top-1 left-1.5 z-10 text-[9px] uppercase tracking-wide text-white/80 bg-black/30 px-1 rounded">
          Ad
        </span>
        {/* key={shownAd.id} restarts the crossfade animation on every rotation without ever
            unmounting to a blank state — a fresh <img> fades in over the still-visible previous
            frame instead of the whole banner hiding and reappearing. */}
        <a
          key={shownAd.id}
          href={shownAd.linkUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="block w-full h-full animate-fade-in"
          style={{ animationDuration: `${CROSSFADE_MS}ms` }}
        >
          <img src={shownUrl} alt={shownAd.title} className="w-full h-full object-cover" />
        </a>
      </div>
    </div>
  );
}
