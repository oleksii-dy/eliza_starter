import { defineConfig } from "tsup";

export default defineConfig({
    entry: ["src/index.ts", "src/actions/post.ts"],
    format: ["esm"],
    dts: {
        entry: {
            index: "src/index.ts",
            "actions/post": "src/actions/post.ts"
        }
    },
    clean: true,
    sourcemap: true,
    outDir: "dist",
    external: ["@elizaos/core"]
});
