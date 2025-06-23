# EVM Plugin Test Suite

This directory contains comprehensive tests for the EVM plugin functionality, designed to work with real testnets and mainnet for complete validation. The test suite includes unit tests, integration tests on testnets, and optional mainnet tests with real wallets and tokens.

## Test Networks

### Testnets (Default)
The tests use the following testnets by default:
- **Sepolia** (Ethereum testnet) - Chain ID: 11155111
- **Base Sepolia** - Chain ID: 84532  
- **Optimism Sepolia** - Chain ID: 11155420
- **Arbitrum Sepolia** - Chain ID: 421614

### Mainnets (Optional)
For comprehensive production testing:
- **Ethereum Mainnet** - Chain ID: 1
- **Polygon** - Chain ID: 137
- **Arbitrum** - Chain ID: 42161
- **Optimism** - Chain ID: 10
- **Base** - Chain ID: 8453
- **BSC** - Chain ID: 56
- **Avalanche** - Chain ID: 43114

## Environment Setup

### Required Environment Variables

```bash
# Optional: Use a specific private key for testing (will generate random if not provided)
TEST_PRIVATE_KEY=0x1234567890abcdef...

# Optional: Use a funded wallet private key for integration tests
FUNDED_TEST_PRIVATE_KEY=0xabcdef1234567890...

# Optional: Custom RPC URLs (will use public endpoints if not provided)
SEPOLIA_RPC_URL=https://your-sepolia-rpc.com
BASE_SEPOLIA_RPC_URL=https://your-base-sepolia-rpc.com
OP_SEPOLIA_RPC_URL=https://your-optimism-sepolia-rpc.com

# Mainnet Testing (Optional - Use with caution!)
RUN_MAINNET_TESTS=true  # Must be explicitly enabled
MAINNET_TEST_PRIVATE_KEY=0x...  # Funded mainnet wallet
MAINNET_RPC_URL=https://eth-mainnet.g.alchemy.com/v2/...
```

### Getting Testnet Funds

To run integration tests that actually execute transactions, you'll need testnet ETH:

1. **Sepolia ETH**: 
   - https://sepoliafaucet.com/
   - https://faucet.sepolia.dev/

2. **Base Sepolia ETH**:
   - https://bridge.base.org/ (bridge from Sepolia)
   - https://coinbase.com/faucets/base-ethereum-sepolia-faucet

3. **Optimism Sepolia ETH**:
   - https://app.optimism.io/faucet
   - Bridge from Sepolia via official bridges

## Test Structure

### 1. Wallet Tests (`wallet.test.ts`)
- Wallet initialization and configuration
- Chain management (adding/removing chains)
- Balance operations
- Network connectivity validation
- Custom RPC URL support

### 2. Transfer Tests (`transfer.test.ts`)
- Basic ETH transfers on testnets
- Parameter validation
- Gas estimation
- Error handling for insufficient funds
- Integration tests with funded wallets

### 3. Swap Tests (`swap.test.ts`)
- Token swaps on individual chains
- Multiple aggregator support (LiFi, Bebop)
- Slippage protection
- Quote comparison
- Error handling and recovery

### 4. Bridge Tests (`bridge.test.ts`)
- Cross-chain token bridging
- Multiple testnet support
- Progress monitoring
- Route discovery
- Cost estimation

### 5. Governance Tests (`governance.test.ts`)
- Vote action testing
- Propose action testing
- Queue action testing
- Execute action testing
- Real governor contract interaction
- Voting power validation

### 6. Mainnet Tests (`mainnet.test.ts`)
- Production environment testing
- Real token transfers (USDC, USDT, DAI)
- Mainnet swap execution
- Cross-chain bridge quotes
- Governance contract reads
- Gas optimization validation

### 7. Mainnet Swap Tests (`swap-mainnet.test.ts`)
- Focused swap testing on mainnet
- ETH to stablecoin swaps
- Stablecoin to stablecoin swaps
- Multi-chain swaps (Polygon, Arbitrum)
- Lower cost than full mainnet suite

### 8. Testnet Deployment (`testnet-governance-deploy.ts`)
- Deploy governance contracts to testnet
- Save deployment addresses
- Enable full governance testing

## Running Tests

### Run All Tests
```bash
bun test
```

### Run Specific Test Files
```bash
# Wallet tests
bun test wallet.test.ts

# Transfer tests  
bun test transfer.test.ts

# Swap tests
bun test swap.test.ts

# Bridge tests
bun test bridge.test.ts
```

### Run with Environment Variables
```bash
TEST_PRIVATE_KEY=0x... FUNDED_TEST_PRIVATE_KEY=0x... bun test
```

### Run Mainnet Swap Tests Only (Lower Cost)
```bash
# Run swap tests on mainnet with real tokens
RUN_MAINNET_SWAP_TESTS=true MAINNET_TEST_PRIVATE_KEY=0x... bun test swap-mainnet.test.ts
```

### Run All Mainnet Tests (Requires Explicit Opt-in)
```bash
# ⚠️ WARNING: This will execute real transactions on mainnet!
RUN_MAINNET_TESTS=true MAINNET_TEST_PRIVATE_KEY=0x... bun test mainnet.test.ts
```

### Run Full Test Suite (Including Mainnet)
```bash
# Complete test coverage with real production testing
RUN_MAINNET_TESTS=true \
MAINNET_TEST_PRIVATE_KEY=0x... \
FUNDED_TEST_PRIVATE_KEY=0x... \
bun test
```

## Test Behavior

### Without Funded Wallet
- Tests will use generated private keys with zero balance
- Tests will validate error handling for insufficient funds
- Network connectivity and parameter validation will still work
- No actual transactions will be executed

### With Funded Wallet
- Integration tests will execute real transactions
- Actual swaps and bridges will be attempted
- Transaction receipts will be validated
- Real network fees will be incurred

## Test Categories

### Unit Tests
- Parameter validation
- Error handling
- Configuration testing
- No network calls required

### Integration Tests  
- Network connectivity
- Balance fetching
- Gas estimation
- Requires network access but no funds

### End-to-End Tests
- Actual transaction execution
- Cross-chain operations
- Requires funded testnet wallet
- Real network fees apply

## Debugging

### Common Issues

1. **Network Connectivity**
   ```
   Error: Network unreachable
   ```
   - Check internet connection
   - Verify RPC URLs are working
   - Try different public RPC endpoints

2. **Insufficient Funds**
   ```
   Error: Transfer failed: insufficient funds
   ```
   - Fund your test wallet with testnet ETH
   - Check balance on block explorers
   - Ensure you're using the correct private key

3. **Transaction Failures**
   ```
   Error: Transaction reverted
   ```
   - Check gas prices on testnet
   - Verify token addresses are correct
   - Ensure sufficient balance for gas + amount

### Verbose Logging
```bash
DEBUG=1 bun test
```

## Best Practices

1. **Use Small Amounts**: Test with minimal amounts (0.001 ETH or less)
2. **Check Balances**: Verify wallet balances before running tests
3. **Monitor Gas**: Testnet gas prices can be volatile
4. **Parallel Tests**: Be careful running multiple tests simultaneously
5. **Clean State**: Each test should be independent

## Block Explorers

Monitor your test transactions:
- **Sepolia**: https://sepolia.etherscan.io/
- **Base Sepolia**: https://sepolia.basescan.org/
- **Optimism Sepolia**: https://sepolia-optimism.etherscan.io/

## Test Status

### Current Test Results
- **Total Tests**: 109
- **Passed**: 82 ✅
- **Skipped**: 27 ⏭️ (require funded wallets or mainnet access)
- **Failed**: 0 ❌

### Skipped Test Breakdown
- **Mainnet Tests**: 16 tests (require `MAINNET_TEST_ENABLED=true`)
- **Mainnet Swap Tests**: 11 tests (require `MAINNET_SWAP_TEST_ENABLED=true`)
- **Integration Tests**: Various (require `FUNDED_TEST_PRIVATE_KEY`)

## Test Coverage

### Current Coverage Status
- **Unit Tests**: 100% coverage (all actions tested)
- **Integration Tests**: ~80% coverage (testnet)
- **Mainnet Tests**: 100% coverage (when enabled)
- **Overall**: ~85% without mainnet, 95%+ with mainnet

### Test Strategy
- **Governance**: Deploy contracts on testnet only (expensive on mainnet)
- **Swaps**: Test on both testnet and mainnet
- **Transfers/Bridges**: Testnet by default, mainnet optional

### Coverage Report
```bash
# Generate coverage report
bun test --coverage

# View coverage in browser
open coverage/index.html
```

### Missing Coverage Areas
1. **Governance Actions** (without mainnet tests)
2. **Advanced Token Types** (rebasing, fee-on-transfer)
3. **Multi-sig Operations**
4. **MEV Protection**
5. **Batch Operations**

See `TEST_COVERAGE_REPORT.md` for detailed analysis.

## Security

⚠️ **Mainnet Testing Safety**
- **NEVER** use your main wallet for mainnet tests
- Use a dedicated test wallet with minimal funds
- Required minimum: 0.1 ETH + test tokens
- Estimated test cost: ~$50-100 (depending on gas)
- Always review transactions before execution

⚠️ **General Security**
- Only use testnet wallets for testnet tests
- Keep funded amounts minimal
- Use environment variables for sensitive data
- Don't commit private keys to version control
- Review all test transactions on block explorers 