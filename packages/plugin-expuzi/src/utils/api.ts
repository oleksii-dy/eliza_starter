import { CoinGeckoClient } from 'coingecko-api';

const gecko = new CoinGeckoClient();

export async function fetchTokenData(symbol: string) {
  const response = await gecko.coins.fetch(symbol);
  
  return {
    price: response.market_data.current_price.usd,
    marketCap: response.market_data.market_cap.usd,
    totalSupply: response.market_data.total_supply,
    holders: response.market_data.total_holders,
    liquidityScore: response.liquidity_score
  };
}

export async function getSocialSentiment(symbol: string) {
  // Implement social sentiment analysis
  return Math.random() * 100 - 50; // Dummy implementation
}
