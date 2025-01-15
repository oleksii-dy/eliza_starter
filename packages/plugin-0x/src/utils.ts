import { MAINNET_TOKENS_BY_ADDRESS, MAINNET_TOKENS_BY_SYMBOL, POLYGON_TOKENS_BY_ADDRESS, POLYGON_TOKENS_BY_SYMBOL } from "./constants";

export const tokensByChain = (chainId: number) => {
    if (chainId === 137) {
        return POLYGON_TOKENS_BY_SYMBOL;
    }
    if (chainId === 1) {
        return MAINNET_TOKENS_BY_SYMBOL;
    }

    return MAINNET_TOKENS_BY_SYMBOL;
};


/**
 * Formats a token amount with its symbol
 * @param amount The amount in base units (e.g., wei)
 * @param address The token address
 * @param chainId The chain ID (defaults to 1 for Ethereum mainnet)
 * @returns Formatted string like "1.234567 USDC"
 */
export function formatTokenAmount(
    amount: string,
    address: string,
    chainId: number = 1
): string {
    if (!amount) {
        return "0";
    }

    let tokensByAddress;
    switch (chainId) {
        case 137:
            tokensByAddress = POLYGON_TOKENS_BY_ADDRESS;
            break;
        case 1:
        default:
            tokensByAddress = MAINNET_TOKENS_BY_ADDRESS;
            break;
    }

    // Get token info
    const tokenInfo = tokensByAddress[address];

    // Parse and format amount
    const parsedAmount = Number(amount) / Math.pow(10, tokenInfo.decimals);
    const symbol = tokenInfo.symbol;

    return `${parsedAmount.toFixed(4)} ${symbol}`;
}