import { Plugin } from "@elizaos/core";
import { marketDataProvider } from "./providers/marketData";
import { manageWatchlistAction } from "./actions/manageWatchlist";
import { getWatchlistAction } from "./actions/getWatchlist";
import { bboProvider } from "./providers/bbo";
import { watchlistProvider } from "./providers/watchlist";
import { paradexPlaceOrderAction } from "./actions/placeOrder";
import { openOrdersProvider } from "./providers/fetchOpenOrders";
import { openPositionsProvider } from "./providers/fetchOpenPositions";
import { paradexCancelOrderAction } from "./actions/cancelOrder";
import { paradexOnboardingAction } from "./actions/onboarding";
import { analysisParadexProvider } from "./providers/backendAnalysisParadex";
import { actOnParadexAction } from "./actions/actOnParadex";
import { paradexBalanceProvider } from "./providers/balanceParadex";

export const paradexPlugin: Plugin = {
    name: "Paradex",
    description:
        "Enable automated crypto trading on Paradex DEX through natural language commands",
    actions: [],
    providers: [],
};

export default paradexPlugin;
