import { IAgentRuntime, type Character } from '@elizaos/core';
import { RuntimeTestHarness } from '@elizaos/core/test-utils';
import { midnightPlugin } from '../index';

/**
 * Test environment configuration for Midnight Network plugin testing
 * Provides standardized setup for multi-agent real integration tests
 */

export interface MidnightTestConfig {
  walletMnemonic?: string;
  indexerUrl?: string;
  nodeUrl?: string;
  proofServerUrl?: string;
  networkId?: string;
  zkConfigPath?: string;
  enableRealNetwork?: boolean;
}

export interface MidnightTestAgents {
  agent1: IAgentRuntime;
  agent2: IAgentRuntime;
  harness: RuntimeTestHarness;
}

/**
 * Create a test environment with two Midnight Network enabled agents
 */
export async function createMidnightTestEnvironment(
  config: MidnightTestConfig = {}
): Promise<MidnightTestAgents> {
  const {
    walletMnemonic = process.env.MIDNIGHT_WALLET_MNEMONIC,
    indexerUrl = process.env.MIDNIGHT_INDEXER_URL || 'http://localhost:8080',
    nodeUrl = process.env.MIDNIGHT_NODE_URL || 'http://localhost:8080',
    proofServerUrl = process.env.MIDNIGHT_PROOF_SERVER_URL || 'http://localhost:6300',
    networkId = process.env.MIDNIGHT_NETWORK_ID || 'testnet',
    zkConfigPath = process.env.MIDNIGHT_ZK_CONFIG_PATH || './zk-config',
    enableRealNetwork = !!walletMnemonic,
  } = config;

  if (!enableRealNetwork) {
    throw new Error(
      'Real network testing is disabled. Provide MIDNIGHT_WALLET_MNEMONIC to enable real network tests.'
    );
  }

  const harness = new RuntimeTestHarness();

  // Character configuration for test agents
  const agent1Character: Character = {
    name: 'MidnightTestAgent1',
    bio: [
      'Test agent for Midnight Network integration testing',
      'Supports secure messaging, payments, and agent discovery',
      'Uses zero-knowledge proofs for privacy-preserving communication',
    ],
    system: 'You are a test agent designed to validate Midnight Network functionality.',
    messageExamples: [],
    knowledge: [],
  };

  const agent2Character: Character = {
    name: 'MidnightTestAgent2',
    bio: [
      'Second test agent for multi-agent Midnight Network scenarios',
      'Communicates securely with other agents using ZK proofs',
      'Participates in payment transactions and chat rooms',
    ],
    system: 'You are a test agent for multi-agent Midnight Network validation.',
    messageExamples: [],
    knowledge: [],
  };

  // API keys and configuration for Midnight Network
  const apiKeys = {
    MIDNIGHT_WALLET_MNEMONIC: walletMnemonic,
    MIDNIGHT_INDEXER_URL: indexerUrl,
    MIDNIGHT_INDEXER_WS_URL: indexerUrl.replace('http', 'ws'),
    MIDNIGHT_NODE_URL: nodeUrl,
    MIDNIGHT_PROOF_SERVER_URL: proofServerUrl,
    MIDNIGHT_NETWORK_ID: networkId,
    MIDNIGHT_ZK_CONFIG_PATH: zkConfigPath,
  };

  // Create first agent runtime
  const agent1 = await harness.createTestRuntime({
    character: agent1Character,
    plugins: [midnightPlugin],
    apiKeys: apiKeys as Record<string, string>,
    isolated: true,
  });

  // Create second agent runtime with different wallet seed
  const agent2 = await harness.createTestRuntime({
    character: agent2Character,
    plugins: [midnightPlugin],
    apiKeys: {
      ...apiKeys,
      // Use different wallet for second agent by appending suffix
      MIDNIGHT_WALLET_MNEMONIC: `${walletMnemonic} agent2`,
    },
    isolated: true,
  });

  return { agent1, agent2, harness };
}

/**
 * Wait for all Midnight Network services to be fully initialized
 */
export async function waitForMidnightInitialization(
  agents: MidnightTestAgents,
  timeoutMs: number = 120000
): Promise<void> {
  const { agent1, agent2 } = agents;

  const checkServiceInitialization = async (agent: IAgentRuntime): Promise<boolean> => {
    try {
      const networkService = agent.getService('midnight-network');
      const messagingService = agent.getService('secure-messaging');
      const paymentService = agent.getService('payment');
      const discoveryService = agent.getService('agent-discovery');

      if (!networkService || !messagingService || !paymentService || !discoveryService) {
        return false;
      }

      // Check if network service is connected
      const connectionState = await new Promise<any>((resolve, reject) => {
        const timeout = setTimeout(() => reject(new Error('Connection check timeout')), 5000);
        const subscription = (networkService as any).getConnectionState().subscribe({
          next: (state: any) => {
            clearTimeout(timeout);
            subscription.unsubscribe();
            resolve(state);
          },
          error: reject,
        });
      });

      return connectionState.isConnected;
    } catch (error) {
      return false;
    }
  };

  const startTime = Date.now();
  const checkInterval = 2000; // 2 seconds

  while (Date.now() - startTime < timeoutMs) {
    const agent1Ready = await checkServiceInitialization(agent1);
    const agent2Ready = await checkServiceInitialization(agent2);

    if (agent1Ready && agent2Ready) {
      console.log('✅ Both Midnight Network agents are fully initialized');
      return;
    }

    console.log('⏳ Waiting for Midnight Network initialization...');
    await new Promise((resolve) => setTimeout(resolve, checkInterval));
  }

  throw new Error('Timeout waiting for Midnight Network services to initialize');
}

/**
 * Verify that core Midnight Network functionality is working
 */
export async function verifyMidnightNetworkHealth(agents: MidnightTestAgents): Promise<void> {
  const { agent1, agent2 } = agents;

  // Test 1: Verify network services are available
  const networkService1 = agent1.getService('midnight-network');
  const networkService2 = agent2.getService('midnight-network');

  if (!networkService1 || !networkService2) {
    throw new Error('Midnight Network services not available');
  }

  // Test 2: Verify wallet functionality
  try {
    const wallet1Info = await (networkService1 as any).getWalletInfo();
    const wallet2Info = await (networkService2 as any).getWalletInfo();

    if (!wallet1Info.address.address || !wallet2Info.address.address) {
      throw new Error('Wallet addresses not available');
    }

    if (wallet1Info.address.address === wallet2Info.address.address) {
      throw new Error('Both agents have the same wallet address - isolation failed');
    }
  } catch (error) {
    throw new Error(`Wallet health check failed: ${(error as Error).message}`);
  }

  // Test 3: Verify network connectivity
  try {
    const connectionState1 = await new Promise<any>((resolve, reject) => {
      const timeout = setTimeout(() => reject(new Error('Connection state timeout')), 10000);
      const subscription = (networkService1 as any).getConnectionState().subscribe({
        next: (state: any) => {
          clearTimeout(timeout);
          subscription.unsubscribe();
          resolve(state);
        },
        error: reject,
      });
    });

    if (!connectionState1.isConnected) {
      throw new Error('Network connection not established');
    }
  } catch (error) {
    throw new Error(`Network connectivity check failed: ${(error as Error).message}`);
  }

  console.log('✅ Midnight Network health verification passed');
}

/**
 * Create a test scenario with predefined agent interactions
 */
export interface MidnightTestScenario {
  name: string;
  description: string;
  steps: MidnightTestStep[];
}

export interface MidnightTestStep {
  agent: 'agent1' | 'agent2';
  action:
    | 'send_message'
    | 'create_room'
    | 'join_room'
    | 'send_payment'
    | 'request_payment'
    | 'discover_agents';
  params: Record<string, any>;
  expectedResult?: any;
  timeout?: number;
}

/**
 * Execute a predefined test scenario
 */
export async function executeMidnightTestScenario(
  agents: MidnightTestAgents,
  scenario: MidnightTestScenario
): Promise<void> {
  console.log(`🎬 Executing scenario: ${scenario.name}`);
  console.log(`📝 Description: ${scenario.description}`);

  for (let i = 0; i < scenario.steps.length; i++) {
    const step = scenario.steps[i];
    const agent = agents[step.agent];

    console.log(`📍 Step ${i + 1}: ${step.action} by ${step.agent}`);

    try {
      switch (step.action) {
        case 'send_message':
          const messagingService = agent.getService('secure-messaging');
          const messageResult = await (messagingService as any).sendSecureMessage(
            step.params.toAgent,
            step.params.content,
            step.params.roomId
          );
          if (!messageResult.success) {
            throw new Error(`Message sending failed: ${messageResult.message}`);
          }
          break;

        case 'create_room':
          const messagingService2 = agent.getService('secure-messaging');
          const roomResult = await (messagingService2 as any).createChatRoom(
            step.params.name,
            step.params.participants,
            step.params.isPrivate
          );
          if (!roomResult.success) {
            throw new Error(`Room creation failed: ${roomResult.message}`);
          }
          break;

        case 'send_payment':
          const paymentService = agent.getService('payment');
          const paymentResult = await (paymentService as any).sendPayment(
            step.params.toAgent,
            BigInt(step.params.amount),
            step.params.currency
          );
          if (!paymentResult.success) {
            throw new Error(`Payment failed: ${paymentResult.message}`);
          }
          break;

        default:
          console.log(`⚠️ Unknown action: ${step.action}`);
      }

      // Wait between steps if specified
      if (step.timeout) {
        await new Promise((resolve) => setTimeout(resolve, step.timeout));
      }

      console.log(`✅ Step ${i + 1} completed successfully`);
    } catch (error) {
      throw new Error(`Step ${i + 1} failed: ${(error as Error).message}`);
    }
  }

  console.log(`🎉 Scenario "${scenario.name}" completed successfully`);
}

/**
 * Predefined test scenarios for common use cases
 */
export const MidnightTestScenarios = {
  basicMessaging: {
    name: 'Basic Secure Messaging',
    description: 'Test secure message exchange between two agents',
    steps: [
      {
        agent: 'agent1',
        action: 'send_message',
        params: {
          toAgent: 'AGENT2_ID', // Will be replaced at runtime
          content: 'Hello Agent 2, this is a secure test message!',
        },
        timeout: 2000,
      },
    ],
  } as MidnightTestScenario,

  chatRoomScenario: {
    name: 'Chat Room Creation and Messaging',
    description: 'Create a chat room and exchange messages',
    steps: [
      {
        agent: 'agent1',
        action: 'create_room',
        params: {
          name: 'Test Chat Room',
          participants: ['AGENT2_ID'], // Will be replaced
          isPrivate: true,
        },
        timeout: 3000,
      },
      {
        agent: 'agent1',
        action: 'send_message',
        params: {
          toAgent: 'AGENT2_ID',
          content: 'Welcome to our secure chat room!',
          roomId: 'ROOM_ID', // Will be set from previous step
        },
        timeout: 2000,
      },
    ],
  } as MidnightTestScenario,

  paymentFlow: {
    name: 'Payment Request and Transfer',
    description: 'Test payment request creation and processing',
    steps: [
      {
        agent: 'agent1',
        action: 'request_payment',
        params: {
          fromAgent: 'AGENT2_ID',
          amount: 1000,
          currency: 'MIDNIGHT',
          description: 'Test payment for services',
        },
        timeout: 3000,
      },
    ],
  } as MidnightTestScenario,
};
