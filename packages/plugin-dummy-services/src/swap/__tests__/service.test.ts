import { describe, expect, it, beforeEach } from 'bun:test';
import { DummySwapService } from '../service';
import { type IAgentRuntime } from '@elizaos/core';

describe('DummySwapService', () => {
  let service: DummySwapService;
  const mockRuntime = {} as IAgentRuntime;

  beforeEach(async () => {
    service = new DummySwapService(mockRuntime);
    await service.start();
  });

  it('should get a swap quote', async () => {
    const quoteParams = {
      inputMint: 'SOL',
      outputMint: 'USDC',
      amount: 1_000_000_000, // 1 SOL
    };
    const quote = await service.getQuote(quoteParams);

    expect(quote).toBeDefined();
    expect(quote.inAmount).toBe(String(quoteParams.amount));
    expect(Number(quote.outAmount)).toBeCloseTo(quoteParams.amount * 0.99);
    expect(quote.priceImpact).toBe(0.001);
    expect(quote.route).toHaveLength(1);
    expect(quote.route[0].dex).toBe('dummy-dex');
  });

  it('should handle different token pairs', async () => {
    const quoteParams = {
      inputMint: 'USDC',
      outputMint: 'ETH',
      amount: 1000_000_000, // 1000 USDC
    };
    const quote = await service.getQuote(quoteParams);

    expect(quote).toBeDefined();
    expect(quote.inAmount).toBe(String(quoteParams.amount));
    expect(Number(quote.outAmount)).toBeGreaterThan(0);
  });

  it('should execute a swap', async () => {
    const swapParams = {
      user: 'test-user',
      inputMint: 'SOL',
      outputMint: 'USDC',
      amount: 1_000_000_000,
    };
    const result = await service.swap(swapParams);

    expect(result.success).toBe(true);
    expect(result.transactionId).toMatch(/^dummy-swap-tx-/);
  });

  it('should handle swap with slippage tolerance', async () => {
    const swapParams = {
      user: 'test-user',
      inputMint: 'SOL',
      outputMint: 'USDC',
      amount: 1_000_000_000,
      slippageBps: 100, // 1% slippage
    };
    const result = await service.swap(swapParams);

    expect(result.success).toBe(true);
    // In a real implementation, we would verify slippage was applied
  });

  it('should get a list of supported tokens', async () => {
    const tokens = await service.getSupportedTokens();
    expect(tokens).toBeDefined();
    expect(tokens).toHaveLength(2);
    expect(tokens?.map((t) => t.symbol)).toContain('SOL');
    expect(tokens?.map((t) => t.symbol)).toContain('USDC');
  });

  it('should handle same token swap gracefully', async () => {
    const quoteParams = {
      inputMint: 'SOL',
      outputMint: 'SOL',
      amount: 1_000_000_000,
    };
    const quote = await service.getQuote(quoteParams);

    // For dummy implementation, it still applies fee even for same token
    // In a real implementation, same token swap should return same amount
    expect(quote).toBeDefined();
    expect(Number(quote.outAmount)).toBeLessThanOrEqual(Number(quote.inAmount));
    expect(quote.route).toHaveLength(1);
  });

  describe('service lifecycle', () => {
    it('should maintain functionality after restart', async () => {
      // Get initial quote
      const quoteParams = {
        inputMint: 'SOL',
        outputMint: 'USDC',
        amount: 1_000_000_000,
      };
      const quote1 = await service.getQuote(quoteParams);

      // Restart service
      await service.stop();
      await service.start();

      // Should still work
      const quote2 = await service.getQuote(quoteParams);
      expect(quote2).toBeDefined();
      expect(quote2.route).toHaveLength(1);
    });
  });
});
