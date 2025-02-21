import {
    Action,
    IAgentRuntime,
    Memory,
    generateObjectDeprecated,
    ModelClass,
    composeContext,
    elizaLogger,
} from "@elizaos/core";
import { WatchlistState } from "../providers/bbo";
import { BaseParadexState } from "../utils/paradexUtils";

interface WatchlistRequest {
    action: "add" | "remove" | "clear";
    markets: string[];
}

const watchlistTemplate = `Analyze ONLY the latest user message to extract watchlist management details.
Last message: "{{lastMessage}}"

Rules:
1. ALL markets MUST be formatted as CRYPTO-USD-PERP (e.g., "BTC-USD-PERP", "ETH-USD-PERP")
2. If only the crypto name is given (e.g., "ETH" or "BTC"), append "-USD-PERP"
3. Support multiple markets in one command

Examples of valid messages and their parsing:
- "Add ETH and BTC to watchlist" → action: "add", markets: ["ETH-USD-PERP", "BTC-USD-PERP"]
- "Remove ETH from watchlist" → action: "add", markets: ["ETH-USD-PERP"]
- "Track ETH BTC DOGE" → action: "add", markets: ["ETH-USD-PERP", "BTC-USD-PERP", "DOGE-USD-PERP"]
- "Stop tracking ETH" → action: "remove", markets: ["ETH-USD-PERP"]
- "Clear watchlist" → action: "clear", markets: []

Respond with a JSON markdown block containing ONLY the action details:
\`\`\`json
{
  "action": "add",
  "markets": ["ETH-USD-PERP", "BTC-USD-PERP"]
}
\`\`\``;

export const manageWatchlistAction: Action = {
    name: "MANAGE_WATCHLIST",
    similes: ["ADD_TO_WATCHLIST", "REMOVE_FROM_WATCHLIST", "TRACK_MARKET"],
    description: "Manages the crypto watchlist for market tracking",
    suppressInitialMessage: true,

    validate: async (runtime: IAgentRuntime, message: Memory) => {
        return true;
    },

    handler: async (
        runtime: IAgentRuntime,
        message: Memory,
        state?: WatchlistState
    ) => {
        elizaLogger.info("Starting watchlist management...");

        if (!state) {
            state = {} as WatchlistState;
            state.watchlist = state.watchlist || [];
            elizaLogger.info("State initialized with empty watchlist");
        }

        try {
            state.lastMessage = message.content.text;
            elizaLogger.info("Processing message:", message.content.text);

            const context = composeContext({
                state,
                template: watchlistTemplate,
            });

            const request = (await generateObjectDeprecated({
                runtime,
                context,
                modelClass: ModelClass.SMALL,
            })) as WatchlistRequest;

            elizaLogger.info("Model response:", request);

            if (!request?.action || !Array.isArray(request.markets)) {
                elizaLogger.warn("Invalid request format:", request);
                return false;
            }

            switch (request.action) {
                case "add":
                    elizaLogger.info(
                        "Watchlist updated:",
                        state.watchlist
                    );
                    return `Added ${request.markets.join(", ")} to watchlist.`;

                case "remove":
                    elizaLogger.info(
                        "Removing markets:",
                        request.markets,
                        "from current watchlist:",
                        state.watchlist
                    );
                    state.watchlist = state.watchlist.filter(
                        (market) => !request.markets.includes(market)
                    );
                    elizaLogger.info("Updated watchlist:", state.watchlist);
                    return `Removed ${request.markets.join(
                        ", "
                    )} from watchlist.`;

                case "clear":
                    elizaLogger.info(
                        "Clearing watchlist. Previous state:",
                        state.watchlist
                    );
                    state.watchlist = [];
                    elizaLogger.info("Watchlist cleared");
                    return "Watchlist cleared.";

                default:
                    elizaLogger.warn(
                        "Unknown action received:",
                        request.action
                    );
                    return false;
            }
        } catch (error) {
            elizaLogger.error("Watchlist management error:", error);
            return false;
        }
    },

    examples: [
        [
            {
                user: "{{user1}}",
                content: { text: "Add ETH and BTC to watchlist" },
            },
            {
                user: "{{agent}}",
                content: {
                    text: "Added ETH-USD-PERP, BTC-USD-PERP to watchlist.",
                    action: "MANAGE_WATCHLIST",
                },
            },
        ],
        [
            {
                user: "{{user1}}",
                content: { text: "Stop tracking ETH" },
            },
            {
                user: "{{agent}}",
                content: {
                    text: "Removed ETH-USD-PERP from watchlist.",
                    action: "MANAGE_WATCHLIST",
                },
            },
        ],
    ],
};
