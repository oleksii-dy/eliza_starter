import type { Plugin } from "@elizaos/core";
import { fetchNewsAction } from "./actions/fetchNews.ts";
import { fetchTokenAction } from "./actions/fetchToken.ts";
export const taylorPlugin: Plugin = {
    name: "taylor",
    description: "Agent taylor with actions on crypto news and prices",
    actions: [
        fetchNewsAction,
        fetchTokenAction,
    ],
};
export default taylorPlugin;
