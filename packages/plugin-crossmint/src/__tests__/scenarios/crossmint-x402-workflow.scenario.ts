import type { PluginScenario } from '@elizaos/core';

/**
 * Real CrossMint + X.402 Workflow Scenario
 * Tests the complete workflow of CrossMint enterprise blockchain operations with X.402 payments
 */
export const crossmintX402WorkflowScenario: PluginScenario = {
  id: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
  name: 'CrossMint Enterprise + X.402 Payment Workflow',
  description: 'Test real CrossMint wallet operations, NFT minting, and X.402 payment protocol integration',
  category: 'integration',
  tags: ['crossmint', 'x402', 'enterprise', 'blockchain', 'payments', 'mpc-wallets'],

  characters: [
    {
      id: 'f1e2d3c4-b5a6-7890-9876-543210fedcba',
      name: 'Enterprise Agent',
      role: 'subject',
      plugins: ['@elizaos/plugin-crossmint']
    },
    {
      id: 'a9b8c7d6-e5f4-3210-9876-543210abcdef',
      name: 'Enterprise User',
      role: 'assistant',
      plugins: []
    }
  ],

  script: {
        steps: [
          {
            type: 'message',
            content: 'I need to create an MPC wallet on Ethereum for our enterprise operations'
          },
          { type: 'wait', duration: 3000 },
          {
            type: 'message',
            content: 'Now create an X.402 payment request for 25 USDC for our service fee'
          },
          { type: 'wait', duration: 3000 },
          {
            type: 'message',
            content: 'Check the status of that payment request'
          },
          { type: 'wait', duration: 2000 },
          {
            type: 'message',
            content: 'Show me my wallet portfolio and balances'
          },
          { type: 'wait', duration: 2000 },
          {
            type: 'message',
            content: 'Create an NFT collection called "Enterprise Assets" on Polygon'
          }
        ]
  },

  setup: {
    roomType: 'dm',
    roomName: 'Enterprise Blockchain Operations',
    context: 'Enterprise user managing blockchain operations with CrossMint and X.402 payments'
  },

  verification: {
    rules: [
      {
        id: 'crossmint-wallet-creation',
        type: 'llm',
        description: 'Agent successfully creates CrossMint MPC wallet',
        config: {
          successCriteria: `
            Verify that the agent:
            1. Acknowledges the wallet creation request
            2. Uses the CREATE_CROSSMINT_WALLET action
            3. Successfully creates an MPC wallet on Ethereum
            4. Provides wallet details including address and type
            5. Confirms the wallet is active and secure
          `,
          priority: 'high',
          category: 'functionality'
        }
      },
      {
        id: 'x402-payment-request',
        type: 'llm',
        description: 'Agent creates valid X.402 payment request',
        config: {
          successCriteria: `
            Verify that the agent:
            1. Uses the CREATE_X402_PAYMENT action
            2. Creates a payment request for 25 USDC
            3. Provides a valid payment link
            4. Confirms X.402 protocol compliance
            5. Sets appropriate expiration time
          `,
          priority: 'high',
          category: 'functionality'
        }
      },
      {
        id: 'payment-status-check',
        type: 'llm',
        description: 'Agent checks X.402 payment status',
        config: {
          successCriteria: `
            Verify that the agent:
            1. Uses the CHECK_PAYMENT_STATUS action
            2. Provides current payment status
            3. Shows payment verification details
            4. Confirms X.402 compliance
          `,
          priority: 'medium',
          category: 'functionality'
        }
      },
      {
        id: 'portfolio-display',
        type: 'llm',
        description: 'Agent displays wallet portfolio and balances',
        config: {
          successCriteria: `
            Verify that the agent:
            1. Shows wallet portfolio information
            2. Displays token balances across chains
            3. Provides total portfolio value
            4. Lists supported blockchain networks
          `,
          priority: 'medium',
          category: 'functionality'
        }
      },
      {
        id: 'nft-collection-creation',
        type: 'llm',
        description: 'Agent creates NFT collection',
        config: {
          successCriteria: `
            Verify that the agent:
            1. Uses appropriate NFT creation action
            2. Creates collection named "Enterprise Assets"
            3. Sets up collection on Polygon network
            4. Provides collection details and contract address
          `,
          priority: 'medium',
          category: 'functionality'
        }
      },
      {
        id: 'enterprise-capabilities-demonstration',
        type: 'llm',
        description: 'Agent demonstrates enterprise blockchain capabilities',
        config: {
          successCriteria: `
            Verify that throughout the conversation the agent:
            1. Demonstrates MPC wallet security features
            2. Shows X.402 HTTP-native payment capabilities
            3. Explains enterprise-grade blockchain infrastructure
            4. Provides professional, enterprise-appropriate responses
            5. Shows understanding of business use cases
          `,
          priority: 'high',
          category: 'integration'
        }
      },
      {
        id: 'error-handling-and-validation',
        type: 'llm',
        description: 'Agent handles operations with proper validation',
        config: {
          successCriteria: `
            Verify that the agent:
            1. Validates input parameters appropriately
            2. Provides clear error messages if operations fail
            3. Suggests alternatives for unsupported operations
            4. Maintains professional communication throughout
          `,
          priority: 'medium',
          category: 'functionality'
        }
      }
    ]
  },

  // Environment requirements
  requiredEnvVars: [
    'CROSSMINT_API_KEY',
    'CROSSMINT_PROJECT_ID',
    'CROSSMINT_ENVIRONMENT',
    'X402_FACILITATOR_URL'
  ]
};

export default crossmintX402WorkflowScenario;