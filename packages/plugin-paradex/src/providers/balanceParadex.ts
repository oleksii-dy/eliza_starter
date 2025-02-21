import {
    Provider,
    IAgentRuntime,
    Memory,
    State,
    elizaLogger,
} from "@elizaos/core";
import { Account, SystemConfig } from "../utils/paradex-ts/types";
import { authenticate } from "../utils/paradex-ts/api";
import { BaseParadexState, getAccount, getParadexConfig, ParadexAuthenticationError } from "../utils/paradexUtils";

interface ParadexState extends State {
    starknetAccount?: string;
    publicKey?: string;
    lastMessage?: string;
    jwtToken?: string;
    jwtExpiry?: number;
    accountBalance?: string;
    accountOrders?: any[];
}

interface BalanceResult {
    token: string;
    size: string;
    last_updated_at: number;
}

interface BalanceResponse {
    results: BalanceResult[];
}

async function fetchAccountBalance(
    config: SystemConfig,
    account: Account
): Promise<BalanceResponse> {
    if (!account.jwtToken) {
        console.error("No JWT token");
    }
    try {
        const balanceResponse = await fetch(`${config.apiBaseUrl}/balance`, {
            headers: {
                Authorization: `Bearer ${account.jwtToken}`,
                Accept: "application/json",
            },
        });
        return await balanceResponse.json();
    } catch (error) {
        console.error("Error fetching account balance:", error);
    }
}

export const paradexBalanceProvider: Provider = {
    get: async (
        runtime: IAgentRuntime,
        message: Memory,
        state?: ParadexState
    ) => {
        // Initializing the state
        if (!state) {
            state = {} as BaseParadexState;
        }

        const config = getParadexConfig();
        const account = await getAccount(runtime);

        try {
            account.jwtToken = await authenticate(config, account);
        } catch (error) {
            elizaLogger.error("Authentication failed:", error);
            throw new ParadexAuthenticationError(
                "Failed to authenticate with Paradex",
                error
            );
        }
        elizaLogger.success("Account retrieved and JWT token generated");

        try {
            const balance = await fetchAccountBalance(config, account);

            if (!balance.results || balance.results.length === 0) {
                return "No balance information available.";
            }

            const formattedBalances = balance.results
                .map((bal: BalanceResult) => {
                    const size = parseFloat(bal.size).toFixed(4);
                    return `${bal.token}: ${size}`;
                })
                .join("\n");

            elizaLogger.success(`Current Balances:\n${formattedBalances}`);
            return `Current Balances:\n${formattedBalances}`;
        } catch (error) {
            console.error("Balance fetch error:", error);
            return "Unable to fetch balance. Please try again later.";
        }
    },
};
