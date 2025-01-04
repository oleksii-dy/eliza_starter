import { elizaLogger } from "@elizaos/core";

const ORDISCAN_BASE_URL = "https://api.ordiscan.com/v1";
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
    ordiscanApiKey: string;

    constructor(ordiscanApiKey?: string) {
        this.ordiscanApiKey = ordiscanApiKey;
    }

    async getRunesPortfolio(address: string) {
        return fetcher(
            `${HIRO_BASE_URL}/runes/v1/addresses/${address}/balances?offset=0&limit=20`
        );
    }

    async getRuneInfo(name: string) {
        return fetcher(`${HIRO_BASE_URL}/runes/v1/etchings/${name}`);
    }

    async getRunesUtxos(address: string, runeName: string) {
        return fetcher(
            `https://api-3.xverse.app/v1/market/address/${address}/rune/${runeName}/utxos`
        );
    }

    async getRareSats(address: string){
        // return fetcher(
        //     `https://api-3.xverse.app/v1/market/address/${address}/rune/${runeName}/utxos`
        // );
    }
}

export default API;
