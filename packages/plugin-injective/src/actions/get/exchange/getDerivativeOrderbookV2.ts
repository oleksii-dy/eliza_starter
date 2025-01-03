import { 
    Action,
    Plugin, 
    IAgentRuntime,
    Memory,
    State,
    HandlerCallback,
    elizaLogger,
    composeContext,
    generateObject,
    ModelClass
} from "@elizaos/core";
import { orderbookTemplates } from "@injective/templates/exchange/orderbook";
import { OrderbookWithSequence } from "@injectivelabs/sdk-ts";
import { InjectiveGrpcBase } from "@injective/modules";

// Schema for derivative orderbook request
const DerivativeOrderbookSchema = {
    type: "object",
    properties: {
        marketId: {
            type: "string",
            description: "The ID of the derivative market to fetch orderbook data for"
        }
    },
    required: ["marketId"]
};

// Type guard for the request content
const isDerivativeOrderbookContent = (content: any): content is { marketId: string } => {
    return typeof content === "object" && typeof content.marketId === "string";
};

// Schema and type guard definitions

export const getDerivativeOrderbookAction: Action = {
    name: "GET_DERIVATIVE_ORDERBOOK",
    description: "Fetch the orderbook data for a specific derivative market on Injective Protocol",
    
    validate: async (runtime: IAgentRuntime, _message: Memory) => {
        elizaLogger.info("Validating runtime for GET_DERIVATIVE_ORDERBOOK...");
        // Add any specific validation requirements
        return true;
    },

    handler: async (
        runtime: IAgentRuntime,
        _message: Memory,
        state: State,
        _options: any,
        callback: HandlerCallback
    ) => {
        elizaLogger.debug("Starting GET_DERIVATIVE_ORDERBOOK handler...");

        try {
            const context = composeContext({
                state,
                template: orderbookTemplates
            });

            const orderbookRequest = await generateObject({
                runtime,
                context,
                modelClass: ModelClass.SMALL,
                schema: DerivativeOrderbookSchema
            });

            if (!isDerivativeOrderbookContent(orderbookRequest.object)) {
                callback({
                    text: "Invalid orderbook request details. Please check the market ID.",
                }, []);
                return;
            }

            const { marketId } = orderbookRequest.object;
            
            // Create instance of InjectiveGrpcBase
            const client = new InjectiveGrpcBase("mainnet");
            
            // Fetch the orderbook data
            const orderbook: OrderbookWithSequence = await client.request({
                method: (params: string) => client.indexerGrpcDerivativesApi.fetchOrderbookV2(params),
                params: marketId
            });

            elizaLogger.info("Orderbook fetched successfully:", orderbook);

            // Format the response
            const response = {
                marketId,
                sequence: orderbook.sequence,
                buys: orderbook.buys?.length || 0,
                sells: orderbook.sells?.length || 0
            };

            callback({
                text: `Derivative orderbook fetched successfully:
- Market ID: ${response.marketId}
- Sequence: ${response.sequence}
- Buy Orders: ${response.buys}
- Sell Orders: ${response.sells}

Full orderbook data is available in the response object.`
            }, []);

        } catch (error) {
            elizaLogger.error("Error fetching derivative orderbook:", error);
            callback({
                text: "Failed to fetch derivative orderbook. Please check the logs for more details."
            }, []);
        }
    },

    examples: [
        [
            {
                user: "{{user1}}",
                content: {
                    text: "Get the orderbook for derivative market 0x123..."
                }
            },
            {
                user: "{{agentName}}",
                content: {
                    text: `Derivative orderbook fetched successfully:
- Market ID: 0x123...
- Sequence: 42
- Buy Orders: 10
- Sell Orders: 8

Full orderbook data is available in the response object.`
                }
            }
        ]
    ],
    similes: ["FETCH_ORDERBOOK", "GET_MARKET_DEPTH", "VIEW_ORDERS"]
};

export const derivativeOrderbookPlugin: Plugin = {
    name: "derivativeOrderbook",
    description: "Enables fetching of derivative market orderbook data on the Injective Protocol",
    actions: [getDerivativeOrderbookAction]
};