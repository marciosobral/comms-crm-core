import tailwindcss from "@tailwindcss/vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import react from "@vitejs/plugin-react";
import { nitro } from "nitro/vite";
import { defineConfig, loadEnv } from "vite";

export default defineConfig(({ mode }) => {
  // The API URL is baked into the client bundle, so a production build without it would
  // silently point every user at localhost.
  if (mode === "production" && !loadEnv(mode, process.cwd(), "VITE_").VITE_API_URL) {
    throw new Error("VITE_API_URL is required for production builds");
  }
  return {
    server: {
      port: 3000,
    },
    resolve: {
      tsconfigPaths: true,
    },
    plugins: [tanstackStart(), nitro(), react(), tailwindcss()],
  };
});
