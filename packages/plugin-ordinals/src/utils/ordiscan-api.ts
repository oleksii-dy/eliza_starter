import { elizaLogger } from "@elizaos/core";

const BASE_URL = "https://api.ordiscan.com/v1";

const fetcher = async (url: string, apiKey: string) => {
    try {
        const response = await fetch(url, {
            headers: { Authorization: `Bearer ${apiKey}` },
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

class OrdiscanAPI {
    apiKey: string;
    constructor(apiKey: string) {
        this.apiKey = apiKey;
    }

    async getRunesPortfolio(address: string) {
        return fetcher(`${BASE_URL}/address/${address}/runes`, this.apiKey);
    }
}

export default OrdiscanAPI;
