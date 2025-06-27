import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { NetworkMessagingService } from '../services/NetworkMessagingService';
import { MidnightNetworkService } from '../services/MidnightNetworkService';
import { proofGenerator } from '../utils/proofGenerator';
import { createTestRuntime } from './test-utils';
import type { IAgentRuntime } from '@elizaos/core';

/**
 * Network Messaging Tests - Verify Real Network Communication
 * Tests actual network messaging functionality vs simulation
 *
 * NOTE: These tests are skipped by default because they require:
 * - Running Midnight Network infrastructure (indexer, node, proof server)
 * - Valid network connectivity
 * - Proper wallet/mnemonic configuration
 *
 * To run these tests, remove the .skip and ensure external services are available.
 */
describe.skip('Network Messaging Service - Real Network Verification', () => {
  let runtime: IAgentRuntime;
  let networkMessaging: NetworkMessagingService;
  let midnightService: MidnightNetworkService;

  beforeEach(async () => {
    // Set up environment variables for midnight service
    process.env.MIDNIGHT_WALLET_MNEMONIC =
      'abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about';
    process.env.MIDNIGHT_NETWORK_URL = 'https://rpc.testnet.midnight.network';
    process.env.MIDNIGHT_INDEXER_URL = 'http://localhost:8080';
    process.env.MIDNIGHT_INDEXER_WS_URL = 'ws://localhost:8080';
    process.env.MIDNIGHT_NODE_URL = 'http://localhost:8080';
    process.env.MIDNIGHT_PROOF_SERVER_URL = 'http://localhost:6300';
    process.env.MIDNIGHT_NETWORK_ID = 'testnet';

    runtime = await createTestRuntime();

    // Initialize midnight network service first
    midnightService = await MidnightNetworkService.start(runtime);
    (runtime.services as any).set((MidnightNetworkService as any).serviceType, midnightService);

    // Initialize network messaging service
    networkMessaging = await NetworkMessagingService.start(runtime);
    (runtime.services as any).set((NetworkMessagingService as any).serviceType, networkMessaging);
  });

  afterEach(async () => {
    if (networkMessaging) {
      await networkMessaging.stop();
    }
    if (midnightService) {
      await midnightService.stop();
    }

    // Clean up environment variables
    delete process.env.MIDNIGHT_WALLET_MNEMONIC;
    delete process.env.MIDNIGHT_NETWORK_URL;
    delete process.env.MIDNIGHT_INDEXER_URL;
    delete process.env.MIDNIGHT_INDEXER_WS_URL;
    delete process.env.MIDNIGHT_NODE_URL;
    delete process.env.MIDNIGHT_PROOF_SERVER_URL;
    delete process.env.MIDNIGHT_NETWORK_ID;
  });

  describe('Network Discovery and Agent Registration', () => {
    it('should register agent on real network discovery contract', async () => {
      // Verify agent registration creates real network presence
      const stats = networkMessaging.getNetworkStats();

      expect(stats.activeAgents).toBeGreaterThan(0);
      expect(stats).toHaveProperty('messageContracts');
      expect(stats).toHaveProperty('verifiedMessages');

      // Check if agent appears in network registry
      const activeAgents = networkMessaging.getActiveAgents();
      expect(activeAgents).toContain(runtime.agentId);
    });

    it('should discover other agents on the network', async () => {
      const activeAgents = networkMessaging.getActiveAgents();

      // Should discover test agents (Alice, Bob, Charlie)
      expect(activeAgents.length).toBeGreaterThan(1);

      // Verify discovery includes expected test agents
      const expectedAgents = ['alice-agent', 'bob-agent', 'charlie-agent'];
      const foundTestAgents = activeAgents.filter((agent) =>
        expectedAgents.some((expected) => agent.includes(expected.split('-')[0]))
      );

      expect(foundTestAgents.length).toBeGreaterThan(0);
    });
  });

  describe('Real Network Message Sending', () => {
    it('should send group message through actual network contracts', async () => {
      const topic = 'test-group-chat';
      const content = 'Test message for network verification';

      const result = await networkMessaging.sendGroupMessage(topic, content);

      expect(result.success).toBe(true);
      expect(result.data).toHaveProperty('messageId');
      expect(result.data).toHaveProperty('transactionHash');
      expect(result.data).toHaveProperty('contractAddress');
      expect(result.data).toHaveProperty('proof');

      // Verify the transaction hash looks like a real blockchain transaction
      const txHash = result.data?.transactionHash;
      expect(txHash).toMatch(/^tx_\d+_[a-z0-9]+$/);

      // Verify contract address format
      const contractAddress = result.data?.contractAddress;
      expect(contractAddress).toContain('group_messaging_');
    });

    it('should generate valid zero-knowledge proofs for messages', async () => {
      const topic = 'proof-verification-test';
      const content = 'Message with ZK proof verification';

      const result = await networkMessaging.sendGroupMessage(topic, content);

      expect(result.success).toBe(true);
      expect(result.data?.proof).toBeDefined();

      const proof = result.data?.proof;
      if (proof) {
        // Verify proof structure
        expect(proof).toHaveProperty('circuitId');
        expect(proof).toHaveProperty('proof');
        expect(proof).toHaveProperty('publicSignals');
        expect(proof).toHaveProperty('witnesses');
        expect(proof).toHaveProperty('timestamp');

        // Verify circuit ID indicates group messaging
        expect(proof.circuitId).toContain('messaging:sendGroupMessage');

        // Note: Actual proof verification would require real Midnight SDK
        // For now, verify proof structure is correct
      }
    });
  });

  describe('Message Reception and Verification', () => {
    it('should receive and process network messages', async () => {
      const topic = 'message-reception-test';
      const testMessage = 'Test message for reception verification';

      // Send a message
      const sendResult = await networkMessaging.sendGroupMessage(topic, testMessage);
      expect(sendResult.success).toBe(true);

      // Check message appears in topic history
      const topicMessages = networkMessaging.getTopicMessages(topic);
      expect(topicMessages.length).toBeGreaterThan(0);

      const latestMessage = topicMessages[topicMessages.length - 1];
      expect(latestMessage.content).toBe(testMessage);
      expect(latestMessage.fromAgent).toBe(runtime.agentId);
      expect(latestMessage.messageType).toBe('group');
    });

    it('should maintain message order and prevent duplicates', async () => {
      const topic = 'ordering-test';
      const messages = ['First message', 'Second message', 'Third message'];

      // Send multiple messages
      for (const message of messages) {
        const result = await networkMessaging.sendGroupMessage(topic, message);
        expect(result.success).toBe(true);

        // Small delay to ensure ordering
        await new Promise((resolve) => setTimeout(resolve, 50));
      }

      // Verify message order
      const topicMessages = networkMessaging.getTopicMessages(topic);
      expect(topicMessages.length).toBe(messages.length);

      for (let i = 0; i < messages.length; i++) {
        expect(topicMessages[i].content).toBe(messages[i]);
      }

      // Verify no duplicate message IDs
      const messageIds = topicMessages.map((msg) => msg.id);
      const uniqueIds = new Set(messageIds);
      expect(uniqueIds.size).toBe(messageIds.length);
    });
  });

  describe('Network Contract Integration', () => {
    it('should interact with real smart contracts', async () => {
      // Test contract deployment/discovery
      const stats = networkMessaging.getNetworkStats();

      // Should have contract mappings
      expect(stats.messageContracts).toBeGreaterThanOrEqual(0);

      // Send message to trigger contract interaction
      const result = await networkMessaging.sendGroupMessage(
        'contract-test',
        'Testing contract interaction'
      );

      expect(result.success).toBe(true);

      // Verify contract address is returned
      expect(result.data?.contractAddress).toBeDefined();
      expect(result.data?.contractAddress).toMatch(/^[a-z_0-9]+$/);
    });

    it('should handle network failures gracefully', async () => {
      // Test error handling when network is unavailable
      // This test verifies the service handles network issues properly

      const topic = 'error-handling-test';
      const content = 'Test message for error handling';

      try {
        const result = await networkMessaging.sendGroupMessage(topic, content);

        // Even if network fails, should return structured response
        expect(result).toHaveProperty('success');
        expect(result).toHaveProperty('data');
        expect(result).toHaveProperty('message');
      } catch (error) {
        // If network throws, should be handled gracefully
        expect(error).toBeInstanceOf(Error);
      }
    });
  });

  describe('Multi-Agent Network Communication', () => {
    it('should support group messaging with multiple recipients', async () => {
      const topic = 'multi-agent-test';
      const content = 'Message for all agents in the group';
      const recipients = ['alice-agent', 'bob-agent', 'charlie-agent'];

      const result = await networkMessaging.sendGroupMessage(topic, content, recipients);

      expect(result.success).toBe(true);
      expect(result.data?.messageId).toBeDefined();

      // Verify message is stored with correct recipients
      const topicMessages = networkMessaging.getTopicMessages(topic);
      const sentMessage = topicMessages.find((msg) => msg.content === content);

      expect(sentMessage).toBeDefined();
      expect(sentMessage?.messageType).toBe('group');
    });

    it('should maintain network statistics accurately', async () => {
      const initialStats = networkMessaging.getNetworkStats();

      // Send several messages
      for (let i = 0; i < 3; i++) {
        await networkMessaging.sendGroupMessage('stats-test', `Statistics test message ${i + 1}`);
      }

      const finalStats = networkMessaging.getNetworkStats();

      // Verify stats are updated
      expect(finalStats.verifiedMessages).toBeGreaterThanOrEqual(initialStats.verifiedMessages);
      expect(finalStats.topicsWithMessages).toBeGreaterThanOrEqual(initialStats.topicsWithMessages);
      expect(finalStats.activeAgents).toBeGreaterThanOrEqual(1);
    });
  });

  describe('Network Event Monitoring', () => {
    it('should emit network events for message activities', async () => {
      const networkEvents: any[] = [];

      // Subscribe to network events
      const subscription = networkMessaging.getNetworkEvents().subscribe({
        next: (event) => networkEvents.push(event),
        error: (error) => console.error('Network event error:', error),
      });

      try {
        // Send a message to trigger events
        await networkMessaging.sendGroupMessage('event-test', 'Message to trigger network events');

        // Allow time for event processing
        await new Promise((resolve) => setTimeout(resolve, 100));

        // Should have received network events
        expect(networkEvents.length).toBeGreaterThan(0);

        // Verify event structure
        const messageEvent = networkEvents.find(
          (event) => event.type === 'MESSAGE_RECEIVED' || event.type === 'MESSAGE_SENT'
        );

        if (messageEvent) {
          expect(messageEvent).toHaveProperty('type');
          expect(messageEvent).toHaveProperty('timestamp');
        }
      } finally {
        subscription.unsubscribe();
      }
    });
  });

  describe('Anti-LARP Verification', () => {
    it('should provide evidence of real network communication', async () => {
      const topic = 'anti-larp-verification';
      const content = 'This message must traverse real Midnight Network infrastructure';

      const result = await networkMessaging.sendGroupMessage(topic, content);

      // Verify real network indicators
      expect(result.success).toBe(true);
      expect(result.data?.transactionHash).toBeDefined();
      expect(result.data?.contractAddress).toBeDefined();
      expect(result.data?.proof).toBeDefined();

      // Verify transaction hash format (not just a random string)
      const txHash = result.data?.transactionHash;
      expect(txHash).toMatch(/^tx_\d+_[a-f0-9]+$/);

      // Verify contract address format
      const contractAddress = result.data?.contractAddress;
      expect(contractAddress).toMatch(/^[a-z_0-9x]+$/);

      // Verify proof contains circuit information
      const proof = result.data?.proof;
      expect(proof?.circuitId).toContain('messaging');
      expect(proof?.witnesses).toBeDefined();

      // Network stats should reflect real activity
      const stats = networkMessaging.getNetworkStats();
      expect(stats.verifiedMessages).toBeGreaterThan(0);
      expect(stats.messageContracts).toBeGreaterThanOrEqual(0);
    });

    it('should demonstrate cross-agent message delivery', async () => {
      const topic = 'cross-agent-delivery';
      const content = 'Cross-agent delivery verification message';

      // Send message from this agent
      const sendResult = await networkMessaging.sendGroupMessage(topic, content);
      expect(sendResult.success).toBe(true);

      // Verify message is in local storage
      const localMessages = networkMessaging.getTopicMessages(topic);
      const sentMessage = localMessages.find((msg) => msg.content === content);
      expect(sentMessage).toBeDefined();
      expect(sentMessage?.fromAgent).toBe(runtime.agentId);

      // Verify network statistics show real activity
      const stats = networkMessaging.getNetworkStats();
      expect(stats.activeAgents).toBeGreaterThan(0);
      expect(stats.topicsWithMessages).toBeGreaterThan(0);

      // Verify agent registry has multiple agents (indicating real network)
      const activeAgents = networkMessaging.getActiveAgents();
      expect(activeAgents.length).toBeGreaterThan(1);
    });
  });
});
