import axios from "axios";

export class ElfaAiApi {
    private static baseUrl = "https://api.elfa.ai";
    private static apiKey = process.env.ELFA_API_KEY;

    private static headers = {
        "Content-Type": "application/json",
        "x-elfa-api-key": ElfaAiApi.apiKey,
    };

    static async ping() {
        const response = await axios.get(`${this.baseUrl}/v1/ping`);
        return response.data;
    }

    static async getApiKeyStatus() {
        const response = await axios.get(`${this.baseUrl}/v1/key-status`, {
            headers: this.headers,
        });
        return response.data;
    }

    static async getMentions(limit = 100, offset = 0) {
        const response = await axios.get(`${this.baseUrl}/v1/mentions`, {
            headers: this.headers,
            params: { limit, offset },
        });
        return response.data;
    }

    static async getTopMentions(
        ticker: string,
        timeWindow = "1h",
        page = 1,
        pageSize = 10,
        includeAccountDetails = false
    ) {
        const response = await axios.get(`${this.baseUrl}/v1/top-mentions`, {
            headers: this.headers,
            params: {
                ticker,
                timeWindow,
                page,
                pageSize,
                includeAccountDetails,
            },
        });
        return response.data;
    }

    static async searchMentionsByKeywords(
        keywords: string,
        from: number,
        to: number,
        limit = 20
    ) {
        const response = await axios.get(`${this.baseUrl}/v1/mentions/search`, {
            headers: this.headers,
            params: { keywords, from, to, limit },
        });
        return response.data;
    }

    static async getTrendingTokens() {
        const response = await axios.get(`${this.baseUrl}/v1/trending-tokens`, {
            headers: this.headers,
        });
        return response.data;
    }

    static async getSmartTwitterAccountStats(username: string) {
        const response = await axios.get(
            `${this.baseUrl}/v1/account/smart-stats`,
            {
                headers: this.headers,
                params: { username },
            }
        );
        return response.data;
    }
}
