# ElizaOS Solana Plugin

`@elizaos/plugin-solana` provides comprehensive Solana blockchain integration with DeFi operations, wallet management, and trust-based security.

## Installation & Configuration

```bash
# Install plugin
bun add @elizaos/plugin-solana

# Required environment variables
SOL_ADDRESS=So11111111111111111111111111111111111111112
SLIPPAGE=1

# Wallet configuration (choose one method)
WALLET_SECRET_KEY=your_base58_secret_key     # Preferred
# OR
WALLET_PRIVATE_KEY=your_private_key
# OR
SOLANA_PRIVATE_KEY=your_private_key  
# OR
WALLET_SECRET_SALT=your_derivation_salt

# Network configuration
SOLANA_RPC_URL=https://api.mainnet-beta.solana.com
SOLANA_NETWORK=mainnet-beta

# Optional enhancement APIs
HELIUS_API_KEY=your_helius_key      # Enhanced RPC services
BIRDEYE_API_KEY=your_birdeye_key    # Price feeds and analytics
```

## Core Actions

### Token Transfers (`TRANSFER_SOLANA`)
Transfer SOL or SPL tokens with trust-based validation.

```typescript
// Trust requirement: 80% for financial transfers
// Minimum SOL balance: 0.005 SOL for gas fees
// Supports: SOL transfers, SPL token transfers with ATA creation

Example interactions:
User: "Send 0.5 SOL to So11111111111111111111111111111111111111112"
Agent: Validates trust score → Checks balance → Executes transfer → Returns transaction ID
```

### Token Swaps (`SWAP_SOLANA`)
Swap tokens using Jupiter aggregator with price impact protection.

```typescript
// Features: Jupiter DEX integration, slippage protection, price impact calculation
// Trust requirement: 60%
// Shows: Rate, expected output, price impact before execution

Example:
User: "Swap 1 SOL for USDC"
Agent: Gets Jupiter quote → Shows price impact → Confirms swap → Executes transaction
```

### SOL Staking (`STAKE_SOL`)
Stake SOL to validators for rewards.

```typescript
// Features: Validator selection, stake account creation, reward tracking
// Trust requirement: 70%

Example:
User: "Stake 2 SOL to earn rewards"
Agent: Finds validator → Creates stake account → Delegates tokens → Confirms staking
```

### NFT Operations
Comprehensive NFT management with marketplace integration.

```typescript
// Actions: MINT_NFT, TRANSFER_NFT, LIST_NFT, VIEW_NFTS
// Features: Metadata handling, marketplace listing, collection management

Example:
User: "Show my NFTs"
Agent: Scans wallet → Fetches metadata → Displays collection with values
```

## Available Services

### Core Services
```typescript
// Access services in actions/providers
const tokenService = runtime.getService<TokenService>('token-service');
const walletService = runtime.getService<WalletBalanceService>('wallet-balance');
const jupiterService = runtime.getService<JupiterDexService>('jupiter-dex');
const rpcService = runtime.getService<RpcService>('rpc-service');
const priceService = runtime.getService<PriceOracleService>('price-oracle');
```

### Service Capabilities

**TokenService**
- Token metadata resolution
- SPL token operations
- Associated Token Account management
- Token balance tracking

**WalletBalanceService**
- Portfolio valuation
- Multi-token balance tracking
- Historical balance data
- Real-time updates

**JupiterDexService**
- Token swaps and aggregation
- Price quotes and impact calculation
- Route optimization
- Slippage protection

**RpcService**
- Solana RPC connection management
- Connection pooling
- Health monitoring
- Retry logic

## Trust-Based Security

### Trust Requirements
| Action | Trust Score Required |
|--------|---------------------|
| Token Transfers | 80% |
| Token Swaps | 60% |
| SOL Staking | 70% |
| NFT Operations | 50% |

### Permission System
```typescript
// Unix-style permissions for granular control
interface SolanaPermissions {
  read: boolean;    // View balances, transactions
  write: boolean;   // Execute transactions
  admin: boolean;   // Staking, advanced operations
}
```

### Wallet Security
- **Private key encryption**: Secure storage with salt-based derivation
- **TEE support**: Trusted Execution Environment integration
- **Multi-signature**: Support for multi-sig wallets
- **Hardware wallet**: Ledger integration capability

## API Endpoints

```typescript
// Wallet information
GET /api/wallet/balance/:address
Response: {
  sol: number,
  tokens: TokenBalance[],
  totalUsd: number
}

// Agent wallet balance
GET /api/agent/balance
Response: {
  publicKey: string,
  sol: number,
  usdValue: number,
  tokens: TokenBalance[]
}

// RPC status
GET /api/rpc/status
Response: {
  connected: boolean,
  endpoint: string,
  latency: number
}
```

## DeFi Operations

### Token Swaps with Jupiter
```typescript
// Get swap quote
const quote = await jupiterService.getQuote({
  inputMint: 'SOL',
  outputMint: 'USDC',
  amount: 1000000000, // 1 SOL in lamports
  slippageBps: 100    // 1% slippage
});

// Execute swap
const result = await jupiterService.swap(quote, wallet);
```

### Liquidity Pool Management
```typescript
// Features available:
// - Pool discovery across DEXs (Raydium, Orca, Jupiter)
// - Position management and tracking
// - Yield farming and rewards
// - Multi-DEX support
```

### Advanced DeFi Features
- **Lending protocols**: Integration with Solana lending platforms
- **Yield farming**: Automated yield optimization
- **Options trading**: DeFi options and derivatives
- **Portfolio rebalancing**: Automated portfolio management

## Action Result Format

All actions return standardized results for chaining:

```typescript
interface SolanaActionResult {
  success: boolean;
  data?: {
    transactionId?: string;
    amount?: string;
    tokenAddress?: string;
    recipient?: string;
    error?: string;
  };
  message: string;
}

// Example usage in action chaining
const transferResult = await transferAction.handler(runtime, message, state);
if (transferResult.success) {
  // Chain to next action with transaction data
  const nextAction = {
    previousResults: [transferResult],
    // ...
  };
}
```

## Error Handling & Recovery

### Transaction Safety
```typescript
// All transactions are simulated before execution
const simulation = await connection.simulateTransaction(transaction);
if (simulation.value.err) {
  throw new Error(`Transaction simulation failed: ${simulation.value.err}`);
}

// Gas estimation
const minimumBalance = 0.005 * LAMPORTS_PER_SOL; // For gas fees
if (balance < minimumBalance) {
  throw new Error('Insufficient SOL for transaction fees');
}
```

### Retry Mechanisms
```typescript
// Exponential backoff for failed transactions
const retryOptions = {
  retries: 3,
  factor: 2,
  minTimeout: 1000,
  maxTimeout: 10000
};

// Network error handling
const connection = new Connection(rpcUrl, {
  commitment: 'confirmed',
  confirmTransactionInitialTimeout: 60000
});
```

## Plugin Integration

```typescript
// Add to character plugins
import { solanaPlugin } from '@elizaos/plugin-solana';

export const character = {
  name: 'SolanaAgent',
  plugins: [solanaPlugin],
  // Trust plugin recommended for security
  bio: ['DeFi-enabled agent with Solana blockchain capabilities'],
  settings: {
    secrets: {
      WALLET_SECRET_KEY: 'your_private_key'
    }
  }
};
```

## Testing & Development

### Development Setup
```bash
# Use devnet for testing
SOLANA_RPC_URL=https://api.devnet.solana.com
SOLANA_NETWORK=devnet

# Get devnet SOL
solana airdrop 1 --url devnet

# Run tests
elizaos test
```

### Test Wallet Creation
```typescript
// Create test wallet programmatically
import { Keypair } from '@solana/web3.js';
import bs58 from 'bs58';

const keypair = Keypair.generate();
const secretKey = bs58.encode(keypair.secretKey);
console.log('Test wallet secret key:', secretKey);
```

## Performance Optimization

### Connection Management
- **Connection pooling**: Reuse RPC connections
- **Load balancing**: Multiple RPC endpoints
- **Caching**: Token metadata and price data
- **Batch operations**: Multiple operations per transaction

### Monitoring & Metrics
```typescript
// Transaction tracking
const metrics = {
  transactionCount: number,
  successRate: number,
  averageLatency: number,
  gasUsed: number
};

// Health checks
const healthCheck = {
  rpcConnected: boolean,
  walletBalance: number,
  lastTransaction: Date
};
```

## Best Practices

1. **Trust Validation**: Always check trust scores before financial operations
2. **Gas Management**: Maintain minimum SOL balance for transaction fees
3. **Slippage Control**: Set appropriate slippage for market conditions
4. **Error Handling**: Implement comprehensive error handling and retry logic
5. **Security**: Use environment variables for private keys, never hardcode
6. **Testing**: Test on devnet before mainnet deployment
7. **Monitoring**: Track transaction success rates and performance metrics
8. **User Communication**: Always confirm high-value transactions with users
9. **Rate Limiting**: Respect RPC rate limits to avoid throttling
10. **Backup**: Maintain backup RPC endpoints for reliability

The Solana plugin provides enterprise-grade blockchain integration with comprehensive DeFi capabilities, security features, and production-ready reliability for building sophisticated Web3 agents.