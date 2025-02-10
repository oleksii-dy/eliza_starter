
# Bluefin ElizaOS Plugin

[![Build Status](https://img.shields.io/badge/build-passing-brightgreen)](https://github.com/KiwiProtocol/bluefin-plugin-eliza)
[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)

The **Bluefin ElizaOS Plugin** is a production-grade plugin for ElizaOS that integrates Bluefin’s trading infrastructure with the ElizaOS agent framework. This plugin exposes a complete set of endpoints from the Bluefin Spot API, Trade API, Rewards API, and Affiliate endpoints, allowing commercial customers to manually execute trades, manage their Sui wallet, and analyze real-time market data via popular client interfaces like Twitter and Telegram.

---

## Overview

The Bluefin ElizaOS Plugin provides a comprehensive solution for traders and institutions by wrapping both the Bluefin TypeScript client SDK (for private endpoints) and direct calls to the Bluefin Exchange API (for Spot API endpoints). Key functionalities include:

- **Spot API Endpoints:**  
  Retrieve exchange info, liquidity pool data, and tokens information.
  
- **Trade API Endpoints:**  
  Execute operations such as deposits, withdrawals, order placements, order cancellations, account data retrieval, and more.
  
- **Rewards & Affiliate Endpoints:**  
  Access campaign details, rewards history, and affiliate payout data.
  
- **Real-Time Data:**  
  Obtain live market data, candlestick charts, order books, and recent trades for informed decision-making.

---

## Installation

Install the plugin via npm or yarn:

```bash
npm install @KiwiProtocol/bluefin-plugin-eliza
# or
yarn add @KiwiProtocol/bluefin-plugin-eliza
```

Ensure that you have the required dependencies installed (see the [Dependencies](#dependencies) section).

---

## Configuration

### Environment Variables

Create a `.env` file in the root directory of your project with the following variables:

```ini
BLUEFIN_API_KEY=your_bluefin_api_key
BLUEFIN_NETWORK=TESTNET_SUI
# Provide either a seed phrase or a private key:
# BLUEFIN_SEED_PHRASE=royal reopen journey royal enlist vote core cluster shield slush hill sample
BLUEFIN_PRIVATE_KEY=your_private_key

SUI_NODE_URL=https://fullnode.mainnet.sui.io
SUI_PRIVATE_KEY=your_sui_private_key
SUI_WALLET_ADDRESS=your_sui_wallet_address

AGENT_TOKEN=your_agent_jwt_token
SERVER_URL=http://your.server.url
```

### Character Configuration

Create a character JSON file (e.g., `./character/bluefinTrader.json`) with your agent settings:

```json
{
  "name": "BluefinTrader",
  "description": "A commercial trading agent for Bluefin integrated with ElizaOS.",
  "clients": ["twitter", "telegram"],
  "modelProvider": "openai",
  "settings": {
    "secrets": {
      "BLUEFIN_API_KEY": "your_bluefin_api_key",
      "SUI_PRIVATE_KEY": "your_sui_private_key",
      "TWITTER_API_TOKEN": "your_twitter_api_token",
      "TELEGRAM_BOT_TOKEN": "your_telegram_bot_token"
    },
    "sui": {
      "nodeUrl": "https://fullnode.mainnet.sui.io",
      "walletAddress": "your_sui_wallet_address"
    },
    "trading": {
      "defaultSymbol": "ETH",
      "defaultOrderType": "LIMIT",
      "defaultLeverage": 3
    }
  }
}
```

### ElizaOS Configuration

Ensure your `elizaConfig.yaml` (or similar configuration file) includes the plugin:

```yaml
plugins:
  - name: bluefin
    enabled: true
```

---

## Usage

Integrate the Bluefin plugin into your ElizaOS agent. For example, your `src/index.ts` file might look like this:

```typescript
// src/index.ts
import { AgentRuntime, ModelProviderName } from '@elizaos/core';
import BluefinPlugin from './plugin-bluefin';
import { ProductionDatabaseAdapter } from './databaseAdapter';
import { ProductionCacheManager } from './cacheManager';

// Create production-level instances of your database adapter and cache manager.
const databaseAdapter = new ProductionDatabaseAdapter();
const cacheManager = new ProductionCacheManager();

// Create a new AgentRuntime instance with required options.
const runtime = new AgentRuntime({
  token: process.env.AGENT_TOKEN || 'dummy_token',
  modelProvider: 'openai' as ModelProviderName,
  databaseAdapter,
  cacheManager,
  conversationLength: 10,
  serverUrl: process.env.SERVER_URL || 'http://localhost:3000',
  character: require('./character/bluefinTrader.json'),
  plugins: [BluefinPlugin]
});

// Run the agent.
runtime.run()
  .then(() => console.log('Agent is running with Bluefin Plugin'))
  .catch(err => console.error('Error running agent:', err));
```

---

## Features

- **Comprehensive API Coverage:**  
  - **Spot API Endpoints:** Get exchange info, pool data, and tokens data via direct Exchange API calls.
  - **Trade API Endpoints:** Deposit/withdraw funds, place and cancel orders, and retrieve account, trade, and position data.
  - **Rewards API Endpoints:** Access campaign details, user rewards history, and summary data.
  - **Affiliate Endpoints:** Retrieve affiliate-related information.
  
- **Real-Time Market Data:**  
  Live updates for order books, candlestick charts, and recent trades.

- **Seamless Integration:**  
  Works with Twitter and Telegram clients for manual trade execution and wallet management.

- **Production-Grade Error Handling:**  
  Robust error logging using console logging and proper asynchronous initialization.

---

## API Reference

### Actions

#### Trade API - Public Endpoints
- **GET_FUNDING_RATE:** Retrieves the current funding rate.
- **GET_RECENT_TRADES:** Retrieves recent trades for a specified symbol.
- **GET_ORDERBOOK:** Retrieves the orderbook for a specified symbol.
- **GET_CANDLESTICK_DATA:** Retrieves candlestick data for a specified symbol.
- **GET_MASTER_INFO:** Retrieves master information.
- **GET_META:** Retrieves meta information.
- **GET_MARKET_DATA_TRADE:** Retrieves market data.
- **GET_EXCHANGE_INFO_TRADE:** Retrieves exchange information (Trade API).

#### Trade API - Private Endpoints
- **GET_USER_FUNDING_HISTORY:** Retrieves user funding history.
- **GET_USER_TRANSFER_HISTORY:** Retrieves user transfer history.
- **GET_USER_POSITION:** Retrieves the user's position.
- **GET_ACCOUNT_INFO:** Retrieves account information.
- **GET_ORDERS:** Retrieves current orders.
- **CANCEL_ORDER_BY_HASH:** Cancels an order by hash.
- **PLACE_ORDER:** Places a new order.
- **AUTHORIZE:** Authorizes the trading account.
- **GET_USER_TRADES_HISTORY:** Retrieves the user's trade history.

#### Rewards API Endpoints
- **GET_USER_REWARDS_SUMMARY:** Retrieves a summary of user rewards.
- **GET_USER_REWARDS_HISTORY:** Retrieves user rewards history.
- **GET_CAMPAIGN_DETAILS:** Retrieves campaign details.
- **GET_TOTAL_HISTORICAL_TRADING_REWARDS:** Retrieves total historical trading rewards.
- **GET_REWARDS_DETAIL:** Retrieves detailed rewards information.
- **GET_REWARDS_OVERVIEW:** Retrieves rewards overview.

#### Affiliate Program Endpoints
- **GET_AFFILIATE_PAYOUTS:** Retrieves affiliate payouts.
- **GET_CAMPAIGN_REWARDS:** Retrieves campaign rewards.

#### Bluefin Spot API Endpoints (Using Bluefin Exchange API)
- **GET_SPOT_EXCHANGE_INFO:** Retrieves exchange info (/info).
- **GET_POOL_LINE_TICKS_SPOT:** Retrieves pool line ticks (/pool/line/ticks).
- **GET_POOL_STATS_LINE_SPOT:** Retrieves pool stats line (/pool/stats/line).
- **GET_POOL_TRANSACTIONS_SPOT:** Retrieves pool transactions (/pool/transactions).
- **GET_POOLS_INFO_SPOT:** Retrieves pools info (/pools/info).
- **GET_TOKENS_PRICE_SPOT:** Retrieves tokens pricing (/tokens/price).
- **GET_TOKENS_INFO_SPOT:** Retrieves tokens info (/tokens/info).

### Providers

- **BluefinExtendedProvider:**  
  Initializes the Bluefin client using a seed phrase or private key and exposes methods for:
  - **Trade API Endpoints:** deposit/withdraw funds, order management, account data, etc.
  - **Rewards API Endpoints:** campaign details, user rewards, etc.
  - **Spot API Endpoints:** Calls to Bluefin Exchange API for exchange, pools, and tokens data.

---

## Development

### Setup

1. **Clone the Repository:**

   ```bash
   git clone https://github.com/KiwiProtocol/bluefin-plugin-eliza.git
   cd bluefin-plugin-eliza
   ```

2. **Install Dependencies:**

   ```bash
   npm install
   # or
   yarn install
   ```

3. **Build the Plugin:**

   ```bash
   npm run build
   ```

4. **Run Tests:**

   ```bash
   npm test
   ```

### Code Structure

- **src/index.ts:** Entry point that creates and runs the AgentRuntime.
- **src/plugin-bluefin.ts:** Defines and exports the Bluefin plugin, aggregating all providers and actions.
- **src/services/bluefinClient.ts:** Contains the Bluefin client initialization logic.
- **src/actions/bluefinActions.ts:** Contains all API actions.
- **src/databaseAdapter.ts:** Production-level database adapter.
- **src/cacheManager.ts:** Production-level cache manager.
- **src/character/bluefinTrader.json:** Sample character configuration.
- **tests/plugin.test.ts:** Basic tests for the plugin.

---

## Dependencies

- **@bluefin-exchange/bluefin-v2-client:** Bluefin SDK for private endpoints.
- **@api/bluefin-exchange:** Module for direct calls to the Bluefin Exchange API for Spot endpoints.
- **@elizaos/core:** Core framework for ElizaOS.
- Additional dependencies as specified in `package.json`.

---

## Future Enhancements

- **Advanced Order Management:**  
  Additional order types, improved tracking, and signature verification.
- **Sub-Account & Read-Only Token Management:**  
  More granular account controls.
- **Extended DeFi Features:**  
  Yield farming, liquidity pool management, flash loans.
- **Enhanced Analytics:**  
  Improved reporting and visualization tools.
- **Improved Security:**  
  Enhanced rate limiting, transaction validation, and audit logging.
- **Developer Tools:**  
  Expanded tests, debugging utilities, and documentation generators.

---

## Credits

Developed as part of the ElizaOS ecosystem by the [ElizaOS Community](https://github.com/KiwiProtocol/bluefin-plugin-eliza). Special thanks to:
- The Bluefin team and maintainers of the Bluefin TypeScript SDK and Bluefin Exchange API.
- Contributors to the ElizaOS framework.
- Open-source communities that made this integration possible.

---

Feel free to open an issue or submit a pull request with suggestions or improvements!
```

