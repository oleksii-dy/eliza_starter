import { defineConfig } from "vitest/config";

export default defineConfig({
    test: {
        globals: true,
        environment: "node",
        setupFiles: ["./src/__tests__/setup.ts"],
        coverage: {
            reporter: ["text", "json", "html"],
            exclude: ["**/__tests__/**", "**/dist/**"],
        },
        testTimeout: 120000,
        hookTimeout: 120000,
    },
});
