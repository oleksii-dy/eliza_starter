# Testing Guide for Polygon Plugin

This document outlines the testing approach and available test scripts for the Polygon plugin.

## Testing Structure

The testing structure for the Polygon plugin is organized as follows:

```
plugin-polygon/
├── tests/                  # Main test directory
│   ├── unit/               # Unit tests for individual components
│   └── integration/        # Integration tests for combined functionality
└── test-scripts/           # Standalone test scripts for specific features
```

## Test Categories

1. **Unit Tests**: Tests for individual components and services (in `tests/unit/`)

   - Bridge service tests
   - RPC provider tests
   - Deposit data encoding tests
   - Governance actions tests

2. **Integration Tests**: Tests that verify multiple components working together (in `tests/integration/`)

   - Plugin initialization tests
   - Full bridge flow tests

3. **Standalone Test Scripts**: Manual test scripts for specific functionality (in `test-scripts/`)
   - Bridge transaction simulation
   - Deposit encoding verification
   - RPC connectivity checks
   - Plugin initialization testing

## Available Test Scripts

The following npm scripts are available for testing:

```bash
# Run all tests
npm test

# Run only unit tests
npm run test:unit

# Run only integration tests
npm run test:integration

# Run standalone test scripts
npm run test:bridge        # Test bridge transaction flow
npm run test:encoding      # Test deposit data encoding
npm run test:rpc           # Test RPC connectivity
npm run test:plugin        # Test plugin initialization
npm run test:standalone    # Run the full standalone test

# Run all standalone test scripts
npm run test:all

# Run tests with coverage
npm run test:coverage
```

## Standalone Test Scripts

The standalone test scripts are designed to run independently of the plugin structure to test specific functionality:

1. **bridge-transaction-test.js**: Simulates the bridge transaction flow for both ETH and ERC20 tokens

   - Tests ETH bridging from L1 to L2
   - Tests ERC20 token bridging from L1 to L2
   - Tests error handling for invalid inputs

2. **deposit-encoding-test.js**: Tests the deposit data encoding for the bridge transactions

   - Tests ETH deposit data encoding
   - Tests ERC20 deposit data encoding
   - Tests predicate root token encoding
   - Tests different token decimal encodings
   - Tests error handling for invalid inputs

3. **rpc-check.js**: Tests connectivity to Ethereum and Polygon RPC endpoints

   - Verifies connectivity to L1 (Ethereum) network
   - Verifies connectivity to L2 (Polygon) network
   - Retrieves basic chain information

4. **plugin-init.js**: Tests the plugin initialization process
   - Tests plugin configuration loading
   - Tests service initialization

## Running Tests

To run the tests, make sure you have the necessary dependencies installed:

```bash
# Install dependencies
npm install

# Run all tests
npm test
```

## Testing Environment

The tests use the following environment:

- **Vitest**: For unit and integration tests
- **Ethers.js** and **Viem**: For blockchain interactions
- **Mock services**: For isolated testing of components

## Advanced Testing

For more advanced testing scenarios, you can:

1. Use the standalone test scripts with custom parameters
2. Mock specific portions of the bridge protocol for targeted testing
3. Run integration tests against testnet environments by providing appropriate RPC URLs
