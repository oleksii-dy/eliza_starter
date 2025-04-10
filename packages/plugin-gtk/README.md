# ElizaOS GTK Plugin

A plugin for ElizaOS that provides integration with the Sifchain GTK margin trading platform.

## Overview

This plugin provides a set of actions that allow ElizaOS to interact with the Sifchain GTK margin trading platform. With this plugin, you can place, close, and cancel orders, check interest rates, view trades, and get profit and loss information.

## Installation

```bash
npm install @elizaos/plugin-gtk
```

## Configuration

The plugin requires the following configuration parameters:

- `API_KEY`: API key for the GTK service
- `MNEMONIC`: Mnemonic for the Sifchain wallet
- `NETWORK`: Network to connect to (mainnet or testnet), defaults to "mainnet"

Example configuration in your ElizaOS agent:

```javascript
{
  "plugins": [
    {
      "name": "@elizaos/plugin-GTK",
      "config": {
        "API_KEY": "your-api-key",
        "MNEMONIC": "your-wallet-mnemonic",
        "NETWORK": "mainnet"
      }
    }
  ]
}
```

## Actions

The plugin provides the following actions:

### PLACE_ORDER

Places a new margin trading order.

**Parameters:**
- `tokenType`: The type of the collateral token (default: 'uusdc')
- `tokenAmount`: The amount of collateral (default: 0.01)
- `targetTokenType`: The type of the target token (default: 'btc')
- `tradeDirection`: The direction of the trade (LONG or SHORT, default: LONG)
- `leverage`: The leverage to use (default: 2)
- `stopLoss`: The stop loss price (optional)
- `takeProfit`: The take profit price (optional)
- `limitPrice`: The limit price (optional)

**Example usage:**
```
Place a long order for 0.01 BTC with 2x leverage
```

### CLOSE_ORDER

Closes an existing order.

**Parameters:**
- `tradeId`: The ID of the trade to close

**Example usage:**
```
Close my trade with ID 123
```

### CANCEL_ORDER

Cancels a pending order.

**Parameters:**
- `tradeId`: The ID of the trade to cancel

**Example usage:**
```
Cancel my pending trade with ID 456
```

### GET_INTEREST_RATE

Gets the current interest rate for a specific token.

**Parameters:**
- `targetTokenType`: The type of token to get the interest rate for (default: 'btc')

**Example usage:**
```
What is the current interest rate for BTC?
```

### GET_TRADES

Gets a list of trades based on type and status.

**Parameters:**
- `tradeDirection`: The direction of the trades to get (LONG or SHORT, optional)
- `status`: The status of the trades to get (PENDING, ACTIVE, COMPLETED, CANCELLED, optional)

**Example usage:**
```
Get all my active trades
```

### GET_TRADE

Gets details of a specific trade by ID.

**Parameters:**
- `tradeId`: The ID of the trade to get

**Example usage:**
```
Show me the details of trade ID 123
```

### GET_TOP_MATCH

Gets the top match amount for a given collateral type.

**Parameters:**
- `collateralType`: The type of collateral (default: 'uusdc')
- `collateralAmount`: The amount of collateral (default: 10)

**Example usage:**
```
Find the top match for 10 USDC
```

### GET_PNL

Gets profit and loss information.

**Parameters:**
- `pnlType`: The type of PnL to get (REALIZED, UNREALIZED, OVERALL, default: OVERALL)

**Example usage:**
```
What is my overall PnL?
```

## Publishing the Plugin

To publish this plugin to the ElizaOS registry:

```bash
npm run publish
```

## Development

To start the plugin in development mode:

```bash
npm run dev
```

To build the plugin:

```bash
npm run build
```

## Project Structure

The plugin is organized with the following structure:

```
src/
├── actions/       # Individual action implementations
│   ├── placeOrder.ts
│   ├── closeOrder.ts
│   ├── cancelOrder.ts
│   ├── getInterestRate.ts
│   ├── getTrades.ts
│   ├── getTrade.ts
│   ├── getTopMatch.ts
│   └── getPnl.ts
├── constants/     # Constants used throughout the plugin
├── service.ts     # GTK service implementation
├── types.ts       # Type definitions
└── index.ts       # Main plugin entry point
```

This modular structure makes it easier to maintain and extend the plugin with new functionality.

## License

MIT
