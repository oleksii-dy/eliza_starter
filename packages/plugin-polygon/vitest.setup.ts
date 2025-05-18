import dotenv from 'dotenv';
import path from 'node:path';
import { vi } from 'vitest';
import type * as ethersActualTypes from 'ethers'; // For type hints for actualEthers

// Resolve the path to the root .env file
const workspaceRoot = path.resolve(__dirname, '../../');
const envPath = path.resolve(workspaceRoot, '.env');

console.log(`Vitest setup: Attempting to load .env from: ${envPath}`);
const result = dotenv.config({ path: envPath });

if (result.error) {
  console.warn(`Vitest setup: Warning - Error loading .env from ${envPath}:`, result.error.message);
} else {
  if (result.parsed && Object.keys(result.parsed).length > 0) {
    console.log(`Vitest setup: .env file loaded successfully from ${envPath}.`);
  } else if (!process.env.POLYGONSCAN_KEY && !process.env.POLYGON_RPC_URL) {
    console.warn(
      `Vitest setup: .env file at ${envPath} might be empty or critical variables (POLYGONSCAN_KEY, POLYGON_RPC_URL) not found after loading attempt.`
    );
  } else {
    console.log(
      `Vitest setup: .env file at ${envPath} was processed. Variables might have been already set or the file is empty.`
    );
  }
}

// --- @elizaos/core Mocks ---

// Mock logger for @elizaos/core (exported for direct use if needed)
export const elizaOsLoggerMock = {
  log: vi.fn(),
  info: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
  debug: vi.fn(),
};

// Mock runtime for @elizaos/core (exported for direct use if needed)
export const mockRuntime = {
  getSetting: vi.fn().mockImplementation((key: string) => {
    const settings: Record<string, string | undefined> = {
      'ETHEREUM_RPC_URL': process.env.ETHEREUM_RPC_URL || 'https://mainnet.infura.io/v3/mock-key',
      'ETHEREUM_RPC_URL_FALLBACK': process.env.ETHEREUM_RPC_URL_FALLBACK,
      'POLYGON_RPC_URL': process.env.POLYGON_RPC_URL || 'https://polygon-mainnet.infura.io/v3/mock-key',
      'POLYGON_RPC_URL_FALLBACK': process.env.POLYGON_RPC_URL_FALLBACK,
      'PRIVATE_KEY': process.env.PRIVATE_KEY || '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef',
      'POLYGONSCAN_KEY': process.env.POLYGONSCAN_KEY || 'MOCK_POLYGONSCAN_KEY',
      'POLYGONSCAN_KEY_FALLBACK': process.env.POLYGONSCAN_KEY_FALLBACK,
    };
    return settings[key] || undefined;
  }),
  getService: vi.fn().mockReturnValue(null),
  registerAction: vi.fn(),
  registerService: vi.fn(),
  useModel: vi.fn().mockResolvedValue('{"tokenAddress":"0x1234567890abcdef1234567890abcdef12345678","amount":"1.5"}'),
  getConfig: vi.fn().mockImplementation((key, defaultValue) => {
    const configs: Record<string, string | undefined> = {
      'polygon.privateKey': process.env.PRIVATE_KEY || '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef',
      'polygon.ethereumRpcUrl': process.env.ETHEREUM_RPC_URL || 'https://mainnet.infura.io/v3/mock-key',
      'polygon.polygonRpcUrl': process.env.POLYGON_RPC_URL || 'https://polygon-mainnet.infura.io/v3/mock-key',
      'polygon.polygonscanKey': process.env.POLYGONSCAN_KEY || 'MOCK_POLYGONSCAN_KEY',
    };
    return configs[key] || defaultValue;
  }),
  getCache: vi.fn().mockResolvedValue(undefined),
  setCache: vi.fn().mockResolvedValue(undefined),
  deleteCache: vi.fn().mockResolvedValue(undefined),
};

vi.mock('@elizaos/core', async () => {
  const actualCore = await vi.importActual<typeof import('@elizaos/core')>('@elizaos/core');
  return {
    ...actualCore,
    logger: elizaOsLoggerMock,
  };
});


// --- node-cache Mock ---
vi.mock('node-cache', () => {
  return {
    default: vi.fn().mockImplementation(() => ({
      get: vi.fn().mockReturnValue(null),
      set: vi.fn(),
      del: vi.fn(),
      has: vi.fn().mockReturnValue(false),
      flushAll: vi.fn(),
    }))
  };
});

// --- viem Mocks ---
vi.mock('viem', async () => {
  const actualViem = await vi.importActual<typeof import('viem')>('viem');
  return {
    ...actualViem,
    createPublicClient: vi.fn(),
    createWalletClient: vi.fn(),
    createTestClient: vi.fn(),
    formatUnits: vi.fn().mockReturnValue('2.0'),
    parseUnits: vi.fn().mockReturnValue(BigInt(2000000000000000000)),
    formatEther: vi.fn().mockReturnValue('2.0'),
    parseEther: vi.fn().mockReturnValue(BigInt(2000000000000000000)),
    http: vi.fn().mockImplementation((url) => ({ url, type: 'http' })),
    fallback: vi.fn().mockImplementation((transports) => transports[0]),
    toHex: vi.fn((value) => actualViem.toHex(value)),
  };
});

vi.mock('viem/accounts', async () => {
  const actualAccounts = await vi.importActual<typeof import('viem/accounts')>('viem/accounts');
  return {
    ...actualAccounts,
    privateKeyToAccount: vi.fn().mockReturnValue({
      address: '0xUserAddressViem',
      signMessage: vi.fn(),
      signTransaction: vi.fn(),
      signTypedData: vi.fn(),
    }),
  };
});


// --- Ethers Mock Specifics (from polygon branch, enhanced) ---
const ROOT_CHAIN_MANAGER_ADDRESS_L1_MOCK = '0xA0c68C638235ee32657e8f720a23ceC1bFc77C77';
const STAKE_MANAGER_ADDRESS_L1_MOCK = '0x5e3Ef299fDDf15eAa0432E6e66473ace8c13D908';
const MOCK_CHECKPOINT_MANAGER_ADDR = '0xCheckpointManager123';

export const mockGetLastChildBlock = vi.fn();
export const mockCheckpointManagerAddressFn = vi.fn();
export const mockCurrentEpoch = vi.fn();

// --- Mock Contracts (from merge-addpolygon-resolution, for ethers and direct use) ---
export const mockApprovalTx = { hash: '0xApprovalTxHash', wait: vi.fn().mockResolvedValue({ status: 1, transactionHash: '0xApprovalTxHash', logs: [] }) };
export const mockDepositTx = { hash: '0xDepositErc20TxHash', wait: vi.fn().mockResolvedValue({ status: 1, transactionHash: '0xDepositErc20TxHash', logs: [] }) };
export const mockDepositEthTx = { hash: '0xDepositEthTxHash', wait: vi.fn().mockResolvedValue({ status: 1, transactionHash: '0xDepositEthTxHash', logs: [] }) };

export const mockERC20Contract = {
  allowance: vi.fn().mockResolvedValue(BigInt(0)),
  approve: vi.fn().mockResolvedValue(mockApprovalTx),
  balanceOf: vi.fn().mockResolvedValue(BigInt(1000000000000000000n)),
  decimals: vi.fn().mockResolvedValue(18),
  symbol: vi.fn().mockResolvedValue('TOKEN'),
  name: vi.fn().mockResolvedValue('Test Token'),
  getAddress: vi.fn().mockResolvedValue('0xTokenAddress'),
  connect: vi.fn().mockReturnThis(),
};

export const mockRootChainManagerContractEthers = {
  depositEtherFor: vi.fn().mockResolvedValue(mockDepositEthTx),
  depositFor: vi.fn().mockResolvedValue(mockDepositTx),
  checkpointManagerAddress: mockCheckpointManagerAddressFn,
  getAddress: vi.fn().mockResolvedValue(ROOT_CHAIN_MANAGER_ADDRESS_L1_MOCK),
  connect: vi.fn().mockReturnThis(),
};

export const mockStakeManagerContractEthers = {
    currentEpoch: mockCurrentEpoch,
    validatorThreshold: vi.fn().mockResolvedValue(1n),
    getValidatorContract: vi.fn().mockResolvedValue('0xValidatorShareContractAddress'),
    delegate: vi.fn().mockResolvedValue({ hash: '0xDelegateTxHash', wait: vi.fn().mockResolvedValue({ status: 1}) }),
    getAddress: vi.fn().mockResolvedValue(STAKE_MANAGER_ADDRESS_L1_MOCK),
    connect: vi.fn().mockReturnThis(),
};

export const mockCheckpointManagerContractEthers = {
    getLastChildBlock: mockGetLastChildBlock,
    currentHeaderBlock: vi.fn().mockResolvedValue(12345n),
    headerBlocks: vi.fn().mockResolvedValue({ start: 12000n, end: 12345n, root: '0xHeaderRoot'}),
    getAddress: vi.fn().mockResolvedValue(MOCK_CHECKPOINT_MANAGER_ADDR),
    connect: vi.fn().mockReturnThis(),
};

export const mockGovernorContract = {
  getVotes: vi.fn().mockResolvedValue(BigInt(100)),
  proposalThreshold: vi.fn().mockResolvedValue(BigInt(1000)),
  votingDelay: vi.fn().mockResolvedValue(BigInt(6570)),
  votingPeriod: vi.fn().mockResolvedValue(BigInt(45818)),
  quorum: vi.fn().mockResolvedValue(BigInt(400000)),
  getAddress: vi.fn().mockResolvedValue('0xGovernorAddress'),
};

export const mockTokenContract = {
  balanceOf: vi.fn().mockResolvedValue(BigInt(1000000000000000000n)),
  decimals: vi.fn().mockResolvedValue(18),
  symbol: vi.fn().mockResolvedValue('GOV'),
  name: vi.fn().mockResolvedValue('Governance Token'),
  getAddress: vi.fn().mockResolvedValue('0xTokenAddress'),
};

export const mockTimelockContract = {
  getMinDelay: vi.fn().mockResolvedValue(BigInt(172800)),
  getAddress: vi.fn().mockResolvedValue('0xTimelockAddress'),
};

export const createMockEthersContract = vi.fn().mockImplementation((address, abi, signerOrProvider) => {
  if (abi && (abi as any[]).find((item: any) => item.name === 'approve' && item.type === 'function')) {
    return { ...mockERC20Contract, getAddress: vi.fn().mockResolvedValue(address) };
  }
  return {
    connect: vi.fn().mockReturnThis(),
    getAddress: vi.fn().mockResolvedValue(address),
    SOME_GENERIC_METHOD: vi.fn().mockResolvedValue(null),
  };
});

vi.mock('ethers', async () => {
  const actualEthers = await vi.importActual<typeof ethersActualTypes>('ethers');

  mockGetLastChildBlock.mockResolvedValue(1000n);
  mockCheckpointManagerAddressFn.mockResolvedValue(MOCK_CHECKPOINT_MANAGER_ADDR);
  mockCurrentEpoch.mockResolvedValue(1n);

  return {
    ...actualEthers,
    JsonRpcProvider: vi.fn().mockImplementation((url: string) => ({
        getNetwork: vi.fn().mockResolvedValue({ chainId: 1n, name: 'mocknetwork' }),
        getFeeData: vi.fn().mockResolvedValue({
            gasPrice: actualEthers.parseUnits('10', 'gwei'),
            maxFeePerGas: actualEthers.parseUnits('20', 'gwei'),
            maxPriorityFeePerGas: actualEthers.parseUnits('2', 'gwei'),
        }),
        getBlockNumber: vi.fn().mockResolvedValue(1234567),
        getBalance: vi.fn().mockResolvedValue(actualEthers.parseEther('100')),
        getTransaction: vi.fn().mockResolvedValue(null),
        getTransactionReceipt: vi.fn().mockResolvedValue(null),
        getBlock: vi.fn().mockResolvedValue(null),
        call: vi.fn().mockResolvedValue('0x'),
        estimateGas: vi.fn().mockResolvedValue(21000n),
        broadcastTransaction: vi.fn().mockResolvedValue({ hash: '0xBroadcastedTxHash', wait: vi.fn().mockResolvedValue({ status: 1})}),
        waitForTransaction: vi.fn().mockResolvedValue({ status: 1, transactionHash: '0xWaitedTxHash', logs: []})
    })),
    Wallet: vi.fn().mockImplementation((privateKey: string, provider?: ethersActualTypes.Provider) => ({
        address: '0xMockSignerAddress',
        connect: vi.fn().mockReturnThis(),
        getFeeData: provider && typeof (provider as any).getFeeData === 'function' ? (provider as any).getFeeData : vi.fn().mockResolvedValue({
            gasPrice: actualEthers.parseUnits('10', 'gwei'),
            maxFeePerGas: actualEthers.parseUnits('20', 'gwei'),
            maxPriorityFeePerGas: actualEthers.parseUnits('2', 'gwei'),
        }),
        estimateGas: vi.fn().mockResolvedValue(21000n),
        signTransaction: vi.fn().mockResolvedValue('0xSignedTxData'),
        sendTransaction: vi.fn().mockResolvedValue({ hash: '0xSentTxHash', wait: vi.fn().mockResolvedValue({ status: 1}) }),
        getAddress: vi.fn().mockResolvedValue('0xMockSignerAddress'),
    })),
    Contract: vi.fn().mockImplementation(
        (address: string, abi: unknown, runner?: ethersActualTypes.ContractRunner | null) => {
          if (address === ROOT_CHAIN_MANAGER_ADDRESS_L1_MOCK) return mockRootChainManagerContractEthers;
          if (address === MOCK_CHECKPOINT_MANAGER_ADDR) return mockCheckpointManagerContractEthers;
          if (address === STAKE_MANAGER_ADDRESS_L1_MOCK) return mockStakeManagerContractEthers;
          return createMockEthersContract(address, abi, runner);
        }
    ),
  };
});

// Standalone ethers Wallet and Provider implementations for mockEthersWalletInstance etc.
const mockEthersWalletImpl = {
  address: '0xUserAddressEthersStandalone',
  signMessage: vi.fn().mockResolvedValue('0xSignedMessageStandalone'),
  signTransaction: vi.fn().mockResolvedValue('0xSignedTransactionStandalone'),
  connect: vi.fn().mockReturnThis(),
  // Add other methods if tests rely on them from these specific instances
};

const mockEthersProviderImpl = {
  getBalance: vi.fn().mockResolvedValue(BigInt(1000000000000000000n)),
  getBlock: vi.fn().mockResolvedValue({ hash: '0xBlockHashStandalone', number: 1000001, timestamp: Math.floor(Date.now() / 1000) + 1 }),
  getTransaction: vi.fn().mockResolvedValue({ hash: '0xTransactionHashStandalone', from: '0xSenderStandalone', to: '0xRecipientStandalone', value: BigInt(1000000000000000000n) }),
  getTransactionReceipt: vi.fn().mockResolvedValue({ status: 1, transactionHash: '0xTransactionHashStandalone', blockNumber: 1000001, gasUsed: BigInt(21001) }),
  getNetwork: vi.fn().mockResolvedValue({ chainId: 1n, name: 'mocknetworkStandalone' }),
  getFeeData: vi.fn().mockResolvedValue({ gasPrice: BigInt(10e9), maxFeePerGas: BigInt(20e9), maxPriorityFeePerGas: BigInt(2e9) }),
  // Add other methods
};

export const mockEthersWalletInstance = vi.fn().mockImplementation(() => mockEthersWalletImpl);
export const mockEthersProviderInstance = vi.fn().mockImplementation(() => mockEthersProviderImpl);
export const createMockEthersWallet = () => mockEthersWalletInstance();
export const createMockEthersProvider = () => mockEthersProviderInstance();

// Viem mock clients
export const mockL1PublicClient = {
  getBlockNumber: vi.fn().mockResolvedValue(BigInt(1000000)),
  getBalance: vi.fn().mockResolvedValue(BigInt(1000000000000000000n)),
  getBlock: vi.fn().mockResolvedValue({ hash: '0xBlockHashViemL1' as `0x${string}`, number: BigInt(1000000), timestamp: BigInt(Math.floor(Date.now() / 1000)) }),
  getTransaction: vi.fn().mockResolvedValue({ hash: '0xTransactionHashViemL1' as `0x${string}`, from: '0xSenderAddressViem' as `0x${string}`, to: '0xRecipientAddressViem' as `0x${string}`, value: BigInt(1000000000000000000n) }),
  getTransactionReceipt: vi.fn().mockResolvedValue({ status: 'success' as const, transactionHash: '0xTransactionHashViemL1' as `0x${string}`, blockNumber: BigInt(1000000), gasUsed: BigInt(21000) }),
  readContract: vi.fn().mockImplementation(({ functionName } : { functionName: string }) => {
    switch (functionName) {
      case 'balanceOf': return BigInt(1000000000000000000n);
      case 'symbol': return 'TOKEN';
      case 'decimals': return 18;
      case 'name': return 'Test Token';
      default: return null;
    }
  }),
  call: vi.fn().mockResolvedValue({ data: '0x0000000000000000000000000000000000000000000000000000000000000000' as `0x${string}` }),
  estimateGas: vi.fn().mockResolvedValue(BigInt(21000)),
};

export const mockL2PublicClient = { ...mockL1PublicClient };

export const mockL1WalletClient = {
  account: { address: '0xUserAddressViem' as `0x${string}` },
  getAddresses: vi.fn().mockResolvedValue(['0xUserAddressViem' as `0x${string}`]),
  sendTransaction: vi.fn().mockResolvedValue('0xTransactionHashViem' as `0x${string}`),
  writeContract: vi.fn().mockResolvedValue('0xContractTxHashViem' as `0x${string}`),
};

export const mockL2WalletClient = { ...mockL1WalletClient };

export const mockTestClient = {
  mine: vi.fn().mockResolvedValue({}),
  setBalance: vi.fn().mockResolvedValue({}),
  impersonateAccount: vi.fn().mockResolvedValue({}),
  stopImpersonatingAccount: vi.fn().mockResolvedValue({}),
};

const { createPublicClient, createWalletClient, createTestClient: createTestClientViem } =
  vi.hoisted(() => ({
    createPublicClient: vi.fn(),
    createWalletClient: vi.fn(),
    createTestClient: vi.fn(),
  }));

if (createPublicClient && typeof createPublicClient.mockImplementation === 'function') {
  createPublicClient.mockImplementation(({ chain }: any) =>
    chain?.id === 137 ? mockL2PublicClient : mockL1PublicClient
  );
}
if (createWalletClient && typeof createWalletClient.mockImplementation === 'function') {
  createWalletClient.mockImplementation(({ chain, account }: any) => {
    const client = chain?.id === 137 ? mockL2WalletClient : mockL1WalletClient;
    if (account) (client as any).account = account;
    return client;
  });
}
if (createTestClientViem && typeof createTestClientViem.mockImplementation === 'function') {
    createTestClientViem.mockReturnValue(mockTestClient);
}

export const mockPolygonChains = {
  'ethereum': { id: 1, name: 'Ethereum', nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18, }, rpcUrls: { default: { http: ['https://mainnet.infura.io/v3/mock-key'], }, custom: { http: [], }, }, blockExplorers: { default: { name: 'Etherscan', url: 'https://etherscan.io', }, }, testnet: false, },
  'polygon': { id: 137, name: 'Polygon', nativeCurrency: { name: 'MATIC', symbol: 'MATIC', decimals: 18, }, rpcUrls: { default: { http: ['https://polygon-mainnet.infura.io/v3/mock-key'], }, custom: { http: [], }, }, blockExplorers: { default: { name: 'PolygonScan', url: 'https://polygonscan.com', }, }, testnet: false, },
};

export const mockGasEstimates = {
  safeLow: { maxFeePerGas: BigInt(30000000000), maxPriorityFeePerGas: BigInt(1000000000), },
  average: { maxFeePerGas: BigInt(50000000000), maxPriorityFeePerGas: BigInt(1500000000), },
  fast: { maxFeePerGas: BigInt(80000000000), maxPriorityFeePerGas: BigInt(2000000000), },
  estimatedBaseFee: BigInt(29000000000),
};

console.log('Vitest global setup: All mocks configured.');
