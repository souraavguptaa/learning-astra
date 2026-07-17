import type { Config } from "tailwindcss";

export default {
  darkMode: "class",
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
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
      },
      borderRadius: {
        DEFAULT: "12px",
        md: "14px",
        lg: "22px",
        xl: "28px",
      },
      boxShadow: {
        // Clean modern SaaS card look: one soft, barely-there shadow instead of claymorphism's
        // puffy triple-layer — full values (not just color) swap per-theme, see index.css.
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
