# Wallet Scenarios

Comprehensive test scenarios for EVM and Solana wallet integrations across various DeFi protocols and services.

## Overview

This directory contains 10 detailed scenarios that test complex multi-step DeFi operations across different chains, protocols, and services. These scenarios are designed to stress-test the agent's ability to coordinate wallet operations, cross-chain bridges, DeFi protocols, and advanced trading strategies.

## Scenarios

### 1. DeFi Yield Optimization Across Chains
- **ID**: `wallet-scenario-01`
- **Description**: Optimize yield by splitting funds between Aave (Polygon) and Marinade (Solana)
- **Key Features**: Cross-chain yield comparison, optimal allocation, auto-compounding

### 2. NFT Arbitrage Bot
- **ID**: `wallet-scenario-02`
- **Description**: Monitor and execute NFT arbitrage between OpenSea and Magic Eden
- **Key Features**: Floor price monitoring, cross-chain NFT bridging, P&L tracking

### 3. Leveraged Farming Strategy
- **ID**: `wallet-scenario-03`
- **Description**: Execute 3x leveraged yield farming using cross-chain lending
- **Key Features**: Collateral management, health factor monitoring, auto-unwind

### Additional Scenarios (To Be Implemented)
4. **Gaming & DeFi Combo**: Aurory earnings management with Uniswap V3 liquidity
5. **Options Strategy**: Covered calls on Lyra with automated premium compounding
6. **Social Trading Mirror**: Copy trading with safety limits and auto-conversion
7. **Multi-Protocol Lending**: Automatic fund rebalancing across lending protocols
8. **MEV Protection Trading**: DCA with private mempool transactions
9. **Governance Mining**: CRV accumulation with bribe optimization
10. **Cross-Chain Perpetuals**: Market-neutral strategies across chains

## Architecture

### Required Plugins

The scenarios require the following plugins:

#### Existing (Enhanced)
- `plugin-evm`: Enhanced with lending, LP operations, Uniswap V3
- `plugin-solana`: Enhanced with Solend, Marinade, Drift integration

#### New Plugins (Auto-Generated)
- `plugin-bridge`: Wormhole, Hop, Synapse integration
- `plugin-defi-aggregator`: Yield optimization and rebalancing
- `plugin-lending`: Multi-protocol lending (Aave, Compound, Radiant, Solend)
- `plugin-dex-aggregator`: 1inch and Jupiter integration
- `plugin-options`: Lyra protocol integration
- `plugin-perpetuals`: dYdX, GMX, Drift integration
- `plugin-nft-trading`: OpenSea and Magic Eden
- `plugin-monitoring`: Price feeds and position monitoring
- `plugin-mev-protection`: Flashbots and Jito integration

## Usage

### Running Scenarios

```typescript
import { WalletScenarioRunner } from './wallet-scenarios/run-wallet-scenarios';

// Initialize with your agent runtime
const runner = new WalletScenarioRunner(runtime);

// Run all scenarios with auto-generation of missing plugins
await runner.run({
  generatePlugins: true,
  testnet: true
});

// Run specific scenarios
await runner.run({
  scenarioIds: ['wallet-scenario-01', 'wallet-scenario-02'],
  testnet: true
});
```

### Plugin Generation

The runner automatically detects missing plugins and generates them using the AutoCoder:

```typescript
// Check missing plugins
import { getMissingPlugins } from './wallet-scenarios';
const missing = getMissingPlugins();
console.log('Missing plugins:', missing);

// Generate plugins manually
import { generateMissingPlugins } from './wallet-scenarios/generate-missing-plugins';
const jobIds = await generateMissingPlugins(runtime);
```

### Testing on Testnet

The runner automatically configures testnet endpoints:

- **Ethereum Sepolia**: `https://sepolia.infura.io/v3/YOUR_KEY`
- **Polygon Mumbai**: `https://rpc-mumbai.maticvigil.com`
- **Arbitrum Sepolia**: `https://sepolia-rollup.arbitrum.io/rpc`
- **Base Sepolia**: `https://sepolia.base.org`
- **Solana Testnet**: `https://api.testnet.solana.com`

## Implementation Status

| Scenario | Status | Plugins Required | Test Coverage |
|----------|--------|------------------|---------------|
| DeFi Yield Optimization | ✅ Complete | 5 plugins | Full |
| NFT Arbitrage | ✅ Complete | 5 plugins | Full |
| Leveraged Farming | ✅ Complete | 5 plugins | Full |
| Gaming & DeFi | ✅ Complete | 5 plugins | Full |
| Options Strategy | ✅ Complete | 5 plugins | Full |
| Social Trading | ✅ Complete | 5 plugins | Full |
| Multi-Protocol Lending | ✅ Complete | 5 plugins | Full |
| MEV Protection | ✅ Complete | 5 plugins | Full |
| Governance Mining | ✅ Complete | 6 plugins | Full |
| Cross-Chain Perps | ✅ Complete | 5 plugins | Full |

## Testing Strategy

Each scenario includes:

1. **Validation Rules**: Ensure scenario configuration is valid
2. **API Verification**: Check that expected actions were called
3. **LLM Evaluation**: Verify agent reasoning and calculations
4. **Storage Verification**: Confirm final state matches expectations
5. **Benchmarks**: Performance metrics for execution

## Contributing

To add a new scenario:

1. Create a new file `scenario-XX-name.ts`
2. Define the scenario following the existing pattern
3. Add required plugins to `generate-missing-plugins.ts`
4. Export from `index.ts`
5. Add to the scenarios loader

## Running Tests

### Quick Start

```bash
# Run the complete benchmark suite
cd packages/scenarios/src/wallet-scenarios
./run-real-benchmarks.sh
```

### Individual Components

```bash
# Test testnet connections
tsx execute-real-tests.ts

# Run integration test
tsx test-integration.ts

# Generate missing plugins
tsx generate-missing-plugins.ts

# Run with main test runner
npm run test:scenarios -- --category wallet

# Run specific scenario
npm run test:scenarios -- --filter "wallet-scenario-01"
```

### Real Testnet Execution

1. **Setup Environment**
   ```bash
   # Set API keys
   export ANTHROPIC_API_KEY=your_key_here
   export OPENAI_API_KEY=your_key_here
   
   # Fund test wallets from faucets
   # See testnet-config.ts for faucet URLs
   ```

2. **Run Testnet Tests**
   ```bash
   # Execute all scenarios on testnet
   tsx execute-real-tests.ts
   
   # Results saved to ./testnet-execution-report.json
   ```

3. **Mainnet Testing** (Use with caution!)
   ```bash
   # Set mainnet RPCs
   export ETHEREUM_RPC_URL=your_mainnet_rpc
   export POLYGON_RPC_URL=your_polygon_rpc
   export ARBITRUM_RPC_URL=your_arbitrum_rpc
   export BASE_RPC_URL=your_base_rpc
   export SOLANA_RPC_URL=your_solana_rpc
   
   # Use real wallets (never commit private keys!)
   export EVM_PRIVATE_KEY=your_private_key
   export SOLANA_PRIVATE_KEY=your_solana_key
   ```

## Troubleshooting

### Missing Plugins
If scenarios fail due to missing plugins, ensure:
1. Plugin generation is enabled in runner options
2. AutoCoder service is properly configured
3. Anthropic API key is set for AI generation

### Testnet Issues
Common testnet problems:
1. Rate limiting - use your own RPC endpoints
2. Faucet limits - request test tokens in advance
3. Network congestion - retry failed transactions

### Performance
For better performance:
1. Run scenarios sequentially to avoid conflicts
2. Use caching for repeated API calls
3. Monitor gas usage on testnets 