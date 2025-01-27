import { defineConfig } from "tsup";

export default defineConfig({
    entry: ["src/index.ts"],
    outDir: "dist",
    format: ["esm"],
    dts: true,
    splitting: false,
    sourcemap: true,
    clean: true,
    minify: false,
    external: ["@elizaos/core", "whatwg-url"],
    treeshake: true,
    target: "node18",
});
