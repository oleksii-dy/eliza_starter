import { Plugin } from "@ai16z/eliza";
import { newsSearchAction } from "./actions/newsSearch.ts";

export * as actions from "./actions";
export * as evaluators from "./evaluators";
export * as providers from "./providers";

export const newsSearchPlugin: Plugin = {
    name: "newsSearch",
    description: "Agent bootstrap with basic actions and evaluators",
    actions: [
        newsSearchAction,
    ],
    evaluators: [],
    providers: [],
};
