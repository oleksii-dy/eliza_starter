import { Plugin } from "@elizaos/core";
import { adNetworkEvaluator } from "./evaluators/adNetworkEval.ts";
import {
    adNetworkProvider,
    initializeAdNetworkProvider,
} from "./providers/adNetworkProvider.ts";
import { AdNetworkConfig } from "./types/types.ts";
import { getTokenDetailsAction } from "./actions/getTokenDetails.ts";

export const adNetworkPlugin: Plugin = {
    name: "adNetwork",
    description:
        "A plugin for generating promotional content for airdrop tokens in the portfolio using Monetize.ai integration.",
    actions: [getTokenDetailsAction],
    evaluators: [adNetworkEvaluator],
    providers: [adNetworkProvider],
};

export const initializeAdNetwork = (config: AdNetworkConfig): void => {
    initializeAdNetworkProvider(config);
};

export * from "./types/types.ts";
