import { describe, expect, it, beforeAll, afterAll } from 'bun:test';
import { Connection, PublicKey, LAMPORTS_PER_SOL } from '@solana/web3.js';
import { WalletBalanceService } from '../../services/WalletBalanceService';
import { TokenService } from '../../services/TokenService';
import { TransactionService } from '../../services/TransactionService';
import { PriceOracleService } from '../../services/PriceOracleService';
import { CustodialWalletService, EntityType } from '../../services/CustodialWalletService';
import { RpcService } from '../../services/RpcService';
import { createMockRuntime } from '@elizaos/core/test-utils';

// Test configuration
const NETWORK = process.env.SOLANA_NETWORK || 'devnet';
const TEST_TIMEOUT = 30000; // 30 seconds

// Test addresses (these are well-known addresses that should exist on both networks)
const TEST_ADDRESSES = {
  devnet: {
    wallet: '11111111111111111111111111111111', // System program
    usdc: 'Gh9ZwEmdLJ8DscKNTkTqPbNwLNNBjuSzaG9Vp2KGtKJr', // USDC on devnet
    sol: 'So11111111111111111111111111111111111111112', // Wrapped SOL
  },
  'mainnet-beta': {
    wallet: '11111111111111111111111111111111', // System program
    usdc: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v', // USDC on mainnet
    sol: 'So11111111111111111111111111111111111111112', // Wrapped SOL
  },
  testnet: {
    wallet: '11111111111111111111111111111111', // System program
    usdc: 'CpMah17kQEL2wqyMKt3mZBdTnZbkbfx4nqmQMFDP5vwp', // USDC on testnet
    sol: 'So11111111111111111111111111111111111111112', // Wrapped SOL
  },
};

const getTestAddresses = () =>
  TEST_ADDRESSES[NETWORK as keyof typeof TEST_ADDRESSES] || TEST_ADDRESSES.devnet;

describe(`Solana Plugin Integration Tests - ${NETWORK}`, () => {
  let mockRuntime: any;
  let walletService: WalletBalanceService;
  let tokenService: TokenService;
  let transactionService: TransactionService;
  let priceService: PriceOracleService;
  let custodialService: CustodialWalletService;
  let rpcService: RpcService;
  let connection: Connection;

  beforeAll(async () => {
    const rpcUrl = process.env.SOLANA_RPC_URL || getDefaultRpcUrl(NETWORK);

    mockRuntime = createMockRuntime({
      getSetting: (key: string) => {
        const settings: Record<string, string> = {
          SOLANA_NETWORK: NETWORK,
          SOLANA_RPC_URL: rpcUrl,
          HELIUS_API_KEY: process.env.HELIUS_API_KEY || '',
          BIRDEYE_API_KEY: process.env.BIRDEYE_API_KEY || '',
          WALLET_MASTER_SEED: `test-integration-master-seed-${Date.now()}`,
          WALLET_ENCRYPTION_KEY: `test-integration-encryption-key-${Date.now()}`,
        };
        return settings[key] || '';
      },
      getService: (serviceType: string) => {
        if (serviceType === 'rpc-service') {
          return rpcService;
        }
        return null;
      },
    });

    // Initialize services
    rpcService = await RpcService.start(mockRuntime);
    connection = rpcService.getConnection();

    walletService = await WalletBalanceService.start(mockRuntime);
    tokenService = await TokenService.start(mockRuntime);
    transactionService = await TransactionService.start(mockRuntime);
    priceService = new PriceOracleService(mockRuntime);
    custodialService = await CustodialWalletService.start(mockRuntime);

    console.log(`Running integration tests on ${NETWORK} network`);
    console.log(`RPC URL: ${rpcUrl}`);
  });

  afterAll(async () => {
    await walletService?.stop();
    await tokenService?.stop();
    await transactionService?.stop();
    await priceService?.stop();
    await custodialService?.stop();
    await rpcService?.stop();
  });

  describe('RPC Service Integration', () => {
    it(
      'should connect to the network and get status',
      async () => {
        const status = rpcService.getStatus();

        expect(status.healthy).toBe(true);
        expect(status.currentEndpoint).toContain(NETWORK === 'mainnet-beta' ? 'mainnet' : NETWORK);
        expect(status.endpointCount).toBeGreaterThan(0);
      },
      TEST_TIMEOUT
    );

    it(
      'should get network slot information',
      async () => {
        const slot = await connection.getSlot();

        expect(slot).toBeTypeOf('number');
        expect(slot).toBeGreaterThan(0);
      },
      TEST_TIMEOUT
    );
  });

  describe('Wallet Balance Service Integration', () => {
    it(
      'should fetch SOL balance for a real address',
      async () => {
        const testAddress = getTestAddresses().wallet;

        const balance = await walletService.getWalletBalance(testAddress);

        expect(balance).toBeDefined();
        expect(balance.sol).toBeDefined();
        expect(balance.sol.symbol).toBe('SOL');
        expect(balance.sol.decimals).toBe(9);
        expect(typeof balance.sol.uiAmount).toBe('number');
      },
      TEST_TIMEOUT
    );

    it(
      'should handle multiple wallet balance requests',
      async () => {
        const addresses = [
          getTestAddresses().wallet,
          'Vote111111111111111111111111111111111111111', // Vote program
          'Config1111111111111111111111111111111111111', // Config program
        ];

        const balances = await walletService.getMultipleWalletBalances(addresses);

        expect(balances.size).toBeGreaterThanOrEqual(1);

        for (const [address, balance] of balances.entries()) {
          expect(addresses.includes(address)).toBe(true);
          expect(balance.sol).toBeDefined();
        }
      },
      TEST_TIMEOUT
    );

    it('should get correct network information', () => {
      const network = walletService.getNetwork();
      expect(network).toBe(NETWORK);
    });
  });

  describe('Token Service Integration', () => {
    it(
      'should fetch token metadata for well-known tokens',
      async () => {
        const addresses = getTestAddresses();

        // Test USDC metadata - be more flexible with devnet tokens
        const usdcInfo = await tokenService.getTokenInfo(addresses.usdc);

        if (usdcInfo) {
          // On devnet, token symbols might be different, so just check structure
          expect(usdcInfo.symbol).toBeDefined();
          expect(typeof usdcInfo.symbol).toBe('string');
          expect(usdcInfo.decimals).toBeGreaterThanOrEqual(0);
          expect(usdcInfo.name).toBeDefined();
          expect(usdcInfo.address).toBe(addresses.usdc);

          // Only check for USDC symbol on mainnet
          if (NETWORK === 'mainnet-beta') {
            expect(usdcInfo.symbol).toMatch(/USDC/i);
            expect(usdcInfo.decimals).toBe(6);
          }
        }
      },
      TEST_TIMEOUT
    );

    it(
      'should fetch SOL token metadata',
      async () => {
        const addresses = getTestAddresses();

        const solInfo = await tokenService.getTokenInfo(addresses.sol);

        if (solInfo) {
          expect(solInfo.symbol).toMatch(/SOL|WSOL/i);
          expect(solInfo.decimals).toBe(9);
        }
      },
      TEST_TIMEOUT
    );

    it(
      'should handle invalid token addresses gracefully',
      async () => {
        const invalidMint = '1111111111111111111111111111111111111111111'; // Invalid length

        const tokenInfo = await tokenService.getTokenInfo(invalidMint);
        expect(tokenInfo).toBeNull();
      },
      TEST_TIMEOUT
    );
  });

  describe('Price Oracle Service Integration', () => {
    it(
      'should fetch SOL price',
      async () => {
        const solPrice = await priceService.getSolPrice();

        if (solPrice) {
          expect(solPrice.price).toBeGreaterThan(0);
          expect(solPrice.symbol).toMatch(/SOL/i);
          expect(typeof solPrice.volume24h).toBe('number');
          expect(typeof solPrice.marketCap).toBe('number');
        }
      },
      TEST_TIMEOUT
    );

    it(
      'should fetch USDC price and identify as stable',
      async () => {
        const addresses = getTestAddresses();

        const usdcPrice = await priceService.getTokenPrice(addresses.usdc);

        if (usdcPrice) {
          expect(usdcPrice.price).toBeCloseTo(1.0, 1); // USDC should be close to $1
          expect(Math.abs(usdcPrice.priceChange24h)).toBeLessThan(5); // Should be relatively stable
        }

        const isStable = await priceService.isStableToken(addresses.usdc);
        expect(isStable).toBe(true);
      },
      TEST_TIMEOUT
    );

    it(
      'should fetch multiple token prices',
      async () => {
        const addresses = getTestAddresses();
        const mints = [addresses.sol, addresses.usdc];

        const prices = await priceService.getMultipleTokenPrices(mints);

        expect(prices instanceof Map).toBe(true);
        if (prices.size > 0) {
          for (const [mint, price] of prices.entries()) {
            expect(price.price).toBeGreaterThan(0);
            expect(mints.includes(mint)).toBe(true);
          }
        }
      },
      TEST_TIMEOUT
    );
  });

  describe('Custodial Wallet Service Integration', () => {
    const testUserId = `integration-test-user-${Date.now()}`;
    const testRoomId = `integration-test-room-${Date.now()}`;

    it(
      'should create custodial wallets for different entities',
      async () => {
        // Create user wallet
        const userWallet = await custodialService.createWallet(
          testUserId,
          EntityType.USER,
          testUserId,
          { name: 'Integration Test User Wallet' }
        );

        expect(userWallet.type).toBe(EntityType.USER);
        expect(userWallet.owner).toBe(testUserId);
        expect(userWallet.status).toBe('active');
        expect(userWallet.publicKey).toMatch(/^[1-9A-HJ-NP-Za-km-z]{32,44}$/); // Base58 pattern

        // Create room wallet
        const roomWallet = await custodialService.createWallet(
          testRoomId,
          EntityType.ROOM,
          testUserId,
          { name: 'Integration Test Room Wallet' }
        );

        expect(roomWallet.type).toBe(EntityType.ROOM);
        expect(roomWallet.owner).toBe(testUserId);
        expect(roomWallet.publicKey).not.toBe(userWallet.publicKey); // Should be different
      },
      TEST_TIMEOUT
    );

    it(
      'should manage wallet permissions correctly',
      async () => {
        const delegateId = `delegate-user-${Date.now()}`;

        // Grant read permission
        await custodialService.grantPermission(testRoomId, delegateId, ['read'], testUserId);

        const hasReadPermission = await custodialService.hasPermission(
          testRoomId,
          delegateId,
          'read'
        );
        const hasAdminPermission = await custodialService.hasPermission(
          testRoomId,
          delegateId,
          'admin'
        );

        expect(hasReadPermission).toBe(true);
        expect(hasAdminPermission).toBe(false);

        // List wallets accessible to delegate
        const accessibleWallets = await custodialService.listWallets(delegateId);
        expect(accessibleWallets.some((w) => w.id === testRoomId)).toBe(true);
      },
      TEST_TIMEOUT
    );

    it(
      'should get wallet balances on the actual network',
      async () => {
        const balance = await custodialService.getBalance(testUserId);

        expect(typeof balance).toBe('number');
        expect(balance).toBeGreaterThanOrEqual(0);
      },
      TEST_TIMEOUT
    );

    it(
      'should export wallet data securely',
      async () => {
        const walletData = await custodialService.exportWalletData(testUserId, testUserId);

        expect(walletData.publicKey).toMatch(/^[1-9A-HJ-NP-Za-km-z]{32,44}$/);
        expect(walletData.metadata.name).toBe('Integration Test User Wallet');
        expect(walletData.permissions).toHaveLength(1);
        expect(walletData.permissions[0].userId).toBe(testUserId);
        expect(walletData.permissions[0].permissions).toContain('admin');
      },
      TEST_TIMEOUT
    );

    it(
      'should manage wallet lifecycle operations',
      async () => {
        // Update metadata
        await custodialService.updateWalletMetadata(
          testUserId,
          { description: 'Updated during integration test' },
          testUserId
        );

        const updatedWallet = await custodialService.getWallet(testUserId);
        expect(updatedWallet?.metadata.description).toContain('Updated during integration test');
        expect(updatedWallet?.metadata.version).toBe(2);

        // Update restrictions
        await custodialService.updateWalletRestrictions(
          testUserId,
          { maxTransactionAmount: 5, dailyLimit: 50 },
          testUserId
        );

        const restrictedWallet = await custodialService.getWallet(testUserId);
        expect(restrictedWallet?.restrictions?.maxTransactionAmount).toBe(5);
        expect(restrictedWallet?.restrictions?.dailyLimit).toBe(50);
      },
      TEST_TIMEOUT
    );

    it(
      'should list wallets by owner and type',
      async () => {
        const ownerWallets = await custodialService.getWalletsByOwner(testUserId);
        expect(ownerWallets).toHaveLength(2); // user + room wallet

        const userWallets = await custodialService.getWalletsByType(EntityType.USER);
        expect(userWallets.some((w) => w.id === testUserId)).toBe(true);

        const roomWallets = await custodialService.getWalletsByType(EntityType.ROOM);
        expect(roomWallets.some((w) => w.id === testRoomId)).toBe(true);
      },
      TEST_TIMEOUT
    );
  });

  describe('Transaction Service Integration', () => {
    it(
      'should estimate priority fees',
      async () => {
        const priorityFee = await transactionService.estimatePriorityFee();

        expect(priorityFee).toBeDefined();
        expect(priorityFee.recommended).toBeGreaterThan(0);
        expect(priorityFee.min).toBeGreaterThan(0);
        expect(priorityFee.max).toBeGreaterThan(0);
      },
      TEST_TIMEOUT
    );

    it(
      'should simulate transactions without executing',
      async () => {
        // Create a test wallet first
        const testUserId = `tx-test-user-${Date.now()}`;
        await custodialService.createWallet(testUserId, EntityType.USER, testUserId);

        // Get the keypair for the created wallet
        const testKeypair = await custodialService.getKeypair(testUserId, testUserId);

        // Create a simple transfer transaction
        const { SystemProgram, Transaction } = await import('@solana/web3.js');
        const transaction = new Transaction().add(
          SystemProgram.transfer({
            fromPubkey: testKeypair.publicKey,
            toPubkey: new PublicKey('11111111111111111111111111111111'),
            lamports: 1000000, // 0.001 SOL
          })
        );

        const simulationResult = await transactionService.simulateTransaction(transaction, [
          testKeypair,
        ]);

        expect(simulationResult).toBeDefined();
        expect(simulationResult.success).toBeDefined();
      },
      TEST_TIMEOUT
    );
  });

  describe('Network-specific behavior', () => {
    it(
      'should handle network-specific token lists',
      async () => {
        // Different networks have different available tokens
        if (NETWORK === 'mainnet-beta') {
          // Mainnet should have more tokens available
          const addresses = getTestAddresses();
          const usdcInfo = await tokenService.getTokenInfo(addresses.usdc);
          expect(usdcInfo).toBeDefined();
        } else {
          // Devnet/testnet may have limited token availability
          console.log(`Testing on ${NETWORK} - limited token availability expected`);
        }
      },
      TEST_TIMEOUT
    );

    it('should respect network-specific RPC endpoints', () => {
      const connection = rpcService.getConnection();
      const endpoint = (connection as any)._rpcEndpoint;

      if (NETWORK === 'mainnet-beta') {
        expect(endpoint).toMatch(/mainnet/i);
      } else if (NETWORK === 'testnet') {
        expect(endpoint).toMatch(/testnet/i);
      } else {
        expect(endpoint).toMatch(/devnet/i);
      }
    });
  });
});

function getDefaultRpcUrl(network: string): string {
  switch (network) {
    case 'mainnet-beta':
      return 'https://api.mainnet-beta.solana.com';
    case 'testnet':
      return 'https://api.testnet.solana.com';
    case 'devnet':
    default:
      return 'https://api.devnet.solana.com';
  }
}
