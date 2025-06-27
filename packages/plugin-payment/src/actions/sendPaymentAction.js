'use strict';
const __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
  function adopt(value) { return value instanceof P ? value : new P((resolve) => { resolve(value); }); }
  return new (P || (P = Promise))((resolve, reject) => {
    function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
    function rejected(value) { try { step(generator['throw'](value)); } catch (e) { reject(e); } }
    function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
    step((generator = generator.apply(thisArg, _arguments || [])).next());
  });
};
const __generator = (this && this.__generator) || function (thisArg, body) {
  let _ = { label: 0, sent() { if (t[0] & 1) {throw t[1];} return t[1]; }, trys: [], ops: [] }, f, y, t, g = Object.create((typeof Iterator === 'function' ? Iterator : Object).prototype);
  return g.next = verb(0), g['throw'] = verb(1), g['return'] = verb(2), typeof Symbol === 'function' && (g[Symbol.iterator] = function () { return this; }), g;
  function verb(n) { return function (v) { return step([n, v]); }; }
  function step(op) {
    if (f) {throw new TypeError('Generator is already executing.');}
    while (g && (g = 0, op[0] && (_ = 0)), _) {try {
      if (f = 1, y && (t = op[0] & 2 ? y['return'] : op[0] ? y['throw'] || ((t = y['return']) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) {return t;}
      if (y = 0, t) {op = [op[0] & 2, t.value];}
      switch (op[0]) {
        case 0: case 1: t = op; break;
        case 4: _.label++; return { value: op[1], done: false };
        case 5: _.label++; y = op[1]; op = [0]; continue;
        case 7: op = _.ops.pop(); _.trys.pop(); continue;
        default:
          if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
          if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
          if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
          if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
          if (t[2]) {_.ops.pop();}
          _.trys.pop(); continue;
      }
      op = body.call(thisArg, _);
    } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }}
    if (op[0] & 5) {throw op[1];} return { value: op[0] ? op[1] : void 0, done: true };
  }
};
Object.defineProperty(exports, '__esModule', { value: true });
exports.sendPaymentAction = void 0;
const core_1 = require('@elizaos/core');
const types_1 = require('../types');
const ethers_1 = require('ethers');
exports.sendPaymentAction = {
  name: 'SEND_PAYMENT',
  description: 'Send cryptocurrency to another address with automatic validation and confirmation. Supports action chaining by providing transaction data for receipt generation, tax reporting, or automated accounting workflows.',
  similes: ['TRANSFER', 'SEND_CRYPTO', 'PAY', 'TRANSFER_FUNDS'],
  validate(runtime, message) { return __awaiter(void 0, void 0, void 0, function () {
    let text;
    let _a, _b;
    return __generator(this, (_c) => {
      text = ((_b = (_a = message.content) === null || _a === void 0 ? void 0 : _a.text) === null || _b === void 0 ? void 0 : _b.toLowerCase()) || '';
      return [2 /*return*/, ((text.includes('send') || text.includes('transfer') || text.includes('pay')) &&
                    (text.includes('eth') ||
                        text.includes('usdc') ||
                        text.includes('sol') ||
                        text.includes('matic') ||
                        text.includes('to')))];
    });
  }); },
  handler(runtime, message, state, options, callback) { return __awaiter(void 0, void 0, void 0, function () {
    let paymentService, text, paymentDetails, amount, method, result, error_1;
    let _a;
    return __generator(this, (_b) => {
      switch (_b.label) {
        case 0:
          _b.trys.push([0, 12, , 14]);
          paymentService = runtime.getService('payment');
          if (paymentService) {return [3 /*break*/, 2];}
          return [4 /*yield*/, (callback === null || callback === void 0 ? void 0 : callback({
            text: 'Payment service is not available. Please ensure the payment plugin is properly configured.',
            error: true,
          }))];
        case 1:
          _b.sent();
          return [2 /*return*/, {
            text: 'Payment service is not available. Please ensure the payment plugin is properly configured.',
            values: { success: false, error: 'service_unavailable' },
            data: { action: 'SEND_PAYMENT' },
          }];
        case 2:
          text = ((_a = message.content) === null || _a === void 0 ? void 0 : _a.text) || '';
          paymentDetails = extractPaymentDetails(text);
          if (paymentDetails) {return [3 /*break*/, 4];}
          return [4 /*yield*/, (callback === null || callback === void 0 ? void 0 : callback({
            text: 'Could not parse payment details. Please specify amount, currency, and recipient address.',
            error: true,
          }))];
        case 3:
          _b.sent();
          return [2 /*return*/, {
            text: 'Could not parse payment details. Please specify amount, currency, and recipient address.',
            values: { success: false, error: 'invalid_payment_details' },
            data: { action: 'SEND_PAYMENT' },
          }];
        case 4:
          core_1.elizaLogger.info('[SendPaymentAction] Processing payment', paymentDetails);
          amount = ethers_1.ethers.parseUnits(paymentDetails.amount, paymentDetails.currency === 'ETH' ? 18 : 6);
          method = void 0;
          switch (paymentDetails.currency.toUpperCase()) {
            case 'ETH':
              method = types_1.PaymentMethod.ETH;
              break;
            case 'USDC':
              method = types_1.PaymentMethod.USDC_ETH;
              break;
            case 'SOL':
              method = types_1.PaymentMethod.SOL;
              break;
            case 'MATIC':
              method = types_1.PaymentMethod.MATIC;
              break;
            default:
              method = types_1.PaymentMethod.USDC_ETH;
          }
          return [4 /*yield*/, paymentService.processPayment({
            id: message.id,
            userId: message.entityId,
            agentId: runtime.agentId,
            actionName: 'SEND_PAYMENT',
            amount,
            method,
            recipientAddress: paymentDetails.recipient,
            metadata: {
              originalRequest: text,
            },
          }, runtime)];
        case 5:
          result = _b.sent();
          if (!(result.status === 'COMPLETED')) {return [3 /*break*/, 7];}
          return [4 /*yield*/, (callback === null || callback === void 0 ? void 0 : callback({
            text: 'Payment sent successfully! Transaction hash: '.concat(result.transactionHash, '. ').concat(paymentDetails.amount, ' ').concat(paymentDetails.currency, ' has been sent to ').concat(paymentDetails.recipient, '.'),
            metadata: {
              transactionHash: result.transactionHash,
              amount: paymentDetails.amount,
              currency: paymentDetails.currency,
              recipient: paymentDetails.recipient,
            },
          }))];
        case 6:
          _b.sent();
          return [2 /*return*/, {
            text: 'Payment sent successfully! Transaction hash: '.concat(result.transactionHash, '. ').concat(paymentDetails.amount, ' ').concat(paymentDetails.currency, ' has been sent to ').concat(paymentDetails.recipient, '.'),
            values: {
              success: true,
              transactionHash: result.transactionHash,
              amount: paymentDetails.amount,
              currency: paymentDetails.currency,
              recipient: paymentDetails.recipient,
              status: 'completed',
            },
            data: {
              action: 'SEND_PAYMENT',
              transactionData: {
                hash: result.transactionHash,
                amount: amount.toString(),
                method,
                recipient: paymentDetails.recipient,
                timestamp: new Date().toISOString(),
              },
            },
          }];
        case 7:
          if (!(result.status === 'PENDING')) {return [3 /*break*/, 9];}
          return [4 /*yield*/, (callback === null || callback === void 0 ? void 0 : callback({
            text: 'Payment is pending approval. '.concat(result.error || 'Please confirm the transaction.'),
            metadata: {
              paymentId: result.id,
              requiresConfirmation: true,
            },
          }))];
        case 8:
          _b.sent();
          return [2 /*return*/, {
            text: 'Payment is pending approval. '.concat(result.error || 'Please confirm the transaction.'),
            values: {
              success: false,
              status: 'pending',
              paymentId: result.id,
              requiresConfirmation: true,
            },
            data: {
              action: 'SEND_PAYMENT',
              paymentId: result.id,
              pendingReason: result.error,
            },
          }];
        case 9: return [4 /*yield*/, (callback === null || callback === void 0 ? void 0 : callback({
          text: 'Payment failed: '.concat(result.error || 'Unknown error occurred'),
          error: true,
        }))];
        case 10:
          _b.sent();
          return [2 /*return*/, {
            text: 'Payment failed: '.concat(result.error || 'Unknown error occurred'),
            values: {
              success: false,
              error: result.error || 'unknown_error',
              status: 'failed',
            },
            data: {
              action: 'SEND_PAYMENT',
              errorType: 'payment_failed',
              errorDetails: result.error,
            },
          }];
        case 11: return [3 /*break*/, 14];
        case 12:
          error_1 = _b.sent();
          core_1.elizaLogger.error('[SendPaymentAction] Error:', error_1);
          return [4 /*yield*/, (callback === null || callback === void 0 ? void 0 : callback({
            text: 'Error processing payment: '.concat(error_1 instanceof Error ? error_1.message : 'Unknown error'),
            error: true,
          }))];
        case 13:
          _b.sent();
          return [2 /*return*/, {
            text: 'Error processing payment: '.concat(error_1 instanceof Error ? error_1.message : 'Unknown error'),
            values: {
              success: false,
              error: error_1 instanceof Error ? error_1.message : 'unknown_error',
            },
            data: {
              action: 'SEND_PAYMENT',
              errorType: 'processing_error',
              errorDetails: error_1 instanceof Error ? error_1.stack : undefined,
            },
          }];
        case 14: return [2];
      }
    });
  }); },
  examples: [
    [
      {
        name: '{{user}}',
        content: { text: 'Send 0.1 ETH to bob.eth' },
      },
      {
        name: '{{agent}}',
        content: {
          text: 'Payment sent successfully! Transaction hash: 0xabc123... 0.1 ETH has been sent to bob.eth.',
          actions: ['SEND_PAYMENT'],
        },
      },
    ],
    [
      {
        name: '{{user}}',
        content: { text: 'Transfer 50 USDC to alice.eth and then send her a confirmation message' },
      },
      {
        name: '{{agent}}',
        content: {
          text: "I'll transfer 50 USDC to alice.eth and then send her a confirmation message.",
          thought: 'User wants me to send payment and follow up with a message - I should process the payment first, then use the transaction details in the message.',
          actions: ['SEND_PAYMENT'],
        },
      },
      {
        name: '{{agent}}',
        content: {
          text: 'Payment completed! Now sending confirmation message to Alice...',
          thought: 'Payment successful with transaction hash. I can now send Alice a message with the transaction details.',
          actions: ['SEND_MESSAGE'],
        },
      },
    ],
    [
      {
        name: '{{user}}',
        content: {
          text: 'Pay the invoice for 100 USDC to vendor.eth and update our accounting records',
        },
      },
      {
        name: '{{agent}}',
        content: {
          text: "I'll process the invoice payment and update the accounting records.",
          thought: 'User wants payment processing followed by accounting updates - I should send the payment first, then use the transaction data for bookkeeping.',
          actions: ['SEND_PAYMENT'],
        },
      },
      {
        name: '{{agent}}',
        content: {
          text: 'Invoice payment completed! Now updating accounting records with transaction details...',
          thought: 'Payment processed successfully. I can now update the accounting system with the transaction hash and payment details.',
          actions: ['UPDATE_ACCOUNTING'],
        },
      },
    ],
  ],
};
/**
 * Extract payment details from text
 */
function extractPaymentDetails(text) {
  // Match patterns like "send 0.1 ETH to address" or "transfer 50 USDC to bob.eth"
  const patterns = [
    /(?:send|transfer|pay)\s+(\d+(?:\.\d+)?)\s+(\w+)\s+to\s+(\S+)/i,
    /(\d+(?:\.\d+)?)\s+(\w+)\s+to\s+(\S+)/i,
  ];
  for (let _i = 0, patterns_1 = patterns; _i < patterns_1.length; _i++) {
    const pattern = patterns_1[_i];
    const match = text.match(pattern);
    if (match) {
      return {
        amount: match[1],
        currency: match[2],
        recipient: match[3],
      };
    }
  }
  return null;
}
