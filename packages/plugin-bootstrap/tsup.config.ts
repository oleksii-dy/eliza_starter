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
    onSuccess: "tsc --emitDeclarationOnly --declaration",
    external: [
        "@elizaos/core",
        "react",
        "react-dom",
        "bootstrap",
        "@popperjs/core",
    ],
});
