# EVM Plugin Test Environment Setup

## Overview

The EVM plugin test suite includes three types of tests:

1. **Unit Tests** - Always run, use mocks, no real network interaction
2. **Integration Tests** - Optional, require funded wallets on testnets
3. **Mainnet Tests** - Optional, require mainnet wallet and may incur real costs

## Test Results Summary

- **82 tests passed** ✅
- **27 tests skipped** ⏭️
- **0 tests failed** ❌

## Skipped Tests Breakdown

### Mainnet Tests (16 skipped)
Located in `src/tests/mainnet.test.ts`

These tests are skipped unless:
- `MAINNET_TEST_ENABLED=true` 
- `MAINNET_PRIVATE_KEY` is set with a valid mainnet private key

**WARNING**: Enabling mainnet tests may incur real gas costs!

### Mainnet Swap Tests (11 skipped)
Located in `src/tests/swap-mainnet.test.ts`

These tests are skipped unless:
- `MAINNET_SWAP_TEST_ENABLED=true`
- `MAINNET_PRIVATE_KEY` is set with a valid mainnet private key

### Integration Tests (scattered across test files)
Various tests that require funded wallets are skipped unless:
- `FUNDED_TEST_PRIVATE_KEY` is set with a private key that has test funds on:
  - Sepolia testnet
  - Base Sepolia testnet
  - Optimism Sepolia testnet

## Enabling Skipped Tests

To run all tests including integration tests:

1. Create a `.env` file in the plugin root:
```bash
# Enable mainnet tests (USE WITH CAUTION)
MAINNET_TEST_ENABLED=true
MAINNET_PRIVATE_KEY=0x... # Your mainnet private key

# Enable mainnet swap tests
MAINNET_SWAP_TEST_ENABLED=true

# Funded testnet wallet
FUNDED_TEST_PRIVATE_KEY=0x... # Private key with testnet funds
```

2. Fund your test wallet on testnets:
   - Get Sepolia ETH from: https://sepoliafaucet.com/
   - Get Base Sepolia ETH from: https://docs.base.org/docs/tools/network-faucets/
   - Get OP Sepolia ETH from: https://docs.optimism.io/builders/tools/faucets

3. Run tests:
```bash
bun run test:unit
```

## Test Categories

### Always Run (82 tests)
- Transfer action validation
- Swap action validation  
- Bridge action validation
- Governance action validation
- Wallet provider operations
- Service initialization

### Skipped Without Configuration (27 tests)
- Real token transfers on testnets
- Real swaps on mainnet/testnets
- Real bridges between chains
- Governance proposals on mainnet
- Gas estimation on mainnet

## E2E Tests

The E2E tests in `src/tests/e2e.test.ts` are designed for the ElizaOS test runner and should be run separately:

```bash
bun run test:e2e
```

These tests validate the plugin integration with the ElizaOS runtime. 