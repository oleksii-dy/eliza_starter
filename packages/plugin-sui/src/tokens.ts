import { elizaLogger } from "@elizaos/core";
import { SuiClient } from "@mysten/sui/client";
import { SUI_DECIMALS } from "@mysten/sui/utils";

export interface TokenMetadata {
    id: string;
    symbol: string;
    decimals: number;
    tokenAddress: string;
}

export const tokens: Map<string, TokenMetadata> = new Map([
    [
        "SUI",
        {
            id: "0x9258181f5ceac8dbffb7030890243caed69a9599d2886d957a9cb7656af3bdb3",
            symbol: "SUI",
            decimals: SUI_DECIMALS,
            tokenAddress: "0x2::sui::SUI",
        },
    ],
    [
        "USDC",
        {
            id: "0x69b7a7c3c200439c1b5f3b19d7d495d5966d5f08de66c69276152f8db3992ec6",
            symbol: "USDC",
            decimals: 6,
            tokenAddress:
                "0xdba34672e30cb065b1f93e3ab55318768fd6fef66c15942c9f7cb846e2f900e7::usdc::USDC",
        },
    ],
    [
        "CETUS",
        {
            id: "0x4c0dce55eff2db5419bbd2d239d1aa22b4a400c01bbb648b058a9883989025da",
            symbol: "CETUS",
            decimals: 9,
            tokenAddress:
                "0x06864a6f921804860930db6ddbe2e16acdf8504495ea7481637a1c8b9a8fe54b::cetus::CETUS",
        },
    ],
]);

// Now, just support the tokens in the map.
// If the token is not in the map, we will use the rpc to get the token metadata. and add it to the map.
// It will support to swap or transfer any token.
export class TokensManager {
    private tokens: Map<string, TokenMetadata>;
    private suiClient: SuiClient;

    constructor(suiClient: SuiClient) {
        this.tokens = new Map(tokens);
        this.suiClient = suiClient;
    }

    async getTokenMetadata(symbol: string): Promise<TokenMetadata> {
        if (this.tokens.has(symbol.toUpperCase())) {
            return this.tokens.get(symbol.toUpperCase());
        }
        const token = await this.getTokenMetadataByRpc(symbol);
        elizaLogger.log("Token metadata:", token);
        // If this symbol is already in the map, just update the coin
        this.tokens.set(token.symbol.toUpperCase(), token);
        return token;
    }

    async getTokenMetadataByRpc(coinType: string): Promise<TokenMetadata> {
        const coinMetadata = await this.suiClient.getCoinMetadata({
            coinType,
        });
        return {
            id: coinMetadata.id,
            symbol: coinMetadata.symbol,
            decimals: coinMetadata.decimals,
            tokenAddress: coinType,
        };
    }
}

export const getAmount = (amount: string, meta: TokenMetadata) => {
    const v = parseFloat(amount);
    return BigInt(v * 10 ** meta.decimals);
};
