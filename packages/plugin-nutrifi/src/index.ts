import type { Plugin } from "@elizaos/core";
import { recommendMealAction } from "./actions/recommend-meal";
import { nutritionGoalsEvaluator } from "./evaluators/nutritionGoalsEvaluator";

export * as actions from "./actions";
export * as evaluators from "./evaluators";


export const nutrifiPlugin: Plugin = {
    name: "nutrifi",
    description: "Agent will use this plugin to recommend healthy meals based on user fitness goals and diet preferences",
    actions: [recommendMealAction],
    evaluators: [nutritionGoalsEvaluator],
    providers: [],
};
export default nutrifiPlugin;
