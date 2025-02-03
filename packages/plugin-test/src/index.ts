import type { Plugin } from "@elizaos/core";
import { helloWorldAction } from "./actions/helloworld.ts";

export * as evaluators from "./evaluators/index.ts";
export * as providers from "./providers/index.ts";

export const testPlugin: Plugin = {
    name: "test",
    description: "Test plugin with basic actions and evaluators",
    actions: [helloWorldAction],
};

export default testPlugin;