import { Plugin } from "@elizaos/core";
import { currentNewsAction } from "./actions/currentnews.ts";
import { helloWorldAction } from "./actions/helloworld.ts";
import { factEvaluator } from "./evaluators/fact.ts";
import { getUserDataEvaluator } from "./evaluators/getUserData.ts";
import { userDataProvider } from "./providers/userDataProvider.ts";
export * as actions from "./actions/index.ts";
export * as evaluators from "./evaluators/index.ts";
export * as providers from "./providers/index.ts";

export const pvpvaiPlugin: Plugin = {
    name: "bootstrap",
    description: "Agent bootstrap with basic actions and evaluators",
    actions: [helloWorldAction, currentNewsAction],
    evaluators: [factEvaluator, getUserDataEvaluator],
    providers: [userDataProvider],
};
export default pvpvaiPlugin;
