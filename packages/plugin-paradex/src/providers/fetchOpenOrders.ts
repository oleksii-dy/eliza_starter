import {
    Provider,
    IAgentRuntime,
    Memory,
    State,
    elizaLogger,
} from "@elizaos/core";
import { authenticate, getParadexConfig } from "../utils/paradexUtils";
import { Account } from "../utils/paradex-ts/types";
import { BaseParadexState } from "../types";

interface OrderResult {
    account: string;
    avg_fill_price: string;
    cancel_reason?: string;
    client_id: string;
    created_at: number;
    flags: string[];
    id: string;
    instruction: string;
    last_updated_at: number;
    market: string;
    price: string;
    published_at: number;
    received_at: number;
    remaining_size: string;
    seq_no: number;
    side: string;
    size: string;
    status: string;
    stp: string;
    timestamp: number;
    trigger_price: string;
    type: string;
}

interface OrderResponse {
    results: OrderResult[];
}

async function fetchOpenOrders(market?: string): Promise<OrderResponse> {
    elizaLogger.info("Starting fetchOpenOrders...");

    try {
        // Get configuration and set up account
        const config = getParadexConfig();
        const account: Account = {
            address: process.env.PARADEX_ACCOUNT_ADDRESS,
            publicKey: process.env.PARADEX_ACCOUNT_ADDRESS,
            privateKey: process.env.PARADEX_PRIVATE_KEY,
            ethereumAccount: process.env.ETHEREUM_ACCOUNT_ADDRESS,
        };

        // Validate required environment variables
        if (
            !account.address ||
            !account.privateKey ||
            !account.ethereumAccount
        ) {
            throw new Error(
                "Missing required Paradex configuration. Please check PARADEX_ACCOUNT_ADDRESS, PARADEX_PRIVATE_KEY, and ETHEREUM_ACCOUNT_ADDRESS.",
            );
        }

        // Authenticate and get JWT token
        elizaLogger.info("Authenticating with Paradex...");
        account.jwtToken = await authenticate(config, account);

        if (!account.jwtToken) {
            throw new Error("Failed to obtain JWT token");
        }

        // Construct URL
        const url = market
            ? `${config.apiBaseUrl}/orders?market=${market}`
            : `${config.apiBaseUrl}/orders`;

        elizaLogger.info("Fetching open orders from URL:", url);

        // Fetch orders
        const response = await fetch(url, {
            headers: {
                Authorization: `Bearer ${account.jwtToken}`,
                Accept: "application/json",
            },
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(
                `Failed to fetch orders: ${response.status} - ${errorText}`,
            );
        }

        const data = await response.json();
        elizaLogger.info("Successfully fetched orders data");
        return data;
    } catch (error) {
        elizaLogger.error("Error in fetchOpenOrders:", error);
        throw error; // Re-throw to be handled by the provider
    }
}

function formatOrder(order: OrderResult): string {
    try {
        const price = parseFloat(order.price).toFixed(2);
        const size = parseFloat(order.size).toFixed(4);
        const remainingSize = parseFloat(order.remaining_size).toFixed(4);
        const created = new Date(order.created_at).toLocaleString();

        return `ID: ${order.id} | ${order.market} | ${order.side} ${size} @ ${price} | Type: ${order.type} | Remaining: ${remainingSize} | Created: ${created}`;
    } catch (error) {
        elizaLogger.error(
            "Error formatting order:",
            error,
            "Order data:",
            order,
        );
        return `Error formatting order ${order.id}`;
    }
}

export const openOrdersProvider: Provider = {
    get: async (
        runtime: IAgentRuntime,
        message: Memory,
        state?: BaseParadexState,
    ) => {
        elizaLogger.info("Starting openOrdersProvider.get...");

        if (!state) {
            state = (await runtime.composeState(message)) as BaseParadexState;
        }

        try {
            const ordersData = await fetchOpenOrders();

            if (!ordersData.results || ordersData.results.length === 0) {
                elizaLogger.info("No open orders found");
                return "No open orders found.";
            }

            const formattedOrders = ordersData.results.map(formatOrder);

            // Update state if available
            if (state) {
                state.openOrders = ordersData.results;
            }

            const finalResponse = `Current Open Orders:\n${formattedOrders.join("\n")}`;
            elizaLogger.info(`Current Open Orders:\n${formattedOrders.join("\n")}`);
            return finalResponse;
        } catch (error) {
            elizaLogger.error("Error in openOrdersProvider:", error);

            // Provide different error messages based on error type
            if (error instanceof Error) {
                if (error.message.includes("configuration")) {
                    return "Missing Paradex configuration. Please check your environment variables.";
                } else if (error.message.includes("JWT")) {
                    return "Authentication failed. Please check your credentials.";
                } else if (error.message.includes("fetch")) {
                    return "Failed to retrieve orders from Paradex. Please try again later.";
                }
            }

            // Generic error message as fallback
            return "Unable to fetch open orders. Please try again later.";
        }
    },
};
