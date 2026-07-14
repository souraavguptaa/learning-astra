import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

// ponytail: Reticle plugin/SDK left in package.json + reticle-dev.ts but disabled here —
// enable by uncommenting once approved interactively (see .mcp.json), not auto-wired by the agent.
// import { reticle } from "@reticlehq/vite-plugin";

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      "/api": {
        target: "http://localhost:4000",
        changeOrigin: true,
      },
    },
  },
});
