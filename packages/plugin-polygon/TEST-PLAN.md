# Polygon Plugin Test Plan

This document outlines the test plan for the Polygon plugin, detailing what functionality is tested and how.

## 1. Test Coverage Areas

### 1.1 Core Plugin Functionality

- Plugin initialization with different configurations
- Service registration and initialization
- Action registration and validation
- Provider registration and execution

### 1.2 RPC Connectivity

- Ethereum (L1) RPC connectivity
- Polygon (L2) RPC connectivity
- Provider fallback and error handling
- Network identification

### 1.3 Bridge Operations

- ETH bridging from L1 to L2
- ERC20 token bridging from L1 to L2
- Bridge deposit data encoding
- Approval transaction sequence
- Transaction status checking

### 1.4 Governance Operations

- Reading validator information
- Reading delegator information
- Submitting governance proposals
- Voting on proposals
- Withdrawing staking rewards

## 2. Test Types and Methodology

### 2.1 Unit Tests

Unit tests focus on testing individual components in isolation:

| Component          | Test Coverage                                                    | Location                                 |
| ------------------ | ---------------------------------------------------------------- | ---------------------------------------- |
| RPC Provider       | Connection initialization, network detection, provider selection | `tests/unit/rpc-provider.test.ts`        |
| Bridge Service     | Transaction building, deposit encoding, approval flow            | `tests/unit/bridge-transactions.test.ts` |
| Deposit Encoding   | ABI encoding, parameter validation, error handling               | `tests/unit/deposit-encoding.test.ts`    |
| Governance Actions | Proposal flow, voting mechanics, validator operations            | `tests/unit/governance-actions.test.ts`  |

### 2.2 Integration Tests

Integration tests verify multiple components working together:

| Integration Area      | Test Coverage                               | Location                                       |
| --------------------- | ------------------------------------------- | ---------------------------------------------- |
| Plugin Initialization | Service registration, configuration loading | `tests/integration/plugin-integration.test.ts` |
| Bridge Flow           | Complete bridge transaction flow            | `tests/integration/bridge-flow.test.ts`        |

### 2.3 Standalone Test Scripts

These scripts provide targeted testing of specific functionality:

| Script                       | Purpose                                              | Location                                  |
| ---------------------------- | ---------------------------------------------------- | ----------------------------------------- |
| `bridge-transaction-test.js` | Test bridge transactions without full plugin context | `test-scripts/bridge-transaction-test.js` |
| `deposit-encoding-test.js`   | Test deposit data encoding specifically              | `test-scripts/deposit-encoding-test.js`   |
| `rpc-check.js`               | Verify RPC connectivity                              | `test-scripts/rpc-check.js`               |
| `plugin-init.js`             | Test plugin initialization                           | `test-scripts/plugin-init.js`             |

## 3. Test Environment

### 3.1 Test Libraries and Tools

- **Vitest**: Primary testing framework
- **Viem**: For blockchain interaction
- **Ethers.js**: For additional blockchain utilities
- **Mock data**: For predictable test outcomes

### 3.2 Mocking Strategy

- Mock external API calls and blockchain interactions
- Create isolation between tests
- Simulate various network conditions and responses

## 4. Specific Test Scenarios

### 4.1 Bridge Transaction Testing

#### ETH Bridge Tests

- Successfully bridge ETH from L1 to L2
- Handle missing/invalid recipient address
- Handle zero or negative amounts
- Handle transaction failures
- Verify gas estimation

#### ERC20 Bridge Tests

- Successfully bridge ERC20 tokens from L1 to L2
- Test approval sequence (approve → wait → deposit)
- Handle token allowance checks
- Handle approval transaction failures
- Handle deposit transaction failures
- Test different token decimals (6, 8, 18)

### 4.2 Deposit Data Encoding Tests

- Correctly encode ETH deposit data
- Correctly encode ERC20 deposit data
- Test address validation and formatting
- Test amount validation
- Test checksum address handling
- Test different token decimals encoding
- Test predicate address handling

### 4.3 RPC Provider Tests

- Initialize providers with valid and invalid URLs
- Test network detection and chain IDs
- Test provider methods (getBalance, getTransactionCount, etc.)
- Test fallback provider functionality
- Test error handling for network issues

### 4.4 Governance Tests

- Test proposal creation and submission
- Test voting mechanics
- Test validator information retrieval
- Test delegator operations
- Test reward withdrawals

## 5. Error Handling Tests

- Invalid parameters
- Network errors and timeouts
- Contract interaction failures
- Insufficient balances/allowances
- Invalid addresses

## 6. Test Execution Strategy

1. Run unit tests during development to verify component functionality
2. Run integration tests before releases to verify component integration
3. Use standalone scripts for manual verification of specific functionality
4. Run all tests before merging changes to ensure no regressions

## 7. Test Reports and Metrics

- Code coverage reports
- Test execution time
- Failure analysis
- Regression detection
