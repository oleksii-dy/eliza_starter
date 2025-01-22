import { Action, composeContext, elizaLogger, generateObject, HandlerCallback, IAgentRuntime, Memory, ModelClass, State } from "@elizaos/core";
import { priceQueryTemplate } from "../templates";
import { isPriceQueryParams, PriceData, PriceQueryParams, PriceQueryParamsSchema } from "../types";

async function fetchPriceData(pair: string) {
    const response = await fetch(`https://live-api.apro.com/api/live-stream/reports?pair=${pair}`);
    const { result } = await response.json();
    return result as PriceData[];
}

export const priceQuery: Action = {
    name: "PRICE_QUERY",
    similes: [
        'PRICE_FETCH',
    ],
    description: "Fetch price data",
    validate: async (runtime: IAgentRuntime, message: Memory) => {
        return true;
    },
    handler: async (
        runtime: IAgentRuntime,
        message: Memory,
        state?: State,
        _options?: { [key: string]: unknown },
        callback?: HandlerCallback
    ) => {
        elizaLogger.info("Composing state for message:", message);
        if (!state) {
            state = (await runtime.composeState(message)) as State;
        } else {
            state = await runtime.updateRecentMessageState(state);
        }

        const context = composeContext({
            state,
            template: priceQueryTemplate,
        });

        const response = await generateObject({
            runtime,
            context,
            modelClass: ModelClass.LARGE,
            schema: PriceQueryParamsSchema,
        });

        const priceQueryParams = response.object as PriceQueryParams;
        if (!isPriceQueryParams(priceQueryParams)) {
            throw new Error('Invalid content: ' + JSON.stringify(priceQueryParams));
        }

        elizaLogger.info('price query params received:', priceQueryParams);

        try {
            const priceData = await fetchPriceData(priceQueryParams.pair);
            elizaLogger.info('price data received:', priceData);

            let priceDataString = '';
            priceData.forEach((data) => {
                priceDataString += `Feed ID: ${data.feedId}\nBid Price: ${data.bidPrice}\nMid Price: ${data.midPrice}\nAsk Price: ${data.askPrice}\nTimestamp: ${data.timestamp}`;
            });
            if (callback) {
                callback({
                    text: `Price data for pair ${priceQueryParams.pair}: \n${priceDataString}`,
                });
            }
        } catch (error: any) {
            elizaLogger.error(`Error fetching price data: ${error.message}`);
            callback(
                {
                    text: 'Error fetching price data, error: ' + error.message,
                }
            )
        }
    },
    examples: [
        [
            {
                user: "{{user1}}",
                content: {
                    text: "Fetch price data for pair BTC/USD",
                },
            },
            {
                user: "{{agentName}}",
                content: {
                    text: "Price data for pair BTC/USD: \nFeed ID: 1, Bid: 10000, Mid: 10001, Ask: 10002\nFeed ID: 2, Bid: 10003, Mid: 10004, Ask: 10005",
                    action: "PRICE_QUERY",
                },
            }
        ],
    ],
}