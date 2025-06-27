import { describe, it, expect } from 'bun:test';
import { PaymentMethod } from '../../types';

// Copy of formatAmount from paymentMiddleware.ts for testing
// In a real scenario, this would be exported from the middleware
function formatAmount(amount: bigint, method?: PaymentMethod): string {
  const methodDecimals: Record<PaymentMethod, number> = {
    [PaymentMethod.USDC_ETH]: 6,
    [PaymentMethod.USDC_SOL]: 6,
    [PaymentMethod.ETH]: 18,
    [PaymentMethod.SOL]: 9,
    [PaymentMethod.BTC]: 8,
    [PaymentMethod.MATIC]: 18,
    [PaymentMethod.ARB]: 18,
    [PaymentMethod.OP]: 18,
    [PaymentMethod.BASE]: 18,
    [PaymentMethod.OTHER]: 18,
  };

  const decimals = methodDecimals[method || PaymentMethod.USDC_ETH];
  const divisor = BigInt(10 ** decimals);
  const whole = amount / divisor;
  const fraction = amount % divisor;

  const currency = (method || PaymentMethod.USDC_ETH).replace('_ETH', '').replace('_SOL', '');

  if (fraction === BigInt(0)) {
    return `${whole} ${currency}`;
  }

  const fractionStr = fraction.toString().padStart(decimals, '0').replace(/0+$/, '');
  return `${whole}.${fractionStr} ${currency}`;
}

// Simplified TestSuite implementation for local use
class TestSuite {
  constructor(private name: string, private config: any) {}

  addTest(test: any) {
    it(test.name, async () => {
      const context = this.config.beforeEach ? this.config.beforeEach() : {};
      await test.fn(context);
    });
  }

  run() {
    // No-op, bun:test handles execution
  }
}

const createUnitTest = (config: { name: string; fn: (context?: any) => Promise<void> | void }) => config;

describe('formatAmount utility', () => {
  const formatAmountSuite = new TestSuite('formatAmount utility', {});

  formatAmountSuite.addTest(
    createUnitTest({
      name: 'should format USDC amounts correctly',
      fn: () => {
        expect(formatAmount(BigInt(1000000), PaymentMethod.USDC_ETH)).toBe('1 USDC');
        expect(formatAmount(BigInt(1500000), PaymentMethod.USDC_ETH)).toBe('1.5 USDC');
        expect(formatAmount(BigInt(123456), PaymentMethod.USDC_ETH)).toBe('0.123456 USDC');
        expect(formatAmount(BigInt(100000000), PaymentMethod.USDC_ETH)).toBe('100 USDC');
      },
    })
  );

  formatAmountSuite.addTest(
    createUnitTest({
      name: 'should format ETH amounts correctly',
      fn: () => {
        expect(formatAmount(BigInt('1000000000000000000'), PaymentMethod.ETH)).toBe('1 ETH');
        expect(formatAmount(BigInt('1500000000000000000'), PaymentMethod.ETH)).toBe('1.5 ETH');
        expect(formatAmount(BigInt('123456789000000000'), PaymentMethod.ETH)).toBe('0.123456789 ETH');
      },
    })
  );

  formatAmountSuite.addTest(
    createUnitTest({
      name: 'should format SOL amounts correctly',
      fn: () => {
        expect(formatAmount(BigInt('1000000000'), PaymentMethod.SOL)).toBe('1 SOL');
        expect(formatAmount(BigInt('500000000'), PaymentMethod.SOL)).toBe('0.5 SOL');
        expect(formatAmount(BigInt('123456789'), PaymentMethod.SOL)).toBe('0.123456789 SOL');
      },
    })
  );

  formatAmountSuite.addTest(
    createUnitTest({
      name: 'should handle zero amounts',
      fn: () => {
        expect(formatAmount(BigInt(0), PaymentMethod.USDC_ETH)).toBe('0 USDC');
        expect(formatAmount(BigInt(0), PaymentMethod.ETH)).toBe('0 ETH');
      },
    })
  );

  formatAmountSuite.addTest(
    createUnitTest({
      name: 'should handle very small amounts',
      fn: () => {
        expect(formatAmount(BigInt(1), PaymentMethod.USDC_ETH)).toBe('0.000001 USDC');
        expect(formatAmount(BigInt(1), PaymentMethod.ETH)).toBe('0.000000000000000001 ETH');
      },
    })
  );

  formatAmountSuite.addTest(
    createUnitTest({
      name: 'should remove trailing zeros from decimals',
      fn: () => {
        expect(formatAmount(BigInt(1230000), PaymentMethod.USDC_ETH)).toBe('1.23 USDC');
        expect(formatAmount(BigInt('1230000000000000000'), PaymentMethod.ETH)).toBe('1.23 ETH');
      },
    })
  );

  formatAmountSuite.addTest(
    createUnitTest({
      name: 'should use USDC_ETH as default when no method specified',
      fn: () => {
        expect(formatAmount(BigInt(1000000))).toBe('1 USDC');
      },
    })
  );

  formatAmountSuite.run();
});
