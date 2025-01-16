# Pyth Data Plugin Actions Debug Guide

## New Actions (Priority)

1. **Get Price Feeds**
   - File: `actionGetPriceFeeds.ts`
   - Action Name: `GET_PRICE_FEEDS`
   - Test Prompt: "Get all available price feeds from Pyth Network"

2. **Get Latest TWAPs**
   - File: `actionGetLatestTwaps.ts`
   - Action Name: `GET_LATEST_TWAPS`
   - Test Prompt: "Get latest TWAPs for BTC/USD with windows of 300 and 900 seconds"

3. **Get Latest Price Updates**
   - File: `actionGetLatestPriceUpdates.ts`
   - Action Name: `GET_LATEST_PRICE_UPDATES`
   - Test Prompt: "Get latest price updates for ETH/USD and BTC/USD"

4. **Get Price Updates Stream**
   - File: `actionGetPriceUpdatesStream.ts`
   - Action Name: `GET_PRICE_UPDATES_STREAM`
   - Test Prompt: "Start a price updates stream for BTC/USD and ETH/USD"

5. **Get Price Updates At Timestamp**
   - File: `actionGetPriceUpdatesAtTimestamp.ts`
   - Action Name: `GET_PRICE_UPDATES_AT_TIMESTAMP`
   - Test Prompt: "Get price updates for BTC/USD at timestamp 1641034800"

6. **Get Latest Publisher Caps**
   - File: `actionGetLatestPublisherCaps.ts`
   - Action Name: `GET_LATEST_PUBLISHER_CAPS`
   - Test Prompt: "Get the latest publisher caps from Pyth Network"

## Existing Actions (To Review Later)

### Price Feed Actions
1. **Get Latest Price**
   - File: `getLatestPrice.ts`
   - Action Name: `GET_LATEST_PRICE`
   - Test Prompt: "Get the latest price for BTC/USD"

2. **Get Multi Price**
   - File: `getMultiPrice.ts`
   - Action Name: `GET_MULTI_PRICE`
   - Test Prompt: "Get prices for BTC/USD and ETH/USD"

3. **Get Price History**
   - File: `getPriceHistory.ts`
   - Action Name: `GET_PRICE_HISTORY`
   - Test Prompt: "Get price history for BTC/USD for the last 24 hours"

4. **Get Price Feeds (Legacy)**
   - File: `getPriceFeeds.ts`
   - Action Name: `GET_PRICE_FEEDS`
   - Test Prompt: "List all available price feeds"

### Price Analysis Actions
5. **Get Price Aggregation**
   - File: `getPriceAggregation.ts`
   - Action Name: `GET_PRICE_AGGREGATION`
   - Test Prompt: "Get aggregated price data for BTC/USD"

6. **Get Price Pair Ratio**
   - File: `getPricePairRatio.ts`
   - Action Name: `GET_PRICE_PAIR_RATIO`
   - Test Prompt: "Calculate price ratio between BTC/USD and ETH/USD"

7. **Get Confidence Intervals**
   - File: `getConfidenceIntervals.ts`
   - Action Name: `GET_CONFIDENCE_INTERVALS`
   - Test Prompt: "Calculate confidence intervals for BTC/USD price"

### Subscription Actions
8. **Subscribe Price Updates**
   - File: `subscribePriceUpdates.ts`
   - Action Name: `SUBSCRIBE_PRICE_UPDATES`
   - Test Prompt: "Subscribe to price updates for BTC/USD"

9. **Batch Subscribe Prices**
   - File: `batchSubscribePrices.ts`
   - Action Name: `BATCH_SUBSCRIBE_PRICES`
   - Test Prompt: "Subscribe to multiple price feeds: BTC/USD, ETH/USD"

### Market Analysis Actions
10. **Get Market Hours**
    - File: `getMarketHours.ts`
    - Action Name: `GET_MARKET_HOURS`
    - Test Prompt: "Get market hours for crypto trading pairs"

11. **Monitor Price Deviation**
    - File: `monitorPriceDeviation.ts`
    - Action Name: `MONITOR_PRICE_DEVIATION`
    - Test Prompt: "Monitor BTC/USD for price deviations above 5%"

12. **Track Liquidity Metrics**
    - File: `trackLiquidityMetrics.ts`
    - Action Name: `TRACK_LIQUIDITY_METRICS`
    - Test Prompt: "Track liquidity metrics for BTC/USD market"

### Validation Actions
13. **Validate Price Feed**
    - File: `validatePriceFeed.ts`
    - Action Name: `VALIDATE_PRICE_FEED`
    - Test Prompt: "Validate the BTC/USD price feed"

### Network Actions
14. **Get Network Status**
    - File: `getNetworkStatus.ts`
    - Action Name: `GET_NETWORK_STATUS`
    - Test Prompt: "Check Pyth Network status"

### Opportunity & Bid Actions
15. **Create Opportunity**
    - File: `createOpportunity.ts`
    - Action Name: `CREATE_OPPORTUNITY`
    - Test Prompt: "Create a new trading opportunity for BTC/USD"

16. **List Opportunities**
    - File: `listOpportunities.ts`
    - Action Name: `LIST_OPPORTUNITIES`
    - Test Prompt: "List all available trading opportunities"

17. **Delete Opportunities**
    - File: `deleteOpportunities.ts`
    - Action Name: `DELETE_OPPORTUNITIES`
    - Test Prompt: "Delete expired trading opportunities"

18. **Create Bid**
    - File: `createBid.ts`
    - Action Name: `CREATE_BID`
    - Test Prompt: "Create a new bid for BTC/USD opportunity"

19. **Bid On Opportunity**
    - File: `bidOnOpportunity.ts`
    - Action Name: `BID_ON_OPPORTUNITY`
    - Test Prompt: "Place a bid on opportunity ID: xyz"

20. **Get Bid Status**
    - File: `getBidStatus.ts`
    - Action Name: `GET_BID_STATUS`
    - Test Prompt: "Check status of bid ID: xyz"

21. **List Chain Bids**
    - File: `listChainBids.ts`
    - Action Name: `LIST_CHAIN_BIDS`
    - Test Prompt: "List all bids on the chain"

22. **Submit Quote**
    - File: `submitQuote.ts`
    - Action Name: `SUBMIT_QUOTE`
    - Test Prompt: "Submit a quote for opportunity ID: xyz"

23. **Get Arbitrage Opportunities**
    - File: `getArbitrageOpportunities.ts`
    - Action Name: `GET_ARBITRAGE_OPPORTUNITIES`
    - Test Prompt: "Find arbitrage opportunities for BTC/USD across exchanges"

## Debug Process for Each Action

1. Uncomment only this action in index.ts
2. Run the test prompt
3. Check callback response
4. Verify data structure
5. Test error handling
6. Document any issues in action_fix.md
7. Make necessary fixes
8. Retest after fixes
9. Comment out other actions when moving to next one

## Common Issues to Watch For

- Network configuration errors
- Schema validation failures
- Type mismatches in callbacks
- Missing properties in responses
- Incorrect error handling
- WebSocket connection issues (for streaming)
- Timestamp format inconsistencies
- Missing or invalid price IDs

## Action Categories for Testing Priority
1. Core Price Data (New Actions)
2. Price Feed Operations
3. Price Analysis
4. Subscriptions
5. Market Analysis
6. Validation
7. Network Operations
8. Opportunity Management
9. Bidding Operations