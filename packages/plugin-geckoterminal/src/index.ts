import { elizaLogger, generateText } from "@elizaos/core";
import {
    Action,
    HandlerCallback,
    IAgentRuntime,
    Memory,
    Plugin,
    State,
} from "@elizaos/core";

interface GeckoTerminalResponse {
    data: Array<{
        id: string;
        type: string;
        attributes: {
            name: string;
            base_token_price_usd: string;
            quote_token_price_usd: string;
            reserve_in_usd: string;
            fdv_usd: string;
            market_cap_usd: string;
        };
    }>;
}

const getPrice: Action = {
    name: "GET_PRICE",
    similes: ["CHECK_PRICE", "PRICE_CHECK", "TOKEN_PRICE", "CRYPTO_PRICE"],
    description:
        "Get the current price of a cryptocurrency token using GeckoTerminal API",
    validate: async (runtime: IAgentRuntime) => true,
    handler: async (
        runtime: IAgentRuntime,
        message: Memory,
        state: State,
        options: any,
        callback: HandlerCallback
    ) => {
        try {
            elizaLogger.log("Composing state for message:", message);
            state = (await runtime.composeState(message)) as State;
            elizaLogger.log("State:", state);
            const userId = runtime.agentId;
            elizaLogger.log("User ID:", userId);
            let result = await generateText({
                runtime,
                context: `Act as a professional crypto analyst that only generates JSON arrays. You are given a context, extract out the token name and return it.

Example:

Context: $AI16Z
Token: ["AI16Z"]

Context: What are the prices of $WBTC and $AI16Z?
Token: ["WBTC", "AI16Z"]

Context: What are price of BTC?
Token: ["BTC"]
Context: ${message.content.text}
Token:
`,
                modelClass: "large",
            });
            elizaLogger.log("Result:", result);
            result = result.replace(/^```json\s*\n/, "").replace(/\n```$/, "");
            const tokenQueries = JSON.parse(result) as string[];
            elizaLogger.log("Token query:", tokenQueries);
            const responses = await Promise.all(
                tokenQueries.map((tokenQuery) =>
                    fetch(
                        `https://api.geckoterminal.com/api/v2/search/pools?query=${encodeURIComponent(tokenQuery)}&page=1`,
                        {
                            headers: {
                                accept: "application/json",
                            },
                        }
                    ).then((response) => response.json())
                )
            );

            if (responses.length > 0) {
                const priceInfo = responses
                    .map((response) => {
                        const attributes = response.data[0].attributes;
                        return `${attributes.name}:
• Price: $${Number(attributes.base_token_price_usd).toFixed(6)}
• Market Cap: $${Number(attributes.market_cap_usd).toLocaleString()}
• FDV: $${Number(attributes.fdv_usd).toLocaleString()}
• Liquidity: $${Number(attributes.reserve_in_usd).toLocaleString()}`;
                    })
                    .join("\n\n");

                callback({
                    text: priceInfo,
                });
            } else {
                callback({
                    text: "No price information found for the specified token.",
                });
            }
        } catch (error) {
            elizaLogger.error("Error fetching price:", error);
            callback({ text: "Failed to fetch price information." });
        }
    },
    examples: [
        [
            {
                user: "{{user1}}",
                content: { text: "AI16Z" },
            },
            {
                user: "{{agentName}}",
                content: {
                    text: "Here is the price information for AI16Z:",
                    action: "GET_PRICE",
                },
            },
        ],
    ],
} as Action;

export const geckoTerminalPlugin: Plugin = {
    name: "geckoTerminal",
    description: "Get cryptocurrency price information from GeckoTerminal",
    actions: [getPrice],
    evaluators: [],
    providers: [],
};
