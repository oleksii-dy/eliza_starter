// src/actions/bluefinActions.ts

import { Action, IAgentRuntime, Memory } from '@elizaos/core';
import bluefinExchange from '@api/bluefin-exchange';
import { bluefinExtendedProvider } from '../services/bluefinClient';
import { MARKET_SYMBOLS, Interval, ORDER_STATUS } from '@bluefin-exchange/bluefin-v2-client';

/* ============================
   TRADE API - Public Endpoints
=============================== */

// GET /fundingRate
export const getFundingRateAction: Action = {
  name: 'GET_FUNDING_RATE',
  description: 'Retrieve the current funding rate',
  similes: [],
  examples: [],
  validate: async (runtime: IAgentRuntime, message: Memory): Promise<boolean> => {
    // Add your validation logic here
    return true;
  },
  async handler(runtime: IAgentRuntime, message: Memory): Promise<boolean> {
    await bluefinExtendedProvider.initPromise;
    try {
      const { symbol } = message.content;
      const result = await bluefinExtendedProvider.client.getMarketFundingRate(symbol as MARKET_SYMBOLS);
      console.log(`Funding Rate: ${JSON.stringify(result)}`);
      return true;
    } catch (error) {
      console.error('Error in GET_FUNDING_RATE action:', error);
      throw error;
    }
  }
};

// GET /recentTrades
export const getRecentTradesAction: Action = {
  name: 'GET_RECENT_TRADES',
  description: 'Retrieve recent trades for a specified symbol',
  similes: [],
  examples: [],
  validate: async () => true,
  async handler(runtime: IAgentRuntime, message: Memory): Promise<boolean> {
    await bluefinExtendedProvider.initPromise;
    try {
      const { symbol } = message.content;
      if (!symbol) throw new Error('Parameter "symbol" is missing.');
      const result = await bluefinExtendedProvider.client.getMarketRecentTrades({ symbol: symbol as MARKET_SYMBOLS });
      console.log(`Recent Trades for ${symbol}: ${JSON.stringify(result)}`);
      return true;
    } catch (error) {
      console.error('Error in GET_RECENT_TRADES action:', error);
      throw error;
    }
  }
};

// GET /orderbook
export const getOrderbookAction: Action = {
  name: 'GET_ORDERBOOK',
  description: 'Retrieve the orderbook for a specified symbol',
  similes: [],
  examples: [],
  validate: async () => true,
  async handler(runtime: IAgentRuntime, message: Memory): Promise<boolean> {
    await bluefinExtendedProvider.initPromise;
    try {
      const { symbol } = message.content;
      if (!symbol) throw new Error('Parameter "symbol" is missing.');
      const result = await bluefinExtendedProvider.client.getOrderbook({ symbol: symbol as MARKET_SYMBOLS, limit: 100 });
      console.log(`Orderbook for ${symbol}: ${JSON.stringify(result)}`);
      return true;
    } catch (error) {
      console.error('Error in GET_ORDERBOOK action:', error);
      throw error;
    }
  }
};

// GET /candlestickData
export const getCandlestickDataAction: Action = {
  name: 'GET_CANDLESTICK_DATA',
  description: 'Retrieve candlestick data for a specified symbol',
  similes: [],
  examples: [],
  validate: async () => true,
  async handler(runtime: IAgentRuntime, message: Memory): Promise<boolean> {
    await bluefinExtendedProvider.initPromise;
    try {
      const { symbol, interval } = message.content;
      if (!symbol) throw new Error('Parameter "symbol" is missing.');
      const result = await bluefinExtendedProvider.client.getMarketCandleStickData({ symbol: symbol as MARKET_SYMBOLS, interval: interval as Interval });
      console.log(`Candlestick Data for ${symbol}: ${JSON.stringify(result)}`);
      return true;
    } catch (error) {
      console.error('Error in GET_CANDLESTICK_DATA action:', error);
      throw error;
    }
  }
};

// GET /masterInfo
export const getMasterInfoAction: Action = {
  name: 'GET_MASTER_INFO',
  description: 'Retrieve master information from the Trade API',
  similes: [],
  examples: [],
  validate: async () => true,
  async handler(runtime: IAgentRuntime, message: Memory): Promise<boolean> {
    await bluefinExtendedProvider.initPromise;
    try {
      const result = await bluefinExtendedProvider.client.getMasterInfo();
      console.log(`Master Info: ${JSON.stringify(result)}`);
      return true;
    } catch (error) {
      console.error('Error in GET_MASTER_INFO action:', error);
      throw error;
    }
  }
};

// GET /meta
export const getMetaAction: Action = {
  name: 'GET_META',
  description: 'Retrieve meta information from the Trade API',
  similes: [],
  examples: [],
  validate: async () => true,
  async handler(runtime: IAgentRuntime, message: Memory): Promise<boolean> {
    await bluefinExtendedProvider.initPromise;
    try {
      const result = await bluefinExtendedProvider.client.getMarketMetaInfo();
      console.log(`Meta Info: ${JSON.stringify(result)}`);
      return true;
    } catch (error) {
      console.error('Error in GET_META action:', error);
      throw error;
    }
  }
};

// GET /marketData
export const getMarketDataTradeAction: Action = {
  name: 'GET_MARKET_DATA_TRADE',
  description: 'Retrieve market data from the Trade API',
  similes: [],
  examples: [],
  validate: async () => true,
  async handler(runtime: IAgentRuntime, message: Memory): Promise<boolean> {
    await bluefinExtendedProvider.initPromise;
    try {
      const { symbol } = message.content;
      if (!symbol) throw new Error('Parameter "symbol" is missing.');
      const result = await bluefinExtendedProvider.client.getMarketData(symbol as string);
      console.log(`Market Data for ${symbol}: ${JSON.stringify(result)}`);
      return true;
    } catch (error) {
      console.error('Error in GET_MARKET_DATA_TRADE action:', error);
      throw error;
    }
  }
};

// GET /exchangeInfo (Trade API)
export const getExchangeInfoTradeAction: Action = {
  name: 'GET_EXCHANGE_INFO_TRADE',
  description: 'Retrieve exchange information from the Trade API',
  similes: [],
  examples: [],
  validate: async () => true,
  async handler(runtime: IAgentRuntime, message: Memory): Promise<boolean> {
    await bluefinExtendedProvider.initPromise;
    try {
      const result = await bluefinExtendedProvider.client.getExchangeInfo();
      console.log(`Exchange Info (Trade): ${JSON.stringify(result)}`);
      return true;
    } catch (error) {
      console.error('Error in GET_EXCHANGE_INFO_TRADE action:', error);
      throw error;
    }
  }
};

/* ============================
   TRADE API - Private Endpoints
=============================== */

// GET /userFundingHistory
export const getUserFundingHistoryAction: Action = {
  name: 'GET_USER_FUNDING_HISTORY',
  description: 'Retrieve user funding history from the Trade API',
  similes: [],
  examples: [],
  validate: async () => true,
  async handler(runtime: IAgentRuntime, message: Memory): Promise<boolean> {
    await bluefinExtendedProvider.initPromise;
    try {

      const { symbol } = message.content;
      const result = await bluefinExtendedProvider.client.getUserFundingHistory({ symbol: symbol as MARKET_SYMBOLS });
      console.log(`User Funding History: ${JSON.stringify(result)}`);
      return true;
    } catch (error) {
      console.error('Error in GET_USER_FUNDING_HISTORY action:', error);
      throw error;
    }
  }
};

// GET /userTransferHistory
export const getUserTransferHistoryAction: Action = {
  name: 'GET_USER_TRANSFER_HISTORY',
  description: 'Retrieve user transfer history from the Trade API',
  similes: [],
  examples: [],
  validate: async () => true,
  async handler(runtime: IAgentRuntime, message: Memory): Promise<boolean> {
    await bluefinExtendedProvider.initPromise;
    try {
      const result = await bluefinExtendedProvider.client.getUserTransferHistory({});
      console.log(`User Transfer History: ${JSON.stringify(result)}`);
      return true;
    } catch (error) {
      console.error('Error in GET_USER_TRANSFER_HISTORY action:', error);
      throw error;
    }
  }
};

// GET /userPosition
export const getUserPositionAction: Action = {
  name: 'GET_USER_POSITION',
  description: 'Retrieve user position from the Trade API',
  similes: [],
  examples: [],
  validate: async () => true,
  async handler(runtime: IAgentRuntime, message: Memory): Promise<boolean> {
    await bluefinExtendedProvider.initPromise;
    try {
      const { symbol } = message.content;
      const result = await bluefinExtendedProvider.client.getUserPosition({ symbol: symbol as MARKET_SYMBOLS });
      console.log(`User Position: ${JSON.stringify(result)}`);
      return true;
    } catch (error) {
      console.error('Error in GET_USER_POSITION action:', error);
      throw error;
    }
  }
};

// GET /account
export const getAccountInfoAction: Action = {
  name: 'GET_ACCOUNT_INFO',
  description: 'Retrieve account information from the Trade API',
  similes: [],
  examples: [],
  validate: async () => true,
  async handler(runtime: IAgentRuntime, message: Memory): Promise<boolean> {
    await bluefinExtendedProvider.initPromise;
    try {
      const result = await bluefinExtendedProvider.client.getUserAccountData();
      console.log(`Account Info: ${JSON.stringify(result)}`);
      return true;
    } catch (error) {
      console.error('Error in GET_ACCOUNT_INFO action:', error);
      throw error;
    }
  }
};

// GET /orders
export const getOrdersAction: Action = {
  name: 'GET_ORDERS',
  description: 'Retrieve orders from the Trade API',
  similes: [],
  examples: [],
  validate: async () => true,
  async handler(runtime: IAgentRuntime, message: Memory): Promise<boolean> {
    await bluefinExtendedProvider.initPromise;
    try {
      const result = await bluefinExtendedProvider.client.getUserOrders({statuses: [ORDER_STATUS.OPEN, ORDER_STATUS.PARTIAL_FILLED]});
      console.log(`Orders: ${JSON.stringify(result)}`);
      return true;
    } catch (error) {
      console.error('Error in GET_ORDERS action:', error);
      throw error;
    }
  }
};

// DELETE /orders/hash
export const cancelOrderByHashAction: Action = {
  name: 'CANCEL_ORDER_BY_HASH',
  description: 'Cancel an order using its hash via the Trade API',
  similes: [],
  examples: [],
  validate: async () => true,
  async handler(runtime: IAgentRuntime, message: Memory): Promise<boolean> {
    await bluefinExtendedProvider.initPromise;
    try {
      const { symbol } = message.content;
      if (!symbol) throw new Error('Parameter "symbol" is required.');
      const result = await bluefinExtendedProvider.client.cancelAllOpenOrders(symbol as string);
      console.log(`Order cancelled: ${JSON.stringify(result)}`);
      return true;
    } catch (error) {
      console.error('Error in CANCEL_ORDER_BY_HASH action:', error);
      throw error;
    }
  }
};

// POST /orders
export const placeOrderAction: Action = {
  name: 'PLACE_ORDER',
  description: 'Place a new order via the Trade API',
  similes: [],
  examples: [],
  validate: async () => true,
  async handler(runtime: IAgentRuntime, message: Memory): Promise<boolean> {
    try {
      const { symbol, price, quantity, side, orderType, leverage, triggerPrice } = message.content;
      if (!symbol || price === undefined || !quantity || !side || !orderType || !leverage) {
        throw new Error('Parameters "symbol", "price", "quantity", "side", "orderType", and "leverage" are required.');
      }
      const orderParams: any = {
        symbol,
        price: Number(price),
        quantity: Number(quantity),
        side,
        orderType,
        leverage: Number(leverage)
      };
      if (triggerPrice !== undefined) {
        orderParams.triggerPrice = Number(triggerPrice);
      }
      const result = await bluefinExtendedProvider.client.postOrder(orderParams);
      console.log(`Order placed: ${JSON.stringify(result.data)}`);
      return true;
    } catch (error) {
      console.error('Error in PLACE_ORDER action:', error);
      throw error;
    }
  }
}
// POST /authorize
export const authorizeAction: Action = {
  name: 'AUTHORIZE',
  description: 'Authorize the trading account via the Trade API',
  similes: [],
  examples: [],
  validate: async () => true,
  async handler(runtime: IAgentRuntime, message: Memory): Promise<boolean> {
    await bluefinExtendedProvider.initPromise;
    try {
      const result = await bluefinExtendedProvider.client.userOnBoarding();
      console.log(`Authorization successful: ${JSON.stringify(result)}`);
      return true;
    } catch (error) {
      console.error('Error in AUTHORIZE action:', error);
      throw error;
    }
  }
};

// GET /userTradesHistory
export const getUserTradesHistoryAction: Action = {
  name: 'GET_USER_TRADES_HISTORY',
  description: 'Retrieve user trades history from the Trade API',
  similes: [],
  examples: [],
  validate: async () => true,
  async handler(runtime: IAgentRuntime, message: Memory): Promise<boolean> {
    await bluefinExtendedProvider.initPromise;
    try {
      const { symbol } = message.content;
      if (!symbol) throw new Error('Parameter "symbol" is missing.');
      const result = await bluefinExtendedProvider.client.getUserTradesHistory({ symbol: symbol as MARKET_SYMBOLS });
      console.log(`User Trades History: ${JSON.stringify(result)}`);
      return true;
    } catch (error) {
      console.error('Error in GET_USER_TRADES_HISTORY action:', error);
      throw error;
    }
  }
};

/* ============================
   REWARDS API Endpoints
=============================== */

// GET /userRewards/summary
export const getUserRewardsSummaryAction: Action = {
  name: 'GET_USER_REWARDS_SUMMARY',
  description: 'Retrieve user rewards summary from the Rewards API',
  similes: [],
  examples: [],
  validate: async () => true,
  async handler(runtime: IAgentRuntime, message: Memory): Promise<boolean> {
    await bluefinExtendedProvider.initPromise;
    try {
      const result = await bluefinExtendedProvider.client.getUserRewardsSummary();
      console.log(`User Rewards Summary: ${JSON.stringify(result)}`);
      return true;
    } catch (error) {
      console.error('Error in GET_USER_REWARDS_SUMMARY action:', error);
      throw error;
    }
  }
};

// GET /userRewards/history
export const getUserRewardsHistoryAction: Action = {
  name: 'GET_USER_REWARDS_HISTORY',
  description: 'Retrieve user rewards history from the Rewards API',
  similes: [],
  examples: [],
  validate: async () => true,
  async handler(runtime: IAgentRuntime, message: Memory): Promise<boolean> {
    await bluefinExtendedProvider.initPromise;
    try {
      const result = await bluefinExtendedProvider.client.getUserRewardsHistory();
      console.log(`User Rewards History: ${JSON.stringify(result)}`);
      return true;
    } catch (error) {
      console.error('Error in GET_USER_REWARDS_HISTORY action:', error);
      throw error;
    }
  }
};

// GET /campaignDetails
export const getCampaignDetailsAction: Action = {
  name: 'GET_CAMPAIGN_DETAILS',
  description: 'Retrieve campaign details from the Rewards API',
  similes: [],
  examples: [],
  validate: async () => true,
  async handler(runtime: IAgentRuntime, message: Memory): Promise<boolean> {
    await bluefinExtendedProvider.initPromise;
    try {
      const result = await bluefinExtendedProvider.client.getCampaignDetails();
      console.log(`Campaign Details: ${JSON.stringify(result)}`);
      return true;
    } catch (error) {
      console.error('Error in GET_CAMPAIGN_DETAILS action:', error);
      throw error;
    }
  }
};

// GET /tradeAndEarn/totalHistoricalTradingRewards
export const getTotalHistoricalTradingRewardsAction: Action = {
  name: 'GET_TOTAL_HISTORICAL_TRADING_REWARDS',
  description: 'Retrieve total historical trading rewards from the Trade & Earn API',
  similes: [],
  examples: [],
  validate: async () => true,
  async handler(runtime: IAgentRuntime, message: Memory): Promise<boolean> {
    await bluefinExtendedProvider.initPromise;
    try {
      const result = await bluefinExtendedProvider.client.getTotalHistoricalTradingRewards();
      console.log(`Total Historical Trading Rewards: ${JSON.stringify(result)}`);
      return true;
    } catch (error) {
      console.error('Error in GET_TOTAL_HISTORICAL_TRADING_REWARDS action:', error);
      throw error;
    }
  }
};

/* ============================
   AFFILIATE PROGRAM Endpoints
=============================== */
// GET /affiliate/payouts
export const getAffiliatePayoutsAction: Action = {
  name: 'GET_AFFILIATE_PAYOUTS',
  description: 'Retrieve affiliate payouts from the Affiliate Program API',
  similes: [],
  examples: [],
  validate: async () => true,
  async handler(runtime: IAgentRuntime, message: Memory): Promise<boolean> {
    await bluefinExtendedProvider.initPromise;
    try {
      const { campaignId } = message.content;
      if (!campaignId) throw new Error('Parameter "campaignId" is required.');
      const result = await bluefinExtendedProvider.client.getAffiliatePayouts(Number(campaignId));
      console.log(`Affiliate Payouts: ${JSON.stringify(result)}`);
      return true;
    } catch (error) {
      console.error('Error in GET_AFFILIATE_PAYOUTS action:', error);
      throw error;
    }
  }
};

// GET /campaignRewards
export const getCampaignRewardsAction: Action = {
  name: 'GET_CAMPAIGN_REWARDS',
  description: 'Retrieve campaign rewards from the Affiliate Program API',
  similes: [],
  examples: [],
  validate: async () => true,
  async handler(runtime: IAgentRuntime, message: Memory): Promise<boolean> {
    await bluefinExtendedProvider.initPromise;
    try {
      const { campaignId } = message.content;
      if (!campaignId) throw new Error('Parameter "campaignId" is required.');
      const result = await bluefinExtendedProvider.client.getCampaignRewards(Number(campaignId));
      console.log(`Campaign Rewards: ${JSON.stringify(result)}`);
      return true;
    } catch (error) {
      console.error('Error in GET_CAMPAIGN_REWARDS action:', error);
      throw error;
    }
  }
};

/* ============================
   BLUEFIN SPOT API Endpoints (Using Bluefin Exchange API)
=============================== */

// GET /info
export const getSpotExchangeInfoAction: Action = {
  name: 'GET_SPOT_EXCHANGE_INFO',
  description: 'Retrieve exchange info from Bluefin Spot API (/info)',
  similes: [],
  examples: [],
  validate: async () => true,
  async handler(runtime: IAgentRuntime, message: Memory): Promise<boolean> {
    try {

      bluefinExchange.getExchangeInfo()
  .then(({ data }) => console.log(data))
  .catch(err => console.error(err))
      return true;
    } catch (error) {
      console.error('Error in GET_SPOT_EXCHANGE_INFO action:', error);
      throw error;
    }
  }
};

// GET /pool/line/ticks
export const getSpotPoolLineTicksAction: Action = {
  name: 'GET_POOL_LINE_TICKS_SPOT',
  description: 'Retrieve pool line ticks from Bluefin Spot API (/pool/line/ticks)',
  similes: [],
  examples: [],
  validate: async () => true,
  async handler(runtime: IAgentRuntime, message: Memory): Promise<boolean> {
    try {
      const poolId: string = message.content.pool as string;
      if (!poolId) throw new Error('Parameter "pool" is required.');
      const { data } = await bluefinExchange.getPoolTicks({ pool: poolId });
      console.log(`Pool Line Ticks for ${poolId}: ${JSON.stringify(data)}`);
      return true;
    } catch (error) {
      console.error('Error in GET_POOL_LINE_TICKS_SPOT action:', error);
      throw error;
    }
  }
};

// GET /pool/stats/line
export const getSpotPoolStatsLineAction: Action = {
  name: 'GET_POOL_STATS_LINE_SPOT',
  description: 'Retrieve pool stats line data from Bluefin Spot API (/pool/stats/line)',
  similes: [],
  examples: [],
  validate: async () => true,
  async handler(runtime: IAgentRuntime, message: Memory): Promise<boolean> {
    try {
      const poolId: string = message.content.pool as string;
      if (!poolId) throw new Error('Parameter "poolId" is required.');
      const { data } = await bluefinExchange.getPoolLine({ pool: poolId, interval: '1d' });
      console.log(`Pool Stats Line for ${poolId}: ${JSON.stringify(data)}`);
      return true;
    } catch (error) {
      console.error('Error in GET_POOL_STATS_LINE_SPOT action:', error);
      throw error;
    }
  }
};

// GET /pool/transactions
export const getSpotPoolTransactionsAction: Action = {
  name: 'GET_POOL_TRANSACTIONS_SPOT',
  description: 'Retrieve pool transactions from Bluefin Spot API (/pool/transactions)',
  similes: [],
  examples: [],
  validate: async () => true,
  async handler(runtime: IAgentRuntime, message: Memory): Promise<boolean> {
    try {
      const poolId: string = message.content.pool as string;
      if (!poolId) throw new Error('Parameter "poolId" is required.');
      const { data } = await bluefinExchange.getPoolTransactions({ pool: poolId, type: 'Swap' });
      console.log(`Pool Transactions for ${poolId}: ${JSON.stringify(data)}`);
      return true;
    } catch (error) {
      console.error('Error in GET_POOL_TRANSACTIONS_SPOT action:', error);
      throw error;
    }
  }
};

// GET /pools/info
export const getSpotPoolsInfoAction: Action = {
  name: 'GET_POOLS_INFO_SPOT',
  description: 'Retrieve pools info from Bluefin Spot API (/pools/info)',
  similes: [],
  examples: [],
  validate: async () => true,
  async handler(runtime: IAgentRuntime, message: Memory): Promise<boolean> {
    try {
      const { data } = await bluefinExchange.getPoolsInfo();
      console.log(`Pools Info: ${JSON.stringify(data)}`);
      return true;
    } catch (error) {
      console.error('Error in GET_POOLS_INFO_SPOT action:', error);
      throw error;
    }
  }
};

// GET /tokens/price
export const getSpotTokensPriceAction: Action = {
  name: 'GET_TOKENS_PRICE_SPOT',
  description: 'Retrieve tokens pricing from Bluefin Spot API (/tokens/price)',
  similes: [],
  examples: [],
  validate: async () => true,
  async handler(runtime: IAgentRuntime, message: Memory): Promise<boolean> {
    try {
      const { symbol } = message.content;
      if (!symbol) throw new Error('Parameter "symbol" is missing.');
      const metadata = { tokens: symbol as string }; // Ensure 'symbol' is a string
      const { data } = await bluefinExchange.getTokensPrice(metadata);
      console.log(`Tokens Price: ${JSON.stringify(data)}`);
      return true;
    } catch (error) {
      console.error('Error in GET_TOKENS_PRICE_SPOT action:', error);
      throw error;
    }
  }
};

// GET /tokens/info
export const getSpotTokensInfoAction: Action = {
  name: 'GET_TOKENS_INFO_SPOT',
  description: 'Retrieve tokens information from Bluefin Spot API (/tokens/info)',
  similes: [],
  examples: [],
  validate: async () => true,
  async handler(runtime: IAgentRuntime, message: Memory): Promise<boolean> {
    try {
      const { data } = await bluefinExchange.getTokensInfo();
      console.log(`Tokens Info: ${JSON.stringify(data)}`);
      return true;
    } catch (error) {
      console.error('Error in GET_TOKENS_INFO_SPOT action:', error);
      throw error;
    }
  }
};
