import type { Plugin } from "@elizaos/core";
import { fetchNewsAction } from "./actions/fetchNews.ts";

export const taylorPlugin: Plugin = {
    name: "taylor",
    description: "Agent taylor with actions on crypto news and prices",
    actions: [
        fetchNewsAction,
    ],
};
export default taylorPlugin;
