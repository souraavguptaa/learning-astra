import { useEffect, useRef, useState } from "react";
import { api } from "../../lib/api.js";
import { useActiveAds, type Ad } from "../../features/promo.js";

const CYCLE_MS = 15000;
const VISIBLE_MS = 8000;

export function AdPopup() {
  const { data: ads } = useActiveAds();
  const [visible, setVisible] = useState(false);
  const [current, setCurrent] = useState<Ad | null>(null);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const indexRef = useRef(0);

  useEffect(() => {
    if (!ads || ads.length === 0) return;
    const timer = setInterval(() => {
      const ad = ads[indexRef.current % ads.length];
      indexRef.current += 1;
      setCurrent(ad);
      setVisible(true);
      api.get<{ url: string }>("/files/download-url", { params: { key: ad.imageFileKey } }).then(({ data }) => setImageUrl(data.url));
    }, CYCLE_MS);
    return () => clearInterval(timer);
  }, [ads]);

  useEffect(() => {
    if (!visible) return;
    const timer = setTimeout(() => setVisible(false), VISIBLE_MS);
    return () => clearTimeout(timer);
  }, [visible]);

  if (!visible || !current) return null;

  return (
    <div className="fixed bottom-6 right-6 w-72 bg-white border border-slate-200 rounded-lg shadow-2xl z-[150] overflow-hidden">
      <button onClick={() => setVisible(false)} className="absolute top-1 right-1 bg-black/40 text-white rounded-full w-5 h-5 text-xs leading-5">
        ✕
      </button>
      <a href={current.linkUrl} target="_blank" rel="noopener noreferrer" onClick={() => setVisible(false)}>
        {imageUrl && <img src={imageUrl} alt={current.title} className="w-full h-36 object-cover" />}
        <div className="px-3 py-2 text-sm font-medium text-slate-700">{current.title}</div>
      </a>
    </div>
  );
}
