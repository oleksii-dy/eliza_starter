# @elizaos/plugin-moralis

A plugin for interacting with Moralis APIs to fetch various blockchain data across different chains.

## Description

The Plugin Moralis provides interfaces to fetch real-time DeFi data including trading pairs, pair statistics, and price history. Currently supports Solana chain endpoints.

## Installation

```bash
pnpm install @elizaos/plugin-moralis
```

## Configuration

Set up your environment with the required Moralis API key:

| Variable Name     | Description          |
| ----------------- | -------------------- |
| `MORALIS_API_KEY` | Your Moralis API key |

## Usage

```typescript
import { moralisPlugin } from "@elizaos/plugin-moralis";

// Initialize the plugin
const plugin = moralisPlugin;
```

## Actions

### GET_SOLANA_TOKEN_PAIRS

Fetches all trading pairs for a specific token on Solana blockchain.

Examples:

- "Get all Solana trading pairs for token So11111111111111111111111111111111111111112"
- "Show me Solana pairs for USDC token EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v"

Response includes:

- Exchange information (name, address)
- Pair details (label, address)
- Price and volume data
- Liquidity information

### GET_SOLANA_PAIR_STATS

Fetches detailed statistics for a specific trading pair on Solana blockchain.

Examples:

- "Get stats for Solana pair A8nPhpCJqtqHdqUk35Uj9Hy2YsGXFkCZGuNwvkD3k7VC"
- "Show me details of Solana trading pair 83v8iPyZihDEjDdY8RdZddyZNyUtXngz69Lgo9Kt5d6d"

Response includes:

- Current price and liquidity
- Price changes over multiple timeframes
- Volume statistics
- Buy/Sell ratios
- Unique traders count

### GET_SOLANA_PAIR_OHLCV

Fetches price history (OHLCV) data for a specific trading pair on Solana blockchain.

Examples:

- "Get hourly candlestick prices for Solana pair A8nPhpCJqtqHdqUk35Uj9Hy2YsGXFkCZGuNwvkD3k7VC in the past 2 days"
- "Show me 15-minute price history for Solana pair 83v8iPyZihDEjDdY8RdZddyZNyUtXngz69Lgo9Kt5d6d"

Supports:

- Multiple timeframes (1h, 15m, etc.)
- Custom date ranges
- Price data in different currencies

## Usage Tips

1. Always specify "Solana" in requests to ensure correct chain selection
2. Use complete token/pair addresses for accurate results
3. For OHLCV data, specify timeframe and date range for precise results

## License

MIT
