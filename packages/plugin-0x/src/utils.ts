import { formatUnits, Hash } from "viem";
import { EVMTokenRegistry } from "./EVMtokenRegistry";
import { IAgentRuntime } from "@elizaos/core";

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
    if (!amount) return "0";

    const tokenRegistry = EVMTokenRegistry.getInstance();
    const token = tokenRegistry.getTokenByAddress(address, chainId);

    if (!token) throw new Error(`Token not found for address: ${address}`);

    const parsedAmount = formatUnits(BigInt(amount), token.decimals);
    return `${Number(parsedAmount).toFixed(4)} ${token.symbol}`;
}

export const TOKENS = {
    ETH: {
        chainId: 8453,
        name: "Ethereum",
        symbol: "ETH",
        decimals: 18,
        address: "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE",
        type: "NATIVE",
        logoURI: "https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/base/info/logo.png"
    },
    USDC: {
        chainId: 8453,
        name: "USD coin",
        symbol: "USDC",
        decimals: 6,
        address: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
        type: "ERC20",
        logoURI: "https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/base/info/logo.png"
    },
    cbBTC: {
        chainId: 8453,
        name: "Coinbase Wrapped BTC",
        symbol: "cbBTC",
        decimals: 8,
        address: "0xcbB7C0000aB88B473b1f5aFd9ef808440eed33Bf",
        type: "ERC20",
        logoURI: "https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/base/info/logo.png"
    }
};

