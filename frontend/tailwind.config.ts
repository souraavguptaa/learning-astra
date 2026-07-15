import type { Config } from "tailwindcss";

export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        astra: {
          DEFAULT: "#2563eb",
          dark: "#1d4ed8",
        },
      },
      keyframes: {
        "loading-bar": {
          "0%": { transform: "translateX(-100%)" },
          "100%": { transform: "translateX(300%)" },
        },
      },
      animation: {
        "loading-bar": "loading-bar 1s ease-in-out infinite",
      },
    },
  },
  plugins: [],
} satisfies Config;
