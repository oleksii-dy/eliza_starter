// Real payment integration scenario
const paymentRealIntegrationScenario: any = {
  id: 'payment-real-integration-001',
  name: 'Payment Real Integration Test',
  description:
    'Tests real blockchain payment integration including wallet connections, gas estimation, and transaction monitoring',
  category: 'payment',
  tags: ['payment', 'blockchain', 'integration', 'wallet', 'transaction'],

  // Add examples array for compatibility with test framework
  examples: [
    [
      {
        user: 'customer',
        content: 'I want to connect my MetaMask wallet to make a payment.',
      },
      {
        user: 'agent',
        content: 'I\'ll help you connect your MetaMask wallet. Please approve the connection request in your wallet. Once connected, you can make secure blockchain payments.',
      },
    ],
    [
      {
        user: 'customer',
        content: 'How much will the gas fees be for this transaction?',
      },
      {
        user: 'agent',
        content: 'Current gas fees on Ethereum are approximately 25 gwei, which would cost about $3.50 for a USDC transfer. Would you like to proceed or wait for lower fees?',
      },
    ],
  ],

  // Add evaluator function for test compatibility
  evaluator: (response: string) => {
    const hasBlockchainMention = 
      response.toLowerCase().includes('blockchain') ||
      response.toLowerCase().includes('wallet') ||
      response.toLowerCase().includes('metamask') ||
      response.toLowerCase().includes('transaction') ||
      response.toLowerCase().includes('gas');
    
    const hasIntegrationMention = 
      response.toLowerCase().includes('connect') ||
      response.toLowerCase().includes('approve') ||
      response.toLowerCase().includes('fees') ||
      response.toLowerCase().includes('gwei');
    
    return hasBlockchainMention || hasIntegrationMention;
  },

  actors: [
    {
      id: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
      name: 'Payment Agent',
      role: 'subject',
      bio: 'An AI agent with real payment capabilities and wallet management',
      system: `You are an AI agent with payment integration. You can:
- Check wallet balances
- Process payments
- Create and manage wallets
- Provide research services that require payment

Research services cost 1 USDC. Always inform users of costs before processing payments.`,
      plugins: ['@elizaos/plugin-payment'],
      script: { steps: [] },
    },
    {
      id: 'b2c3d4e5-f6a7-8901-bcde-f23456789012',
      name: 'Test User',
      role: 'assistant',
      script: {
        steps: [
          {
            type: 'message',
            content: 'Can you check my wallet balance?',
          },
          {
            type: 'wait',
            waitTime: 3000,
          },
          {
            type: 'message',
            content: 'Research the latest developments in quantum computing',
          },
          {
            type: 'wait',
            waitTime: 5000,
          },
        ],
      },
    },
  ],

  setup: {
    roomType: 'dm',
    roomName: 'Payment Integration Test',
    context: 'Testing real payment integration with wallet management',
    beforeRun: async (context: any) => {
      // Ensure payment service is initialized
      const runtime = context.runtime;
      const paymentService = runtime.getService('payment');
      if (!paymentService) {
        throw new Error('Payment service not initialized');
      }

      // Ensure database is available
      const dbService = runtime.getService('database');
      if (!dbService || !dbService.getDatabase) {
        throw new Error('Database service not available');
      }

      return { paymentService, dbService };
    },
  },

  execution: {
    maxDuration: 30000,
    maxSteps: 10,
    stopConditions: [
      {
        type: 'message_count',
        value: 4,
        description: 'Stop after 4 messages exchanged',
      },
    ],
  },

  verification: {
    rules: [
      {
        id: 'wallet-created',
        type: 'custom',
        description: 'Wallet created and persisted',
        config: {
          validate: async (context: any) => {
            const { runtime, state } = context;
            const { paymentService, dbService } = state;
            const userId = 'b2c3d4e5-f6a7-8901-bcde-f23456789012';

            // Check if wallet was created
            const balances = await paymentService.getUserBalance(userId, runtime);
            
            if (balances.size === 0) {
              return { success: false, reason: 'No wallets created' };
            }

            // Check database persistence
            const db = dbService.getDatabase();
            const wallets = await db
              .select()
              .from('userWallets')
              .where({ userId })
              .limit(10);

            if (!wallets || wallets.length === 0) {
              return { success: false, reason: 'Wallet not persisted in database' };
            }

            // Verify encryption
            const wallet = wallets[0];
            if (!wallet.encryptedPrivateKey || wallet.encryptedPrivateKey.includes('0x')) {
              return { success: false, reason: 'Wallet not properly encrypted' };
            }

            return { success: true };
          },
        },
        weight: 5,
      },
      {
        id: 'balance-reported',
        type: 'llm',
        description: 'Agent reports wallet balance',
        config: {
          criteria: 'The agent should report the wallet balance when requested',
          expectedValue: 'Balance information provided',
        },
        weight: 3,
      },
      {
        id: 'payment-context',
        type: 'llm',
        description: 'Payment context in research response',
        config: {
          criteria: 'The agent should mention payment requirement or insufficient funds for research',
          expectedValue: 'Payment context mentioned',
        },
        weight: 2,
      },
    ],
    expectedOutcomes: [
      {
        actorId: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
        outcome: 'Successfully managed wallet and handled payment requests',
        verification: {
          id: 'integration-complete',
          type: 'llm',
          description: 'Real integration completed',
          config: {
            criteria: 'The agent successfully created wallets, reported balances, and handled payment requirements',
          },
        },
      },
    ],
  },

  cleanup: async (context: any) => {
    const { state } = context;
    const { dbService } = state;
    const db = dbService.getDatabase();
    
    try {
      // Clean up test data
      await db.delete('userWallets').where({ userId: 'b2c3d4e5-f6a7-8901-bcde-f23456789012' });
      await db.delete('paymentTransactions').where({ payerId: 'b2c3d4e5-f6a7-8901-bcde-f23456789012' });
    } catch (error) {
      // Ignore cleanup errors
    }
  },
};

// Payment confirmation scenario
const paymentConfirmationScenario: any = {
  id: 'payment-confirmation-real-001',
  name: 'Payment Confirmation Test',
  description: 'Test payment confirmation with real verification codes',
  category: 'payment',
  tags: ['payment', 'confirmation', 'verification', 'security'],

  actors: [
    {
      id: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
      name: 'Payment Agent',
      role: 'subject',
      bio: 'An AI agent with secure payment confirmation',
      system: `You are an AI agent with payment integration. 
You can process payments but require confirmation for security.
Always generate unique verification codes for payment confirmations.`,
      plugins: ['@elizaos/plugin-payment'],
      script: { steps: [] },
    },
    {
      id: 'b2c3d4e5-f6a7-8901-bcde-f23456789012',
      name: 'Test User',
      role: 'assistant',
      script: {
        steps: [
          {
            type: 'message',
            content: 'Send 5 USDC to 0x742d35Cc6634C0532925a3b844Bc9e7595f7E123',
          },
          {
            type: 'wait',
            waitTime: 5000,
          },
        ],
      },
    },
  ],

  setup: {
    roomType: 'dm',
    roomName: 'Payment Confirmation Test',
    context: 'Testing payment confirmation flow',
    beforeRun: async (context: any) => {
      const runtime = context.runtime;
      const paymentService = runtime.getService('payment');
      
      // Update settings to require confirmation
      await paymentService.updateSettings({
        requireConfirmation: true,
        autoApprovalThreshold: 0.01,
      });

      return { paymentService };
    },
  },

  execution: {
    maxDuration: 20000,
    maxSteps: 5,
    stopConditions: [
      {
        type: 'message_count',
        value: 2,
        description: 'Stop after initial exchange',
      },
    ],
  },

  verification: {
    rules: [
      {
        id: 'confirmation-required',
        type: 'llm',
        description: 'Agent requires confirmation',
        config: {
          criteria: 'The agent should mention that confirmation or verification is required',
          expectedValue: 'Confirmation requirement mentioned',
        },
        weight: 3,
      },
      {
        id: 'verification-code-generated',
        type: 'custom',
        description: 'Unique verification code generated',
        config: {
          validate: async (context: any) => {
            const { runtime } = context;
            const dbService = runtime.getService('database');
            const db = dbService.getDatabase();
            
            const pendingPayments = await db
              .select()
              .from('paymentRequests')
              .where({ 
                userId: 'b2c3d4e5-f6a7-8901-bcde-f23456789012',
                requiresConfirmation: true,
              })
              .limit(1);

            if (!pendingPayments || pendingPayments.length === 0) {
              return { success: false, reason: 'No pending payment found' };
            }

            const payment = pendingPayments[0];
            const metadata = payment.metadata as any;
            
            if (!metadata?.verificationCode || metadata.verificationCode === '123456') {
              return { success: false, reason: 'No unique verification code' };
            }

            if (!/^\d{6}$/.test(metadata.verificationCode)) {
              return { success: false, reason: 'Invalid code format' };
            }

            return { success: true };
          },
        },
        weight: 5,
      },
    ],
    expectedOutcomes: [
      {
        actorId: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
        outcome: 'Successfully created pending payment with verification',
        verification: {
          id: 'confirmation-flow-complete',
          type: 'llm',
          description: 'Confirmation flow executed',
          config: {
            criteria: 'The agent created a pending payment and requested confirmation with proper security',
          },
        },
      },
    ],
  },

  cleanup: async (context: any) => {
    const { state } = context;
    const { paymentService } = state;
    
    // Reset settings
    await paymentService.updateSettings({
      requireConfirmation: false,
      autoApprovalThreshold: 10,
    });
  },
};

export default paymentRealIntegrationScenario;
export { paymentConfirmationScenario }; 