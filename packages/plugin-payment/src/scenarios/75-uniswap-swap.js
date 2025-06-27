"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var uniswapSwapScenario = {
    name: 'Payment: Swap Tokens on Uniswap',
    description: 'Demonstrates swapping tokens using Uniswap DEX',
    category: 'payment',
    examples: [
        [
            {
                user: 'alice',
                content: 'Swap 1 ETH for USDC',
            },
            {
                user: 'agent',
                content: 'Initiating Uniswap swap: 1 ETH → USDC. Current rate: 1 ETH = 2,245.67 USDC. Expected output: 2,234.21 USDC after 0.5% slippage. Gas estimate: 0.015 ETH.',
                action: 'UNISWAP_SWAP',
            },
        ],
        [
            {
                user: 'bob',
                content: 'Convert 1000 USDC to DAI with minimal slippage',
            },
            {
                user: 'agent',
                content: "Processing Uniswap V3 swap: 1000 USDC → DAI. Using 0.1% slippage tolerance. Rate: 1 USDC = 0.9998 DAI. You'll receive 999.60 DAI. Routing through USDC/DAI 0.01% pool.",
                action: 'UNISWAP_SWAP',
            },
        ],
        [
            {
                user: 'charlie',
                content: 'Trade 500 MATIC for WETH on Polygon',
            },
            {
                user: 'agent',
                content: 'Executing swap on Uniswap (Polygon): 500 MATIC → WETH. Best route found: MATIC → USDC → WETH. Expected: 0.1823 WETH. Network: Polygon, Gas: ~0.5 MATIC.',
                action: 'UNISWAP_SWAP',
            },
        ],
    ],
    actions: ['UNISWAP_SWAP'],
    evaluator: function (response) {
        var hasSwapIntent = response.toLowerCase().includes('swap') ||
            response.toLowerCase().includes('convert') ||
            response.toLowerCase().includes('trade') ||
            response.toLowerCase().includes('exchange');
        var hasUniswap = response.toLowerCase().includes('uniswap');
        var hasTokenPair = /→|->|to|for/i.test(response);
        var hasAmount = /\d+(\.\d+)?\s*[A-Z]{3,}/i.test(response);
        var hasRate = /rate|price|slippage|output/i.test(response);
        return hasSwapIntent && hasUniswap && hasTokenPair && (hasAmount || hasRate);
    },
    tags: ['payment', 'uniswap', 'swap', 'dex', 'trading'],
};
exports.default = uniswapSwapScenario;
