import type { Plugin } from "@elizaos/core";
import { routeQueries } from "./actions/router.ts";

// Simple terminal output
console.log("\n===============================");
console.log("      SoM Plugin Loaded      ");
console.log("===============================");
console.log("Name      : SoM-plugin");
console.log("Version   : 0.1.0");
console.log("X Account : https://x.com/ChasmNetwork");
console.log("GitHub    : https://github.com/chasmnetwork");
console.log("Author    : https://x.com/cloudre01");
console.log("===============================\n");

export const somPlugin: Plugin = {
    name: "som",
    description: "State of Mika integration plugin for ElizaOS",
    actions: [routeQueries],
    evaluators: [],
    providers: [],
};
export default somPlugin;
