import type { Plugin } from "@elizaos/core";
import { createQuestAction } from "./actions/createQuest.ts";
import { noneAction } from "./actions/none.ts";

export * as actions from "./actions/index.ts";

export const ethereumGuildPlugin: Plugin = {
    name: "ethereumGuildPlugin",
    description:
        "A plugin to deal with quests, facilitated by the Ethereum Guild.",
    actions: [createQuestAction, noneAction],
    evaluators: [],
    providers: [],
};
export default ethereumGuildPlugin;
