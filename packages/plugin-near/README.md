# NEAR Protocol Plugin for ElizaOS

This plugin provides NEAR Protocol blockchain integration for ElizaOS agents, enabling them to interact with the NEAR ecosystem.

## Quick Answers

### 💰 Contract Deployment Costs

- **JavaScript contracts**: ~2-3 NEAR required (500KB contracts)
- **Rust contracts**: ~1-2 NEAR required (smaller size)
- **Testnet NEAR**: FREE from faucets (not purchased)
- **Local development**: $0 - completely free!

### 🆓 Getting Free Testnet NEAR

1. **NEAR Faucet**: https://near-faucet.io/
2. **MyNearWallet**: https://testnet.mynearwallet.com/ (gives initial NEAR)
3. **Discord Bot**: Join NEAR Discord and use `/faucet` command

### 🏠 Local Development (Zero Cost)

```bash
# Option 1: NEAR Workspaces (recommended)
npm install --save-dev near-workspaces

# Option 2: NEAR Sandbox
npm install -g near-sandbox
near-sandbox --home ~/.near-sandbox init
near-sandbox --home ~/.near-sandbox run
```

See [LOCAL_DEVELOPMENT.md](./LOCAL_DEVELOPMENT.md) for detailed local setup guide.

## Features

### 🔧 Core Services

- **Wallet Management**: Create and manage NEAR wallets
- **Token Transfers**: Send and receive NEAR tokens
- **Token Swaps**: Exchange tokens via Ref Finance
- **Staking**: Stake NEAR tokens with validators
- **Cross-chain Bridge**: Bridge assets to/from Ethereum via Rainbow Bridge
- **NFT Marketplace**: Buy, sell, and mint NFTs
- **Storage**: Decentralized storage integration
- **Smart Contracts**: Deploy and interact with smart contracts
- **On-chain Messaging**: Decentralized messaging between agents
- **Escrow Service**: Multi-party escrow with arbiter support

### 🎯 Actions

- `SEND_NEAR`: Transfer NEAR tokens
- `EXECUTE_SWAP_NEAR`: Swap tokens on Ref Finance
- `STAKE_NEAR`: Stake NEAR with validators
- `CREATE_ESCROW`: Create multi-party escrow contracts
- `RESOLVE_ESCROW`: Resolve escrow disputes
- `SEND_MESSAGE_NEAR`: Send on-chain messages
- `CREATE_ROOM_NEAR`: Create messaging rooms
- `BRIDGE_TO_ETHEREUM`: Bridge assets to Ethereum
- `LIST_NFT`: List NFTs for sale
- `MINT_NFT`: Create new NFTs
- `PLAY_GAME`: Gaming integrations

### 📊 Providers

- `near-wallet`: Provides wallet balance and portfolio information

## Installation

```bash
npm install @elizaos/plugin-near
```

## Configuration

Set the following environment variables:

```env
# Required
NEAR_WALLET_SECRET_KEY=ed25519:your-private-key
NEAR_WALLET_PUBLIC_KEY=ed25519:your-public-key
NEAR_ADDRESS=your-account.near

# Optional (defaults shown)
NEAR_NETWORK=testnet
NEAR_RPC_URL=https://neart.lava.build
NEAR_SLIPPAGE=1

# Smart Contract Addresses (optional - throws errors if not set and contracts are used)
NEAR_ESCROW_CONTRACT=escrow.your-account.near
NEAR_MESSAGING_CONTRACT=messaging.your-account.near
```

## Usage

```typescript
import { nearPlugin } from '@elizaos/plugin-near';

// Register the plugin
elizaAgent.use(nearPlugin);

// The agent can now respond to NEAR-related commands
```

## Smart Contracts

### Escrow Contract

Multi-party escrow with arbiter support:

- Create escrows for payments or bets
- 2% arbiter fee (configurable)
- Automatic refunds on cancellation
- State tracking (Pending → Active → Resolved/Cancelled)

### Messaging Contract

On-chain messaging for agents:

- Room-based group messaging
- Direct messages between users
- Message editing and deletion
- User blocking functionality

## SDK Compatibility Issue

**Current Status**: The smart contracts are built with NEAR SDK 5.x which has a known incompatibility with the current NEAR runtime. This causes a "PrepareError(Deserialization)" error when trying to interact with the contracts.

**Impact**: When smart contracts are not available or fail to initialize, the plugin will throw clear error messages instead of falling back to mock implementations. This ensures developers are aware of deployment issues.

**Solutions**:

1. Wait for NEAR runtime updates to support SDK 5.x
2. Use NEAR SDK 4.x or 3.x for contract deployment
3. Deploy contracts with alternative tools that support SDK 5.x

**Error Handling**: The plugin now throws explicit errors when contracts fail, making it easier to identify and fix issues:

```
❌ Failed to initialize escrow service - NEAR_RPC_ERROR: Failed to connect to escrow contract...
```

## Development

### Building

```bash
bun install
bun run build
```

### Testing

```bash
# Run all tests with bun
bun test

# Run specific test file
bun test src/__tests__/plugin-functionality.test.ts

# Note: We use bun test, not vitest
```

### Contract Development

```bash
cd contracts/escrow
cargo build --target wasm32-unknown-unknown --release

# Deploy (when SDK compatibility is resolved)
near deploy escrow.your-account.near target/wasm32-unknown-unknown/release/elizaos_escrow.wasm
```

## Examples

### Send NEAR

```typescript
// User: "Send 5 NEAR to alice.near"
// Agent: Executes transfer and confirms transaction
```

### Create Escrow

```typescript
// User: "Create an escrow to pay bob.near 10 NEAR when he delivers the website"
// Agent: Creates escrow contract and provides escrow ID
```

### Swap Tokens

```typescript
// User: "Swap 100 NEAR for USDC"
// Agent: Executes swap on Ref Finance
```

## Architecture

The plugin follows a service-oriented architecture:

- **Services**: Long-running stateful components (WalletService, TransactionService, etc.)
- **Actions**: User-triggered operations that use services
- **Providers**: Supply contextual information to the agent

## Contributing

Contributions are welcome! Please see the main ElizaOS contributing guidelines.

## License

MIT License - see LICENSE file for details
