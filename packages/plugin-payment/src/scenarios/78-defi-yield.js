"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var defiYieldScenario = {
    name: 'Payment: DeFi Yield Farming',
    description: 'Demonstrates DeFi yield farming, staking, and liquidity provision',
    category: 'payment',
    examples: [
        [
            {
                user: 'alice',
                content: 'Stake 1000 USDC in Aave to earn yield',
            },
            {
                user: 'agent',
                content: "Depositing 1000 USDC to Aave V3:\nCurrent APY: 3.45%\nEstimated yearly return: 34.5 USDC\nYou'll receive 1000 aUSDC tokens\nGas cost: ~$15\nTransaction confirming...",
                action: 'DEFI_STAKE',
            },
        ],
        [
            {
                user: 'bob',
                content: 'Add liquidity to ETH/USDC pool on Uniswap V3',
            },
            {
                user: 'agent',
                content: 'Setting up Uniswap V3 liquidity position:\nPool: ETH/USDC 0.3%\nRange: $2,100-$2,500\nDeposit: 0.5 ETH + 1,122.50 USDC\nEstimated APR: 24.5% (fees + rewards)\nImpermanent loss risk: Medium',
                action: 'DEFI_PROVIDE_LIQUIDITY',
            },
        ],
        [
            {
                user: 'charlie',
                content: 'Show me the best yield opportunities for my 10k DAI',
            },
            {
                user: 'agent',
                content: 'Top yield opportunities for 10,000 DAI:\n1. Compound: 4.2% APY (low risk)\n2. Yearn DAI vault: 7.8% APY (medium risk)\n3. Curve 3pool: 5.5% + CRV rewards\n4. Convex staking: 12.3% APY (higher risk)\nRecommended: Split between Compound and Yearn for balanced risk/reward.',
                action: 'DEFI_YIELD_SEARCH',
            },
        ],
    ],
    actions: ['DEFI_STAKE', 'DEFI_PROVIDE_LIQUIDITY', 'DEFI_YIELD_SEARCH'],
    evaluator: function (response) {
        var hasDefi = response.toLowerCase().includes('defi') ||
            response.toLowerCase().includes('aave') ||
            response.toLowerCase().includes('compound') ||
            response.toLowerCase().includes('uniswap') ||
            response.toLowerCase().includes('curve') ||
            response.toLowerCase().includes('yearn');
        var hasYield = response.toLowerCase().includes('yield') ||
            response.toLowerCase().includes('apy') ||
            response.toLowerCase().includes('apr') ||
            response.toLowerCase().includes('stake') ||
            response.toLowerCase().includes('liquidity');
        var hasAmount = /\d+(\.\d+)?\s*(USDC|ETH|DAI|USD)/i.test(response);
        return hasDefi && hasYield && hasAmount;
    },
    tags: ['payment', 'defi', 'yield', 'staking', 'liquidity'],
};
exports.default = defiYieldScenario;
