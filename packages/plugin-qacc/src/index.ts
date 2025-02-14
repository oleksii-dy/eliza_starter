import type { Plugin } from "@elizaos/core";

export * as actions from "./actions";

export const qaccPlugin: Plugin = {
    name: "qacc",
    description: "Agent bootstrap with basic actions and evaluators",
    actions: [],
    evaluators: [],
    providers: [],
};
export default qaccPlugin;
