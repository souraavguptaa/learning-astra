import { Moon, Sun } from "lucide-react";
import { useTheme } from "../../lib/themeContext.js";

/** A real sliding toggle switch (not just an icon swap) — the sun/moon icon rides inside the
 * thumb as it slides across the track. */
export function ThemeToggle({ className = "" }: { className?: string }) {
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === "dark";
  return (
    <button
      type="button"
      role="switch"
      aria-checked={isDark}
      onClick={toggleTheme}
      title={isDark ? "Switch to light mode" : "Switch to dark mode"}
      aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
      className={`relative inline-flex items-center w-12 h-7 rounded-pill shrink-0 transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-astra ${
        isDark ? "bg-astra" : "bg-slate-200"
      } ${className}`}
    >
      <span
        className={`inline-flex items-center justify-center w-5 h-5 bg-white rounded-pill shadow transform transition-transform ${
          isDark ? "translate-x-[22px]" : "translate-x-1"
        }`}
      >
        {isDark ? <Moon className="w-3 h-3 text-astra" /> : <Sun className="w-3 h-3 text-amber-500" />}
      </span>
    </button>
  );
}
