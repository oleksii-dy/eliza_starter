export * from "./actions/getLatest";

import type { Plugin } from "@elizaos/core";
import { getLatestTokensAction } from "./actions/getLatest";

export const dexscreenerPlugin: Plugin = {
    name: "dexscreener",
    description: "dexscreener blockchain integration plugin",
    providers: [],
    evaluators: [],
    services: [],
    actions: [getLatestTokensAction],
};

export default dexscreenerPlugin;
