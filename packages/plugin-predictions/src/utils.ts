import { SearchResponse, DexScreenerResponse, TokenPair, TokenCreationResponse } from "./types.ts";

const API_URL = "https://api.dexscreener.com";

/**
 * Cleans a string by removing dollar signs, spaces, and converting to lowercase
 * @example
 * cleanString("$Hello World$") // returns "helloworld"
 * cleanString("$100.00 USD") // returns "100.00usd"
 * cleanString("  MIXED case  $STRING$ ") // returns "mixedcasestring"
 */
export function cleanString(input: string): string {
    if (typeof input !== "string") {
        throw new Error("Input must be a string");
    }

    return input
        .replace(/\$/g, "")
        .replace(/\s+/g, "")
        .toLowerCase();
}

export function calculatePairScore(pair: TokenPair): number {
    let score = 0;

    // Age score (older is better) - 20 points max
    const ageInDays = (Date.now() - pair.pairCreatedAt) / (1000 * 60 * 60 * 24);
    score += (Math.min(ageInDays, 365) / 365) * 20;

    // Liquidity score - 25 points max
    const liquidityScore =
        (Math.min(pair.liquidity?.usd || 0, 1000000) / 1000000) * 25;
    score += liquidityScore;

    // Volume score (24h) - 25 points max
    const volumeScore =
        (Math.min(pair.volume?.h24 || 0, 1000000) / 1000000) * 25;
    score += volumeScore;

    // Transaction score (24h) - 30 points max
    const txCount = (pair.txns?.h24?.buys || 0) + (pair.txns?.h24?.sells || 0);
    const txScore = (Math.min(txCount, 1000) / 1000) * 30;
    score += txScore;

    return score;
}

export const searchCashTags = async (
    cashtag: string,
): Promise<SearchResponse> => {
    // Fetch data from DexScreener API
    const _cashtag = cleanString(cashtag);
    const apiUrl = `${API_URL}/latest/dex/search?q=${_cashtag}`;

    const response = await fetch(apiUrl, {
        method: "GET",
        headers: {
            Accept: "application/json",
        },
    });

    if (!response.ok) {
        throw new Error(`API request failed: ${response.status}`);
    }

    const data = (await response.json()) as DexScreenerResponse;
    if (!data.pairs || data.pairs.length === 0) {
        return {
            success: false,
            error: `No matching pairs found for ${_cashtag}`,
        };
    }

    // Filter pairs where baseToken symbol exactly matches the cashtag
    const matchingPairs = data.pairs.filter(
        pair => cleanString(pair.baseToken.symbol) === _cashtag
    );

    if (matchingPairs.length === 0) {
        return {
            success: false,
            error: `No exact symbol match found for ${_cashtag}`,
        };
    }

    // Sort pairs by score and return the highest scoring pair
    const sortedPairs = matchingPairs
        .map(pair => ({ pair, score: calculatePairScore(pair) }))
        .sort((a, b) => b.score - a.score);

    return {
        success: true,
        data: sortedPairs[0].pair,
    };
};

export async function fetchTokenCreation(tokenAddress: string, chain: string) {
    try {
        const baseUrl = "https://public-api.birdeye.so";
        const apiUrl = `${baseUrl}/defi/token_creation_info?address=${tokenAddress}`;

        const response = await fetch(apiUrl, {
            method: "GET",
            headers: {
                accept: "application/json",
                "X-API-KEY": process.env.BIRDEYE_API_KEY,
                "x-chain": chain,
            },
        });
        const data = await response.json() as TokenCreationResponse;

        return data.data.blockUnixTime;
    } catch (error) {
        console.error("Error in fetchTokenCreation:", error);
        return null;
    }
}