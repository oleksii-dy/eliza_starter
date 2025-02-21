import { Plugin } from "@elizaos/core";
import { manageWatchlistAction } from "./actions/manageWatchlist";
import { bboProvider } from "./providers/bbo";

export const paradexPlugin: Plugin = {
    name: "Paradex",
    description:
        "Enable automated crypto trading on Paradex DEX through natural language commands",
    actions: [manageWatchlistAction],
    providers: [bboProvider],
};

export default paradexPlugin;
