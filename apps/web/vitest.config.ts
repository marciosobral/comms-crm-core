import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    testTimeout: 10_000,
    hookTimeout: 10_000,
    teardownTimeout: 5_000,
    include: ["src/**/*.spec.ts", "src/**/*.spec.tsx"],
    environment: "node",
  },
});
