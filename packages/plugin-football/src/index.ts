import { Plugin } from "@elizaos/core";
import { noneAction } from "./actions/none.ts";
import { factEvaluator } from "./evaluators/fact.ts";
import { timeProvider } from "./providers/time.ts";
export * as evaluators from "./evaluators";
export * as providers from "./providers";

export const footballPlugin: Plugin = {
    name: "football",
    description:
        "Football data plugin to fetch live scores, standings, and fixtures",
    actions: [noneAction],
    evaluators: [factEvaluator],
    providers: [timeProvider],
};
export default footballPlugin;
