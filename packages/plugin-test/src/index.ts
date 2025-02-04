import type { Plugin } from "@elizaos/core";
import { helloWorldAction } from "./actions/helloworld.ts";
import { currentNewsAction } from "./actions/currentNews.ts";
import { randomEmotionProvider } from "./providers/emotion.ts";
import { userDataEvaluator } from "./evaluators/userDataEvaluator.ts";
import { userDataProvider } from "./providers/userDataProvider.ts";
export * as evaluators from "./evaluators/index.ts";
export * as providers from "./providers/index.ts";

export const testPlugin: Plugin = {
    name: "test",
    description: "Test plugin with basic actions and evaluators",
    actions: [helloWorldAction, currentNewsAction],
    providers: [randomEmotionProvider, userDataProvider],
    evaluators: [userDataEvaluator],
};

export default testPlugin;