export interface CoinGeckoResponse {
  content: {
    prices: {
      [key: string]: {
        usd: number;
        usd_market_cap: number;
        usd_24h_vol: number;
        usd_24h_change: number;
      }
    }
  }
}