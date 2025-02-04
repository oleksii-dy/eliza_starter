import { getAccount, getAssociatedTokenAddress } from "@solana/spl-token";
import { createSolanaRpc, type SolanaRpcApi, type Rpc } from "@solana/rpc";
import { address } from "@solana/addresses";
import { elizaLogger } from "@elizaos/core";
import { PublicKey } from '@solana/web3.js'

export async function getTokenPriceInSol(tokenSymbol: string): Promise<number> {
    const response = await fetch(
        `https://price.jup.ag/v6/price?ids=${tokenSymbol}`
    );
    const data = await response.json();
    return data.data[tokenSymbol].price;
}

async function getTokenBalance(
    rpc: Rpc<SolanaRpcApi>,
    walletAddress: string,
    tokenMintAddress: string
): Promise<number> {
    try {
        // Convert addresses to proper format
        const mintPubkey = new PublicKey(tokenMintAddress);
        const walletPubkey = new PublicKey(walletAddress);
        
        // Get the associated token account address
        const tokenAccountAddress = await getAssociatedTokenAddress(
            mintPubkey,
            walletPubkey
        );

        // Get the token account info
        const tokenAccount = await rpc.getTokenAccountBalance(
            tokenAccountAddress.toString() as any
        ).send();

        if (!tokenAccount.value) {
            return 0;
        }

        // Return the UI amount which is already adjusted for decimals
        return Number(tokenAccount.value.uiAmount || 0);
    } catch (error) {
        elizaLogger.error(
            `Error retrieving balance for token: ${tokenMintAddress}`,
            error
        );
        return 0;
    }
}

// Update the type definitions in getTokenBalances as well
async function getTokenBalances(
    rpc: Rpc<SolanaRpcApi>,
    walletAddress: string
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

function getTokenName(mintAddress: string): string {
    // Implement a mapping of mint addresses to token names
    const tokenNameMap: { [mintAddress: string]: string } = {
        EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v: "USDC",
        So11111111111111111111111111111111111111112: "SOL",
    };

    return tokenNameMap[mintAddress] || "Unknown Token";
}

export { getTokenBalance, getTokenBalances };
