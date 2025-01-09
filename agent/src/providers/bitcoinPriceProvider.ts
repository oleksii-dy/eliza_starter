import { Provider, IAgentRuntime, Memory, State } from "@elizaos/core";
import axios from 'axios'; // Note: You'll need to ensure axios is installed

const bitcoinPriceProvider: Provider = {
  get: async (runtime: IAgentRuntime, message: Memory, state?: State) => {
    try {
      // Fetch current BTC price from CoinGecko API
      const priceResponse = await axios.get('https://api.coingecko.com/api/v3/simple/price', {
        params: {
          ids: 'bitcoin',
          vs_currencies: 'usd',
          include_24h_change: true
        }
      });

      const btcPrice = priceResponse.data.bitcoin.usd;
      const btcChange24h = priceResponse.data.bitcoin.usd_24h_change;

      // Format the response
      return `Current Bitcoin Price:
- Price: $${btcPrice.toLocaleString()} USD`;

    } catch (error) {
    //   console.error("Bitcoin price provider error:", error);
      return "Unable to fetch Bitcoin price at the moment";
    }
  }
};

export { bitcoinPriceProvider };