import { Action, Context } from "@eliza/core";
import axios from "axios";

const getCryptoPrice: Action = {
    name: "get-crypto-price",
    description: "Fetches real-time cryptocurrency prices from Binance.",
    parameters: [
        {
            name: "symbol",
            type: "string",
            description: "Cryptocurrency symbol (e.g., BTCUSDT)"
        }
    ],
    execute: async (context: Context, params) => {
        const binanceApiKey = process.env.BINANCE_API_KEY;
        if (!binanceApiKey) {
            return "Missing Binance API Key.";
        }

        try {
            const response = await axios.get(`https://api.binance.com/api/v3/ticker/price?symbol=${params.symbol}`);
            return `Current price of ${params.symbol}: $${response.data.price}`;
        } catch (error) {
            return "Failed to fetch crypto price.";
        }
    }
};

export { getCryptoPrice };
