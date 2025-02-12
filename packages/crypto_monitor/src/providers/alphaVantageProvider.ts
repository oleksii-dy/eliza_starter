import { Provider } from "@eliza/core";
import axios from "axios";

const alphaVantageProvider: Provider = {
    name: "alpha-vantage-provider",
    description: "Provides historical crypto market data from Alpha Vantage.",
    provide: async () => {
        const alphaVantageApiKey = process.env.ALPHA_VANTAGE_API_KEY;
        if (!alphaVantageApiKey) {
            return "Missing Alpha Vantage API Key.";
        }

        try {
            const response = await axios.get(`https://www.alphavantage.co/query?function=CURRENCY_EXCHANGE_RATE&from_currency=BTC&to_currency=USD&apikey=${alphaVantageApiKey}`);
            return `BTC/USD Exchange Rate: $${response.data["Realtime Currency Exchange Rate"]["5. Exchange Rate"]}`;
        } catch (error) {
            return "Error fetching Alpha Vantage data.";
        }
    }
};

export { alphaVantageProvider };
