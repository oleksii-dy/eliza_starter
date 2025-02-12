import type { Plugin } from "@elizaos/core";
import { portfolioAction } from "./actions/portfolio.ts";
import { farcasterPortfolioAction } from "./actions/farcasterPortfolio.ts";
export * as evaluators from "./evaluators/index.ts";
export * as providers from "./providers/index.ts";

export const testPlugin: Plugin = {
    name: "test",
    description: "Test plugin with basic actions and evaluators",
    actions: [portfolioAction, farcasterPortfolioAction],
    providers: [],
    evaluators: [],
};

export default testPlugin;