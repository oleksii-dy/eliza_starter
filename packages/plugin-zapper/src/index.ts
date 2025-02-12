import type { Plugin } from "@elizaos/core";
import { portfolioAction } from "./actions/portfolio";
import { farcasterPortfolioAction } from "./actions/farcasterPortfolio";

export const zapperPlugin: Plugin = {
    name: "zapper",
    description: "A plugin for integrating the Zapper API with your application.",
    actions: [portfolioAction, farcasterPortfolioAction],
};
export default zapperPlugin;
