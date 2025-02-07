import type { Plugin } from "@elizaos/core";
import { recommendMealAction } from "./actions/recommend-meal";

export { recommendMealAction } from "./actions";
export * as evaluators from "./evaluators";
export * as providers from "./providers";

export const nutrifiPlugin: Plugin = {
    name: "nutrifi",
    description: "Agent will use this plugin to recommend healthy meals based on user fitness goals and diet preferences",
    actions: [recommendMealAction],
    evaluators: [],
    providers: [],
};
export default nutrifiPlugin;
