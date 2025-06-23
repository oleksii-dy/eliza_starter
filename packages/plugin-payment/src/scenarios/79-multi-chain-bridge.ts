type Scenario = any;

const multiChainBridgeScenario: Scenario = {
  name: 'Payment: Multi-Chain Bridge Operations',
  description: 'Demonstrates bridging assets across different blockchain networks',
  category: 'payment',
  examples: [
    [
      {
        user: 'alice',
        content: 'Bridge 500 USDC from Ethereum to Arbitrum',
      },
      {
        user: 'agent',
        content: 'Initiating cross-chain bridge:\nFrom: Ethereum → To: Arbitrum\nAmount: 500 USDC\nBridge: Arbitrum Native Bridge\nEstimated time: 10-15 minutes\nFees: $12 (L1) + $0.50 (L2)\nFinal amount: 499.50 USDC',
        action: 'BRIDGE_TOKENS',
      },
    ],
    [
      {
        user: 'bob',
        content: 'Move my ETH from Polygon to Optimism using the fastest bridge',
      },
      {
        user: 'agent',
        content: 'Fast bridge selected: Hop Protocol\nRoute: Polygon → Ethereum → Optimism\nAmount: 2.5 ETH\nEstimated time: 2-3 minutes\nBridge fee: 0.3% (0.0075 ETH)\nYou\'ll receive: 2.4925 ETH on Optimism',
        action: 'BRIDGE_TOKENS',
      },
    ],
    [
      {
        user: 'charlie',
        content: 'Bridge 1000 MATIC from Polygon to BSC',
      },
      {
        user: 'agent',
        content: 'Cross-chain transfer via Multichain:\nFrom: Polygon (MATIC) → To: BSC (Wrapped MATIC)\nAmount: 1000 MATIC\nBridge time: 5-10 minutes\nFees: 0.1% (1 MATIC) + gas\nSecurity: Audited, $2B+ bridged\nProceed with transaction?',
        action: 'BRIDGE_TOKENS',
      },
    ],
  ],
  actions: ['BRIDGE_TOKENS'],
  evaluator: (response: string) => {
    const hasBridge = 
      response.toLowerCase().includes('bridge') ||
      response.toLowerCase().includes('cross-chain') ||
      response.toLowerCase().includes('transfer');
    
    const hasChains = 
      response.toLowerCase().includes('ethereum') ||
      response.toLowerCase().includes('arbitrum') ||
      response.toLowerCase().includes('polygon') ||
      response.toLowerCase().includes('optimism') ||
      response.toLowerCase().includes('bsc');
    
    const hasAmount = /\d+(\.\d+)?\s*[A-Z]{3,}/i.test(response);
    const hasFees = /fee|cost|gas/i.test(response);
    
    return hasBridge && hasChains && (hasAmount || hasFees);
  },
  tags: ['payment', 'bridge', 'cross-chain', 'multichain', 'transfer'],
};

export default multiChainBridgeScenario; 