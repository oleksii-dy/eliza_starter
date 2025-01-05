import { elizaLogger } from "@elizaos/core";
import { IBalance, IOrdinalUtxo, IRuneInfo, IRuneUtxo } from "../types";
import { sleep } from ".";

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
        return await fetcher(
            `${HIRO_BASE_URL}/runes/v1/etchings/${nonSpacedName}`
        );
    }

    async getRunesUtxos(
        address: string,
        runeName: string
    ): Promise<IRuneUtxo[]> {
        return await fetcher(
            `https://api-3.xverse.app/v1/market/address/${address}/rune/${runeName}/utxos`
        );
    }

    async getRareSats(
        address: string
    ): Promise<{ rareSats: IOrdinalUtxo[]; totalRareSats: number }> {
        let rareSats: IOrdinalUtxo[] = [];
        let hasAny = true;
        let run = 1;
        const batchSize = 50;
        let total = 0;
        do {
            const data = await fetcher(
                `https://api-3.xverse.app/v2/address/${address}/ordinal-utxo?limit=${batchSize}&offset=${(run * batchSize) - 1}&hideUnconfirmed=true&hideSpecialWithoutSatributes=true`
            );
            total = data?.total;
            if (data?.results?.length > 0) {
                rareSats = [...rareSats, ...(data?.results || [])];
            } else {
                hasAny = false;
            }
            run++;
            await sleep(500);
        } while (hasAny);
        return { rareSats, totalRareSats: total };
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
