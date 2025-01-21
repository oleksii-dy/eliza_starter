import { IAgentRuntime } from "@elizaos/core";

// Transaction fee limits - these are safe to expose as they are network constants
export const SWAP_FEE_LIMIT = 100_000_000; // 100 TRX
export const WRAP_FEE_LIMIT = 1_000_000_000; // 1000 TRX

// Contract addresses and API endpoints must be configured via environment
export interface TronAddresses {
    WRAPPED_TRX_ADDRESS: string;
    SUNSWAPV2_ROUTER: string;
    SUNSWAPV2_FACTORY: string;
}

export interface TronEndpoints {
    SYMBIOSIS_API: string;
}

export const getContractAddresses = async (runtime: IAgentRuntime): Promise<TronAddresses> => {
    const config = await runtime.getValidatedConfig();
    return {
        WRAPPED_TRX_ADDRESS: config.TRON_WRAPPED_ADDRESS,
        SUNSWAPV2_ROUTER: config.TRON_SUNSWAP_ROUTER,
        SUNSWAPV2_FACTORY: config.TRON_SUNSWAP_FACTORY,
    };
};

export const getApiEndpoints = async (runtime: IAgentRuntime): Promise<TronEndpoints> => {
    const config = await runtime.getValidatedConfig();
    return {
        SYMBIOSIS_API: config.TRON_SYMBIOSIS_API,
    };
};
