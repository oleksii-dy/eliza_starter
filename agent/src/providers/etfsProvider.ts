import { Provider, IAgentRuntime, Memory, State } from "@elizaos/core";
import axios from 'axios'; // Note: You'll need to ensure axios is installed

const etfsProvider: Provider = {
  get: async (runtime: IAgentRuntime, message: Memory, state?: State) => {
    try {
      // Fetch current BTC price from CoinGecko API
      const response = await axios.get('http://localhost:8080/scrap');

      console.log(response.data);
      /*
      [
      {
        Ticker: 'BTCO\nBTC',
        'ETF Name': 'Invesco Galaxy Bitcoin ETF',
        Price: '$98.57',
        'Price Change': '+5.65\n+6.08%',
        Volume: '$7.92M',
        'Volume %': '81.02K',
        'Market Cap': '$783.63M'
      },...,
    ]
      */
      return  `Current ETFs information,
      ${response.data.map((etf) => {
        return `- ${etf['ETF Name']}:
  - Price: ${etf.Price}
  - Price Change: ${etf['Price Change']}
  - Volume: ${etf.Volume}
  - Volume %: ${etf['Volume %']}
  - Market Cap: ${etf['Market Cap']}`;
      }
      ).join('\n')}`;


    } catch (error) {
      console.error("etfs provider error:", error);
      return "Unable to fetch etfs at the moment";
    }
  }
};

export { etfsProvider };