import type { Plugin } from "@elizaos/core";
import {
    createQuestAction,
    getBalanceAction,
    noneAction,
    swapAction,
    transferAction,
} from "./actions";
import { evmWalletProvider } from "./providers/wallet";

export * as actions from "./actions/index.ts";
export * from "./providers/wallet";
export * from "./types";

export const etherGuildPlugin: Plugin = {
    name: "etherGuildPlugin",
    description:
        "A plugin to deal with quests, facilitated by the Ether Guild https://etherguild.xyz.",
    actions: [
        createQuestAction,
        noneAction,
        getBalanceAction,
        transferAction,
        swapAction,
    ],
    evaluators: [],
    providers: [evmWalletProvider],
};
export default etherGuildPlugin;
