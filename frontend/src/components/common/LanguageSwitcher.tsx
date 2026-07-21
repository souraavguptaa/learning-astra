import { Languages } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { SUPPORTED_LANGUAGES, setLanguage, type SupportedLanguage } from "../../i18n/index.js";

export function LanguageSwitcher({ direction = "down" }: { direction?: "up" | "down" }) {
  const { t, i18n } = useTranslation();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [open]);

  return (
    <div className="relative shrink-0" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-label={t("language.switch")}
        title={t("language.switch")}
        className="w-7 h-7 flex items-center justify-center rounded-md text-slate-400 hover:bg-slate-100 hover:text-astra"
      >
        <Languages className="w-4 h-4" />
      </button>
      {open && (
        <div
          className={`absolute left-0 w-36 bg-white border border-black/[0.06] dark:border-white/10 rounded-md shadow-lg z-30 p-1 ${
            direction === "up" ? "bottom-full mb-1" : "top-full mt-1"
          }`}
        >
          {SUPPORTED_LANGUAGES.map((lang: SupportedLanguage) => (
            <button
              key={lang}
              type="button"
              onClick={() => {
                setLanguage(lang);
                setOpen(false);
              }}
              className={`w-full text-left px-2 py-1.5 rounded text-sm ${
                i18n.language === lang ? "bg-astra-soft text-astra-dark font-medium" : "text-slate-700 hover:bg-slate-100"
              }`}
            >
              {t(`language.${lang}`)}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
