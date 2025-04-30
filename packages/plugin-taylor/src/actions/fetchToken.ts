import { composeContext, elizaLogger } from "@elizaos/core";
import { generateMessageResponse } from "@elizaos/core";
import { messageCompletionFooter } from "@elizaos/core";
import {
    type Action,
    type ActionExample,
    type Content,
    type HandlerCallback,
    type IAgentRuntime,
    type Memory,
    ModelClass,
    type State,
} from "@elizaos/core";
import axios from "axios";

const COOKIE_API_URL = "https://api.cookie-api.com/api/crypto";

export const tokenHandlerTemplate = `# Task: Create a concise crypto market update tweet in AIXBT style (under 280 characters).
Focus on key price movements, market metrics, and significant developments. Use clean, professional language.

Token Data:
Symbol: {{symbol}}
Price: {{current_price_usd}}
24h Range: {{low_24h}} - {{high_24h}}
Market Cap: {{market_cap}}
Volume: {{trading_volume}}
Description: {{description}}

Write a clean, professional market update tweet: ` + messageCompletionFooter;

export const fetchTokenAction: Action = {
    name: "FETCH_TOKEN",
    similes: ["TOKEN_INFO", "PRICE_CHECK"],
    description: "Fetches and shares token information in AIXBT-style market updates",
    validate: async (runtime: IAgentRuntime, message: Memory) => {
        return true;
    },
    handler: async (
        runtime: IAgentRuntime,
        message: Memory,
        state: State,
        options: any,
        callback: HandlerCallback
    ) => {
        try {
            const tokenName = message.content.text.toLowerCase().split(" ").pop();
            if (!tokenName) {
                throw new Error("No token specified");
            }

            const apiKey = runtime.getSetting("COOKIE_API_KEY");
            if (!apiKey) {
                throw new Error("Cookie API key not configured");
            }

            const response = await axios.get(COOKIE_API_URL, {
                params: {
                    crypto: tokenName
                },
                headers: {
                    Authorization: apiKey
                }
            });

            const tokenData = response.data;

            const formatNumber = (num: number) => {
                if (num >= 1e12) return `${(num / 1e12).toFixed(2)}T`;
                if (num >= 1e9) return `${(num / 1e9).toFixed(2)}B`;
                if (num >= 1e6) return `${(num / 1e6).toFixed(2)}M`;
                if (num >= 1e3) return `${(num / 1e3).toFixed(2)}K`;
                return num.toFixed(2);
            };

            const context = composeContext({
                state: {
                    ...state,
                    symbol: tokenData.symbol.toUpperCase(),
                    current_price_usd: formatNumber(tokenData.current_price_usd),
                    high_24h: formatNumber(tokenData.high_24h),
                    low_24h: formatNumber(tokenData.low_24h),
                    market_cap: formatNumber(tokenData.market_cap),
                    trading_volume: formatNumber(tokenData.trading_volume),
                    description: tokenData.description.split('.')[0]
                },
                template: tokenHandlerTemplate
            });

            const summary = await generateMessageResponse({
                runtime,
                context,
                modelClass: ModelClass.SMALL
            });

            const responseContent: Content = {
                text: summary.text,
                action: "FETCH_TOKEN"
            };

            await callback(responseContent);
            return responseContent;

        } catch (error) {
            elizaLogger.error("[FETCH_TOKEN] Error fetching token data:", error);
            const errorContent: Content = {
                text: "Sorry, I couldn't fetch the token information right now. Please try again later.",
                action: "FETCH_TOKEN"
            };
            await callback(errorContent);
            return errorContent;
        }
    },
    examples: [
        [
            {
                user: "{{user1}}",
                content: {
                    text: "What's the latest on Bitcoin?",
                },
            },
            {
                user: "{{user2}}",
                content: {
                    text: "$BTC Market Update\n\nPrice: $94.9K\n24h Range: $93.8K - $95.4K\nMC: $1.89T | Vol: $23.8B\n\nBitcoin continues to dominate as the OG crypto, revolutionizing digital payments with secure, peer-to-peer transactions. #Bitcoin #Crypto",
                    action: "FETCH_TOKEN",
                },
            },
        ],
        [
            {
                user: "{{user1}}",
                content: {
                    text: "Tell me about Ethereum",
                },
            },
            {
                user: "{{user2}}",
                content: {
                    text: "$ETH Market Update\n\nPrice: $3.2K\n24h Range: $3.1K - $3.3K\nMC: $385B | Vol: $12.4B\n\nEthereum remains the leading smart contract platform, powering DeFi, NFTs, and Web3 applications with its robust ecosystem. #Ethereum #DeFi",
                    action: "FETCH_TOKEN",
                },
            },
        ],
        [
            {
                user: "{{user1}}",
                content: {
                    text: "What's happening with Solana?",
                },
            },
            {
                user: "{{user2}}",
                content: {
                    text: "$SOL Market Update\n\nPrice: $102\n24h Range: $98 - $105\nMC: $44.2B | Vol: $2.8B\n\nSolana maintains its position as a high-performance blockchain with fast transactions and growing DeFi ecosystem. #Solana #Crypto",
                    action: "FETCH_TOKEN",
                },
            },
        ],
        [
            {
                user: "{{user1}}",
                content: {
                    text: "Give me an update on Chainlink",
                },
            },
            {
                user: "{{user2}}",
                content: {
                    text: "$LINK Market Update\n\nPrice: $15.2\n24h Range: $14.8 - $15.5\nMC: $8.9B | Vol: $342M\n\nChainlink continues to lead the oracle space, providing secure data feeds for DeFi and smart contracts. #Chainlink #DeFi",
                    action: "FETCH_TOKEN",
                },
            },
        ],
        [
            {
                user: "{{user1}}",
                content: {
                    text: "What's the status of Uniswap?",
                },
            },
            {
                user: "{{user2}}",
                content: {
                    text: "$UNI Market Update\n\nPrice: $7.8\n24h Range: $7.5 - $8.1\nMC: $4.7B | Vol: $156M\n\nUniswap remains the dominant DEX with over $2B daily volume and growing DeFi integration. #Uniswap #DeFi",
                    action: "FETCH_TOKEN",
                },
            },
        ],
    ] as ActionExample[][],
} as Action;
