import dotenv from 'dotenv';
import path from 'node:path';
import { vi } from 'vitest';
import type * as ethersActualTypes from 'ethers'; // For type hints for actualEthers

// Resolve the path to the root .env file from packages/plugin-polygon/vitest.setup.ts
// __dirname in this context should be packages/plugin-polygon/
// So, ../../.env should point to the root
const workspaceRoot = path.resolve(__dirname, '../../');
const envPath = path.resolve(workspaceRoot, '.env');

console.log(`Vitest setup: Attempting to load .env from: ${envPath}`);
const result = dotenv.config({ path: envPath });

if (result.error) {
  // It's a warning because the .env file might not exist in all CI environments
  console.warn(`Vitest setup: Warning - Error loading .env from ${envPath}:`, result.error.message);
} else {
  if (result.parsed && Object.keys(result.parsed).length > 0) {
    console.log(`Vitest setup: .env file loaded successfully from ${envPath}.`);
  } else if (!process.env.POLYGONSCAN_KEY && !process.env.POLYGON_RPC_URL) {
    // If not parsed, it might be empty or already loaded through other means (e.g. CI secrets)
    // Only warn if critical vars are definitely missing after the attempt.
    console.warn(
      `Vitest setup: .env file at ${envPath} might be empty or critical variables (POLYGONSCAN_KEY, POLYGON_RPC_URL) not found after loading attempt.`
    );
  } else {
    console.log(
      `Vitest setup: .env file at ${envPath} was processed. Variables might have been already set or the file is empty.`
    );
  }
}

// For quick verification during test runs:
// console.log(`Vitest setup: POLYGONSCAN_KEY is ${process.env.POLYGONSCAN_KEY ? 'Loaded' : 'NOT LOADED'}`);
// console.log(`Vitest setup: POLYGON_RPC_URL is ${process.env.POLYGON_RPC_URL ? 'Loaded' : 'NOT LOADED'}`);

// --- Vitest Global Mocks ---

// --- Mock @elizaos/core logger ---
vi.mock('@elizaos/core', async () => {
  const actualCore = await vi.importActual<typeof import('@elizaos/core')>('@elizaos/core');
  return {
    ...actualCore,
    logger: {
      info: vi.fn(),
      error: vi.fn(),
      warn: vi.fn(),
      debug: vi.fn(),
    },
  };
});

// --- Constants for ethers mock (mirroring what was in PolygonRpcService.unit.test.ts) ---
// These might be needed if the mock implementations rely on them.
// Consider if these should be configurable or if they are stable for all unit tests.
const ROOT_CHAIN_MANAGER_ADDRESS_L1_MOCK = '0xA0c68C638235ee32657e8f720a23ceC1bFc77C77';
const STAKE_MANAGER_ADDRESS_L1_MOCK = '0x5e3Ef299fDDf15eAa0432E6e66473ace8c13D908';
const MOCK_CHECKPOINT_MANAGER_ADDR = '0xCheckpointManager123'; // Renamed to avoid conflict if a real one exists

// Exported mock functions to allow tests to control their behavior
export const mockGetLastChildBlock = vi.fn();
export const mockCheckpointManagerAddressFn = vi.fn();
export const mockCurrentEpoch = vi.fn();

// --- Mock the entire ethers module ---
vi.mock('ethers', async () => {
  const actualEthers = await vi.importActual<typeof ethersActualTypes>('ethers');

  // Set default behaviors for exported mock functions.
  // Tests can import these and use .mockResolvedValueOnce, .mockRejectedValueOnce, etc., in their `beforeEach` or per test.
  mockGetLastChildBlock.mockResolvedValue(1000n);
  mockCheckpointManagerAddressFn.mockResolvedValue(MOCK_CHECKPOINT_MANAGER_ADDR);
  mockCurrentEpoch.mockResolvedValue(1n);

  return {
    ...actualEthers,
    JsonRpcProvider: vi
      .fn()
      .mockImplementation((url: string, network?: unknown, options?: unknown) => ({
        getNetwork: vi.fn().mockResolvedValue({ chainId: 1n }),
      })),
    Wallet: vi
      .fn()
      .mockImplementation((privateKey: string, provider?: ethersActualTypes.ContractRunner) => ({
        getAddress: vi.fn().mockResolvedValue('0xMockSignerAddress'),
        connect: vi.fn().mockReturnThis(),
      })),
    Contract: vi
      .fn()
      .mockImplementation(
        (address: string, abi: unknown, runner?: ethersActualTypes.ContractRunner) => {
          if (address === ROOT_CHAIN_MANAGER_ADDRESS_L1_MOCK) {
            return {
              checkpointManagerAddress: mockCheckpointManagerAddressFn,
              connect: vi.fn().mockReturnThis(),
            };
          }
          if (address === MOCK_CHECKPOINT_MANAGER_ADDR) {
            return {
              getLastChildBlock: mockGetLastChildBlock,
              connect: vi.fn().mockReturnThis(),
            };
          }
          if (address === STAKE_MANAGER_ADDRESS_L1_MOCK) {
            return {
              currentEpoch: mockCurrentEpoch,
              connect: vi.fn().mockReturnThis(),
            };
          }
          console.warn(
            `Vitest global ethers mock: Unhandled contract address for Contract mock: ${address}. Returning generic mock.`
          );
          return {
            connect: vi.fn().mockReturnThis(),
            getAddress: vi.fn().mockResolvedValue(address),
          };
        }
      ),
  };
});
