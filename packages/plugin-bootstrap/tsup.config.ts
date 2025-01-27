import { defineConfig } from "tsup";

export default defineConfig({
    entry: ["src/index.ts"],
    format: ["cjs", "esm"],
    dts: true,
    splitting: false,
    sourcemap: true,
    clean: true,
    minify: false,
    outDir: "dist",
    onSuccess: "echo Build completed successfully",
    external: [
        "@elizaos/core",
        "react",
        "react-dom",
        "bootstrap",
        "@popperjs/core",
    ],
    treeshake: true,
    verbose: true,
    loader: {
        ".css": "css",
        ".scss": "css",
    },
});
