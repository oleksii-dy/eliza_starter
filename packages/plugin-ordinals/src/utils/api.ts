import { elizaLogger } from "@elizaos/core";
import { IBalance, IRuneInfo } from "../types";

const HIRO_BASE_URL = "https://api.hiro.so";

const fetcher = async (url: string, apiKey?: string) => {
    try {
        const response = await fetch(url, {
            headers: apiKey ? { Authorization: `Bearer ${apiKey}` } : {},
        });

        if (!response.ok) {
            const errorMessage = `Status: ${response.status} - ${response.statusText}`;
            throw new Error(errorMessage);
        }

        const data = await response.json();
        return data;
    } catch (error) {
        const errorMessage =
            error instanceof Error ? error.message : "Unknown error occurred";
        elizaLogger.error("Error in fetcher:", errorMessage);

        throw error;
    }
};

class API {
    async getRunesPortfolio(address: string): Promise<IBalance[]> {
        return await fetcher(
            `https://api-3.xverse.app/v2/address/${address}/rune-balance?includeUnconfirmed=true`
        );
    }

    async getRuneInfo(name: string): Promise<IRuneInfo> {
        const nonSpacedName = name?.replaceAll("•", "");
        return await fetcher(`${HIRO_BASE_URL}/runes/v1/etchings/${nonSpacedName}`);
    }

    async getRunesUtxos(address: string, runeName: string) {
        return fetcher(
            `https://api-3.xverse.app/v1/market/address/${address}/rune/${runeName}/utxos`
        );
    }

    async getRareSats(address: string) {
        // return fetcher(
        //     `https://api-3.xverse.app/v1/market/address/${address}/rune/${runeName}/utxos`
        // );
    }

    async getRunePrice(
        name: string
    ): Promise<IRuneInfo & { pricePerToken: number }> {
        const info = await this.getRuneInfo(name);
        const priceInfo = await fetcher(
            `https://api-3.xverse.app/v1/runes/fiat-rates?currency=USD&runeIds[]=${info?.id}`
        );

        const pricePerToken =
            priceInfo?.[
                `${info?.location?.block_height}:${info?.location?.tx_index}`
            ].USD;

        return { ...info, pricePerToken };
    }
}

export default API;
