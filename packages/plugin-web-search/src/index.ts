import { Plugin } from "@elizaos/core";

import { webSearch } from "./actions/webSearch.ts";

export const webSearchPlugin: Plugin = {
    name: "webSearch",
    description: "Search web",
    actions: [webSearch],
    evaluators: [],
    providers: [],
};

export default webSearchPlugin;
