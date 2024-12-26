# Privy Server Wallet Plugin for Eliza

A plugin for the Eliza framework that enables AI agents to interact with blockchain wallets using Privy's server wallet infrastructure. This plugin provides secure wallet management, transaction capabilities, and balance checking across multiple blockchain networks.

## Features

- Create and manage server wallets across multiple chains (Ethereum, EVM-compatible, Solana)
- Send transactions with idempotency guarantees
- Check wallet balances for native and token assets
- Track transaction history in agent memory for context awareness
- Configurable network settings (mainnet/testnet)
- Comprehensive transaction logging and retrieval

## Installation

```bash
# Using pnpm (recommended)
pnpm add @ai16z/plugin-privy-serverwallet

# Using npm
npm install @ai16z/plugin-privy-serverwallet

# Using yarn
yarn add @ai16z/plugin-privy-serverwallet
```

## Configuration

Set up the following environment variables:

```env
PRIVY_APP_ID=your_app_id_here
PRIVY_API_SECRET=your_api_secret_here
PRIVY_WALLET_ADDRESS=optional_default_wallet_address
```

You can obtain your App ID and API Secret from the [Privy Dashboard](https://dashboard.privy.io/).

## Usage

### Plugin Registration

```typescript
import { PrivyWalletPlugin } from '@ai16z/plugin-privy-serverwallet';

// Register the plugin with your Eliza instance
eliza.registerPlugin(PrivyWalletPlugin);
```

### Available Actions

#### 1. Create Wallet
```typescript
// Example: Create a new wallet
const result = await runtime.executeAction("CREATE_PRIVY_WALLET", {
  chain: "ethereum" // or "polygon", "solana", etc.
});
// Returns: { address: "0x..." }
```

#### 2. Send Transaction
```typescript
// Example: Send ETH to another address
const result = await runtime.executeAction("SEND_PRIVY_TRANSACTION", {
  to: "0x123...",
  value: "0.1", // in ETH
  chainId: 1 // Ethereum mainnet
});
// Returns: { hash: "0x...", status: "pending" }
```

#### 3. Get Balance
```typescript
// Example: Check wallet balance
const result = await runtime.executeAction("GET_PRIVY_BALANCE", {
  address: "0x..." // Optional, uses default if not provided
});
// Returns: { balance: "1.5", symbol: "ETH", tokens: [...] }
```

### Transaction Memory

The plugin automatically logs all transactions to the agent's memory for context awareness. Transaction logs include:

```typescript
// Example memory structure
{
  content: {
    text: "Transaction sent: 0.1 ETH from 0xABC... to 0xDEF...",
    action: "SEND_PRIVY_TRANSACTION",
    metadata: {
      transactionHash: "0x...",
      from: "0x...",
      to: "0x...",
      value: "0.1",
      symbol: "ETH",
      chainId: 1
    }
  }
}
```

To retrieve past transactions:

```typescript
import { getPastTransactions } from '@ai16z/plugin-privy-serverwallet';

const transactions = await getPastTransactions(runtime);
```

## Development

```bash
# Install dependencies
pnpm install

# Build the plugin
pnpm run build

# Run tests
pnpm test

# Lint code
pnpm lint
```

## Security Considerations

- Store API credentials securely using environment variables
- Never commit sensitive keys to version control
- Use Privy's policy engine to set transaction limits and controls
- Monitor wallet activity through Privy's dashboard

## License

MIT License - see LICENSE file for details
