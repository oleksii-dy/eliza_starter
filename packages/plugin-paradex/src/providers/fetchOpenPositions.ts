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

interface Position {
    average_entry_price: string;
    average_entry_price_usd: string;
    average_exit_price: string;
    cached_funding_index: string;
    closed_at: number;
    cost: string;
    cost_usd: string;
    created_at: number;
    id: string;
    last_fill_id: string;
    last_updated_at: number;
    leverage: string;
    liquidation_price: string;
    market: string;
    realized_positional_funding_pnl: string;
    realized_positional_pnl: string;
    seq_no: number;
    side: string;
    size: string;
    status: string;
    unrealized_funding_pnl: string;
    unrealized_pnl: string;
}

interface PositionResponse {
    results: Position[];
}

function formatNumber(value: string, decimals: number = 2): string {
    try {
        const num = parseFloat(value);
        return isNaN(num) ? "N/A" : num.toFixed(decimals);
    } catch (error) {
        elizaLogger.error("Error formatting number:", error, "Value:", value);
        return "N/A";
    }
}

function calculateROE(unrealizedPnl: string, cost: string): string {
    try {
        const pnl = parseFloat(unrealizedPnl);
        const costValue = parseFloat(cost);

        if (isNaN(pnl) || isNaN(costValue) || costValue === 0) {
            return "N/A";
        }

        return ((pnl / Math.abs(costValue)) * 100).toFixed(2);
    } catch (error) {
        elizaLogger.error(
            "Error calculating ROE:",
            error,
            "PnL:",
            unrealizedPnl,
            "Cost:",
            cost,
        );
        return "N/A";
    }
}

async function fetchPositions(): Promise<PositionResponse> {
    elizaLogger.info("Starting fetchPositions...");

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

        const url = `${config.apiBaseUrl}/positions`;
        elizaLogger.info("Fetching positions from URL:", url);

        // Fetch positions
        const response = await fetch(url, {
            headers: {
                Authorization: `Bearer ${account.jwtToken}`,
                Accept: "application/json",
            },
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(
                `Failed to fetch positions: ${response.status} - ${errorText}`,
            );
        }

        const data = await response.json();
        elizaLogger.info("Successfully fetched positions data");
        return data;
    } catch (error) {
        elizaLogger.error("Error in fetchPositions:", error);
        throw error;
    }
}

function formatPosition(position: Position): string {
    try {
        const size = formatNumber(position.size, 4);
        const entryPrice = formatNumber(position.average_entry_price);
        const markPrice = formatNumber(position.average_exit_price);
        const unrealizedPnl = formatNumber(position.unrealized_pnl);
        const fundingPnl = formatNumber(position.unrealized_funding_pnl);
        const roe = calculateROE(position.unrealized_pnl, position.cost);
        const leverage = position.leverage || "1";
        const liqPrice = formatNumber(position.liquidation_price);

        return [
            `ID: ${position.id}`,
            `${position.market} | ${position.side} ${size}`,
            `Entry: ${entryPrice} | Mark: ${markPrice}`,
            `PnL: $${unrealizedPnl} (${roe}% ROE)`,
            `Funding PnL: $${fundingPnl}`,
            `Leverage: ${leverage}x | Liq. Price: ${liqPrice}`,
        ].join(" | ");
    } catch (error) {
        elizaLogger.error(
            "Error formatting position:",
            error,
            "Position data:",
            position,
        );
        return `Error formatting position ${position.id}`;
    }
}

export const openPositionsProvider: Provider = {
    get: async (
        runtime: IAgentRuntime,
        message: Memory,
        state?: BaseParadexState,
    ) => {
        elizaLogger.info("Starting openPositionsProvider.get...");

        if (!state) {
            state = (await runtime.composeState(message)) as BaseParadexState;
        }

        try {
            // Fetch positions data
            const positionsData = await fetchPositions();

            if (!positionsData.results || positionsData.results.length === 0) {
                elizaLogger.info("No open positions found");
                return "No open positions found.";
            }

            // Filter and format positions
            const formattedPositions = positionsData.results
                .filter((position) => position.status === "OPEN")
                .map(formatPosition);

            // Update state if available
            if (state) {
                state.positions = positionsData.results;
            }

            const finalResponse = `Current Open Positions:\n${formattedPositions.join("\n")}`;
            elizaLogger.info(`Current Open Positions:\n${formattedPositions.join("\n")}`);
            return finalResponse;
        } catch (error) {
            elizaLogger.error("Error in openPositionsProvider:", error);

            // Provide different error messages based on error type
            if (error instanceof Error) {
                if (error.message.includes("configuration")) {
                    return "Missing Paradex configuration. Please check your environment variables.";
                } else if (error.message.includes("JWT")) {
                    return "Authentication failed. Please check your credentials.";
                } else if (error.message.includes("fetch")) {
                    return "Failed to retrieve positions from Paradex. Please try again later.";
                }
            }

            // Generic error message as fallback
            return "Unable to fetch positions. Please try again later.";
        }
    },
};
