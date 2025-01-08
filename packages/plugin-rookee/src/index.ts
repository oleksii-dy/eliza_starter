import { Plugin } from "@elizaos/core";
import { sampleAction } from "./actions/sampleAction.ts";
import { sampleEvaluator } from "./evaluators/sampleEvalutor.ts";
import { sampleProvider } from "./providers/sampleProvider.ts";

export const rookeePlugin: Plugin = {
    name: "rookee-plugin",
    description: "Adds custom functionality",
    actions: [
        sampleAction
    ],
    evaluators: [
        // sampleEvaluator
    ],
    providers: [
        sampleProvider
    ],
    services: [
        /* custom services */
    ],
};
