import { useTheme } from "../../lib/themeContext.js";

export function ThemeToggle({ className = "" }: { className?: string }) {
  const { theme, toggleTheme } = useTheme();
  return (
    <button
      type="button"
      onClick={toggleTheme}
      title={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
      aria-label={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
      className={`text-lg leading-none ${className}`}
    >
      {theme === "dark" ? "☀️" : "🌙"}
    </button>
  );
}
