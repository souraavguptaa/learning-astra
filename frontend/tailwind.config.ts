import type { Config } from "tailwindcss";

export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        astra: {
          DEFAULT: "#5b6ee8",
          dark: "#4453c9",
        },
        clay: {
          bg: "#eef1fb",
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
        // (top-left) — reads as a puffy raised surface instead of a flat bordered box.
        clay: "0 10px 24px -6px rgba(91, 110, 232, 0.28), inset -6px -6px 12px rgba(91, 110, 232, 0.10), inset 6px 6px 10px rgba(255, 255, 255, 0.85)",
        "clay-sm": "0 4px 12px -3px rgba(91, 110, 232, 0.25), inset -3px -3px 6px rgba(91, 110, 232, 0.10), inset 3px 3px 6px rgba(255, 255, 255, 0.8)",
        // Inverted (inset-only) — for form fields, giving a "carved into clay" look instead of raised.
        "clay-inset": "inset 3px 3px 6px rgba(91, 110, 232, 0.15), inset -3px -3px 6px rgba(255, 255, 255, 0.9)",
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
