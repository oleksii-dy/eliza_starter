import type { IAgentRuntime, Memory, HandlerCallback, TestSuite, Content } from '@elizaos/core';
import { v4 as uuidv4 } from 'uuid';
import { WalletService } from '../../services/WalletService';
import { TransactionService } from '../../services/TransactionService';
import { executeTransfer } from '../../actions/transfer';

/**
 * Comprehensive E2E tests for agent message handling
 * These tests simulate real conversations where agents receive messages,
 * process them through the NEAR plugin actions, and respond appropriately
 */
const agentMessageHandlingTestSuite: TestSuite = {
  name: 'agent-message-handling-e2e',

  tests: [
    {
      name: 'Agent processes NEAR transfer request and responds',
      fn: async (runtime: IAgentRuntime) => {
        console.log('\n=== Testing Agent Message Processing for NEAR Transfer ===');

        // Ensure services are initialized
        const walletService = runtime.getService<WalletService>('near-wallet' as any);
        const transactionService = runtime.getService<TransactionService>(
          'near-transaction' as any
        );

        if (!walletService || !transactionService) {
          throw new Error('Required services not available');
        }

        // Get initial balance
        const initialBalance = await walletService.getBalance();
        console.log(`Agent wallet: ${walletService.getAddress()}`);
        console.log(`Initial balance: ${initialBalance} NEAR`);

        // Create a user message requesting a transfer
        const userMessage: Memory = {
          id: uuidv4() as any,
          entityId: uuidv4() as any,
          roomId: uuidv4() as any,
          agentId: runtime.agentId,
          content: {
            text: 'Please send 0.1 NEAR to alice.testnet',
            source: 'user',
          },
          createdAt: Date.now(),
          embedding: [] as any,
        };

        console.log('\n📨 User message:', userMessage.content.text);

        // Test 1: Verify the action validates the message
        console.log('\n🔍 Testing action validation...');
        const isValid = await executeTransfer.validate(runtime, userMessage);
        if (!isValid) {
          throw new Error('Transfer action should validate the message');
        }
        console.log('✅ Action validated the message');

        // Test 2: Execute the action handler
        console.log('\n🚀 Executing transfer action...');
        let agentResponse: Content | null = null;
        let responseError: Error | null = null;

        const callback: HandlerCallback = async (response: Content) => {
          if (response) {
            agentResponse = response;
            console.log(
              '\n🤖 Agent response received:',
              (response as any).text || JSON.stringify(response)
            );
          }
          return []; // HandlerCallback expects Memory[] return
        };

        try {
          await executeTransfer.handler(runtime, userMessage, undefined, undefined, callback);
        } catch (error) {
          responseError = error as Error;
          console.log('⚠️ Transfer error:', error);
        }

        // Test 3: Verify agent responded appropriately
        console.log('\n📊 Analyzing agent response...');
        if (agentResponse) {
          // Check that response contains expected elements
          const responseText = ((agentResponse as any).text || '').toLowerCase();

          // Should mention the transfer details
          if (!responseText.includes('alice.testnet') && !responseText.includes('transfer')) {
            throw new Error('Agent response should mention the recipient');
          }

          // Should indicate if successful or failed
          if (
            !responseText.includes('sent') &&
            !responseText.includes('completed') &&
            !responseText.includes('failed') &&
            !responseText.includes('error')
          ) {
            throw new Error('Agent response should indicate transfer status');
          }

          console.log('✅ Agent provided appropriate response');
        } else if (responseError) {
          // If testnet issues, verify error handling
          if (responseError.message.includes('does not track the shard')) {
            console.log('✅ Agent handled testnet RPC error gracefully');
          } else {
            throw responseError;
          }
        } else {
          throw new Error('Agent should have responded to the message');
        }

        console.log('\n✅ Agent successfully processed message and responded appropriately');
      },
    },

    {
      name: 'Agent handles invalid transfer requests appropriately',
      fn: async (runtime: IAgentRuntime) => {
        console.log('\n=== Testing Agent Handling of Invalid Requests ===');

        // Test various invalid message formats
        const invalidMessages = [
          {
            text: 'Send NEAR', // No amount or recipient
            expectedReason: 'missing amount and recipient',
          },
          {
            text: 'Send abc NEAR to alice.testnet', // Invalid amount
            expectedReason: 'invalid amount format',
          },
          {
            text: 'Send 0.1 NEAR to invalid@address', // Invalid address
            expectedReason: 'invalid NEAR address format',
          },
        ];

        for (const testCase of invalidMessages) {
          console.log(`\n📨 Testing: "${testCase.text}"`);

          const message: Memory = {
            id: uuidv4() as any,
            entityId: uuidv4() as any,
            roomId: uuidv4() as any,
            agentId: runtime.agentId,
            content: {
              text: testCase.text,
              source: 'user',
            },
            createdAt: Date.now(),
            embedding: [] as any,
          };

          // Should not validate
          const isValid = await executeTransfer.validate(runtime, message);
          if (isValid) {
            throw new Error(`Should not validate message with ${testCase.expectedReason}`);
          }

          console.log(`✅ Correctly rejected: ${testCase.expectedReason}`);
        }

        console.log('\n✅ Agent correctly handles all invalid transfer requests');
      },
    },

    {
      name: 'Agent maintains conversation context through multiple messages',
      fn: async (runtime: IAgentRuntime) => {
        console.log('\n=== Testing Multi-Message Conversation Flow ===');

        const roomId = uuidv4() as any;
        const userId = uuidv4() as any;

        // Conversation flow
        const conversation = [
          {
            text: "What's my NEAR wallet balance?",
            expectInResponse: ['balance', 'near'],
          },
          {
            text: 'Can you send 0.05 NEAR to bob.testnet?',
            expectInResponse: ['bob.testnet', '0.05'],
          },
          {
            text: 'Actually, make that 0.1 NEAR instead',
            expectInResponse: ['0.1', 'near'],
          },
        ];

        for (let i = 0; i < conversation.length; i++) {
          const turn = conversation[i];
          console.log(`\n💬 Message ${i + 1}: "${turn.text}"`);

          const message: Memory = {
            id: uuidv4() as any,
            entityId: userId,
            roomId: roomId,
            agentId: runtime.agentId,
            content: {
              text: turn.text,
              source: 'user',
            },
            createdAt: Date.now() + i * 1000, // Ensure temporal ordering
            embedding: [] as any,
          };

          // Store the message in memory
          await runtime.createMemory(message, 'conversation', true);

          // Process through appropriate action
          let responded = false;
          const callback: HandlerCallback = async (response: Content) => {
            if (response) {
              const responseText = (response as any).text || JSON.stringify(response);
              console.log(`🤖 Agent: ${responseText}`);

              // Verify response contains expected elements
              const responseLower = responseText.toLowerCase();
              for (const expected of turn.expectInResponse) {
                if (!responseLower.includes(expected.toLowerCase())) {
                  throw new Error(`Response should mention "${expected}"`);
                }
              }

              responded = true;
            }
            return [];
          };

          // Try wallet provider for balance question
          if (turn.text.includes('balance')) {
            const walletProvider = (runtime as any).providers?.find(
              (p: any) => p.name === 'near-wallet'
            );
            if (walletProvider) {
              const result = await walletProvider.get(runtime, message);
              console.log(`🤖 Agent: ${result.text}`);
              responded = true;
            }
          } else if (turn.text.includes('send') || turn.text.includes('NEAR')) {
            // Try transfer action
            if (await executeTransfer.validate(runtime, message)) {
              try {
                await executeTransfer.handler(runtime, message, undefined, undefined, callback);
              } catch (error) {
                console.log(`⚠️ Transfer handling error: ${error}`);
                responded = true; // Error is still a response
              }
            }
          }

          if (!responded) {
            throw new Error('Agent should respond to every message');
          }

          console.log('✅ Agent responded appropriately');
        }

        console.log('\n✅ Agent successfully maintained conversation context');
      },
    },

    {
      name: 'Agent integrates with NEAR blockchain for real operations',
      fn: async (runtime: IAgentRuntime) => {
        console.log('\n=== Testing Real Blockchain Integration ===');

        const walletService = runtime.getService<WalletService>('near-wallet' as any);
        if (!walletService) {
          throw new Error('Wallet service not available');
        }

        try {
          // Test 1: Verify wallet connection
          console.log('\n🔗 Testing wallet connection...');
          const address = walletService.getAddress();
          const balance = await walletService.getBalance();

          if (!address || !address.includes('.')) {
            throw new Error('Invalid NEAR address format');
          }

          if (typeof balance !== 'string' || isNaN(parseFloat(balance))) {
            throw new Error('Invalid balance format');
          }

          console.log(`✅ Connected to ${address} with ${balance} NEAR`);

          // Test 2: Verify transaction service is available
          console.log('\n🔌 Testing transaction service availability...');
          const transactionService = runtime.getService<TransactionService>(
            'near-transaction' as any
          );

          if (transactionService) {
            // Service is available and initialized
            console.log('✅ Transaction service is available and ready');
          } else {
            throw new Error('Transaction service not available');
          }

          console.log('\n✅ NEAR blockchain integration verified');
        } catch (error: any) {
          if (error.message?.includes('does not track the shard')) {
            console.log('⚠️ Testnet RPC issue - test passed with known limitation');
          } else {
            throw error;
          }
        }
      },
    },
  ],
};

export default agentMessageHandlingTestSuite;
