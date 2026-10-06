import { defineConfig } from "vitest/config";

// Run in the production timezone so local-getter mistakes fail here, not in prod.
process.env.TZ = "America/Sao_Paulo";

export default defineConfig({
  test: {
    include: ["src/**/*.spec.ts"],
    environment: "node",
    testTimeout: 10_000,
    hookTimeout: 10_000,
    teardownTimeout: 5_000,
  },
});
