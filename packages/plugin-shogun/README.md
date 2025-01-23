# @elizaos/plugin-shogun

A comprehensive DeFi integration plugin for the Eliza Agent Stack, powered by Shogun Network's cross-chain DEX aggregator and Lit Protocol's Programmable Key Pairs (PKPs). This plugin enables autonomous agents to perform secure token swaps and obtain quotes across multiple chains through a unified interface.

## Overview

The Shogun plugin provides:
- Cross-chain token swaps using Lit Protocol PKPs
- Real-time price quotes
- Multi-DEX aggregation
- Automated slippage protection
- Gas optimization
- Secure transaction signing

## Features

- **Token Swaps with Lit Protocol**
  - Secure cross-chain swaps using PKP wallets
  - Automated capacity credit management
  - Session-based authentication
  - Threshold cryptography for transaction signing
  - Automated PKP lifecycle management

- **Price Quotes**
  - Real-time price discovery
  - Best route calculation
  - Fee estimation
  - Gas cost estimation
  - Multi-DEX aggregation

- **Supported Tokens**
  - ETH
  - USDC
  - WETH
  - LBTC
  - cbBTC
  - And many more ERC20 tokens

- **Supported Networks**
  - Ethereum
  - Base
  - Arbitrum
  - BSC
  - Polygon zkEVM
  - Linea
  - Scroll
  - And more...

## Installation
```bash
npm install @elizaos/plugin-shogun
```

## Configuration

Required environment variables:
```env
# Shogun Configuration
EVM_RPC_URL=           # RPC endpoint for blockchain interactions
API_KEY=              # Shogun API key
BASE_URL=             # Shogun API base URL

# Lit Protocol Configuration
FUNDING_PRIVATE_KEY=   # Private key for funding operations
LIT_PKP_PUBLIC_KEY=    # (Optional) Existing PKP public key
```

## Important: Wallet Funding

Before executing any swaps, you must fund the generated Lit wallet address with the necessary assets. The plugin will create a new PKP wallet address if one isn't provided, and this address will need to hold sufficient funds to:
1. Cover the amount being swapped
2. Pay for transaction fees (gas fees) on both source and destination chains
3. Cover any bridge fees for cross-chain swaps

You can view your PKP wallet address after initializing the plugin using the Lit Protocol configuration file (`lit-config.json`).

## Adding New Networks

To add support for additional networks, follow the pattern in `network.ts`. For each new network, you'll need to:

1. Add the RPC URL to your environment variables
2. Create a provider and signer pair using ethers.js

Example:
```typescript
// In your .env file
NEW_NETWORK_URL=https://your-network-rpc-url

// In network.ts
export const newNetworkProvider = ethers.getDefaultProvider(process.env.NEW_NETWORK_URL!);
export const newNetworkSigner = new ethers.Wallet(process.env.EVM_PRIVATE_KEY!).connect(newNetworkProvider);
```

Currently supported networks:
- Base
- Arbitrum

## Usage

### Basic Setup
```typescript
import { shogunPlugin } from '@elizaos/plugin-shogun';
import { litPlugin } from '@elizaos/plugin-lit';

// Register both plugins
runtime.registerPlugin(litPlugin);  // Register Lit first for PKP initialization
runtime.registerPlugin(shogunPlugin);
```

### Getting a Quote
```typescript
// Get quote for token swap
await runtime.executeAction('QUOTE_SWAP', {
  text: "Quote 1 ETH for USDC"
});
```

### Executing a Swap
```typescript
// Execute token swap using PKP wallet
await runtime.executeAction('EVM_EXECUTE_SWAP', {
  text: "Swap 1 ETH for USDC"
});
```

### Cross-Chain Swaps
```typescript
// Execute cross-chain swap with PKP
await runtime.executeAction('EVM_EXECUTE_SWAP', {
  text: "Swap 1 ETH on Base for USDC on Arbitrum"
});
```

## Security

The plugin implements multiple security layers:
- Lit Protocol PKP for secure transaction signing
- Capacity credit management
- Session-based authentication
- Slippage protection
- Gas price checks
- Token validation
- Address validation
- Transaction simulation

## Architecture

The plugin consists of several key components:

- **Actions**
  - `evmQuote`: Price quote functionality
  - `evmSwap`: Token swap execution with PKP signing
  - Additional cross-chain actions

- **Lit Protocol Integration**
  - PKP wallet creation and management
  - Capacity credit allocation
  - Session signature handling
  - Secure transaction signing

- **SDK Integration**
  - Direct integration with Shogun SDK
  - Optimized routing algorithms
  - Real-time price feeds
  - Gas estimation

## PKP Configuration

The plugin automatically manages PKP creation and configuration through the Lit Protocol integration:

```typescript
interface LitState {
  nodeClient: LitNodeClient;
  evmWallet?: ethers.Wallet;
  pkp?: {
    publicKey: string;
    ethAddress: string;
  };
  capacityCredit?: {
    tokenId: string;
  };
}
```

## Token Support

The plugin includes built-in support for common tokens:
```typescript
const TOKEN_ADDRESSES = {
    "ETH": "0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee",
    "USDC": "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
    "WETH": "0x4200000000000000000000000000000000000006",
    "LBTC": "0x8236a87084f8b84306f72007f36f2618a5634494",
    "cbBTC": "0xcbB7C0000aB88B473b1f5aFd9ef808440eed33Bf"
};
```

## Error Handling

The plugin provides comprehensive error handling for:
- PKP initialization failures
- Invalid token addresses
- Insufficient balances
- Network issues
- Failed transactions
- API errors
- Capacity credit issues

## Contributing

Contributions are welcome! Please see our [Contributing Guide](../CONTRIBUTING.md) for details.

## Testing

Run the test suite:
```bash
npm test
```

The test suite covers:
- Quote fetching
- Token validation
- Transaction simulation
- PKP initialization
- Error handling
- Cross-chain functionality

## License

MIT