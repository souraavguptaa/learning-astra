import type { Config } from "tailwindcss";

export default {
  darkMode: "class",
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        // Bento design system: Inter Tight for display/headings, Inter for body — see
        // typography.md in .claude/skills/typeui-design-system/SKILL.md.
        sans: ['"Inter"', "system-ui", "sans-serif"],
        display: ['"Inter Tight"', '"Inter"', "system-ui", "sans-serif"],
      },
      colors: {
        // Values come from CSS custom properties (defined in index.css, swapped under .dark) so
        // every existing bg-astra/shadow-clay/bg-clay-bg usage across the app adapts to dark mode
        // automatically — no per-component dark: variants needed for the core design tokens.
        astra: {
          DEFAULT: "var(--astra)",
          dark: "var(--astra-dark)",
          soft: "var(--astra-soft)",
        },
        clay: {
          bg: "var(--clay-bg)",
        },
        border: {
          default: "var(--border-default)",
          strong: "var(--border-strong)",
        },
      },
      borderRadius: {
        // Bento radius.md scale: xs 10 / sm 14 / md 18 / lg 24 / xl 32 / pill 9999.
        xs: "10px",
        sm: "14px",
        DEFAULT: "18px",
        md: "18px",
        lg: "24px",
        xl: "32px",
        pill: "9999px",
      },
      boxShadow: {
        // Full values (not just color) swap per-theme, see index.css.
        clay: "var(--shadow-clay)",
        "clay-sm": "var(--shadow-clay-sm)",
        "clay-inset": "var(--shadow-clay-inset)",
      },
      keyframes: {
        "fade-in": {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
      },
      animation: {
        "fade-in": "fade-in 200ms ease-out",
      },
    },
  },
  plugins: [],
} satisfies Config;
