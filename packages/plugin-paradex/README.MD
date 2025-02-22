# @elizaos/plugin-paradex

Core Paradex DEX plugin for Eliza OS that provides essential services and actions for trading on the Paradex decentralized exchange.

## Overview

The Paradex plugin enables seamless interaction with the Paradex decentralized exchange. It provides services for order management, market data access, position tracking, and automated trading strategies through natural language commands.

## Features

### Market Operations

-   **Market Data**: Real-time access to available markets and trading pairs
-   **Order Book**: Live order book monitoring and best bid/offer tracking
-   **Price Monitoring**: Real-time price feeds and market data
-   **Watchlist Management**: Customizable market watchlists

### Trading Operations

-   **Order Management**: Place and cancel orders easily
-   **Position Tracking**: Monitor open positions and account balances
-   **Order Types**: Support for market and limit orders
-   **Trade History**: Track and analyze past trades

### Account Management

-   **Balance Tracking**: Real-time account balance monitoring
-   **Position Management**: Track and manage open positions
-   **Authentication**: Secure JWT-based authentication
-   **Onboarding**: Streamlined account setup process

## Configuration

Configure the plugin by setting the following environment variables:

```typescript
const paradexEnvSchema = {
    PARADEX_NETWORK: "testnet" | "prod",
    PARADEX_ACCOUNT_ADDRESS: string,
    PARADEX_PRIVATE_KEY: string,
    ETHEREUM_ACCOUNT_ADDRESS: string,
};
```

## Usage

### Basic Setup

```typescript
import { paradexPlugin } from "@elizaos/plugin-paradex";

// Initialize the plugin
const runtime = await initializeRuntime({
    plugins: [paradexPlugin],
});
```

### Providers

#### BBO (Best Bid/Offer) Provider

Provides real-time best bid and offer data for watched markets.

```typescript
const bboData = await runtime.getProvider("bbo");
```

#### Market Data Provider

Access available markets and trading information.

```typescript
const marketData = await runtime.getProvider("marketData");
```

#### Balance Provider

Track account balances across different tokens.

```typescript
const balanceData = await runtime.getProvider("balanceParadex");
```

#### Open Orders Provider

Monitor and manage open orders.

```typescript
const openOrders = await runtime.getProvider("openOrders");
```

### Actions

#### Place Order

Execute trades with market or limit orders.

```typescript
// Example usage
const result = await runtime.executeAction("PARADEX_PLACE_ORDER", {
    action: "long",
    market: "BTC-USD-PERP",
    size: 0.1,
    price: 50000, // Optional for limit orders
});
```

#### Cancel Order

Cancel existing orders by ID.

```typescript
// Example usage
const result = await runtime.executeAction("CANCEL_PARADEX_ORDER", {
    orderId: "123456789",
});
```

#### Manage Watchlist

Add or remove markets from your watchlist.

```typescript
// Example usage
const result = await runtime.executeAction("MANAGE_WATCHLIST", {
    action: "add",
    markets: ["BTC-USD-PERP", "ETH-USD-PERP"],
});
```
