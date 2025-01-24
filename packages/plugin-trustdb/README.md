# @elizaos/plugin-trustdb

A plugin for managing trust scores and performance metrics in a secure database, providing recommender tracking and token performance analysis capabilities.

## Overview

This plugin provides functionality to:

- Track and manage recommender trust scores
- Monitor token performance metrics
- Record and analyze trading performance
- Maintain historical metrics data
- Handle transaction records and validations

## Installation

```bash
npm install @elizaos/plugin-trustdb
```

## Configuration

The plugin supports both PostgreSQL and SQLite as database backends:

```typescript
import { initTrustDatabase } from "@elizaos/plugin-trustdb";

// PostgreSQL
const trustDB = await initTrustDatabase({
    dbConfig: "postgres://connection-string"
});

// SQLite
const trustDB = await initTrustDatabase({
    db: sqliteDb
});
```

## Usage

### Managing Recommenders

```typescript
// Add a recommender
const recommender = {
    id: "uuid",
    address: "wallet-address",
    telegramId: "telegram-id"
};
await trustDB.addRecommender(recommender);

// Get recommender by ID
const existingRecommender = await trustDB.getRecommender(id);

// Get or create recommender
const recommenderWithMetrics = await trustDB.getOrCreateRecommender({
    address: "wallet-address",
    telegramId: "user-id"
});
```

### Trust Metrics

```typescript
// Update recommender metrics
await trustDB.updateRecommenderMetrics({
    recommenderId: "uuid",
    trustScore: 85.5,
    totalRecommendations: 10,
    successfulRecs: 5,
    avgTokenPerformance: 12.3,
    riskScore: 45.2,
    consistencyScore: 78.9,
    virtualConfidence: 65.4,
    trustDecay: 0.1
});

// Get metrics history
const history = await trustDB.getRecommenderMetricsHistory(recommenderId);
```

### Token Performance

```typescript
// Add/update token performance
await trustDB.upsertTokenPerformance({
    tokenAddress: "address",
    symbol: "TOKEN",
    priceChange24h: 5.2,
    volumeChange24h: 15.3,
    liquidity: 100000,
    holderChange24h: 2.1
});

// Get token performance
const performance = await trustDB.getTokenPerformance("token-address");
```

### Trade Performance

```typescript
// Record trade
await trustDB.addTradePerformance({
    token_address: "address",
    recommender_id: "uuid",
    buy_price: 1.0,
    buy_timeStamp: new Date().toISOString(),
    buy_amount: 100,
    buy_value_usd: 100,
    buy_market_cap: 1000000,
    buy_liquidity: 500000
}, false);

// Update trade with sell details
await trustDB.updateTradePerformanceOnSell(
    "token-address",
    "recommender-id",
    "buy-timestamp",
    {
        sell_price: 1.2,
        sell_timeStamp: new Date().toISOString(),
        sell_amount: 100,
        received_sol: 120,
        sell_value_usd: 120,
        profit_usd: 20,
        profit_percent: 20,
        sell_market_cap: 1100000,
        market_cap_change: 100000,
        sell_liquidity: 550000,
        liquidity_change: 50000,
        rapidDump: false
    },
    false
);
```

## Core Interfaces

### Recommender

```typescript
interface Recommender {
    id: string;
    address: string;
    solanaPubkey?: string;
    telegramId?: string;
    discordId?: string;
    twitterId?: string;
    ip?: string;
}
```

### RecommenderMetrics

```typescript
interface RecommenderMetrics {
    recommenderId: string;
    trustScore: number;
    totalRecommendations: number;
    successfulRecs: number;
    avgTokenPerformance: number;
    riskScore: number;
    consistencyScore: number;
    virtualConfidence: number;
    lastActiveDate: Date;
    trustDecay: number;
    lastUpdated: Date;
}
```

### TokenPerformance

```typescript
interface TokenPerformance {
    tokenAddress: string;
    symbol: string;
    priceChange24h: number;
    volumeChange24h: number;
    trade_24h_change: number;
    liquidity: number;
    liquidityChange24h: number;
    holderChange24h: number;
    rugPull: boolean;
    isScam: boolean;
    marketCapChange24h: number;
    sustainedGrowth: boolean;
    rapidDump: boolean;
    suspiciousVolume: boolean;
    validationTrust: number;
    balance: number;
    initialMarketCap: number;
    lastUpdated: Date;
}
```

### TradePerformance

```typescript
interface TradePerformance {
    token_address: string;
    recommender_id: string;
    buy_price: number;
    sell_price: number;
    buy_timeStamp: string;
    sell_timeStamp: string;
    buy_amount: number;
    sell_amount: number;
    buy_sol: number;
    received_sol: number;
    buy_value_usd: number;
    sell_value_usd: number;
    profit_usd: number;
    profit_percent: number;
    buy_market_cap: number;
    sell_market_cap: number;
    market_cap_change: number;
    buy_liquidity: number;
    sell_liquidity: number;
    liquidity_change: number;
    last_updated: string;
    rapidDump: boolean;
}
```

## Development

```bash
npm run build   # Build the plugin
npm run dev     # Development mode with watch
npm run test    # Run tests (requires PostgreSQL connection)
npm run lint    # Lint code
```

## Dependencies

- `better-sqlite3`: SQLite database interface
- `uuid`: Unique identifier generation
- `dompurify`: HTML sanitization
- Other standard dependencies listed in package.json

## Security Measures

- Input validation on all parameters
- Transaction handling with rollbacks
- Secure database connections
- Regular backup procedures recommended

## License

Part of the Eliza project. See main repository for license information.
