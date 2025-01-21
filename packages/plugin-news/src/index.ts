import { Plugin } from "@elizaos/core";
import { optimismNewsAction } from "./actions/pearNews.ts";
import { factEvaluator } from "./evaluators/fact.ts";
import { factsProvider } from "./providers/facts.ts";
import { timeProvider } from "./providers/time.ts";
import { cryptoPriceAction } from "./actions/cryptoPrice.ts";
import { pearIntentDataAction } from "./actions/index.ts";
export * as actions from "./actions/index.ts";
export * as evaluators from "./evaluators/index.ts";
export * as providers from "./providers/index.ts";

export const NewsPlugin: Plugin = {
    name: "bootstrap",
    description: "Agent gets news from differenct soucres",
    actions: [optimismNewsAction, cryptoPriceAction, pearIntentDataAction],
    evaluators: [factEvaluator],
    providers: [timeProvider, factsProvider],
};
