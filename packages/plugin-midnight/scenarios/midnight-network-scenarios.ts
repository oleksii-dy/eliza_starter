import type { PluginScenario } from '@elizaos/core';

type Scenario = any;

/**
 * Midnight Network Plugin Scenario Tests
 *
 * These scenarios test the Midnight Network plugin with:
 * - Real agent instances with funded wallets
 * - Actual Midnight Network testnet connectivity
 * - Zero-knowledge proof transactions
 * - Multi-agent secure communication
 * - Private payment processing
 */

// Scenario 1: Agent Discovery and Secure Messaging
export const agentDiscoveryScenario: PluginScenario = {
  id: 'midnight-agent-discovery' as any,
  name: 'Midnight Network Agent Discovery and Secure Messaging',
  description:
    'Tests agent discovery on Midnight Network and secure message exchange using zero-knowledge proofs',
  category: 'integration',
  tags: ['midnight', 'privacy', 'messaging', 'discovery'],

  characters: [
    {
      id: 'alice-agent' as any,
      name: 'AliceAgent',
      role: 'subject',
      bio: 'Alice is a Midnight Network agent with a funded testnet wallet who initiates secure communications',
      system:
        'You are AliceAgent, a specialized Midnight Network agent. You have access to a funded testnet wallet and can perform secure messaging and payments using zero-knowledge proofs. Your mission is to discover other agents and establish secure communication channels.',
      plugins: ['@elizaos/plugin-midnight'],
      settings: {
        secrets: {
          MIDNIGHT_WALLET_MNEMONIC:
            'despair pyramid crush balance crash busy sure popular level shed amount drastic note addict elite odor border theme lab scene oxygen illness immune wave',
          MIDNIGHT_NETWORK_URL: 'https://rpc.testnet.midnight.network',
          MIDNIGHT_INDEXER_URL: 'https://indexer.testnet.midnight.network',
          MIDNIGHT_NETWORK_ID: 'testnet',
        },
      },
    },
    {
      id: 'bob-agent' as any,
      name: 'BobAgent',
      role: 'observer',
      bio: 'Bob is a Midnight Network agent who receives secure communications and can respond with encrypted messages',
      system:
        'You are BobAgent, a Midnight Network agent specializing in privacy-preserving communications. You receive and respond to secure messages, demonstrating the power of zero-knowledge proof technology.',
      plugins: ['@elizaos/plugin-midnight'],
      settings: {
        secrets: {
          MIDNIGHT_WALLET_MNEMONIC:
            'abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon art',
          MIDNIGHT_NETWORK_URL: 'https://rpc.testnet.midnight.network',
          MIDNIGHT_INDEXER_URL: 'https://indexer.testnet.midnight.network',
          MIDNIGHT_NETWORK_ID: 'testnet',
        },
      },
    },
  ],

  script: {
    steps: [
      {
        type: 'message',
        from: 'alice-agent',
        content:
          'Hello! I am Alice, a Midnight Network agent. Let me discover other agents on the network.',
      },
      {
        type: 'action',
        from: 'alice-agent',
        actionName: 'DISCOVER_AGENTS',
        content: 'Discover agents on Midnight Network',
      },
      {
        type: 'wait',
        duration: 3000,
      },
      {
        type: 'message',
        from: 'alice-agent',
        content:
          'I found another agent! Let me send them a secure message using zero-knowledge proofs.',
      },
      {
        type: 'action',
        from: 'alice-agent',
        actionName: 'SEND_SECURE_MESSAGE',
        content:
          'Hello Bob! This is a secure, private message sent through Midnight Network using zero-knowledge proofs. Only you can read this!',
        actionParams: {
          recipient: 'bob-agent',
          message:
            'Hello Bob! This is a secure, private message sent through Midnight Network using zero-knowledge proofs. Only you can read this!',
        },
      },
      {
        type: 'wait',
        duration: 5000,
      },
      {
        type: 'message',
        from: 'alice-agent',
        content:
          'Message sent successfully! The communication is completely private and encrypted.',
      },
    ],
  },

  setup: {
    timeout: 60000,
    maxSteps: 50,
  },

  verification: {
    rules: [
      {
        id: 'agent-discovery-success',
        type: 'llm',
        description: 'Verify agents can discover each other on Midnight Network',
        config: {
          successCriteria:
            'Alice should successfully discover Bob agent on the Midnight Network using the DISCOVER_AGENTS action.',
          priority: 'high',
          category: 'functionality',
        },
      },
      {
        id: 'secure-message-transmission',
        type: 'llm',
        description: 'Verify secure message transmission using zero-knowledge proofs',
        config: {
          successCriteria:
            'Alice should successfully send an encrypted message to Bob using SEND_SECURE_MESSAGE action with zero-knowledge proofs.',
          priority: 'high',
          category: 'functionality',
        },
      },
      {
        id: 'message-decryption',
        type: 'llm',
        description: 'Verify Bob can receive and decrypt the secure message',
        config: {
          successCriteria:
            "Bob should receive, decrypt, and acknowledge Alice's secure message, demonstrating end-to-end privacy.",
          priority: 'high',
          category: 'functionality',
        },
      },
      {
        id: 'bidirectional-communication',
        type: 'llm',
        description: 'Verify bidirectional secure communication',
        config: {
          successCriteria:
            'Bob should successfully send a secure reply to Alice, establishing bidirectional encrypted communication.',
          priority: 'high',
          category: 'collaboration',
        },
      },
    ],
  },
};

// Scenario 2: Private Payment Processing
export const privatePaymentScenario: Scenario = {
  id: 'midnight-private-payment' as any,
  name: 'Midnight Network Private Payment Processing',
  description:
    'Tests private payment processing between agents using zero-knowledge proofs on Midnight Network testnet',
  category: 'integration',
  tags: ['midnight', 'payments', 'privacy', 'zk-proofs'],

  actors: [
    {
      id: 'alice-payer' as any,
      name: 'AliceAgent',
      role: 'payer',
      bio: 'Alice has a funded Midnight Network testnet wallet and will send private payments',
      system:
        'You are AliceAgent with a funded testnet wallet. You will demonstrate private payment capabilities using zero-knowledge proofs to maintain transaction privacy.',
      plugins: ['@elizaos/plugin-midnight'],
      settings: {
        secrets: {
          MIDNIGHT_WALLET_MNEMONIC:
            'despair pyramid crush balance crash busy sure popular level shed amount drastic note addict elite odor border theme lab scene oxygen illness immune wave',
          MIDNIGHT_NETWORK_URL: 'https://rpc.testnet.midnight.network',
          MIDNIGHT_INDEXER_URL: 'https://indexer.testnet.midnight.network',
          MIDNIGHT_NETWORK_ID: 'testnet',
        },
      },
      script: {
        steps: [
          {
            type: 'message',
            content:
              'I have a funded Midnight Network wallet. Let me check my balance before sending a payment.',
            description: 'Check wallet balance before payment',
          },
          {
            type: 'provider',
            provider: 'MIDNIGHT_WALLET',
            description: 'Get current wallet balance and status',
          },
          {
            type: 'wait',
            waitTime: 2000,
            description: 'Wait for balance check',
          },
          {
            type: 'message',
            content:
              'Balance confirmed! Now I will send a private payment to Bob using zero-knowledge proofs.',
            description: 'Confirm balance and prepare payment',
          },
          {
            type: 'action',
            action: 'SEND_PAYMENT',
            content: 'Send 1.0 MIDNIGHT tokens to Bob',
            params: {
              recipient: 'bob-agent',
              amount: '1.0',
              token: 'MIDNIGHT',
              private: true,
            },
            description: 'Send private payment to Bob using ZK proofs',
          },
          {
            type: 'wait',
            waitTime: 10000,
            description: 'Wait for payment processing and network confirmation',
          },
          {
            type: 'message',
            content:
              'Payment sent successfully! The transaction amount and recipient are hidden using zero-knowledge proofs.',
            description: 'Confirm private payment sent',
          },
          {
            type: 'provider',
            provider: 'MIDNIGHT_WALLET',
            description: 'Check updated wallet balance after payment',
          },
        ],
      },
    },
    {
      id: 'bob-payee' as any,
      name: 'BobAgent',
      role: 'payee',
      bio: 'Bob will receive private payments and verify receipt while maintaining privacy',
      system:
        'You are BobAgent, a recipient of private payments on Midnight Network. You can receive and verify payments while maintaining complete transaction privacy.',
      plugins: ['@elizaos/plugin-midnight'],
      settings: {
        secrets: {
          MIDNIGHT_WALLET_MNEMONIC:
            'abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon art',
          MIDNIGHT_NETWORK_URL: 'https://rpc.testnet.midnight.network',
          MIDNIGHT_INDEXER_URL: 'https://indexer.testnet.midnight.network',
          MIDNIGHT_NETWORK_ID: 'testnet',
        },
      },
      script: {
        steps: [
          {
            type: 'message',
            content:
              'I am ready to receive private payments on Midnight Network. My wallet is prepared.',
            description: 'Announce readiness to receive payments',
          },
          {
            type: 'provider',
            provider: 'MIDNIGHT_WALLET',
            description: 'Check initial wallet balance',
          },
          {
            type: 'wait',
            waitTime: 15000,
            description: 'Wait to receive payment from Alice',
          },
          {
            type: 'message',
            content: 'I should have received a payment. Let me check my wallet balance.',
            description: 'Check for received payment',
          },
          {
            type: 'provider',
            provider: 'MIDNIGHT_WALLET',
            description: 'Check updated wallet balance after receiving payment',
          },
          {
            type: 'wait',
            waitTime: 2000,
            description: 'Wait for balance update',
          },
          {
            type: 'message',
            content:
              'Payment received successfully! The transaction was completely private - observers cannot see the amount or sender.',
            description: 'Confirm private payment received',
          },
          {
            type: 'action',
            action: 'SEND_SECURE_MESSAGE',
            content:
              'Thank you Alice! I confirm receipt of the private payment. The zero-knowledge proof technology worked perfectly!',
            params: {
              recipient: 'alice-agent',
              message:
                'Thank you Alice! I confirm receipt of the private payment. The zero-knowledge proof technology worked perfectly!',
            },
            description: 'Send secure confirmation to Alice',
          },
        ],
      },
    },
  ],

  execution: {
    maxDuration: 90000,
    maxSteps: 60,
  },

  verification: {
    rules: [
      {
        id: 'wallet-balance-check',
        type: 'llm',
        description: 'Verify wallet balance can be checked before payment',
        config: {
          successCriteria:
            'Alice should successfully check her wallet balance using the MIDNIGHT_WALLET provider before sending payment.',
          priority: 'medium',
          category: 'functionality',
        },
      },
      {
        id: 'private-payment-transmission',
        type: 'llm',
        description: 'Verify private payment is sent using zero-knowledge proofs',
        config: {
          successCriteria:
            'Alice should successfully send a private payment to Bob using SEND_PAYMENT action with zero-knowledge proofs.',
          priority: 'critical',
          category: 'functionality',
        },
      },
      {
        id: 'payment-receipt-confirmation',
        type: 'llm',
        description: 'Verify Bob receives the payment and balance updates',
        config: {
          successCriteria:
            'Bob should receive the payment and his wallet balance should increase, demonstrating successful private transaction.',
          priority: 'critical',
          category: 'functionality',
        },
      },
      {
        id: 'privacy-preservation',
        type: 'llm',
        description: 'Verify transaction privacy is maintained',
        config: {
          successCriteria:
            'Both agents should confirm that transaction details (amount, sender, recipient) remain private to external observers.',
          priority: 'high',
          category: 'functionality',
        },
      },
    ],
  },
};

// Scenario 3: Private Chat Room Creation and Management
export const privateChatRoomScenario: Scenario = {
  id: 'midnight-private-chat-room' as any,
  name: 'Midnight Network Private Chat Room Management',
  description:
    'Tests creation and management of private chat rooms with encrypted group communication',
  category: 'integration',
  tags: ['midnight', 'chat-rooms', 'group-privacy', 'encryption'],

  actors: [
    {
      id: 'alice-moderator' as any,
      name: 'AliceAgent',
      role: 'subject',
      bio: 'Alice creates and moderates private chat rooms on Midnight Network',
      system:
        'You are AliceAgent, a chat room moderator on Midnight Network. You create secure, private chat rooms and invite other agents to join encrypted group conversations.',
      plugins: ['@elizaos/plugin-midnight'],
      settings: {
        secrets: {
          MIDNIGHT_WALLET_MNEMONIC:
            'despair pyramid crush balance crash busy sure popular level shed amount drastic note addict elite odor border theme lab scene oxygen illness immune wave',
          MIDNIGHT_NETWORK_URL: 'https://rpc.testnet.midnight.network',
          MIDNIGHT_INDEXER_URL: 'https://indexer.testnet.midnight.network',
          MIDNIGHT_NETWORK_ID: 'testnet',
        },
      },
      script: {
        steps: [
          {
            type: 'message',
            content:
              'I will create a private chat room for secure group communication on Midnight Network.',
            description: 'Announce chat room creation',
          },
          {
            type: 'action',
            action: 'CREATE_CHAT_ROOM',
            content: 'Create private chat room: "Midnight Development Team"',
            params: {
              name: 'Midnight Development Team',
              description: 'Private chat room for discussing Midnight Network development',
              private: true,
              encrypted: true,
            },
            description: 'Create encrypted private chat room',
          },
          {
            type: 'wait',
            waitTime: 3000,
            description: 'Wait for chat room creation',
          },
          {
            type: 'message',
            content:
              'Chat room created successfully! Now I will invite Bob to join our private discussion.',
            description: 'Confirm chat room creation and prepare invitation',
          },
          {
            type: 'action',
            action: 'SEND_SECURE_MESSAGE',
            content:
              'Bob, you are invited to join our private chat room "Midnight Development Team" for encrypted group discussion.',
            params: {
              recipient: 'bob-participant',
              message:
                'Bob, you are invited to join our private chat room "Midnight Development Team" for encrypted group discussion.',
              chatRoom: 'Midnight Development Team',
            },
            description: 'Send secure invitation to Bob',
          },
          {
            type: 'wait',
            waitTime: 10000,
            description: 'Wait for Bob to join',
          },
          {
            type: 'message',
            content:
              'Welcome everyone to our secure chat room! All messages here are encrypted and private.',
            description: 'Welcome message in the private chat room',
          },
        ],
      },
    },
    {
      id: 'bob-participant' as any,
      name: 'BobAgent',
      role: 'participant',
      bio: 'Bob participates in private chat rooms and encrypted group discussions',
      system:
        'You are BobAgent, a participant in private Midnight Network chat rooms. You join encrypted group conversations and contribute to secure discussions.',
      plugins: ['@elizaos/plugin-midnight'],
      settings: {
        secrets: {
          MIDNIGHT_WALLET_MNEMONIC:
            'abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon art',
          MIDNIGHT_NETWORK_URL: 'https://rpc.testnet.midnight.network',
          MIDNIGHT_INDEXER_URL: 'https://indexer.testnet.midnight.network',
          MIDNIGHT_NETWORK_ID: 'testnet',
        },
      },
      script: {
        steps: [
          {
            type: 'message',
            content: 'I am ready to participate in private chat rooms on Midnight Network.',
            description: 'Announce readiness for group chat',
          },
          {
            type: 'wait',
            waitTime: 8000,
            description: 'Wait for chat room invitation',
          },
          {
            type: 'message',
            content: 'I received an invitation to join a private chat room! Let me join.',
            description: 'Acknowledge chat room invitation',
          },
          {
            type: 'action',
            action: 'JOIN_CHAT_ROOM',
            content: 'Join the "Midnight Development Team" chat room',
            params: {
              roomName: 'Midnight Development Team',
              invitedBy: 'alice-moderator',
            },
            description: 'Join the private encrypted chat room',
          },
          {
            type: 'wait',
            waitTime: 5000,
            description: 'Wait for chat room join confirmation',
          },
          {
            type: 'message',
            content:
              'Successfully joined the private chat room! Thank you Alice for the invitation.',
            description: 'Confirm joining the chat room',
          },
          {
            type: 'action',
            action: 'SEND_SECURE_MESSAGE',
            content:
              "Hello everyone! I'm excited to be part of this secure, private discussion about Midnight Network development.",
            params: {
              chatRoom: 'Midnight Development Team',
              message:
                "Hello everyone! I'm excited to be part of this secure, private discussion about Midnight Network development.",
            },
            description: 'Send message in the private chat room',
          },
        ],
      },
    },
    {
      id: 'charlie-observer' as any,
      name: 'CharlieAgent',
      role: 'observer',
      bio: 'Charlie observes network activity but cannot access private chat rooms',
      system:
        'You are CharlieAgent, an observer on Midnight Network. You can see public activity but cannot access private, encrypted chat rooms unless invited.',
      plugins: ['@elizaos/plugin-midnight'],
      script: {
        steps: [
          {
            type: 'message',
            content:
              'I am monitoring network activity. I can see some encrypted traffic but cannot read private communications.',
            description: 'Observe network activity without access',
          },
          {
            type: 'provider',
            provider: 'MIDNIGHT_CHAT_ROOMS',
            description: 'Check for visible chat rooms',
          },
          {
            type: 'wait',
            waitTime: 15000,
            description: 'Wait and observe network activity',
          },
          {
            type: 'message',
            content:
              'I can detect encrypted chat room activity but cannot access the private content. Privacy is maintained!',
            description: 'Confirm privacy protection from external observer',
          },
        ],
      },
    },
  ],

  execution: {
    maxDuration: 120000,
    maxSteps: 75,
  },

  verification: {
    rules: [
      {
        id: 'chat-room-creation',
        type: 'llm',
        description: 'Verify private chat room can be created',
        config: {
          successCriteria:
            'Alice should successfully create a private, encrypted chat room using CREATE_CHAT_ROOM action.',
          priority: 'high',
          category: 'collaboration',
        },
      },
      {
        id: 'chat-room-invitation',
        type: 'llm',
        description: 'Verify secure invitation system works',
        config: {
          successCriteria:
            'Alice should successfully send a secure invitation to Bob to join the private chat room.',
          priority: 'high',
          category: 'functionality',
        },
      },
      {
        id: 'chat-room-joining',
        type: 'llm',
        description: 'Verify invited users can join private chat rooms',
        config: {
          successCriteria:
            'Bob should successfully join the private chat room using JOIN_CHAT_ROOM action after receiving invitation.',
          priority: 'high',
          category: 'functionality',
        },
      },
      {
        id: 'encrypted-group-messaging',
        type: 'llm',
        description: 'Verify encrypted messaging within the chat room',
        config: {
          successCriteria:
            'Both Alice and Bob should be able to send encrypted messages within the private chat room.',
          priority: 'critical',
          category: 'functionality',
        },
      },
      {
        id: 'privacy-from-observers',
        type: 'llm',
        description: 'Verify external observers cannot access private content',
        config: {
          successCriteria:
            'Charlie should be unable to access the private chat room content, confirming privacy protection.',
          priority: 'critical',
          category: 'functionality',
        },
      },
    ],
  },
};

// Scenario 4: Complete Multi-Agent Workflow
export const completeWorkflowScenario: Scenario = {
  id: 'midnight-complete-workflow' as any,
  name: 'Midnight Network Complete Multi-Agent Workflow',
  description:
    'Comprehensive test of all Midnight Network features: discovery, messaging, payments, and chat rooms',
  category: 'integration',
  tags: ['midnight', 'comprehensive', 'multi-agent', 'full-workflow'],

  actors: [
    {
      id: 'alice-coordinator' as any,
      name: 'AliceAgent',
      role: 'coordinator',
      bio: 'Alice coordinates the complete workflow demonstration',
      system:
        'You are AliceAgent, the coordinator for a comprehensive Midnight Network demonstration. You will showcase agent discovery, secure messaging, private payments, and chat room management.',
      plugins: ['@elizaos/plugin-midnight'],
      settings: {
        secrets: {
          MIDNIGHT_WALLET_MNEMONIC:
            'despair pyramid crush balance crash busy sure popular level shed amount drastic note addict elite odor border theme lab scene oxygen illness immune wave',
          MIDNIGHT_NETWORK_URL: 'https://rpc.testnet.midnight.network',
          MIDNIGHT_INDEXER_URL: 'https://indexer.testnet.midnight.network',
          MIDNIGHT_NETWORK_ID: 'testnet',
        },
      },
      script: {
        steps: [
          {
            type: 'message',
            content:
              'Welcome to the complete Midnight Network demonstration! I will showcase all privacy features.',
            description: 'Introduction to complete workflow',
          },
          {
            type: 'action',
            action: 'DISCOVER_AGENTS',
            content: 'Discover all available Midnight Network agents',
            description: 'Step 1: Agent Discovery',
          },
          {
            type: 'wait',
            waitTime: 3000,
            description: 'Wait for agent discovery',
          },
          {
            type: 'action',
            action: 'CREATE_CHAT_ROOM',
            content: 'Create demonstration chat room',
            params: {
              name: 'Midnight Demo Room',
              description: 'Demonstration of complete Midnight Network capabilities',
              private: true,
            },
            description: 'Step 2: Create private chat room',
          },
          {
            type: 'wait',
            waitTime: 3000,
            description: 'Wait for chat room creation',
          },
          {
            type: 'action',
            action: 'SEND_SECURE_MESSAGE',
            content: 'Bob, join our demo room for a complete Midnight Network showcase!',
            params: {
              recipient: 'bob-collaborator',
              message: 'Bob, join our demo room for a complete Midnight Network showcase!',
            },
            description: 'Step 3: Send secure invitation',
          },
          {
            type: 'wait',
            waitTime: 8000,
            description: 'Wait for Bob to join',
          },
          {
            type: 'action',
            action: 'SEND_PAYMENT',
            content: 'Send demonstration payment to Bob',
            params: {
              recipient: 'bob-collaborator',
              amount: '0.5',
              token: 'MIDNIGHT',
            },
            description: 'Step 4: Send private payment',
          },
          {
            type: 'wait',
            waitTime: 10000,
            description: 'Wait for payment processing',
          },
          {
            type: 'message',
            content:
              'Complete workflow demonstration finished! All Midnight Network features working perfectly.',
            description: 'Conclude demonstration',
          },
        ],
      },
    },
    {
      id: 'bob-collaborator' as any,
      name: 'BobAgent',
      role: 'collaborator',
      bio: 'Bob collaborates in the complete workflow demonstration',
      system:
        'You are BobAgent, collaborating in a complete Midnight Network workflow demonstration. You will participate in discovery, messaging, payments, and chat rooms.',
      plugins: ['@elizaos/plugin-midnight'],
      settings: {
        secrets: {
          MIDNIGHT_WALLET_MNEMONIC:
            'abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon art',
          MIDNIGHT_NETWORK_URL: 'https://rpc.testnet.midnight.network',
          MIDNIGHT_INDEXER_URL: 'https://indexer.testnet.midnight.network',
          MIDNIGHT_NETWORK_ID: 'testnet',
        },
      },
      script: {
        steps: [
          {
            type: 'message',
            content:
              'I am ready to participate in the complete Midnight Network workflow demonstration.',
            description: 'Ready for complete workflow',
          },
          {
            type: 'wait',
            waitTime: 10000,
            description: "Wait for Alice's invitation",
          },
          {
            type: 'action',
            action: 'JOIN_CHAT_ROOM',
            content: 'Join the Midnight Demo Room',
            params: {
              roomName: 'Midnight Demo Room',
            },
            description: 'Join the demonstration chat room',
          },
          {
            type: 'wait',
            waitTime: 3000,
            description: 'Wait for chat room join',
          },
          {
            type: 'message',
            content: 'Joined the demo room! Ready for the complete workflow demonstration.',
            description: 'Confirm participation',
          },
          {
            type: 'wait',
            waitTime: 12000,
            description: 'Wait to receive payment',
          },
          {
            type: 'provider',
            provider: 'MIDNIGHT_WALLET',
            description: 'Check wallet after payment',
          },
          {
            type: 'message',
            content:
              'Payment received! Complete workflow demonstration successful - all privacy features working!',
            description: 'Confirm complete workflow success',
          },
        ],
      },
    },
  ],

  execution: {
    maxDuration: 150000,
    maxSteps: 100,
  },

  verification: {
    rules: [
      {
        id: 'complete-agent-discovery',
        type: 'llm',
        description: 'Verify complete agent discovery functionality',
        config: {
          successCriteria:
            'Alice should successfully discover Bob using the agent discovery system.',
          priority: 'high',
          category: 'functionality',
        },
      },
      {
        id: 'complete-secure-messaging',
        type: 'llm',
        description: 'Verify complete secure messaging functionality',
        config: {
          successCriteria:
            'Alice and Bob should successfully exchange secure messages using zero-knowledge proofs.',
          priority: 'critical',
          category: 'functionality',
        },
      },
      {
        id: 'complete-private-payments',
        type: 'llm',
        description: 'Verify complete private payment functionality',
        config: {
          successCriteria:
            'Alice should successfully send a private payment to Bob, and Bob should receive it.',
          priority: 'critical',
          category: 'functionality',
        },
      },
      {
        id: 'complete-chat-room-management',
        type: 'llm',
        description: 'Verify complete chat room management functionality',
        config: {
          successCriteria:
            'Alice should create a private chat room and Bob should successfully join it.',
          priority: 'high',
          category: 'collaboration',
        },
      },
      {
        id: 'end-to-end-privacy',
        type: 'llm',
        description: 'Verify end-to-end privacy throughout the complete workflow',
        config: {
          successCriteria:
            'All interactions should maintain privacy: messages encrypted, payments private, chat rooms secure.',
          priority: 'critical',
          category: 'functionality',
        },
      },
    ],
  },
};

// Export all scenarios
export const midnightNetworkScenarios = [
  agentDiscoveryScenario,
  privatePaymentScenario,
  privateChatRoomScenario,
  completeWorkflowScenario,
];

export default midnightNetworkScenarios;
