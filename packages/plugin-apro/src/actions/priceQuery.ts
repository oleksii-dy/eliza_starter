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
        elizaLogger.info("Composing state for message:", message.content.text);
        if (!state) {
            state = (await runtime.composeState(message)) as State;
        } else {
            state = await runtime.updateRecentMessageState(state);
        }

        const context = composeContext({
            state,
            template: priceQueryTemplate,
        });

        let priceQueryParams: PriceQueryParams;
        try {
            const response = await generateObject({
                runtime,
                context,
                modelClass: ModelClass.LARGE,
                schema: PriceQueryParamsSchema,
            });

            priceQueryParams = response.object as PriceQueryParams;
            if (!isPriceQueryParams(priceQueryParams)) {
                throw new Error();
            }
            elizaLogger.info('price query params received:', priceQueryParams);
        } catch (error: any) {
            elizaLogger.error('Invalid content: ', priceQueryParams ? JSON.stringify(priceQueryParams) : null, error);
            callback({ text: 'Cannot fetch price data because of invalid content: ' + priceQueryParams ? JSON.stringify(priceQueryParams) : null });
            return;
        }

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
                    text: "Fetching price data, please wait...",
                    action: "PRICE_QUERY",
                },
            }
        ],
    ],
}