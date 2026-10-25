import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["tests/**/*.test.ts"],
    // The integration suite boots a real Strapi instance, which takes a while.
    hookTimeout: 120_000,
    testTimeout: 30_000,
  },
});
