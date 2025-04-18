import { defineConfig } from "tsup";

export default defineConfig({
    entry: ["src/index.ts"],
    outDir: "dist",
    sourcemap: true,
    clean: true,
    format: ["esm", "cjs"], // Update to support both formats
    external: [
        "dotenv", // Externalize dotenv to prevent bundling
        "fs", // Externalize fs to use Node.js built-in module
        "path", // Externalize other built-ins if necessary
        "node:crypto", // Added to fix dynamic require issue
        "crypto", // Added standard crypto module as well
        "@reflink/reflink",
        "@node-llama-cpp",
        "https",
        "http",
        "agentkeepalive",
        "safe-buffer",
        "base-x",
        "bs58",
        "borsh",
        "stream",
        "buffer",
        "querystring",
        "amqplib",
        "viem",
        "viem/chains",
        "viem/accounts",
        "symphony-sdk",
        "symphony-sdk/viem",
        "@cosmjs/stargate",
        "@sei-js/evm",
        "ethers",
        "openai",
        "sei-agent-kit",
    ],
    noExternal: []
});
