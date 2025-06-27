"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var coinbaseAgentKitScenario = {
    name: 'Payment: Coinbase AgentKit Operations',
    description: 'Demonstrates using Coinbase AgentKit for automated trading and portfolio management',
    category: 'payment',
    examples: [
        [
            {
                user: 'alice',
                content: 'Set up automated DCA buying $100 of BTC every week',
            },
            {
                user: 'agent',
                content: 'Configuring Coinbase AgentKit DCA strategy: $100 BTC weekly purchases. Starting next Monday at 9 AM UTC. Funding from your USD balance. Estimated fees: $2.99 per purchase.',
                action: 'AGENTKIT_DCA_SETUP',
            },
        ],
        [
            {
                user: 'bob',
                content: 'Rebalance my portfolio to 60% BTC, 30% ETH, 10% SOL',
            },
            {
                user: 'agent',
                content: 'Initiating portfolio rebalance via AgentKit:\nCurrent: BTC 45%, ETH 40%, SOL 15%\nTarget: BTC 60%, ETH 30%, SOL 10%\nRequired trades: Sell 0.5 ETH, 25 SOL → Buy 0.15 BTC\nEstimated cost: $45 in fees',
                action: 'AGENTKIT_REBALANCE',
            },
        ],
        [
            {
                user: 'charlie',
                content: 'Enable smart order routing for my next ETH purchase',
            },
            {
                user: 'agent',
                content: 'AgentKit smart routing enabled. Your ETH orders will be split across Coinbase Pro, Coinbase Advanced, and partner exchanges for best execution. Typical savings: 0.1-0.3% vs single venue.',
                action: 'AGENTKIT_SMART_ROUTE',
            },
        ],
    ],
    actions: ['AGENTKIT_DCA_SETUP', 'AGENTKIT_REBALANCE', 'AGENTKIT_SMART_ROUTE'],
    evaluator: function (response) {
        var hasAgentKit = response.toLowerCase().includes('agentkit') || response.toLowerCase().includes('coinbase');
        var hasAutomation = response.toLowerCase().includes('automat') ||
            response.toLowerCase().includes('dca') ||
            response.toLowerCase().includes('rebalance') ||
            response.toLowerCase().includes('smart') ||
            response.toLowerCase().includes('configur');
        var hasTrading = response.toLowerCase().includes('buy') ||
            response.toLowerCase().includes('sell') ||
            response.toLowerCase().includes('trade') ||
            response.toLowerCase().includes('portfolio') ||
            response.toLowerCase().includes('purchas');
        return hasAgentKit && (hasAutomation || hasTrading);
    },
    tags: ['payment', 'coinbase', 'agentkit', 'automation', 'trading'],
};
exports.default = coinbaseAgentKitScenario;
