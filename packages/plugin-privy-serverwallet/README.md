# Privy Server Wallet Plugin for Eliza

A plugin for the Eliza framework that enables AI agents to interact with blockchain wallets using Privy's server wallet infrastructure. This plugin provides secure wallet management, transaction capabilities, and balance checking across multiple blockchain networks.

## Features

- Create and manage server wallets across multiple chains (Ethereum, EVM-compatible, Solana)
- Send transactions with idempotency guarantees and third-party gas payments
- Support for custom wallet metadata and tags
- Check wallet balances for native and token assets
- Track transaction history in agent memory for context awareness
- Configurable network settings (mainnet/testnet)
- Comprehensive transaction logging and retrieval with metadata support

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

You can obtain your App ID and API Secret from the [Privy Dashboard](https://dashboard.privy.io/). For detailed information about server wallets and their capabilities, refer to the [Privy Server Wallets Documentation](https://docs.privy.io/guide/server-wallets/).

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
// Example: Create a new wallet with metadata
const result = await runtime.executeAction("CREATE_PRIVY_WALLET", {
  chain: "ethereum", // or "polygon", "solana", etc.
  customId: "agent-trading-wallet",
  tags: ["defi", "trading"],
  description: "DeFi trading wallet for Agent X"
});
// Returns: { address: "0x..." }
```

#### 2. Send Transaction
```typescript
// Example: Send ETH with gas management and idempotency
const result = await runtime.executeAction("SEND_PRIVY_TRANSACTION", {
  to: "0x123...",
  value: "0.1", // in ETH
  chainId: "eip155:1", // Ethereum mainnet
  useThirdPartyGas: true, // Enable third-party gas payments
  gasPayedBy: "protocol", // Specify gas payer
  idempotency: {
    useGeneratedKey: true // Auto-generate idempotency key
  }
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
      chainId: "eip155:1",
      useThirdPartyGas: true,
      gasPayedBy: "protocol",
      idempotencyKey: "tx-123...",
      metadata: {
        purpose: "defi-trade",
        tags: ["swap", "uniswap"]
      }
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

## Related Projects

- [ElizaOS](https://github.com/elizaOS/eliza) - The core Eliza framework
- [Privy Documentation](https://docs.privy.io/) - Official Privy documentation
- [Privy Server Wallets Guide](https://docs.privy.io/guide/server-wallets/) - Detailed server wallet documentation

## Security Considerations

- Store API credentials securely using environment variables
- Never commit sensitive keys to version control
- Use Privy's policy engine to set transaction limits and controls
- Monitor wallet activity through Privy's dashboard

## License

MIT License - see LICENSE file for details
