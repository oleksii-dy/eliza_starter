// src/plugin-bluefin.ts
import { Plugin } from '@elizaos/core';
import { bluefinExtendedProvider } from './services/bluefinClient';
import * as actions from './actions/bluefinActions';

/**
 * BluefinPlugin aggregates all trade, rewards, affiliate, and Bluefin Spot API actions.
 */
export const BluefinPlugin: Plugin = {
  name: 'bluefin',
  description:
    'Bluefin Plugin for ElizaOS providing Trade API, Rewards API, Affiliate endpoints, and Bluefin Spot API endpoints via direct Exchange API calls.',
  providers: [bluefinExtendedProvider],
  actions: [
    // TRADE API - Public Endpoints
    actions.getFundingRateAction,
    actions.getRecentTradesAction,
    actions.getOrderbookAction,
    actions.getCandlestickDataAction,
    actions.getMasterInfoAction,
    actions.getMetaAction,
    actions.getMarketDataTradeAction,
    actions.getExchangeInfoTradeAction,

    // TRADE API - Private Endpoints
    actions.getUserFundingHistoryAction,
    actions.getUserTransferHistoryAction,
    actions.getUserPositionAction,
    actions.getAccountInfoAction,
    actions.getOrdersAction,
    actions.cancelOrderByHashAction,
    actions.placeOrderAction,
    actions.authorizeAction,
    actions.getUserTradesHistoryAction,

    // REWARDS API Endpoints
    actions.getUserRewardsSummaryAction,
    actions.getUserRewardsHistoryAction,
    actions.getCampaignDetailsAction,
    actions.getTotalHistoricalTradingRewardsAction,

    // AFFILIATE PROGRAM Endpoints
    actions.getAffiliatePayoutsAction,
    actions.getCampaignRewardsAction,

    // BLUEFIN SPOT API Endpoints (Using Bluefin Exchange API)
    actions.getSpotExchangeInfoAction,
    actions.getSpotPoolLineTicksAction,
    actions.getSpotPoolStatsLineAction,
    actions.getSpotPoolTransactionsAction,
    actions.getSpotPoolsInfoAction,
    actions.getSpotTokensPriceAction,
    actions.getSpotTokensInfoAction
  ]
};

export default BluefinPlugin;
