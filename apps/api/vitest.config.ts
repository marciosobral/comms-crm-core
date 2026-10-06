import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

// Run in the production timezone so local-getter mistakes fail here, not in prod.
process.env.TZ = "America/Sao_Paulo";

export default defineConfig({
  resolve: {
    alias: {
      "@prisma-client": fileURLToPath(
        new URL("./prisma/generated/prisma/client/client", import.meta.url),
      ),
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
  test: {
    testTimeout: 10_000,
    hookTimeout: 10_000,
    teardownTimeout: 5_000,
    include: ["src/**/*.spec.ts"],
    environment: "node",
  },
});
