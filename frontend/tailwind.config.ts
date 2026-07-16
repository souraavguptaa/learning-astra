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
        },
        clay: {
          bg: "var(--clay-bg)",
        },
      },
      borderRadius: {
        DEFAULT: "12px",
        md: "16px",
        lg: "26px",
        xl: "32px",
      },
      boxShadow: {
        // Claymorphism recipe: soft colored outer glow + inset dark (bottom-right) + inset light
        // (top-left) — reads as a puffy raised surface instead of a flat bordered box. Full values
        // (not just the color) are swapped per-theme since the "light highlight" component needs to
        // change too, not just hue — see index.css.
        clay: "var(--shadow-clay)",
        "clay-sm": "var(--shadow-clay-sm)",
        "clay-inset": "var(--shadow-clay-inset)",
      },
      keyframes: {
        "loading-bar": {
          "0%": { transform: "translateX(-100%)" },
          "100%": { transform: "translateX(300%)" },
        },
        "fade-in": {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
      },
      animation: {
        "loading-bar": "loading-bar 1.2s linear infinite",
        "fade-in": "fade-in 200ms ease-out",
      },
    },
  },
  plugins: [],
} satisfies Config;
