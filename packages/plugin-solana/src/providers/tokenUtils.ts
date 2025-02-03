import { getAccount, getAssociatedTokenAddress } from "@solana/spl-token";
import { createSolanaRpc } from '@solana/rpc';
import { Rpc, SolanaRpcApi, Address, address } from '@solana/web3.js';
import { elizaLogger } from "@elizaos/core";

export async function getTokenPriceInSol(tokenSymbol: string): Promise<number> {
    const response = await fetch(
        `https://price.jup.ag/v6/price?ids=${tokenSymbol}`
    );
    const data = await response.json();
    return data.data[tokenSymbol].price;
}

async function getTokenBalance(
    rpc: Rpc<SolanaRpcApi>,
    walletAddress: Address,
    tokenMintAddress: Address
): Promise<number> {
    const tokenAccountAddress = await getAssociatedTokenAddress(
        tokenMintAddress,
        walletAddress
    );

    try {
        const tokenAccount = await getAccount(rpc, tokenAccountAddress);
        const decimals = tokenAccount.mint.decimals;
        const rawAmount = Number(tokenAccount.amount);
        const tokenAmount = rawAmount / Math.pow(10, decimals);
        return tokenAmount;
    } catch (error) {
        elizaLogger.error(
            `Error retrieving balance for token: ${tokenMintAddress}`,
            error
        );
        return 0;
    }
}

async function getTokenBalances(
    rpc: Rpc<SolanaRpcApi>,
    walletAddress: Address
): Promise<{ [tokenName: string]: number }> {
    const tokenBalances: { [tokenName: string]: number } = {};

    // Add the token mint addresses you want to retrieve balances for
    const tokenMintAddresses = [
        address("EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v"), // USDC
        address("So11111111111111111111111111111111111111112"), // SOL
    ];

    for (const mintAddress of tokenMintAddresses) {
        const tokenName = getTokenName(mintAddress);
        const balance = await getTokenBalance(rpc, walletAddress, mintAddress);
        tokenBalances[tokenName] = balance;
    }

    return tokenBalances;
}

function getTokenName(mintAddress: Address): string {
    // Implement a mapping of mint addresses to token names
    const tokenNameMap: { [mintAddress: string]: string } = {
        EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v: "USDC",
        So11111111111111111111111111111111111111112: "SOL",
    };

    return tokenNameMap[mintAddress] || "Unknown Token";
}

export { getTokenBalance, getTokenBalances };
