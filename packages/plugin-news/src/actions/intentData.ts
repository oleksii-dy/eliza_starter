import { generateText, ModelClass } from "@elizaos/core";
import { elizaLogger } from "@elizaos/core";
import {
    Action,
    ActionExample,
    HandlerCallback,
    IAgentRuntime,
    Memory,
    State,
} from "@elizaos/core";
import { custom } from "viem";
import { arbitrum } from "viem/chains";
import React from "react";
import useSWR from "swr";

import BigNumber from "bignumber.js";

// Constants
const BN_ZERO = new BigNumber(0);

export enum IntentPositionType {
    LONG = "LONG",
    SHORT = "SHORT",
}

export enum QuoteStatus {
    OPENED = "OPENED",
    CLOSED = "CLOSED",
    LIQUIDATED = "LIQUIDATED",
    CLOSE_PENDING = "CLOSE_PENDING",
    CANCEL_CLOSE_PENDING = "CANCEL_CLOSE_PENDING",
}

export interface MarketData {
    symbol: string;
    markPrice: number;
}

interface Quote {
    marketId: number;
    openedPrice: string;
    positionType: IntentPositionType;
    quoteStatus: QuoteStatus;
    avgClosedPrice: string;
    closedAmount: string;
    quantity: string;
    liquidateAmount?: string;
    liquidatePrice?: string;
    createTimestamp: number;
}

interface IntentPosition {
    singleTrade: IntentPositionType | null;
    id: string;
    LongSideQuote: Quote;
    ShortSideQuote: Quote;
}

const marketsURL =
    "https://www.perps-streaming.com/v1/42161a/0x6273242a7E88b3De90822b31648C212215caaFE4/contract-symbols";

function toBN(val: string | number): BigNumber {
    return new BigNumber(val || 0);
}

export async function getMarketData(marketId: number): Promise<MarketData> {
    try {
        const response = await fetch(`${marketsURL}/${marketId}`);
        if (!response.ok) {
            throw new Error(
                `Failed to fetch market data: ${response.statusText}`
            );
        }
        return await response.json();
    } catch (error) {
        console.error("Error fetching market data:", error);
        throw error;
    }
}

export function formatPrice(
    price: string | number,
    precision: number = 4
): string {
    if (!price) return "-";
    return toBN(price).toFixed(precision);
}

function calculateQuoteUpnlAndPnl(
    quote: Quote,
    currentPrice: string | number,
    quantityToClose?: string | number,
    closedPrice?: string | number
): [string, string] {
    const {
        openedPrice,
        positionType,
        avgClosedPrice,
        closedAmount,
        quoteStatus,
        quantity,
        liquidateAmount,
        liquidatePrice,
    } = quote;

    // Calculate PNL
    const pnl =
        toBN(closedPrice ?? avgClosedPrice)
            .minus(openedPrice)
            .times(quantityToClose ?? closedAmount)
            .times(positionType === IntentPositionType.SHORT ? -1 : 1)
            .toString() || BN_ZERO.toString();

    // Calculate UPNL
    const upnl =
        toBN(quantity)
            .minus(closedAmount)
            .times(toBN(currentPrice).minus(openedPrice))
            .times(positionType === IntentPositionType.SHORT ? -1 : 1)
            .toString() || BN_ZERO.toString();

    // Return appropriate values based on quote status
    if (
        quoteStatus === QuoteStatus.CLOSE_PENDING ||
        quoteStatus === QuoteStatus.CANCEL_CLOSE_PENDING ||
        quoteStatus === QuoteStatus.OPENED
    ) {
        return [upnl, pnl];
    } else if (quoteStatus === QuoteStatus.CLOSED) {
        return [BN_ZERO.toString(), pnl];
    } else if (quoteStatus === QuoteStatus.LIQUIDATED) {
        if (quantityToClose) return [BN_ZERO.toString(), pnl];

        const averagePrice = toBN(liquidatePrice)
            .times(liquidateAmount || 0)
            .plus(toBN(avgClosedPrice).times(closedAmount))
            .div(quantity);

        return [
            BN_ZERO.toString(),
            toBN(parseFloat(averagePrice.toString()))
                .minus(openedPrice)
                .times(quantity)
                .times(positionType === IntentPositionType.SHORT ? -1 : 1)
                .toString() || BN_ZERO.toString(),
        ];
    } else {
        return [BN_ZERO.toString(), BN_ZERO.toString()];
    }
}

export async function calculatePositionMetrics(
    position: IntentPosition,
    quantityToClose?: string | number,
    closedPrice?: string | number
) {
    const isLongOnly = position.singleTrade === IntentPositionType.LONG;
    const isShortOnly = position.singleTrade === IntentPositionType.SHORT;
    const isPairTrade = !position.singleTrade;

    // Get market data for both sides
    const [longMarketData, shortMarketData] = await Promise.all([
        getMarketData(position.LongSideQuote.marketId),
        getMarketData(position.ShortSideQuote.marketId),
    ]);

    // Calculate UPNLs and PNLs
    const [longUpnl, longPnl] = calculateQuoteUpnlAndPnl(
        position.LongSideQuote,
        longMarketData.markPrice,
        quantityToClose,
        closedPrice
    );

    const [shortUpnl, shortPnl] = calculateQuoteUpnlAndPnl(
        position.ShortSideQuote,
        shortMarketData.markPrice,
        quantityToClose,
        closedPrice
    );

    if (isPairTrade) {
        // Entry prices
        const longEntryPrice = toBN(position.LongSideQuote.openedPrice);
        const shortEntryPrice = toBN(position.ShortSideQuote.openedPrice);
        const entryRate = longEntryPrice.div(shortEntryPrice);

        // Current prices
        const longCurrentPrice = toBN(longMarketData.markPrice);
        const shortCurrentPrice = toBN(shortMarketData.markPrice);
        const currentRate = longCurrentPrice.div(shortCurrentPrice);

        // Combine UPNLs and PNLs
        const totalUpnl = toBN(longUpnl).plus(shortUpnl);
        const totalPnl = toBN(longPnl).plus(shortPnl);

        return {
            entryPrice: formatPrice(entryRate.toString()),
            currentPrice: formatPrice(currentRate.toString()),
            upnl: formatPrice(totalUpnl.toString()),
            pnl: formatPrice(totalPnl.toString()),
        };
    } else {
        const dominantQuote = isLongOnly
            ? position.LongSideQuote
            : position.ShortSideQuote;
        const dominantMarketData = isLongOnly
            ? longMarketData
            : shortMarketData;
        const dominantUpnl = isLongOnly ? longUpnl : shortUpnl;
        const dominantPnl = isLongOnly ? longPnl : shortPnl;

        return {
            entryPrice: formatPrice(dominantQuote.openedPrice),
            currentPrice: formatPrice(dominantMarketData.markPrice.toString()),
            upnl: formatPrice(dominantUpnl),
            pnl: formatPrice(dominantPnl),
        };
    }
}

const IntentAPIs = {
    all: `${process.env.NEXT_PUBLIC_BACKEND_API_MAIN}/v1/intent/positions?account=`,
    openPositionsTrades: `${process.env.NEXT_PUBLIC_BACKEND_API_MAIN}/v1/intent/positions/open-trades?account=`,
};

// Standalone data fetching function
const fetchIntentPositions = async (account: `0x${string}`) => {
    const response = await fetch(`${IntentAPIs.all}${account}`);
    const data = (await response.json()) as {
        message: string;
        payload: IntentPosition[];
        statusCode: number;
    };

    console.log(response, data, "response");

    let OpenIntentPositionData: IntentPosition[] = [];
    let CloseIntentPositionData: IntentPosition[] = [];

    if (data?.payload?.length) {
        console.log("heeeeeee");
        data.payload.forEach((intent) => {
            const isLongOnly = intent.singleTrade === IntentPositionType.LONG;
            const isPairTrade = !intent.singleTrade;

            const dominantQuoteSide: Quote =
                isPairTrade || isLongOnly
                    ? intent.LongSideQuote
                    : intent.ShortSideQuote;

            if (dominantQuoteSide.quoteStatus === QuoteStatus.CLOSED) {
                CloseIntentPositionData.push(intent);
            } else if (dominantQuoteSide.quoteStatus === QuoteStatus.OPENED) {
                OpenIntentPositionData.push(intent);
            }
        });
    }

    return {
        OpenIntentPositionData,
        CloseIntentPositionData,
    };
};

// export const useGetAllIntentPositions = (account: `0x${string}`) => {
//     const fetcher = (url: string) => fetch(url).then((res) => res.json());
//     const intentPositionsUrl = `${IntentAPIs.all}${account}`;

//     const { data: intentPositionData, isLoading: intentPositionLoading } =
//         useSWR<{
//             message: string;
//             payload: IntentPosition[];
//             statusCode: number;
//         }>(intentPositionsUrl, fetcher, {
//             refreshInterval: 30000,
//         });

//     const { OpenIntentPositionData, CloseIntentPositionData } = React.useMemo(() => {
//         if (!intentPositionData?.payload?.length) {
//             return { OpenIntentPositionData: [], CloseIntentPositionData: [] };
//         }

//         let OpenIntentPositionData: IntentPosition[] = [];
//         let CloseIntentPositionData: IntentPosition[] = [];

//         intentPositionData.payload.forEach((intent) => {
//             const isLongOnly = intent.singleTrade === IntentPositionType.LONG;
//             const isPairTrade = !intent.singleTrade;

//             const dominantQuoteSide: Quote =
//                 isPairTrade || isLongOnly
//                     ? intent.LongSideQuote
//                     : intent.ShortSideQuote;

//             if (dominantQuoteSide.quoteStatus === QuoteStatus.CLOSED) {
//                 CloseIntentPositionData.push(intent);
//             } else if (dominantQuoteSide.quoteStatus === QuoteStatus.OPENED) {
//                 OpenIntentPositionData.push(intent);
//             }
//         });

//         return {
//             OpenIntentPositionData,
//             CloseIntentPositionData
//         };
//     }, [intentPositionData]);

//     return {
//         intentPositionLoading,
//         OpenIntentPositionData,
//         CloseIntentPositionData,
//     };
// };

// Action handler implementation
export const pearIntentDataAction: Action = {
    name: "PEAR_INTENT_DATA",
    similes: [
        "PEAR_INTENT",
        "INTENT_POSITIONS",
        "TRADE_INTENT",
        "PEAR_TRADES",
        "PEAR_POSITIONS",
    ],
    description:
        "Fetches Pear intent data based on the connected wallet address.",

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
        const addresses = [
            "0xD323CC9C8Ad7850FC443F432F7a39395452E0b99" as `0x${string}`,
        ];
        const isConnected = addresses.length > 0;

        if (!isConnected) {
            callback({
                text: "Please connect your wallet first to fetch Pear intent data.",
                action: "PEAR_INTENT_DATA",
            });
            return true;
        }

        const address = addresses[0];

        try {
            // Use the non-hook version to fetch data
            const { OpenIntentPositionData, CloseIntentPositionData } =
                await fetchIntentPositions(address);

            console.log(
                "OpenIntentPositionData",
                OpenIntentPositionData,
                CloseIntentPositionData
            );

            const fetchMarketData = async (marketId: number) => {
                const response = await fetch(`${marketsURL}/${marketId}`);
                return response.json();
            };

            console.log(fetchMarketData, "fetchMarketData");
            const getSymbolFromMarketData = async (intent: IntentPosition) => {
                const [lMarketData, sMarketData] = await Promise.all([
                    fetchMarketData(intent.LongSideQuote.marketId),
                    fetchMarketData(intent.ShortSideQuote.marketId),
                ]);
                return `${lMarketData.symbol}/${sMarketData.symbol}`;
            };

            console.log(getSymbolFromMarketData, "getSymbolFromMarketData");
            const formatIntentData = async (intent: IntentPosition) => {
                const symbol = await getSymbolFromMarketData(intent);
                console.log(symbol, intent, "symbol");
                const openDate = new Date(
                    intent.LongSideQuote.createTimestamp * 1000
                ).toLocaleString();

                const metrics = calculatePositionMetrics(intent);

                console.log(metrics);
                // TODO: Implement price and PNL calculations
                const currentPrice = "-";
                const entryPrice = "-";
                const currentPnl = "-";

                return {
                    id: intent.id,
                    symbol,
                    openDate,
                    currentPrice,
                    entryPrice,
                    currentPnl,
                };
            };

            const getPositions = async (
                positionType: "open" | "closed" | "all"
            ) => {
                let positions: IntentPosition[] = [];

                if (positionType === "open" || positionType === "all") {
                    positions = positions.concat(
                        OpenIntentPositionData.slice(0, 3)
                    );
                }
                if (positionType === "closed" || positionType === "all") {
                    positions = positions.concat(
                        CloseIntentPositionData.slice(0, 3)
                    );
                }

                return Promise.all(positions.map(formatIntentData));
            };

            const userMessage = message.content.text.toLowerCase();
            const positionType = userMessage.includes("open")
                ? "open"
                : userMessage.includes("closed")
                  ? "closed"
                  : "all";

            callback({
                text: "Fetching Pear intent data...",
                action: "PEAR_INTENT_DATA",
            });

            const intentPositions = await getPositions(positionType);


            const response = intentPositions
                .map(
                    (position) =>
                        `Trade ID: ${position.id}
          Symbol: ${position.symbol}
          Open Date: ${position.openDate}
          Current Price: ${position.currentPrice}
          Entry Price: ${position.entryPrice}
          Current PNL: ${position.currentPnl}`
                )
                .join("\n\n");

            callback({ text: response, action: "PEAR_INTENT_DATA" });
        } catch (error) {
            callback({
                text:
                    "Error fetching Pear intent data: " +
                    (error as Error).message,
                action: "PEAR_INTENT_DATA",
            });
        }

        return true;
    },

    examples: [
        [
            {
                user: "user",
                content: {
                    text: "Show my Pear positions",
                    action: "PEAR_INTENT_DATA",
                },
            },
        ],
        [
            {
                user: "user",
                content: {
                    text: "What are my open Pear trades?",
                    action: "PEAR_INTENT_DATA",
                },
            },
        ],
        [
            {
                user: "user",
                content: {
                    text: "Get my closed Pear intent positions",
                    action: "PEAR_INTENT_DATA",
                },
            },
        ],
    ] as ActionExample[][],
} as Action;
