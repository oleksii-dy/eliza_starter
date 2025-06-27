'use strict';
Object.defineProperty(exports, '__esModule', { value: true });
exports.PaymentEventType = exports.PaymentStatus = exports.PaymentMethod = void 0;
/**
 * Supported payment methods
 */
let PaymentMethod;
(function (PaymentMethod) {
  PaymentMethod['USDC_ETH'] = 'USDC_ETH';
  PaymentMethod['USDC_SOL'] = 'USDC_SOL';
  PaymentMethod['ETH'] = 'ETH';
  PaymentMethod['SOL'] = 'SOL';
  PaymentMethod['BTC'] = 'BTC';
  PaymentMethod['MATIC'] = 'MATIC';
  PaymentMethod['ARB'] = 'ARB';
  PaymentMethod['OP'] = 'OP';
  PaymentMethod['BASE'] = 'BASE';
  PaymentMethod['OTHER'] = 'OTHER';
})(PaymentMethod || (exports.PaymentMethod = PaymentMethod = {}));
/**
 * Payment status enum
 */
let PaymentStatus;
(function (PaymentStatus) {
  PaymentStatus['PENDING'] = 'PENDING';
  PaymentStatus['PROCESSING'] = 'PROCESSING';
  PaymentStatus['CONFIRMING'] = 'CONFIRMING';
  PaymentStatus['COMPLETED'] = 'COMPLETED';
  PaymentStatus['FAILED'] = 'FAILED';
  PaymentStatus['CANCELLED'] = 'CANCELLED';
  PaymentStatus['REFUNDED'] = 'REFUNDED';
  PaymentStatus['EXPIRED'] = 'EXPIRED';
})(PaymentStatus || (exports.PaymentStatus = PaymentStatus = {}));
/**
 * Payment event types
 */
let PaymentEventType;
(function (PaymentEventType) {
  PaymentEventType['PAYMENT_REQUESTED'] = 'PAYMENT_REQUESTED';
  PaymentEventType['PAYMENT_PROCESSING'] = 'PAYMENT_PROCESSING';
  PaymentEventType['PAYMENT_CONFIRMED'] = 'PAYMENT_CONFIRMED';
  PaymentEventType['PAYMENT_COMPLETED'] = 'PAYMENT_COMPLETED';
  PaymentEventType['PAYMENT_FAILED'] = 'PAYMENT_FAILED';
  PaymentEventType['PAYMENT_CANCELLED'] = 'PAYMENT_CANCELLED';
  PaymentEventType['PAYMENT_REFUNDED'] = 'PAYMENT_REFUNDED';
  PaymentEventType['BALANCE_UPDATED'] = 'BALANCE_UPDATED';
})(PaymentEventType || (exports.PaymentEventType = PaymentEventType = {}));
