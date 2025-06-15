import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/index.ts"],
  outDir: "dist",
  sourcemap: true,
  clean: true,
  format: ["esm"],
  external: [
    "dotenv",
    "fs",
    "path",
    "@elizaos/core",
    "@octokit/rest",
    "zod",
  ],
  platform: "node",
  target: "node20",
  tsconfig: "tsconfig.build.json",
});