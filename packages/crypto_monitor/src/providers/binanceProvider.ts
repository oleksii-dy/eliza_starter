import { Provider } from "@eliza/core";
import axios from "axios";

const binanceProvider: Provider = {
    name: "binance-provider",
    description: "Provides real-time crypto price data from Binance.",
    provide: async () => {
        try {
            const response = await axios.get("https://api.binance.com/api/v3/ticker/price?symbol=BTCUSDT");
            return `BTC/USDT: $${response.data.price}`;
        } catch (error) {
            return "Error fetching Binance price data.";
        }
    }
};

export { binanceProvider };
