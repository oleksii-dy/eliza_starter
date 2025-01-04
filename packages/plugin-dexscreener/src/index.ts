import { Plugin } from "@elizaos/core";
import { TokenPriceAction } from "./actions/tokenAction.ts";
import { TokenPriceEvaluator } from "./evaluators/tokenEvaluator.ts";
import { TokenPriceProvider } from "./providers/tokenProvider.ts";

export * as actions from "./actions";
export * as evaluators from "./evaluators";
export * as providers from "./providers";

export const dexScreenerPlugin: Plugin = {
    name: "DexScreener",
    description: "A plugin to get token prices usidng DexScreener API",
    actions: [
        new TokenPriceAction()
    ],
    evaluators: [ new TokenPriceEvaluator() ],
    providers: [ new TokenPriceProvider() ]
};
