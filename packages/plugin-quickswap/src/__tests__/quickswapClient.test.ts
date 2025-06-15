import { describe, it, expect, vi, beforeEach } from 'vitest';
import { initializeQuickswapClient } from '../utils/quickswapClient.js';
import { IAgentRuntime } from '@elizaos/core';
import { JsonRpcProvider, Wallet, Contract, parseUnits } from 'ethers';
import {
  ChainId,
  Fetcher,
  CurrencyAmount,
  Trade,
  Percent,
  Router,
  TokenAmount,
  Pair,
} from 'quickswap-sdk';

// Mock external dependencies
vi.mock('ethers', async (importOriginal) => {
  const actual = await importOriginal<typeof import('ethers')>();
  return {
    ...actual,
    JsonRpcProvider: vi.fn(() => ({
      getNetwork: vi.fn(() => Promise.resolve({ chainId: 137 })),
      getTransactionReceipt: vi.fn((hash) => {
        if (hash === '0xSuccessTxHash') {
          return Promise.resolve({
            status: 1,
            blockNumber: 123,
            gasUsed: BigInt('21000'),
            from: '0xFrom',
            to: '0xTo',
            hash: '0xSuccessTxHash',
          });
        } else if (hash === '0xPendingTxHash') {
          return Promise.resolve(null);
        }
        return Promise.resolve(null);
      }),
      getTransaction: vi.fn((hash) => {
        if (hash === '0xPendingTxHash') {
          return Promise.resolve({
            from: '0xFrom',
            to: '0xTo',
            value: BigInt('100'),
            hash: '0xPendingTxHash',
          });
        }
        return Promise.resolve(null);
      }),
    })),
    Wallet: vi.fn(() => ({
      address: '0xmockWalletAddress',
      sendTransaction: vi.fn(() =>
        Promise.resolve({
          hash: '0xmockTransactionHash',
          wait: vi.fn(() =>
            Promise.resolve({
              status: 1,
              blockNumber: 123,
              gasUsed: BigInt('21000'),
              from: '0xFrom',
              to: '0xTo',
              hash: '0xmockTransactionHash',
            })
          ),
        })
      ),
    })),
    Contract: vi.fn((address, abi, signerOrProvider) => {
      const mockContract = {
        decimals: vi.fn(() => Promise.resolve(18)),
        symbol: vi.fn(() => Promise.resolve('MOCK')),
        totalSupply: vi.fn(() => Promise.resolve(BigInt('1000000000000000000000'))),
        // Generic handler for any method dynamically called on the contract
        // This simulates the router contract methods like swapExactTokensForTokens
        // It should return a transaction object with a .wait() method
        simulateTransaction: vi.fn(() =>
          Promise.resolve({
            hash: '0xmockTransactionHash',
            wait: vi.fn(() =>
              Promise.resolve({
                status: 1,
                blockNumber: 123,
                gasUsed: BigInt('21000'),
                from: '0xFrom',
                to: '0xTo',
                hash: '0xmockTransactionHash',
              })
            ),
          })
        ),
      };

      // Use a Proxy to dynamically handle method access,
      // returning `simulateTransaction` for any method not explicitly mocked
      return new Proxy(mockContract, {
        get: (target, prop, receiver) => {
          if (typeof prop === 'string' && prop in target) {
            return Reflect.get(target, prop, receiver);
          }
          // If the property is a method name (string) and not already mocked,
          // return the generic simulateTransaction mock.
          // This covers method calls like `routerContract.swapExactTokensForTokens(...args)`
          if (typeof target.simulateTransaction === 'function') {
            return target.simulateTransaction;
          }
          return Reflect.get(target, prop, receiver);
        },
      });
    }),
    parseUnits: vi.fn((amount, decimals) =>
      BigInt(Math.floor(parseFloat(amount) * 10 ** decimals).toString())
    ),
    Interface: vi.fn(() => ({
      encodeFunctionData: vi.fn(() => '0xmockEncodedFunctionData'),
    })),
  };
});

vi.mock('quickswap-sdk', async (importOriginal) => {
  const actual = await importOriginal<typeof import('quickswap-sdk')>();

  // A simplified mock for Token to avoid internal sdk validation issues
  // This mock should contain all properties and methods that quickswapClient.ts attempts to access
  const mockToken = (
    chainId: ChainId,
    address: string,
    decimals: number,
    symbol: string,
    name: string
  ) => ({
    chainId: chainId,
    address: address,
    decimals: decimals,
    symbol: symbol,
    name: name,
    // Add any other properties/methods accessed by quickswapClient.ts if needed
    equals: vi.fn((other: any) => other.address.toLowerCase() === address.toLowerCase()),
    sortsBefore: vi.fn(() => false),
    isNative: false,
    isToken: true,
    serialize: vi.fn(() => ({
      chainId: chainId,
      address: address,
      decimals: decimals,
      symbol: symbol,
      name: name,
      success: true,
    })),
    get wrapped() {
      return this; // For WETH.wrapped
    },
  });

  // Mock CurrencyAmount to prevent BigInt serialization issues when logging
  const MockCurrencyAmount = vi.fn((token, rawAmount) => {
    return {
      token,
      raw: rawAmount,
      toExact: vi.fn(() => (Number(rawAmount) / 10 ** token.decimals).toString()),
      toSignificant: vi.fn((significantDigits?: number) =>
        (Number(rawAmount) / 10 ** token.decimals).toFixed(significantDigits || 6)
      ),
      wrapped: vi.fn(() => MockCurrencyAmount(token.wrapped, rawAmount)),
    };
  }) as any;

  // Mock TokenAmount, similar to CurrencyAmount for consistent BigInt handling
  const MockTokenAmount = vi.fn((token, rawAmount) => {
    return {
      token,
      raw: rawAmount,
      toExact: vi.fn(() => (Number(rawAmount) / 10 ** token.decimals).toString()),
      toSignificant: vi.fn((significantDigits?: number) =>
        (Number(rawAmount) / 10 ** token.decimals).toFixed(significantDigits || 6)
      ),
    };
  }) as any;

  return {
    ...actual,
    Token: vi.fn((chainId, address, decimals, symbol, name) =>
      mockToken(chainId, address, decimals, symbol, name)
    ) as any, // Mock Token constructor
    WETH: {
      [actual.ChainId.MATIC]: mockToken(
        actual.ChainId.MATIC,
        '0x7ceb23fd6bc0add59e62ac25578270cff1b9f619',
        18,
        'WMATIC',
        'Wrapped MATIC'
      ),
    },
    Fetcher: {
      fetchTokenData: vi.fn((chainId, address, provider) => {
        // Mock specific hardcoded tokens in quickswapClient.ts first
        const lowerCaseAddress = address.toLowerCase();
        if (lowerCaseAddress === '0x2791b072600277340f1ada76ae19a6c09bed2737') {
          // USDC
          return Promise.resolve(
            mockToken(chainId, '0x2791B072600277340f1aDa76aE19A6C09bED2737', 6, 'USDC', 'USD Coin')
          );
        } else if (lowerCaseAddress === '0x8f3cf7ad23cd3cadbd9735fd5cbf25ab28cef580') {
          // DAI
          return Promise.resolve(
            mockToken(
              chainId,
              '0x8f3Cf7ad23Cd3CaDbD9735Fd5CbF25ab28cef580',
              18,
              'DAI',
              'Dai Stablecoin'
            )
          );
        } else if (lowerCaseAddress === '0x831753dd7087dfc61') {
          // QUICK
          return Promise.resolve(
            mockToken(chainId, '0x831753DD7087DfC61', 18, 'QUICK', 'Quickswap')
          );
        }
        // For 0xMockTokenAddress, it should resolve successfully
        if (lowerCaseAddress === '0xmocktokenaddress') {
          return Promise.resolve(
            mockToken(chainId, address, 18, 'GENERIC_MOCK', 'Generic Mock Token')
          );
        }
        // For '0xUnknownTokenAddress', explicitly reject to trigger the Contract fallback in quickswapClient.ts
        if (lowerCaseAddress === '0xunknowntokenaddress') {
          return Promise.reject(
            new Error('Simulated Fetcher.fetchTokenData rejection for 0xUnknownTokenAddress')
          );
        }
        return Promise.reject(new Error('Token not found in mock Fetcher.fetchTokenData'));
      }),
      fetchPairData: vi.fn((tokenA, tokenB, provider) => {
        const mockWmatic = mockToken(
          actual.ChainId.MATIC,
          '0x7ceb23fd6bc0add59e62ac25578270cff1b9f619',
          18,
          'WMATIC',
          'Wrapped MATIC'
        );
        const mockUsdc = mockToken(
          actual.ChainId.MATIC,
          '0x2791B072600277340f1aDa76aE19A6C09bED2737',
          6,
          'USDC',
          'USD Coin'
        );

        if (
          (tokenA.symbol === 'WMATIC' && tokenB.symbol === 'USDC') ||
          (tokenA.symbol === 'USDC' && tokenB.symbol === 'WMATIC')
        ) {
          const reserve0 = new MockTokenAmount(mockWmatic, BigInt('1000000000000000000000'));
          const reserve1 = new MockTokenAmount(mockUsdc, BigInt('500000000'));

          const mockPair = {
            token0: mockWmatic,
            token1: mockUsdc,
            reserve0: reserve0,
            reserve1: reserve1,
            liquidityToken: mockToken(
              actual.ChainId.MATIC,
              '0xMockLPTokenAddress',
              18,
              'QUICKSWAP_LP',
              'Quickswap LP Token'
            ),
            token0Price: { toSignificant: vi.fn((digits?: number) => '0.5') },
            token1Price: { toSignificant: vi.fn((digits?: number) => '2.0') },
            getLiquidityMinted: vi.fn(
              () =>
                new MockTokenAmount(
                  mockToken(actual.ChainId.MATIC, '0xMockLPTokenAddress', 18, 'LP', 'LP Token'),
                  BigInt('1000')
                )
            ),
            getLiquidityValue: vi.fn((token, totalSupply, liquidityAmount) => {
              if (token.symbol === 'WMATIC')
                return new MockTokenAmount(mockWmatic, BigInt('500000000000000000'));
              if (token.symbol === 'USDC')
                return new MockTokenAmount(mockUsdc, BigInt('250000000'));
              return new MockTokenAmount(token, BigInt(0));
            }),
            priceOf: vi.fn(() => ({ toSignificant: vi.fn((digits?: number) => '1.0') })),
          };
          return Promise.resolve(mockPair);
        }
        return Promise.reject(new Error('Pair not found in mock Fetcher.fetchPairData'));
      }),
    },
    Trade: {
      bestTradeExactIn: vi.fn((pairs, amountIn, tokenOut, options) => {
        const mockOutputAmount = new MockTokenAmount(
          tokenOut,
          BigInt(amountIn.raw.toString()) / BigInt(2)
        );
        const mockExecutionPrice = { toSignificant: vi.fn((digits?: number) => '0.5') };
        const mockPriceImpact = { toSignificant: vi.fn((digits?: number) => '0.01') };
        return [
          {
            inputAmount: amountIn,
            outputAmount: mockOutputAmount,
            executionPrice: mockExecutionPrice,
            priceImpact: mockPriceImpact,
            route: {
              path: [amountIn.token, tokenOut],
              midPrice: mockExecutionPrice,
            },
          },
        ];
      }),
    },
    Router: {
      swapCallParameters: vi.fn((trade, options) => ({
        methodName: 'swapExactTokensForTokens',
        args: [
          BigInt('1000000000000000000').toString(), // Convert BigInt to string for args
          BigInt('490000000000000000').toString(), // Convert BigInt to string for args
          ['0xInputTokenAddress', '0xOutputTokenAddress'],
          '0xRecipientAddress',
          BigInt('1234567890').toString(), // Convert BigInt to string for args
        ],
        value: BigInt('0').toString(), // Convert BigInt to string for value
      })),
    },
    ChainId: actual.ChainId,
    CurrencyAmount: MockCurrencyAmount, // Use our mock CurrencyAmount
    Percent: actual.Percent,
    TokenAmount: MockTokenAmount, // Use our mock TokenAmount
    Pair: actual.Pair,
  };
});

describe('QuickswapClient', () => {
  let mockRuntime: IAgentRuntime;

  beforeEach(() => {
    mockRuntime = {
      getSetting: vi.fn((key: string) => {
        if (key === 'QUICKSWAP_API_URL') return 'http://mock-rpc-url.com';
        if (key === 'WALLET_PRIVATE_KEY') return '0xmockPrivateKey';
        if (key === 'CHAIN_ID') return 137;
        return undefined;
      }),
      getService: vi.fn(),
      useModel: vi.fn(),
    } as unknown as IAgentRuntime;

    vi.clearAllMocks();
  });

  it('should initialize the client successfully', async () => {
    const client = await initializeQuickswapClient(mockRuntime);
    expect(client).toBeDefined();
    expect(JsonRpcProvider).toHaveBeenCalledWith('http://mock-rpc-url.com');
  });

  it('should fetch token data for a known token symbol (WMATIC)', async () => {
    const client = await initializeQuickswapClient(mockRuntime);
    const tokenData = await client.fetchTokenData('WMATIC');

    expect(tokenData.success).toBe(true);
    expect(tokenData.symbol).toBe('WMATIC');
    expect(tokenData.name).toBe('Wrapped MATIC');
    // Adjusted expectation to account for mockToken's address assignment
    expect(tokenData.address).toBe('0x7ceb23fd6bc0add59e62ac25578270cff1b9f619');
    expect(tokenData.decimals).toBe(18);
    expect(Fetcher.fetchTokenData).not.toHaveBeenCalled();
  });

  it('should fetch pair data successfully', async () => {
    const client = await initializeQuickswapClient(mockRuntime);
    const pairData = await client.fetchPairData('WMATIC', 'USDC');

    expect(pairData.success).toBe(true);
    expect(pairData.token0.symbol).toBe('WMATIC');
    expect(pairData.token1.symbol).toBe('USDC');
    expect(Fetcher.fetchPairData).toHaveBeenCalledWith(
      expect.any(Object),
      expect.any(Object),
      expect.anything()
    ); // Expect any object for mocked Token
  });

  it('should simulate a swap successfully', async () => {
    const client = await initializeQuickswapClient(mockRuntime);
    const swapResult = await client.simulateSwap('WMATIC', 'USDC', 1);

    expect(swapResult.success).toBe(true);
    expect(swapResult.transactionHash).toBeDefined();
    expect(swapResult.amountReceived).toBeDefined();
    expect(Fetcher.fetchPairData).toHaveBeenCalled();
    expect(Trade.bestTradeExactIn).toHaveBeenCalled();
    expect(Router.swapCallParameters).toHaveBeenCalled();
  });

  it('should simulate adding liquidity successfully', async () => {
    const client = await initializeQuickswapClient(mockRuntime);
    const addLiquidityResult = await client.simulateAddLiquidity('WMATIC', 'USDC', 10, 5);

    expect(addLiquidityResult.success).toBe(true);
    expect(addLiquidityResult.lpTokensReceived).toBeDefined();
    expect(addLiquidityResult.transactionHash).toBeDefined();
    expect(Fetcher.fetchPairData).toHaveBeenCalled();
  });

  it('should simulate removing liquidity successfully', async () => {
    const client = await initializeQuickswapClient(mockRuntime);
    const removeLiquidityResult = await client.simulateRemoveLiquidity('WMATIC', 'USDC', 100);

    expect(removeLiquidityResult.success).toBe(true);
    expect(removeLiquidityResult.token0Received).toBeDefined();
    expect(removeLiquidityResult.token1Received).toBeDefined();
    expect(removeLiquidityResult.transactionHash).toBeDefined();
    expect(Fetcher.fetchPairData).toHaveBeenCalled();
  });

  it('should get transaction status (success)', async () => {
    const client = await initializeQuickswapClient(mockRuntime);
    const statusResult = await client.simulateGetTransactionStatus('0xSuccessTxHash');

    expect(statusResult.success).toBe(true);
    expect(statusResult.status).toBe('success');
    expect(statusResult.blockNumber).toBe('123');
  });

  it('should get transaction status (pending)', async () => {
    const client = await initializeQuickswapClient(mockRuntime);
    const statusResult = await client.simulateGetTransactionStatus('0xPendingTxHash');

    expect(statusResult.success).toBe(true);
    expect(statusResult.status).toBe('pending');
    expect(statusResult.blockNumber).toBeNull();
  });

  it('should calculate liquidity value successfully', async () => {
    const client = await initializeQuickswapClient(mockRuntime);
    const liquidityValueResult = await client.simulateCalculateLiquidityValue('WMATIC', 'USDC', 10);

    expect(liquidityValueResult.success).toBe(true);
    expect(liquidityValueResult.token0Value).toBeDefined();
    expect(liquidityValueResult.token1Value).toBeDefined();
    expect(liquidityValueResult.totalUsdValue).toBeDefined();
    expect(Fetcher.fetchPairData).toHaveBeenCalled();
  });

  it('should calculate mid price successfully', async () => {
    const client = await initializeQuickswapClient(mockRuntime);
    const midPriceResult = await client.simulateCalculateMidPrice('WMATIC', 'USDC');

    expect(midPriceResult.success).toBe(true);
    expect(midPriceResult.midPrice).toBe(0.5);
    expect(midPriceResult.invertedPrice).toBe(2.0);
    expect(Fetcher.fetchPairData).toHaveBeenCalled();
  });

  it('should calculate token price successfully', async () => {
    const client = await initializeQuickswapClient(mockRuntime);
    const tokenPriceResult = await client.simulateCalculateTokenPrice('WMATIC', 'USDC');

    expect(tokenPriceResult.success).toBe(true);
    expect(tokenPriceResult.price).toBe(1.0);
    expect(Fetcher.fetchPairData).toHaveBeenCalled();
  });

  it('should execute a limit order successfully', async () => {
    const client = await initializeQuickswapClient(mockRuntime);
    const orderResult = await client.simulateExecuteOrder({
      tradeType: 'limit',
      inputTokenSymbolOrAddress: 'WMATIC',
      outputTokenSymbolOrAddress: 'USDC',
      amount: '1',
      price: '0.5',
    });

    expect(orderResult.success).toBe(true);
    expect(orderResult.transactionHash).toBeDefined();
  });

  it('should simulate a stop-loss order', async () => {
    const client = await initializeQuickswapClient(mockRuntime);
    const orderResult = await client.simulateExecuteOrder({
      tradeType: 'stop-loss',
      inputTokenSymbolOrAddress: 'WMATIC',
      outputTokenSymbolOrAddress: 'USDC',
      amount: '1',
      price: '0.5',
      stopPrice: '0.4',
    });

    expect(orderResult.success).toBe(true);
    expect(orderResult.transactionHash).toContain('0xmockTransactionHash');
  });

  it('should simulate a take-profit order', async () => {
    const client = await initializeQuickswapClient(mockRuntime);
    const orderResult = await client.simulateExecuteOrder({
      tradeType: 'take-profit',
      inputTokenSymbolOrAddress: 'WMATIC',
      outputTokenSymbolOrAddress: 'USDC',
      amount: '1',
      price: '0.5',
      takeProfitPrice: '0.6',
    });

    expect(orderResult.success).toBe(true);
    expect(orderResult.transactionHash).toContain('0xmockTransactionHash');
  });

  it('should calculate price impact successfully', async () => {
    const client = await initializeQuickswapClient(mockRuntime);
    const priceImpactResult = await client.calculatePriceImpact('WMATIC', 'USDC', 1);

    expect(priceImpactResult.success).toBe(true);
    expect(priceImpactResult.priceImpactPercentage).toBe(0.01);
    expect(priceImpactResult.newPrice).toBe(0.5);
    expect(Fetcher.fetchPairData).toHaveBeenCalled();
    expect(Trade.bestTradeExactIn).toHaveBeenCalled();
  });

  it('should get farming pool details (simulated)', async () => {
    const client = await initializeQuickswapClient(mockRuntime);
    const poolDetails = await client.getFarmingPoolDetails({ poolId: '1' });

    expect(poolDetails.success).toBe(true);
    expect(poolDetails.poolId).toBe('1');
    expect(poolDetails.name).toBe('Placeholder Pool Name');
    expect(poolDetails.apr).toBe(0.1);
  });

  it('should estimate gas fees (simulated)', async () => {
    const client = await initializeQuickswapClient(mockRuntime);
    const gasEstimate = await client.estimateGasFees({ transactionType: 'swap' });

    expect(gasEstimate.success).toBe(true);
    expect(gasEstimate.gasPriceGwei).toBe(10);
    expect(gasEstimate.estimatedGasUse).toBe(100000);
    expect(gasEstimate.feeInEth).toBe(0.01);
  });

  it('should claim farming rewards (simulated)', async () => {
    const client = await initializeQuickswapClient(mockRuntime);
    const claimResult = await client.claimFarmingRewards({
      poolId: '1',
      walletAddress: '0xmockWalletAddress',
    });

    expect(claimResult.success).toBe(true);
    expect(claimResult.rewardsClaimed).toBe(100);
    expect(claimResult.rewardsTokenSymbol).toBe('WMATIC');
    expect(claimResult.transactionHash).toBeDefined();
  });
});
