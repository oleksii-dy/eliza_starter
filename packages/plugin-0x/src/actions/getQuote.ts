import {
    Action,
    IAgentRuntime,
    Memory,
    State,
    HandlerCallback,
    elizaLogger,
    MemoryManager,
} from "@elizaos/core";
import { createClientV2 } from "@0x/swap-ts-sdk";
import { parseUnits } from "viem";
import { GetQuoteResponse, PriceInquiry } from "../types";
import { formatTokenAmount } from "../utils";
import { ZX_PRICE_MEMORY } from "../constants";

export const getQuote: Action = {
    name: "GET_QUOTE",
    similes: [],
    suppressInitialMessage: true,
    description:
        "Get a firm quote for a swap from 0x when user wants to execute a trade. This action is triggered only after user has requested for an indicative price.",
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
        const latestPriceInquiry = await retrieveLatestPriceInquiry(
            runtime,
            message
        );
        if (!latestPriceInquiry) {
            callback({
                text: "Please provide me the details of the swap.",
            });
            return;
        }

        const {
            sellTokenObject,
            sellAmountBaseUnits,
            buyTokenObject,
            chainId,
        } = latestPriceInquiry;

        const zxClient = createClientV2({
            apiKey: runtime.getSetting("ZERO_EX_API_KEY"),
        });

        try {
            const quote = (await zxClient.swap.permit2.getQuote.query({
                sellAmount: sellAmountBaseUnits,
                sellToken: sellTokenObject.address,
                buyToken: buyTokenObject.address,
                chainId: chainId,
                taker: runtime.getSetting("WALLET_PUBLIC_ADDRESS"),
            })) as GetQuoteResponse;

            const buyAmountBaseUnitsQuoted =
                Number(quote.buyAmount) / Math.pow(10, buyTokenObject.decimals);
            const sellAmountBaseUnitsQuoted =
                Number(quote.sellAmount) /
                Math.pow(10, sellTokenObject.decimals);

            const { tokens } = quote.route;
            const sellTokenSymbol = tokens.find(
                (t) => t.address.toLowerCase() === quote.sellToken.toLowerCase()
            )?.symbol;
            const buyTokenSymbol = tokens.find(
                (t) => t.address.toLowerCase() === quote.buyToken.toLowerCase()
            )?.symbol;

            console.log("quote", quote);

            const formattedResponse = [
                `🎯 Firm Quote Details:`,
                `────────────────`,
                // Basic swap details (same as price)
                `📤 Sell: ${sellAmountBaseUnitsQuoted.toFixed(4)} ${sellTokenSymbol}`,
                `📥 Buy: ${buyAmountBaseUnitsQuoted.toFixed(4)} ${buyTokenSymbol}`,
                `📊 Rate: 1 ${sellTokenSymbol} = ${(buyAmountBaseUnitsQuoted / sellAmountBaseUnitsQuoted).toFixed(4)} ${buyTokenSymbol}`,

                // New information specific to quote
                `📈 Minimum Buy Amount: ${parseUnits(quote.minBuyAmount, buyTokenObject.decimals)} ${buyTokenSymbol}`,

                // Fee breakdown
                `💰 Fees Breakdown:`,
                `  • Protocol Fee: ${formatTokenAmount(quote.fees.zeroExFee?.amount, quote.fees.zeroExFee?.token, chainId)}`,
                `  • Gas Fee: ${formatTokenAmount(quote.fees.gasFee?.amount, quote.fees.gasFee?.token, chainId)}`,
                `  • Integrator Fee: ${formatTokenAmount(quote.fees.integratorFee?.amount, quote.fees.integratorFee?.token, chainId)}`,

                `🛣️ Route:`,
                quote.route.fills
                    .map(
                        (fill) =>
                            `  • ${Number(fill.proportionBps) / 100}% via ${fill.source}`
                    )
                    .join("\n"),

                // Approval status
                `🔐 Approval: ${quote.issues.allowance ? "Required" : "Not Required"}`,

                // Balance check
                `💼 Balance Check: ${Number(quote.issues.balance?.actual) >= Number(quote.issues.balance?.expected) ? "✅" : "❌"}`,

                // Expiration (from deadline in trade.eip712.message)
                `⏰ Quote Expires: ${formatDeadline(quote.permit2.eip712.message.deadline)}`,

                // Chain
                `🔗 Chain: Ethereum`,

                `\nReady to execute! Use this quote to perform the swap.`,
            ]
                .filter(Boolean)
                .join("\n");

            callback({
                text: formattedResponse,
                content: { quote },
            });
            return true;
        } catch (error) {
            elizaLogger.error("Error getting quote:", error);
            if (callback) {
                callback({
                    text: `Error getting quote: ${error.message}`,
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
                    text: "I want to swap 1 ETH for USDC",
                },
            },
            {
                user: "{{agent}}",
                content: {
                    text: "Let me get you a quote for that swap.",
                    action: "GET_QUOTE",
                },
            },
        ],
    ],
};

const formatDeadline = (deadline: string) => {
    const expirationDate = new Date(parseInt(deadline) * 1000);

    // Format: "Mar 15, 2:30 PM"
    const formattedTime = expirationDate.toLocaleString(undefined, {
        month: "short",
        day: "numeric",
        hour: "numeric",
        minute: "2-digit",
        hour12: true,
    });

    return `⏰ Expires: ${formattedTime}`;
};

export const retrieveLatestPriceInquiry = async (
    runtime: IAgentRuntime,
    message: Memory
): Promise<PriceInquiry | null> => {
    const memoryManager = new MemoryManager({
        runtime,
        tableName: ZX_PRICE_MEMORY.tableName,
    });

    try {
        const memories = await memoryManager.getMemories({
            roomId: message.roomId,
            count: 1,
            start: 0,
            end: Date.now(),
        });
        console.log("memories", memories);

        if (memories?.[0]) {
            return JSON.parse(memories[0].content.text) as LatestPriceInquiry;
        }
        return null;
    } catch (error) {
        elizaLogger.error(`Failed to retrieve price inquiry: ${error.message}`);
        return null;
    }
};
