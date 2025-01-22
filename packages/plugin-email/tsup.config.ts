import { defineConfig } from "tsup";

export default defineConfig({
    entry: ["src/index.ts"],
    outDir: "dist",
    sourcemap: true,
    clean: true,
    format: ["esm"], // Ensure you're targeting CommonJS
    external: [
        "nodemailer", // Externalize dotenv to prevent bundling
        "mail-notifier",
        "z", // Externalize fs to use Node.js built-in module
    ],
});
