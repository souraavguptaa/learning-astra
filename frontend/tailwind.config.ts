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
    },
  },
  plugins: [],
} satisfies Config;
