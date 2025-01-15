import {
    Action,
    IAgentRuntime,
    Memory,
    State,
    HandlerCallback,
    elizaLogger,
    composeContext,
    ModelClass,
    generateObject,
    MemoryManager,
} from "@elizaos/core";
import { createClientV2 } from "@0x/swap-ts-sdk";
import { getIndicativePriceTemplate } from "../templates";
import { z } from "zod";
import { tokensByChain } from "../utils";
import { GetIndicativePriceResponse, PriceInquiry } from "../types";
import { parseUnits } from "viem";
import { ZX_PRICE_MEMORY } from "../constants";

export const IndicativePriceSchema = z.object({
    sellToken: z.string(),
    sellAmount: z.number(),
    buyToken: z.string(),
});

export interface IndicativePriceContent {
    sellToken: string;
    sellAmount: number;
    buyToken: string;
}

export const getIndicativePrice: Action = {
    name: "GET_INDICATIVE_PRICE",
    similes: [],
    suppressInitialMessage: true,
    description:
        "Get indicative price for a swap from 0x when user wants to convert their tokens",
    validate: async (runtime: IAgentRuntime) => {
        return !!runtime.getSetting("ZERO_EX_API_KEY");
    },
    handler: async (
        runtime: IAgentRuntime,
        message: Memory,
        state: State,
        options: Record<string, unknown>,
        callback: HandlerCallback
    ) => {
        // Initialize or update state
        state = !state
            ? await runtime.composeState(message)
            : await runtime.updateRecentMessageState(state);

        const context = composeContext({
            state,
            template: getIndicativePriceTemplate,
        });
        elizaLogger.info("Context:", context);

        const content = await generateObject({
            runtime,
            context,
            modelClass: ModelClass.SMALL,
            schema: IndicativePriceSchema,
        });

        if (!isIndicativePriceContent(content.object)) {
            console.error("Invalid indicative price content:", content.object);
            const missingFields = getMissingIndicativePriceContent(
                content.object
            );
            callback({
                text: `Need more information about the swap. Please provide me ${missingFields}`,
            });

            return;
        }

        const indicativePrice = content.object as IndicativePriceContent;
        const { sellToken, sellAmount, buyToken } = indicativePrice;

        elizaLogger.info("Getting indicative price for:", content);

        const zxClient = createClientV2({
            apiKey: runtime.getSetting("ZERO_EX_API_KEY"),
        });

        let chainId = 1;
        const sellTokenObject = tokensByChain(chainId)[sellToken.toLowerCase()];
        const buyTokenObject = tokensByChain(chainId)[buyToken.toLowerCase()];

        elizaLogger.info("Sell token object:", sellTokenObject);
        elizaLogger.info("Buy token object:", buyTokenObject);
        elizaLogger.info("Chain ID:", chainId);
        elizaLogger.info(
            "Sell amount:",
            parseUnits(sellAmount.toString(), sellTokenObject.decimals)
        );
        const sellAmountBaseUnits = parseUnits(
            sellAmount.toString(),
            sellTokenObject.decimals
        ).toString();

        try {
            // TODO: get the chainId from the content
            const price = (await zxClient.swap.permit2.getPrice.query({
                sellAmount: sellAmountBaseUnits,
                sellToken: sellTokenObject.address,
                buyToken: buyTokenObject.address,
                chainId: chainId, // Assume ETH mainnet
            })) as GetIndicativePriceResponse;

            // Format amounts to human-readable numbers
            const buyAmount =
                Number(price.buyAmount) / Math.pow(10, buyTokenObject.decimals);
            const sellAmount =
                Number(price.sellAmount) /
                Math.pow(10, sellTokenObject.decimals);
            const priceImpact = price.estimatedPriceImpact || "0";

            elizaLogger.info("Price:", price);

            // Get token symbols from route
            const { tokens } = price.route;
            const sellTokenSymbol = tokens.find(
                (t) => t.address.toLowerCase() === price.sellToken.toLowerCase()
            )?.symbol;
            const buyTokenSymbol = tokens.find(
                (t) => t.address.toLowerCase() === price.buyToken.toLowerCase()
            )?.symbol;

            // Set state
            await storePriceInquiryToMemory(runtime, message, {
                sellTokenObject: sellTokenObject,
                buyTokenObject: buyTokenObject,
                sellAmountBaseUnits: sellAmountBaseUnits,
                chainId: chainId,
                timestamp: new Date().toISOString(),
            });

            const formattedResponse = [
                `💱 Swap Details:`,
                `────────────────`,
                `📤 Sell: ${sellAmount.toFixed(4)} ${sellTokenSymbol}`,
                `📥 Buy: ${buyAmount.toFixed(4)} ${buyTokenSymbol}`,
                `📊 Rate: 1 ${sellTokenSymbol} = ${(buyAmount / sellAmount).toFixed(4)} ${buyTokenSymbol}`,
                `📈 Price Impact: ${Number(priceImpact).toFixed(2)}%`,
                `🔗 Chain: Ethereum`,
            ]
                .filter(Boolean)
                .join("\n");

            callback({
                text: formattedResponse,
            });
            return true;
        } catch (error) {
            elizaLogger.error("Error getting price:", error);
            if (callback) {
                callback({
                    text: `Error getting price: ${error.message}`,
                    content: { error: error.message },
                });
            }
            return false;
        }
    },
    examples: [
        [
            {
                user: "{{user1}}",
                content: {
                    text: "What's the price of ETH in USDT?",
                },
            },
            {
                user: "{{agent}}",
                content: {
                    text: "Let me check the current exchange rate for ETH/USDT.",
                    action: "GET_INDICATIVE_PRICE",
                },
            },
            {
                user: "{{agent}}",
                content: {
                    text: "Current exchange rate: 1 USDT = 0.000423 ETH\nEstimated gas cost: 0.002 ETH\nPrice impact: 0.12%",
                },
            },
        ],
        [
            {
                user: "{{user1}}",
                content: {
                    text: "What's the price of WETH in USDT?",
                },
            },
            {
                user: "{{agent}}",
                content: {
                    text: "Let me get the indicative price for WETH -> USDT.",
                    action: "GET_INDICATIVE_PRICE",
                },
            },
            {
                user: "{{agent}}",
                content: {
                    text: "I need more information about the swap. What is the amount you are selling?",
                    action: "GET_INDICATIVE_PRICE",
                },
            },
            {
                user: "{{user1}}",
                content: {
                    text: "5 WETH",
                },
            },
            {
                user: "{{agent}}",
                content: {
                    text: "Let me get the indicative price for 5 WETH -> USDT.",
                    action: "GET_INDICATIVE_PRICE",
                },
            },
            {
                user: "{{agent}}",
                content: {
                    text: "Current exchange rate: 1 USDT = 0.000423 ETH\nEstimated gas cost: 0.002 ETH\nPrice impact: 0.12%",
                },
            },
        ],
    ],
};

export const isIndicativePriceContent = (
    object: any
): object is IndicativePriceContent => {
    if (IndicativePriceSchema.safeParse(object).success) {
        console.log("Valid indicative price content:", object);
        return true;
    }
    return false;
};

export const getMissingIndicativePriceContent = (
    content: Partial<IndicativePriceContent>
): string => {
    const missingFields = [];

    if (typeof content.sellToken !== "string") missingFields.push("sell token");
    if (typeof content.buyToken !== "string") missingFields.push("buy token");
    if (typeof content.sellAmount !== "number")
        missingFields.push("sell amount");

    return missingFields.join(" and ");
};

export const storePriceInquiryToMemory = async (
    runtime: IAgentRuntime,
    message: Memory,
    priceInquiry: PriceInquiry
) => {
    const memory: Memory = {
        roomId: message.roomId,
        userId: message.userId,
        agentId: runtime.agentId,
        content: {
            text: JSON.stringify(priceInquiry),
            type: ZX_PRICE_MEMORY.type,
        },
    };

    const memoryManager = new MemoryManager({
        runtime,
        tableName: ZX_PRICE_MEMORY.tableName,
    });

    await memoryManager.createMemory(memory);
    const memories = await memoryManager.getMemories({
        roomId: message.roomId,
        count: 1,
        start: 0,
        end: Date.now(),
    });
    console.log("memoriesHERE", memories);
};
