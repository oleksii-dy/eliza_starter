import {
    Action,
    IAgentRuntime,
    Memory,
    generateObjectDeprecated,
    ModelClass,
    composeContext,
    elizaLogger,
} from "@elizaos/core";
import { authenticate } from "../utils/paradex-ts/api";
import { signOrder } from "../utils/paradex-ts/signature";
import { SystemConfig, Account } from "../utils/paradex-ts/types";
import { getParadexConfig, initializeAccount } from "../utils/paradexUtils";
import { BaseParadexState } from "../types";

interface OrderRequest {
    action: "long" | "short" | "buy" | "sell";
    market: string;
    size: number;
    price?: number;
}

interface PlaceOrderParams {
    market: string;
    side: "BUY" | "SELL";
    type: "LIMIT" | "MARKET";
    size: string;
    price?: string;
    instruction?: string;
}

export class ParadexOrderError extends Error {
    constructor(message: string, public details?: any) {
        super(message);
        this.name = "ParadexOrderError";
    }
}

const orderTemplate = `Analyze ONLY the latest user message to extract order details.
 Last message: "{{lastMessage}}"
 
 Rules:
 1. ALL markets MUST be formatted as CRYPTO-USD-PERP (e.g., "BTC-USD-PERP", "ETH-USD-PERP")
 2. If only the crypto name is given (e.g., "ETH" or "BTC"), append "-USD-PERP"
 3. Size must be a number
 4. Price is optional - if specified, creates a limit order
 
 Examples of valid messages and their parsing:
 - "Long 0.1 ETH" → market: "ETH-USD-PERP"
 - "Short 0.5 BTC at 96000" → market: "BTC-USD-PERP"
 - "Buy 1000 USDC worth of ETH" → market: "ETH-USD-PERP"
 - "Sell 0.2 ETH at 5000" → market: "ETH-USD-PERP"
 
 Respond with a JSON markdown block containing ONLY the order details:
 \`\`\`json
 {
  "action": "long",
  "market": "ETH-USD-PERP",
  "size": 0.1
 }
 \`\`\``;

async function placeOrder(
    config: SystemConfig,
    account: Account,
    orderDetails: PlaceOrderParams
): Promise<any> {
    try {
        if (!account.jwtToken) {
            throw new ParadexOrderError("JWT token is missing");
        }

        const timestamp = Date.now();
        const formattedOrderDetails: Record<string, string> = {
            market: orderDetails.market,
            side: orderDetails.side,
            type: orderDetails.type,
            size: orderDetails.size,
            ...(orderDetails.price && { price: orderDetails.price }),
            ...(orderDetails.instruction && {
                instruction: orderDetails.instruction,
            }),
        };

        const signature = signOrder(
            config,
            account,
            formattedOrderDetails,
            timestamp
        );

        const response = await fetch(`${config.apiBaseUrl}/orders`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Accept: "application/json",
                Authorization: `Bearer ${account.jwtToken}`,
            },
            body: JSON.stringify({
                ...orderDetails,
                signature,
                signature_timestamp: timestamp,
            }),
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new ParadexOrderError(
                `HTTP Error ${response.status}: ${errorText}`
            );
        }

        return await response.json();
    } catch (error) {
        elizaLogger.error("Error in placeOrderApi:", error);
        throw error instanceof ParadexOrderError
            ? error
            : new ParadexOrderError("Failed to place order", error);
    }
}

async function parseOrderRequest(
    runtime: IAgentRuntime,
    state: BaseParadexState
): Promise<OrderRequest> {
    const context = composeContext({
        state,
        template: orderTemplate,
    });

    const request = (await generateObjectDeprecated({
        runtime,
        context,
        modelClass: ModelClass.SMALL,
    })) as OrderRequest;

    if (!request?.market || !request?.size || !request?.action) {
        throw new ParadexOrderError("Invalid or incomplete order request");
    }

    return request;
}

export const paradexPlaceOrderAction: Action = {
    name: "PARADEX_PLACE_ORDER",
    similes: ["PLACE_ORDER", "SUBMIT_ORDER", "CREATE_ORDER"],
    description: "Places an order on Paradex",
    suppressInitialMessage: true,

    validate: async (runtime: IAgentRuntime, message: Memory) => {
        return true;
    },

    handler: async (
        runtime: IAgentRuntime,
        message: Memory,
        state?: BaseParadexState
    ) => {
        elizaLogger.info("Starting order placement...");

        try {
            // Initialize state if needed
            if (!state) {
                state = (await runtime.composeState(
                    message
                )) as BaseParadexState;
            }
            state.lastMessage = message.content.text;

            // Get account and config
            const account = await initializeAccount(runtime);
            const config = getParadexConfig();

            // Authenticate
            account.jwtToken = await authenticate(config, account);
            elizaLogger.info("Authentication successful");

            // Parse order request
            const request = await parseOrderRequest(runtime, state);
            state.orderRequestObj = request;

            // Convert to order parameters
            const orderParams: PlaceOrderParams = {
                market: request.market,
                side:
                    request.action === "long" || request.action === "buy"
                        ? "BUY"
                        : "SELL",
                type: request.price ? "LIMIT" : "MARKET",
                size: request.size.toString(),
                instruction: "GTC",
                ...(request.price && { price: request.price.toString() }),
            };

            // Place the order
            const result = await placeOrder(config, account, orderParams);
            elizaLogger.success("Order placed successfully:", result);

            return true;
        } catch (error) {
            if (error instanceof ParadexOrderError) {
                elizaLogger.error(
                    "Order placement error:",
                    error.details || error.message
                );
            } else {
                elizaLogger.error(
                    "Unexpected error during order placement:",
                    error
                );
            }
            return false;
        }
    },

    examples: [
        [
            {
                user: "{{user1}}",
                content: { text: "Long 0.1 ETH" },
            },
            {
                user: "{{agent}}",
                content: {
                    text: "Market long order placed for ETH-USD-PERP.",
                    action: "PARADEX_PLACE_ORDER",
                },
            },
        ],
        [
            {
                user: "{{user1}}",
                content: { text: "Short 0.05 BTC at 96000" },
            },
            {
                user: "{{agent}}",
                content: {
                    text: "Limit short order placed for BTC-USD-PERP.",
                    action: "PARADEX_PLACE_ORDER",
                },
            },
        ],
    ],
};
