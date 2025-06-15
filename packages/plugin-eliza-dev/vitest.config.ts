import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    setupFiles: ["../../packages/core/src/test_resources/testSetup.ts"],
    testTimeout: 120000,
  },
});