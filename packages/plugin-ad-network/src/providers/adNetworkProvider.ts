import { Provider, IAgentRuntime, Memory, State } from "@elizaos/core";
import {
    AdNetworkConfig,
    AdNetworkProviderResponse,
    TokenDetails,
} from "../types/types.ts";

let providerConfig: AdNetworkConfig;

export const adNetworkProvider: Provider = {
    get: async (
        runtime: IAgentRuntime,
        message: Memory,
        state?: State
    ): Promise<AdNetworkProviderResponse> => {
        try {
            if (!providerConfig?.provider?.apiKey) {
                throw new Error("AdNetwork API key is required");
            }

            const baseUrl =
                providerConfig.provider.baseUrl ||
                "https://api.monitize.ai/ad-network/token-details";

            // Construct API request
            const url = `${baseUrl}`;
            const headers = {
                "x-api-key": providerConfig.provider.apiKey,
            };

            // Fetch token details from the API
            const response = await fetch(url, { headers });
            if (!response.ok) {
                throw new Error(`API request failed: ${response.statusText}`);
            }

            const data = await response.json();

            // Transform API response to TokenDetails
            const tokenDetails: TokenDetails = {
                token: data.token,
                chain: data.chain,
                context: data.context,
            };

            return {
                success: true,
                data: tokenDetails,
            };
        } catch (error) {
            return {
                success: false,
                error:
                    error instanceof Error
                        ? error.message
                        : "Failed to fetch token details",
            };
        }
    },
};

export const initializeAdNetworkProvider = (config: AdNetworkConfig): void => {
    providerConfig = config;
};
