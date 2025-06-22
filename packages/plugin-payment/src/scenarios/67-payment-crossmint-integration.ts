// Crossmint integration scenario for testing MPC wallets and cross-chain payments
const crossmintIntegrationScenario: any = {
  id: 'payment-crossmint-integration-001',
  name: 'Crossmint Integration Test',
  description: 'Tests Crossmint adapter integration with MPC wallets and multi-chain payment support',
  category: 'payment',
  tags: ['payment', 'crossmint', 'mpc', 'multi-chain', 'ethereum', 'solana'],

  actors: [
    {
      id: 'c3d4e5f6-a7b8-9012-cdef-345678901234',
      name: 'Crossmint Payment Agent',
      role: 'subject',
      bio: 'An AI agent with Crossmint integration for secure MPC wallet payments',
      system: `You are an AI agent with Crossmint payment integration. You can:
- Process payments using secure MPC (Multi-Party Computation) wallets
- Handle cross-chain payments on Ethereum, Polygon, Arbitrum, Optimism, Base, and Solana
- Accept USDC, ETH, SOL, MATIC, and other supported tokens
- Provide enterprise-grade security without exposing private keys

When users request payments, use the Crossmint adapter for maximum security and cross-chain flexibility.
Always inform users about the MPC wallet benefits and supported chains.`,
      plugins: ['@elizaos/plugin-payment', '@elizaos/plugin-crossmint'],
      script: { steps: [] },
    },
    {
      id: 'd4e5f6a7-b8c9-0123-defa-456789012345',
      name: 'Cross-chain User',
      role: 'assistant',
      script: {
        steps: [
          {
            type: 'message',
            content: 'Hi! I need to send 10 USDC on Ethereum to my colleague.',
          },
          {
            type: 'wait',
            waitTime: 5000,
          },
          {
            type: 'message',
            content: 'Great! Please use the secure MPC wallet. Here\'s the address: 0x742d35Cc6634C0532925a3b844Bc9e7595f2bD3e',
          },
          {
            type: 'wait',
            waitTime: 8000,
          },
          {
            type: 'message',
            content: 'Excellent! Now I need to send 0.5 SOL on Solana. Can you handle that too?',
          },
          {
            type: 'wait',
            waitTime: 5000,
          },
          {
            type: 'message',
            content: 'Perfect! Send it to: 7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZjDpNqYV4N',
          },
          {
            type: 'wait',
            waitTime: 8000,
          },
          {
            type: 'message',
            content: 'This MPC wallet system seems very secure. Can you explain how it protects my funds?',
          },
        ],
      },
    },
  ],

  setup: {
    roomType: 'dm',
    roomName: 'Crossmint Payment Services',
    context: 'Testing Crossmint integration for secure cross-chain payments',
  },

  execution: {
    maxDuration: 90000,
    maxSteps: 25,
    stopConditions: [
      {
        type: 'message_count',
        value: 10,
        description: 'Stop after 10 messages exchanged',
      },
    ],
  },

  verification: {
    rules: [
      {
        id: 'crossmint-mentioned',
        type: 'llm',
        description: 'Agent mentions Crossmint or MPC wallets',
        config: {
          criteria: 'The agent should mention using Crossmint or MPC (Multi-Party Computation) wallets for secure payments',
          expectedValue: 'Crossmint/MPC wallet mentioned',
        },
        weight: 3,
      },
      {
        id: 'ethereum-payment',
        type: 'llm',
        description: 'Ethereum USDC payment processed',
        config: {
          criteria: 'The agent should process the 10 USDC payment on Ethereum using Crossmint',
          expectedValue: 'Ethereum payment processed',
        },
        weight: 3,
      },
      {
        id: 'solana-payment',
        type: 'llm',
        description: 'Solana payment processed',
        config: {
          criteria: 'The agent should process the 0.5 SOL payment on Solana using Crossmint',
          expectedValue: 'Solana payment processed',
        },
        weight: 3,
      },
      {
        id: 'security-explanation',
        type: 'llm',
        description: 'MPC security explained',
        config: {
          criteria: 'The agent should explain how MPC wallets protect funds without exposing private keys',
          expectedValue: 'Security benefits explained',
        },
        weight: 2,
      },
      {
        id: 'cross-chain-capability',
        type: 'llm',
        description: 'Cross-chain support demonstrated',
        config: {
          criteria: 'The agent should successfully handle payments on both Ethereum and Solana chains',
          expectedValue: 'Multi-chain payments supported',
        },
        weight: 2,
      },
    ],
    expectedOutcomes: [
      {
        actorId: 'c3d4e5f6-a7b8-9012-cdef-345678901234',
        outcome: 'Successfully processed cross-chain payments using Crossmint MPC wallets',
        verification: {
          id: 'crossmint-integration-complete',
          type: 'llm',
          description: 'Complete Crossmint payment flow executed',
          config: {
            criteria: 'The agent successfully processed payments on multiple chains using Crossmint MPC wallets and explained the security benefits',
          },
        },
      },
    ],
  },
};

export default crossmintIntegrationScenario; 