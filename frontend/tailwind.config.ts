import type { Config } from "tailwindcss";

export default {
  darkMode: "class",
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        // Glassmorphism design system calls for "Google Sans" uniformly (not embeddable via
        // Google Fonts — it's Google's proprietary product font). Inter is the closest freely
        // licensed stand-in and is already loaded in index.html.
        sans: ['"Inter"', "system-ui", "sans-serif"],
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
        // Glassmorphism radius.md scale: base 20 (buttons/cards/inputs/modals — the product
        // default), default 12 (badges/tooltips/dropdown items/small controls), sm 8 (checkboxes/
        // tiny elements), full 9999 (pills/avatars, already Tailwind's built-in rounded-full).
        sm: "8px",
        DEFAULT: "20px",
        md: "12px",
        lg: "20px",
        xl: "20px",
        pill: "9999px",
      },
      boxShadow: {
        // clay/clay-sm/clay-inset are var-driven so they swap per-theme, see index.css. The rest
        // are shadows.md's static elevation scale (doesn't vary by theme).
        clay: "var(--shadow-clay)",
        "clay-sm": "var(--shadow-clay-sm)",
        "clay-inset": "var(--shadow-clay-inset)",
        "2xs": "0 1px 2px rgba(0, 0, 0, 0.05)",
        xs: "0 2px 8px rgba(0, 0, 0, 0.08)",
        md: "0 8px 32px rgba(0, 0, 0, 0.1), inset 0 1px 0 rgba(255, 255, 255, 0.15)",
        lg: "0 12px 40px rgba(0, 0, 0, 0.12), inset 0 1px 0 rgba(255, 255, 255, 0.2)",
        xl: "0 20px 50px rgba(0, 0, 0, 0.15), inset 0 1px 0 rgba(255, 255, 255, 0.25)",
        "2xl": "0 25px 60px rgba(0, 0, 0, 0.2), inset 0 1px 0 rgba(255, 255, 255, 0.3)",
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
