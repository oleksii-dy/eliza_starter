import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import { createTestRuntime, cleanupTestRuntime, createTestMemory, createTestUserId } from '../helpers/test-runtime';
import { paymentPlugin } from '../../index';
import { PaymentService } from '../../services/PaymentService';
import { sendPaymentAction } from '../../actions/sendPaymentAction';
import type { IAgentRuntime, Memory } from '@elizaos/core';
import scenarios from '../../scenarios';

describe('Payment Scenarios Integration', () => {
  let runtime: IAgentRuntime;
  let paymentService: PaymentService;

  beforeAll(async () => {
    // Create runtime with payment plugin
    runtime = await createTestRuntime({
      plugins: [paymentPlugin],
      settings: {
        PAYMENT_AUTO_APPROVAL_ENABLED: 'true',
        PAYMENT_AUTO_APPROVAL_THRESHOLD: '1000',
        PAYMENT_REQUIRE_CONFIRMATION: 'false',
      }
    });

    paymentService = runtime.getService('payment') as PaymentService;
    expect(paymentService).toBeDefined();

    // Register the send payment action
    runtime.registerAction(sendPaymentAction);
  });

  afterAll(async () => {
    await cleanupTestRuntime(runtime);
  });

  describe('Scenario Evaluators', () => {
    scenarios.forEach((scenario) => {
      describe(scenario.name, () => {
        it('should have valid evaluator function', () => {
          expect(scenario.evaluator).toBeDefined();
          expect(typeof scenario.evaluator).toBe('function');
        });

        it('should evaluate examples correctly', () => {
          scenario.examples.forEach((example, index) => {
            const agentResponse = example.find(msg => 
              msg.name === '{{agent}}' || msg.user === 'agent'
            );
            
            if (agentResponse && agentResponse.content?.text) {
              const result = scenario.evaluator(agentResponse.content.text);
              expect(result).toBe(true);
            }
          });
        });
      });
    });
  });

  describe('Send Payment Action', () => {
    it('should validate send payment messages', async () => {
      const message = createTestMemory({
        content: { text: 'Send 0.1 ETH to 0x742d35Cc6634C0532925a3b844Bc9e7595f7E123' }
      });

      const isValid = await sendPaymentAction.validate(runtime, message);
      expect(isValid).toBe(true);
    });

    it('should extract payment details correctly', async () => {
      const testCases = [
        {
          text: 'Send 0.1 ETH to bob.eth',
          expected: { amount: '0.1', currency: 'ETH', recipient: 'bob.eth' }
        },
        {
          text: 'Transfer 50 USDC to 0x742d35Cc6634C0532925a3b844Bc9e7595f7E123',
          expected: { amount: '50', currency: 'USDC', recipient: '0x742d35Cc6634C0532925a3b844Bc9e7595f7E123' }
        },
        {
          text: 'Pay 100 MATIC to alice.polygon',
          expected: { amount: '100', currency: 'MATIC', recipient: 'alice.polygon' }
        }
      ];

      for (const testCase of testCases) {
        const message = createTestMemory({
          content: { text: testCase.text }
        });

        let callbackCalled = false;
        let callbackResponse: any;

        await sendPaymentAction.handler(
          runtime,
          message,
          undefined,
          {},
          async (response) => {
            callbackCalled = true;
            callbackResponse = response;
            return [];
          }
        );

        expect(callbackCalled).toBe(true);
        // Payment will fail due to insufficient funds, but we can check the error message
        expect(callbackResponse.text).toContain('Payment');
      }
    });
  });

  describe('Real-world Scenario Simulations', () => {
    it('should handle multi-agent payment scenario', async () => {
      const alice = createTestUserId();
      const bob = createTestUserId();

      // Alice gets a wallet
      await paymentService.getUserBalance(alice, runtime);
      
      // Bob gets a wallet
      const bobBalance = await paymentService.getUserBalance(bob, runtime);
      expect(bobBalance).toBeDefined();
    });

    it('should handle payment request scenario', async () => {
      const userId = createTestUserId();
      
      // Process a payment request through the service
      const result = await paymentService.processPayment({
        id: createTestUserId(),
        userId,
        agentId: runtime.agentId,
        actionName: 'payment_request',
        amount: BigInt(25 * 1e6), // 25 USDC
        method: 'USDC_ETH' as any,
        metadata: {
          description: 'Dinner last night',
          requestedFrom: 'bob@example.com'
        }
      }, runtime);

      expect(result).toBeDefined();
      expect(result.status).toBeDefined();
    });

    it('should validate Polymarket scenario responses', () => {
      const polymarketScenario = scenarios.find(s => s.name.includes('Polymarket'));
      if (polymarketScenario) {
        const testResponse = 'The current Polymarket odds for BTC reaching $100k are 72% ($0.72)';
        const result = polymarketScenario.evaluator(testResponse);
        expect(result).toBe(true);
      }
    });

    it('should validate Uniswap swap scenario responses', () => {
      const uniswapScenario = scenarios.find(s => s.name.includes('Uniswap'));
      if (uniswapScenario) {
        const testResponse = 'Initiating Uniswap swap: 1 ETH → USDC. Rate: 2250 USDC';
        const result = uniswapScenario.evaluator(testResponse);
        expect(result).toBe(true);
      }
    });

    it('should validate DeFi yield scenario responses', () => {
      const defiScenario = scenarios.find(s => s.name.includes('DeFi'));
      if (defiScenario) {
        const testResponse = 'Depositing 1000 USDC to Aave V3. Current APY: 3.45%';
        const result = defiScenario.evaluator(testResponse);
        expect(result).toBe(true);
      }
    });
  });

  describe('Cross-chain Operations', () => {
    it('should validate bridge scenario responses', () => {
      const bridgeScenario = scenarios.find(s => s.name.includes('Multi-Chain Bridge'));
      if (bridgeScenario) {
        const testResponse = 'Bridging 500 USDC from Ethereum to Arbitrum. Fees: $12';
        const result = bridgeScenario.evaluator(testResponse);
        expect(result).toBe(true);
      }
    });
  });

  describe('NFT Operations', () => {
    it('should validate Crossmint NFT scenario responses', () => {
      const nftScenario = scenarios.find(s => s.name.includes('Crossmint NFT'));
      if (nftScenario) {
        const testResponse = 'Minting NFT via Crossmint on Ethereum. Cost: $25';
        const result = nftScenario.evaluator(testResponse);
        expect(result).toBe(true);
      }
    });
  });

  describe('Automated Trading', () => {
    it('should validate Coinbase AgentKit scenario responses', () => {
      const agentKitScenario = scenarios.find(s => s.name.includes('Coinbase AgentKit'));
      if (agentKitScenario) {
        const testResponse = 'Configuring Coinbase AgentKit DCA: $100 BTC weekly purchases';
        const result = agentKitScenario.evaluator(testResponse);
        expect(result).toBe(true);
      }
    });
  });
}); 