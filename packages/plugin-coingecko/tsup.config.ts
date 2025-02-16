import { defineConfig } from "tsup";

export default defineConfig({
    entry: ["src/index.ts"],
    outDir: "dist",
    clean: true,
    format: ["esm"],
    dts: true,
    sourcemap: true,
    splitting: false,
    treeshake: true,
    external: ["@elizaos/core"]
});
