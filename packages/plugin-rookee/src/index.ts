import { Plugin } from "@elizaos/core";

import { getNewsCryptoPanic } from "./actions/getNewsCryptoPanic.ts";
export const rookeePlugin: Plugin = {
    name: "rookee-plugin",
    description: "Adds custom functionality",
    actions: [
        getNewsCryptoPanic,
    ],
    evaluators: [
        // sampleEvaluator
    ],
    providers: [
        // sampleProvider
    ],
    services: [
        /* custom services */
    ],
};
