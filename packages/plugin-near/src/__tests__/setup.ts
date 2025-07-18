import { beforeEach, afterEach, mock } from 'bun:test';

// Setup test environment to avoid testnet issues
import '../../test-env-setup.js';

// Mock environment variables for testing
process.env.NEAR_NETWORK = process.env.NEAR_NETWORK || 'testnet';
process.env.NEAR_RPC_URL = process.env.NEAR_RPC_URL || 'https://rpc.testnet.near.org';

// Global test utilities
global.testUtils = {
  // Create mock NEAR transaction result
  mockTransactionResult: (success = true, txHash = 'test-tx-hash') => ({
    transaction: { hash: txHash },
    transaction_outcome: {
      id: txHash,
      block_hash: 'test-block-hash',
      outcome: {
        executor_id: 'test.testnet',
        gas_burnt: '100000000000',
        tokens_burnt: '10000000000000000000',
      },
    },
    status: success
      ? { SuccessValue: '' }
      : { Failure: { ActionError: { kind: 'FunctionCallError' } } },
    receipts_outcome: [],
  }),

  // Create mock account state
  mockAccountState: (balance = '5000000000000000000000000') => ({
    amount: balance,
    locked: '0',
    code_hash: '11111111111111111111111111111111',
    storage_usage: 500,
  }),

  // Create mock token metadata
  mockTokenMetadata: () => ({
    spec: 'ft-1.0.0',
    name: 'Test Token',
    symbol: 'TEST',
    icon: null,
    reference: null,
    reference_hash: null,
    decimals: 18,
  }),

  // Create mock wallet info
  mockWalletInfo: (address = 'test.testnet') => ({
    address,
    publicKey: 'ed25519:test-public-key',
    balance: '5000000000000000000000000',
    tokens: [],
    totalValueUsd: 0,
  }),
};

// Save original console methods
const originalLog = console.log;
const originalInfo = console.info;
const originalWarn = console.warn;
const originalDebug = console.debug;

// Setup console mocks to reduce noise in tests
beforeEach(() => {
  console.log = mock(() => {});
  console.info = mock(() => {});
  console.warn = mock(() => {});
  console.debug = mock(() => {});
});

afterEach(() => {
  // Restore console methods
  console.log = originalLog;
  console.info = originalInfo;
  console.warn = originalWarn;
  console.debug = originalDebug;
});

// Extend global type definitions
declare global {
  var testUtils: {
    mockTransactionResult: (success?: boolean, txHash?: string) => any;
    mockAccountState: (balance?: string) => any;
    mockTokenMetadata: () => any;
    mockWalletInfo: (address?: string) => any;
  };
}
