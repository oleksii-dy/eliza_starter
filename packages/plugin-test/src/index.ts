import type { Plugin } from "@elizaos/core";
import { zapperAction } from "./actions/zapper.ts";
import { addressDataProvider } from "./providers/addressDataProvider.ts";
import { addressDataEvaluator } from "./evaluators/addressDataEvaluator.ts";
export * as evaluators from "./evaluators/index.ts";
export * as providers from "./providers/index.ts";

export const testPlugin: Plugin = {
    name: "test",
    description: "Test plugin with basic actions and evaluators",
    actions: [zapperAction],
    providers: [],
    evaluators: [],
};

export default testPlugin;