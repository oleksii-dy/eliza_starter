"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var paymentRequestScenario = {
    name: 'Payment: Send Payment Requests',
    description: 'Demonstrates creating and sending payment requests to other users',
    category: 'payment',
    examples: [
        [
            {
                user: 'alice',
                content: 'Request 25 USDC from bob@example.com for dinner last night',
            },
            {
                user: 'agent',
                content: 'I\'ve created a payment request for 25 USDC from bob@example.com with the note "dinner last night". They\'ll receive a notification to approve the payment.',
                action: 'CREATE_PAYMENT_REQUEST',
            },
        ],
        [
            {
                user: 'charlie',
                content: 'Send an invoice for 0.05 ETH to client.eth for consulting services',
            },
            {
                user: 'agent',
                content: 'Invoice created for 0.05 ETH to client.eth. Description: "consulting services". The payment request has been sent and is awaiting approval.',
                action: 'CREATE_PAYMENT_REQUEST',
            },
        ],
        [
            {
                user: 'david',
                content: 'Split the bill of 100 USDC between me, alice, and bob equally',
            },
            {
                user: 'agent',
                content: "I've created payment requests of 33.33 USDC each to alice and bob. You'll cover 33.34 USDC. The requests have been sent for approval.",
                action: 'CREATE_PAYMENT_REQUEST',
            },
        ],
    ],
    actions: ['CREATE_PAYMENT_REQUEST'],
    evaluator: function (response) {
        var hasRequestIntent = response.toLowerCase().includes('request') ||
            response.toLowerCase().includes('invoice') ||
            response.toLowerCase().includes('split');
        var hasPaymentInfo = response.toLowerCase().includes('payment') ||
            response.toLowerCase().includes('approval') ||
            response.toLowerCase().includes('notification');
        var hasAmount = /\d+(\.\d+)?\s*(ETH|USDC|SOL|MATIC)/i.test(response);
        return hasRequestIntent && hasPaymentInfo && hasAmount;
    },
    tags: ['payment', 'request', 'invoice', 'split', 'bill'],
};
exports.default = paymentRequestScenario;
