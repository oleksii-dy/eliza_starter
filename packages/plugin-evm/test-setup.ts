import { vi } from 'vitest';

// Mock @elizaos/core
vi.mock('@elizaos/core', () => ({
  elizaLogger: {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
    log: vi.fn(),
  },
  logger: {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
    log: vi.fn(),
  },
  ModelType: {
    TEXT_SMALL: 'TEXT_SMALL',
    TEXT_LARGE: 'TEXT_LARGE',
    TEXT_EMBEDDING: 'TEXT_EMBEDDING',
    TEXT_REASONING_SMALL: 'TEXT_REASONING_SMALL',
    TEXT_REASONING_LARGE: 'TEXT_REASONING_LARGE',
    LARGE: 'LARGE',
  },
  TEEMode: {
    OFF: 'OFF',
    LOCAL: 'LOCAL',
    REMOTE: 'REMOTE',
  },
  ServiceType: {
    UNKNOWN: 'UNKNOWN',
    TRANSCRIPTION: 'transcription',
    VIDEO: 'video',
    BROWSER: 'browser',
    PDF: 'pdf',
    REMOTE_FILES: 'aws_s3',
    WEB_SEARCH: 'web_search',
    EMAIL: 'email',
    TEE: 'tee',
    TASK: 'task',
    WALLET: 'wallet',
    LP_POOL: 'lp_pool',
    TOKEN_DATA: 'token_data',
    TUNNEL: 'tunnel',
  },
  parseKeyValueXml: vi.fn().mockImplementation((xml) => {
    // Simple XML parser for tests
    const matches = xml.matchAll(/<(\w+)>([^<]*)<\/\1>/g);
    const result: Record<string, string> = {};
    for (const match of matches) {
      result[match[1]] = match[2].trim();
    }
    return result;
  }),
  composePromptFromState: vi.fn().mockReturnValue('mocked prompt'),
  generateText: vi.fn().mockResolvedValue('mocked text'),
  formatEther: vi.fn((value) => (BigInt(value) / BigInt(1e18)).toString()),
  parseEther: vi.fn((value) => BigInt(Math.floor(parseFloat(value) * 1e18))),
  // Add missing exports
  ActionExample: vi.fn(),
  Content: vi.fn(),
  Memory: vi.fn(),
  State: vi.fn(),
  IAgentRuntime: vi.fn(),
  HandlerCallback: vi.fn(),
  Action: vi.fn(),
  Provider: vi.fn(),
  Evaluator: vi.fn(),
  Plugin: vi.fn(),
  Service: vi.fn(),
  asUUID: vi.fn((id) => id),
  UUID: vi.fn(),
  IWalletService: vi.fn(),
  ICacheManager: vi.fn(),
  IDatabaseAdapter: vi.fn(),
  IMemoryManager: vi.fn(),
}));

// Mock complex dependencies
vi.mock('@alchemy/aa-core', () => ({
  LocalAccountSigner: {
    privateKeyToAccountSigner: vi.fn().mockReturnValue({
      signMessage: vi.fn(),
      signTransaction: vi.fn(),
      address: '0x1234567890123456789012345678901234567890',
    }),
  },
  WalletClientSigner: vi.fn().mockImplementation(() => ({
    signMessage: vi.fn(),
    signTransaction: vi.fn(),
    address: '0x1234567890123456789012345678901234567890',
  })),
  SmartAccountSigner: vi.fn().mockImplementation(() => ({
    signMessage: vi.fn(),
    signTransaction: vi.fn(),
    address: '0x1234567890123456789012345678901234567890',
  })),
}));

vi.mock('@safe-global/protocol-kit', () => ({
  SafeApiKit: vi.fn(),
  Safe: {
    create: vi.fn().mockResolvedValue({
      getAddress: vi.fn().mockResolvedValue('0x1234567890123456789012345678901234567890'),
      createTransaction: vi.fn(),
      signTransaction: vi.fn(),
      executeTransaction: vi.fn(),
    }),
  },
}));

vi.mock('ethers', () => ({
  ethers: {
    Wallet: vi.fn().mockImplementation(() => ({
      address: '0x1234567890123456789012345678901234567890',
      privateKey: '0x1234567890123456789012345678901234567890123456789012345678901234',
      connect: vi.fn().mockReturnThis(),
      getBalance: vi.fn().mockResolvedValue(BigInt('1000000000000000000')),
      sendTransaction: vi.fn().mockResolvedValue({ hash: '0xmockhash' }),
    })),
    JsonRpcProvider: vi.fn().mockImplementation(() => ({
      getBlockNumber: vi.fn().mockResolvedValue(1000000),
      getGasPrice: vi.fn().mockResolvedValue(BigInt('20000000000')),
      getBalance: vi.fn().mockResolvedValue(BigInt('1000000000000000000')),
      estimateGas: vi.fn().mockResolvedValue(BigInt('21000')),
      getTransaction: vi.fn(),
      waitForTransaction: vi.fn(),
    })),
    Contract: vi.fn().mockImplementation(() => ({
      interface: { encodeFunctionData: vi.fn() },
      address: '0x1234567890123456789012345678901234567890',
    })),
    getDefaultProvider: vi.fn(),
    parseEther: vi.fn((value) => BigInt(Math.floor(parseFloat(value) * 1e18))),
    formatEther: vi.fn((value) => (BigInt(value) / BigInt(1e18)).toString()),
  },
  Contract: vi.fn(),
  Wallet: vi.fn(),
  JsonRpcProvider: vi.fn(),
}));

vi.mock('viem', () => ({
  createWalletClient: vi.fn().mockImplementation((config) => {
    // Get the account from config if provided
    const account = config?.account || { address: '0x1234567890123456789012345678901234567890' };
    const chain = config?.chain || { id: 11155111, name: 'Sepolia', testnet: true };
    // Extract URL from transport config
    let transportUrl = 'http://localhost:8545';
    if (config?.transport) {
      // Check if transport is an http transport with a URL
      if (typeof config.transport === 'function') {
        // viem's http() returns a function, but we need to extract the URL
        // For testing, we'll look at the chain's custom RPC URLs
        if (chain.rpcUrls?.custom?.http?.[0]) {
          transportUrl = chain.rpcUrls.custom.http[0];
        } else if (chain.rpcUrls?.default?.http?.[0]) {
          transportUrl = chain.rpcUrls.default.http[0];
        }
      }
    }
    
    return {
      account,
      chain,
      transport: { url: transportUrl },
      sendTransaction: vi.fn().mockImplementation(async (args) => {
        // Validate transaction parameters
        if (args.to && args.to.toLowerCase() === 'invalid-address') {
          throw new Error('Invalid address');
        }
        if (args.value === BigInt(0)) {
          throw new Error('Cannot transfer zero amount');
        }
        // Check for large transfers (> 100 ETH is considered too much for test wallet)
        if (args.value && args.value >= BigInt('100000000000000000000')) { // >= 100 ETH
          throw new Error('insufficient funds for gas * price + value');
        }
        // Return proper 64-character hash
        return '0x' + 'a'.repeat(64);
      }),
      signMessage: vi.fn(),
      writeContract: vi.fn().mockResolvedValue('0x' + 'b'.repeat(64)),
    };
  }),
  createPublicClient: vi.fn().mockImplementation((config) => {
    const chain = config?.chain || { id: 11155111, name: 'Sepolia', testnet: true };
    // Extract URL from transport config
    let transportUrl = 'http://localhost:8545';
    if (config?.transport) {
      // Check if transport is an http transport with a URL
      if (typeof config.transport === 'function') {
        // viem's http() returns a function, but we need to extract the URL
        // For testing, we'll look at the chain's custom RPC URLs
        if (chain.rpcUrls?.custom?.http?.[0]) {
          transportUrl = chain.rpcUrls.custom.http[0];
        } else if (chain.rpcUrls?.default?.http?.[0]) {
          transportUrl = chain.rpcUrls.default.http[0];
        }
      }
    }
    
    return {
      chain,
      transport: { url: transportUrl },
      getBlockNumber: vi.fn().mockResolvedValue(BigInt(1000000)),
      getGasPrice: vi.fn().mockResolvedValue(BigInt('20000000000')),
      getBalance: vi.fn().mockResolvedValue(BigInt('1000000000000000000')),
      estimateGas: vi.fn().mockResolvedValue(BigInt('21000')),
      readContract: vi.fn().mockResolvedValue(18), // Default decimals for ERC20
      simulateContract: vi.fn().mockResolvedValue({ result: true }),
      getTransaction: vi.fn(),
      waitForTransactionReceipt: vi.fn().mockResolvedValue({ status: 'success' }),
      getChainId: vi.fn().mockResolvedValue(chain.id),
    };
  }),
  http: vi.fn(),
  parseEther: vi.fn((value) => {
    if (typeof value === 'string') {
      const parsed = BigInt(Math.floor(parseFloat(value) * 1e18));
      // Log for debugging
      if (parseFloat(value) > 1000) {
        console.log(`parseEther called with large value: ${value} ETH = ${parsed} wei`);
      }
      return parsed;
    }
    return BigInt(0);
  }),
  formatEther: vi.fn((value) => {
    if (typeof value === 'bigint') {
      return (value / BigInt(1e18)).toString();
    }
    return '0';
  }),
  formatUnits: vi.fn((value, decimals = 18) => {
    if (typeof value === 'bigint') {
      return (value / BigInt(10 ** decimals)).toString();
    }
    return '0';
  }),
  parseUnits: vi.fn((value, decimals = 18) => {
    if (typeof value === 'string') {
      return BigInt(Math.floor(parseFloat(value) * (10 ** decimals)));
    }
    return BigInt(0);
  }),
  isAddress: vi.fn((address) => {
    if (typeof address !== 'string') return false;
    if (address.toLowerCase() === 'invalid-address') return false;
    return address.startsWith('0x') && address.length === 42 && /^0x[a-fA-F0-9]{40}$/i.test(address);
  }),
  getContract: vi.fn().mockReturnValue({
    read: {},
    write: {},
    address: '0x1234567890123456789012345678901234567890',
  }),
  encodeFunctionData: vi.fn().mockReturnValue('0xa9059cbb0000000000000000000000000000000000000000000000000000000000000000'),
  decodeFunctionResult: vi.fn(),
  parseAbi: vi.fn().mockReturnValue([]),
}));

// Mock viem/accounts
vi.mock('viem/accounts', () => ({
  privateKeyToAccount: vi.fn((privateKey) => ({
    address: '0xE234F3633E9C86a864fE8b6A9b9c97Fc97899B9c',
    publicKey: '0xmockpublickey',
    signMessage: vi.fn(),
    signTransaction: vi.fn(),
    signTypedData: vi.fn(),
  })),
  generatePrivateKey: vi.fn(() => '0x0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef'),
}));

// Mock viem/chains
vi.mock('viem/chains', () => {
  const createChain = (id, name, testnet = false, symbol = 'ETH') => ({
    id,
    name,
    testnet,
    nativeCurrency: {
      name: symbol === 'ETH' ? 'Ether' : symbol,
      symbol,
      decimals: 18,
    },
    rpcUrls: {
      default: {
        http: [`https://${name.toLowerCase().replace(/\s+/g, '-')}.example.com`],
      },
      public: {
        http: [`https://${name.toLowerCase().replace(/\s+/g, '-')}.example.com`],
      },
    },
  });
  
  return {
    mainnet: createChain(1, 'Ethereum', false),
    sepolia: createChain(11155111, 'Sepolia', true),
    baseSepolia: createChain(84532, 'Base Sepolia', true),
    optimismSepolia: createChain(11155420, 'OP Sepolia', true),
    arbitrumSepolia: createChain(421614, 'Arbitrum Sepolia', true),
    polygon: createChain(137, 'Polygon', false, 'MATIC'),
    polygonMumbai: createChain(80001, 'Polygon Mumbai', true, 'MATIC'),
    arbitrum: createChain(42161, 'Arbitrum One', false),
    arbitrumGoerli: createChain(421613, 'Arbitrum Goerli', true),
    optimism: createChain(10, 'OP Mainnet', false),
    optimismGoerli: createChain(420, 'Optimism Goerli', true),
    base: createChain(8453, 'Base', false),
    baseGoerli: createChain(84531, 'Base Goerli', true),
    bsc: createChain(56, 'BNB Smart Chain', false, 'BNB'),
    bscTestnet: createChain(97, 'BNB Smart Chain Testnet', true, 'BNB'),
    avalanche: createChain(43114, 'Avalanche', false, 'AVAX'),
    avalancheFuji: createChain(43113, 'Avalanche Fuji', true, 'AVAX'),
    goerli: createChain(5, 'Goerli', true),
    fantom: createChain(250, 'Fantom', false, 'FTM'),
    fantomTestnet: createChain(4002, 'Fantom Testnet', true, 'FTM'),
    gnosis: createChain(100, 'Gnosis', false, 'xDAI'),
    celo: createChain(42220, 'Celo', false, 'CELO'),
    celoAlfajores: createChain(44787, 'Celo Alfajores', true, 'CELO'),
    aurora: createChain(1313161554, 'Aurora', false),
    auroraTestnet: createChain(1313161555, 'Aurora Testnet', true),
    moonbeam: createChain(1284, 'Moonbeam', false, 'GLMR'),
    moonriver: createChain(1285, 'Moonriver', false, 'MOVR'),
    moonbaseAlpha: createChain(1287, 'Moonbase Alpha', true, 'DEV'),
    metis: createChain(1088, 'Metis', false, 'METIS'),
    metisGoerli: createChain(599, 'Metis Goerli', true, 'METIS'),
    cronos: createChain(25, 'Cronos', false, 'CRO'),
    cronosTestnet: createChain(338, 'Cronos Testnet', true, 'CRO'),
    mantle: createChain(5000, 'Mantle', false, 'MNT'),
    mantleTestnet: createChain(5001, 'Mantle Testnet', true, 'MNT'),
    linea: createChain(59144, 'Linea', false),
    lineaTestnet: createChain(59140, 'Linea Testnet', true),
    scroll: createChain(534352, 'Scroll', false),
    scrollSepolia: createChain(534351, 'Scroll Sepolia', true),
    polygonZkEvm: createChain(1101, 'Polygon zkEVM', false),
    polygonZkEvmTestnet: createChain(1442, 'Polygon zkEVM Testnet', true),
  };
});

vi.mock('@lifi/sdk', () => ({
  createConfig: vi.fn().mockReturnValue({
    integrator: 'eliza',
    chains: [{ id: 1 }, { id: 10 }, { id: 11155111 }],
  }),
  EVM: vi.fn().mockImplementation(() => ({
    getQuote: vi.fn().mockResolvedValue({
      estimate: {
        toAmount: '1000000000000000000',
        gasCosts: [{ amount: '100000000000000' }],
      },
      transactionRequest: {
        to: '0x1234567890123456789012345678901234567890',
        data: '0xmockdata',
        value: '1000000000000000000',
        gasLimit: '200000',
      },
    }),
    getRoutes: vi.fn().mockResolvedValue({
      routes: [{
        id: 'test-route',
        fromChainId: 1,
        toChainId: 10,
        fromAmount: '1000000000000000000',
        toAmount: '990000000000000000',
      }],
    }),
  })),
  LiFi: vi.fn().mockImplementation(() => ({
    getQuote: vi.fn().mockResolvedValue({
      estimate: {
        toAmount: '1000000000000000000',
        gasCosts: [{ amount: '100000000000000' }],
        fromAmount: '1000000000000000000',
        executionDuration: 30,
      },
      action: {
        fromChainId: 1,
        toChainId: 1,
        fromToken: {
          address: '0x0000000000000000000000000000000000000000',
          symbol: 'ETH',
          decimals: 18,
        },
        toToken: {
          address: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
          symbol: 'USDC',
          decimals: 6,
        },
      },
      transactionRequest: {
        to: '0x1234567890123456789012345678901234567890',
        data: '0xmockdata',
        value: '1000000000000000000',
        gasLimit: '200000',
      },
    }),
    getRoutes: vi.fn().mockResolvedValue({
      routes: [{
        id: 'test-route',
        fromChainId: 1,
        toChainId: 10,
        fromAmount: '1000000000000000000',
        toAmount: '990000000000000000',
        steps: [{
          type: 'swap',
          tool: 'uniswap',
          estimate: {
            fromAmount: '1000000000000000000',
            toAmount: '990000000000000000',
          },
        }],
      }],
    }),
    executeRoute: vi.fn().mockResolvedValue({
      transactionHash: '0x' + 'c'.repeat(64),
    }),
  })),
  getChains: vi.fn().mockResolvedValue([
    { id: 1, name: 'Ethereum' },
    { id: 10, name: 'Optimism' },
    { id: 11155111, name: 'Sepolia' },
  ]),
  getToken: vi.fn().mockImplementation(async (chainId, tokenSymbolOrAddress) => {
    const tokens: Record<string, any> = {
      'ETH': {
        symbol: 'ETH',
        decimals: 18,
        address: '0x0000000000000000000000000000000000000000',
      },
      'USDC': {
        symbol: 'USDC',
        decimals: 6,
        address: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
      },
      'USDT': {
        symbol: 'USDT',
        decimals: 6,
        address: '0xdAC17F958D2ee523a2206206994597C13D831ec7',
      },
      'WETH': {
        symbol: 'WETH',
        decimals: 18,
        address: '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2',
      },
    };
    
    // Return token if found, otherwise throw error
    const token = tokens[tokenSymbolOrAddress.toUpperCase()];
    if (token) {
      return token;
    }
    
    // If it's an address, return a generic token
    if (tokenSymbolOrAddress.startsWith('0x')) {
      return {
        symbol: 'UNKNOWN',
        decimals: 18,
        address: tokenSymbolOrAddress,
      };
    }
    
    throw new Error(`Token ${tokenSymbolOrAddress} not found`);
  }),
}));

// Global setup
global.fetch = vi.fn().mockResolvedValue({
  ok: true,
  json: vi.fn().mockResolvedValue({}),
  text: vi.fn().mockResolvedValue(''),
  headers: new Headers(),
  status: 200,
  statusText: 'OK',
}) as any;
process.env.NODE_ENV = 'test';
process.env.VITEST = 'true';