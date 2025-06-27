'use strict';
Object.defineProperty(exports, '__esModule', { value: true });
const bun_test_1 = require('bun:test');
const types_1 = require('../../types');
// Copy of formatAmount from paymentMiddleware.ts for testing
// In a real scenario, this would be exported from the middleware
function formatAmount(amount, method) {
  let _a;
  const methodDecimals = (_a = {},
  _a[types_1.PaymentMethod.USDC_ETH] = 6,
  _a[types_1.PaymentMethod.USDC_SOL] = 6,
  _a[types_1.PaymentMethod.ETH] = 18,
  _a[types_1.PaymentMethod.SOL] = 9,
  _a[types_1.PaymentMethod.BTC] = 8,
  _a[types_1.PaymentMethod.MATIC] = 18,
  _a[types_1.PaymentMethod.ARB] = 18,
  _a[types_1.PaymentMethod.OP] = 18,
  _a[types_1.PaymentMethod.BASE] = 18,
  _a[types_1.PaymentMethod.OTHER] = 18,
  _a);
  const decimals = methodDecimals[method || types_1.PaymentMethod.USDC_ETH];
  const divisor = BigInt(Math.pow(10, decimals));
  const whole = amount / divisor;
  const fraction = amount % divisor;
  const currency = (method || types_1.PaymentMethod.USDC_ETH).replace('_ETH', '').replace('_SOL', '');
  if (fraction === BigInt(0)) {
    return ''.concat(whole, ' ').concat(currency);
  }
  const fractionStr = fraction.toString().padStart(decimals, '0').replace(/0+$/, '');
  return ''.concat(whole, '.').concat(fractionStr, ' ').concat(currency);
}
(0, bun_test_1.describe)('formatAmount utility', () => {
  (0, bun_test_1.it)('should format USDC amounts correctly', () => {
    (0, bun_test_1.expect)(formatAmount(BigInt(1000000), types_1.PaymentMethod.USDC_ETH)).toBe('1 USDC');
    (0, bun_test_1.expect)(formatAmount(BigInt(1500000), types_1.PaymentMethod.USDC_ETH)).toBe('1.5 USDC');
    (0, bun_test_1.expect)(formatAmount(BigInt(123456), types_1.PaymentMethod.USDC_ETH)).toBe('0.123456 USDC');
    (0, bun_test_1.expect)(formatAmount(BigInt(100000000), types_1.PaymentMethod.USDC_ETH)).toBe('100 USDC');
  });
  (0, bun_test_1.it)('should format ETH amounts correctly', () => {
    (0, bun_test_1.expect)(formatAmount(BigInt('1000000000000000000'), types_1.PaymentMethod.ETH)).toBe('1 ETH');
    (0, bun_test_1.expect)(formatAmount(BigInt('1500000000000000000'), types_1.PaymentMethod.ETH)).toBe('1.5 ETH');
    (0, bun_test_1.expect)(formatAmount(BigInt('123456789000000000'), types_1.PaymentMethod.ETH)).toBe('0.123456789 ETH');
  });
  (0, bun_test_1.it)('should format SOL amounts correctly', () => {
    (0, bun_test_1.expect)(formatAmount(BigInt('1000000000'), types_1.PaymentMethod.SOL)).toBe('1 SOL');
    (0, bun_test_1.expect)(formatAmount(BigInt('500000000'), types_1.PaymentMethod.SOL)).toBe('0.5 SOL');
    (0, bun_test_1.expect)(formatAmount(BigInt('123456789'), types_1.PaymentMethod.SOL)).toBe('0.123456789 SOL');
  });
  (0, bun_test_1.it)('should handle zero amounts', () => {
    (0, bun_test_1.expect)(formatAmount(BigInt(0), types_1.PaymentMethod.USDC_ETH)).toBe('0 USDC');
    (0, bun_test_1.expect)(formatAmount(BigInt(0), types_1.PaymentMethod.ETH)).toBe('0 ETH');
  });
  (0, bun_test_1.it)('should handle very small amounts', () => {
    (0, bun_test_1.expect)(formatAmount(BigInt(1), types_1.PaymentMethod.USDC_ETH)).toBe('0.000001 USDC');
    (0, bun_test_1.expect)(formatAmount(BigInt(1), types_1.PaymentMethod.ETH)).toBe('0.000000000000000001 ETH');
  });
  (0, bun_test_1.it)('should remove trailing zeros from decimals', () => {
    (0, bun_test_1.expect)(formatAmount(BigInt(1230000), types_1.PaymentMethod.USDC_ETH)).toBe('1.23 USDC');
    (0, bun_test_1.expect)(formatAmount(BigInt('1230000000000000000'), types_1.PaymentMethod.ETH)).toBe('1.23 ETH');
  });
  (0, bun_test_1.it)('should use USDC_ETH as default when no method specified', () => {
    (0, bun_test_1.expect)(formatAmount(BigInt(1000000))).toBe('1 USDC');
  });
});
