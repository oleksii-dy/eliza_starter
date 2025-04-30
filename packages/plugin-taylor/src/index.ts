import type { Plugin, Character } from "@elizaos/core";
import { fetchNewsAction } from "./actions/fetchNews.ts";
import { fetchTokenAction } from "./actions/fetchToken.ts";
import { TaylorTwitterClient } from "./twitter.ts";
import { elizaLogger } from "@elizaos/core";

export const taylorPlugin: Plugin = {
    name: "taylor",
    description: "Agent taylor with actions on crypto news and prices",
    actions: [
        fetchNewsAction,
        fetchTokenAction,
    ],
    clients: [new TaylorTwitterClient()],
};

export default taylorPlugin;
