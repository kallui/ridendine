import path from "node:path";
import { defineConfig } from "vitest/config";

/**
 * Occasional GTFS smoke suite — not used by `npm test` / CI.
 * Run: npm run smoke:gtfs
 */
export default defineConfig({
  test: {
    environment: "node",
    include: ["scripts/gtfs-smoke/**/*.test.ts"],
    fileParallelism: false,
    maxWorkers: 1,
    testTimeout: 600_000,
    hookTimeout: 120_000,
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
