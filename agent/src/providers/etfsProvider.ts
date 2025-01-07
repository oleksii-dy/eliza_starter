import { Provider, IAgentRuntime, Memory, State } from "@elizaos/core";
import axios from 'axios'; // Note: You'll need to ensure axios is installed
import { ScrapperResponse } from "../interfaces/scrapper";

const etfsProvider: Provider = {
  get: async (runtime: IAgentRuntime, message: Memory, state?: State) => {
    try {
      // Fetch current BTC price from CoinGecko API
      const response = await axios.get('https://etfscrapper-349714367197.us-central1.run.app/scrap');
      const data: ScrapperResponse = response.data

      return  `
        Only use this data when the user asks about it. This is the ETF overview:

        ${data.etfOverview.map(
        (data) => `Ticker: ${data.ticker}, ETF Name: ${data.etfName}, Volume: ${data.Volume}, Market Cap: ${data.marketCap}`
        ).join('\n')}

        This is the inflowsBTC data:

        ${data.inflowsBTC.map(
        (inflow) => `Date: ${inflow.time}, Total: ${inflow.Total}, Breakdown:
            GBTC: ${inflow.GBTC}, IBIT: ${inflow.IBIT}, FBTC: ${inflow.FBTC}, ARKB: ${inflow.ARKB}, BITB: ${inflow.BITB},
            BTCO: ${inflow.BTCO}, HODL: ${inflow.HODL}, BRRR: ${inflow.BRRR}, EZBC: ${inflow.EZBC}, BCTW: ${inflow.BCTW}, BTC: ${inflow.BTC}`
        ).join('\n')}
    `;


    } catch (error) {
      console.error("etfs provider error:", error);
      return "Unable to fetch etfs at the moment";
    }
  }
};

export { etfsProvider };