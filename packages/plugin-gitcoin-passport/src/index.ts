export * from "./actions/getScore";

import type { Plugin } from "@elizaos/core";
import {
    getLatestTokensAction,
    getLatestBoostedTokensAction,
    getTopBoostedTokensAction,
} from "./actions/getScore";

export const passportPlugin: Plugin = {
    name: "passport",
    description: "Gitcoin passport integration plugin",
    providers: [],
    evaluators: [],
    services: [],
    actions: [
        getLatestTokensAction,
        getLatestBoostedTokensAction,
        getTopBoostedTokensAction,
    ],
};

export default passportPlugin;
