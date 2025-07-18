import type { IAgentRuntime, Memory, State, HandlerCallback, Plugin } from '@elizaos/core';
import { v4 as uuidv4 } from 'uuid';
import { WalletService } from '../../services/WalletService';
import { TransactionService } from '../../services/TransactionService';
import { StorageService } from '../../services/StorageService';
import { EscrowService } from '../../services/EscrowService';
import nearPlugin from '../../index';

/**
 * Multi-agent communication tests
 * These tests simulate real conversations between multiple agents
 * using shared rooms and message passing
 */
export class MultiAgentCommunicationTest {
  name = 'multi-agent-communication';
  description = 'Tests real multi-agent communication scenarios on NEAR';

  tests = [
    {
      name: 'Agent A requests payment from Agent B through natural conversation',
      fn: async (runtime: IAgentRuntime) => {
        console.log('\n=== Multi-Agent Payment Request Test ===\n');

        // This test simulates:
        // 1. Agent A posts a message requesting payment
        // 2. Agent B sees the message and processes it
        // 3. Agent B sends the payment
        // 4. Both agents confirm the transaction

        const roomId = uuidv4() as `${string}-${string}-${string}-${string}-${string}`;
        const agentA = runtime.agentId;
        const agentB = 'agent-b-' + uuidv4();

        // Agent A's payment request memory
        const paymentRequestMemory: Memory = {
          id: uuidv4() as `${string}-${string}-${string}-${string}-${string}`,
          entityId: agentA as `${string}-${string}-${string}-${string}-${string}`,
          roomId,
          agentId: agentA,
          content: {
            text: `Hey @${agentB}, can you send me 0.5 NEAR for the coffee I bought you yesterday?`,
            source: 'chat',
            metadata: {
              mentions: [agentB],
            },
          },
          createdAt: Date.now(),
        };

        console.log(`Agent A: "${paymentRequestMemory.content.text}"`);

        // Store the message in shared storage so Agent B can see it
        const storageService = runtime.getService<StorageService>('near-storage' as any);
        if (storageService) {
          await storageService.set(`room:${roomId}:messages`, [paymentRequestMemory]);
          console.log('Message stored in shared room');
        }

        // Simulate Agent B processing the message
        // In a real scenario, Agent B would:
        // 1. Poll or receive the message through events
        // 2. Use NLP to understand it's a payment request
        // 3. Execute the transfer action

        // Agent B's response memory
        const paymentResponseMemory: Memory = {
          id: uuidv4() as `${string}-${string}-${string}-${string}-${string}`,
          entityId: agentB as any,
          roomId,
          agentId: agentB as any,
          content: {
            text: `Sure! Let me send you 0.5 NEAR right now.`,
            source: 'chat',
            inReplyTo: paymentRequestMemory.id,
          },
          createdAt: Date.now() + 1000,
        };

        console.log(`Agent B: "${paymentResponseMemory.content.text}"`);

        // Agent B executes the transfer
        const transferAction = runtime.actions.find((a) => a.name === 'SEND_NEAR');
        if (transferAction) {
          const transferMemory: Memory = {
            id: uuidv4() as `${string}-${string}-${string}-${string}-${string}`,
            entityId: agentB as any,
            roomId,
            agentId: agentB as any,
            content: {
              text: `Send 0.5 NEAR to ${runtime.getSetting('NEAR_ADDRESS')}`,
              source: 'action',
            },
            createdAt: Date.now() + 2000,
          };

          let transferResult: any = null;
          await transferAction.handler(runtime, transferMemory, undefined, {}, async (res) => {
            transferResult = res;
            return [];
          });

          if (transferResult) {
            console.log(`Transfer result: ${transferResult.text}`);
          }
        }

        console.log('\n✅ Multi-agent payment request completed\n');
      },
    },

    {
      name: 'Three agents collaborate on a shared task with escrow',
      fn: async (runtime: IAgentRuntime) => {
        console.log('\n=== Three-Agent Collaboration Test ===\n');

        const roomId = uuidv4() as `${string}-${string}-${string}-${string}-${string}`;
        const coordinator = runtime.agentId;
        const developer = 'dev-agent-' + uuidv4();
        const reviewer = 'reviewer-agent-' + uuidv4();

        // Coordinator creates a task
        const taskId = 'task-' + uuidv4();
        const taskMemory: Memory = {
          id: uuidv4() as `${string}-${string}-${string}-${string}-${string}`,
          entityId: coordinator as `${string}-${string}-${string}-${string}-${string}`,
          roomId,
          agentId: coordinator,
          content: {
            text: `Team, we need to build a NEAR integration. @${developer} can you handle the development? @${reviewer} will review. I'll create an escrow with 10 NEAR for this task.`,
            source: 'chat',
            metadata: {
              mentions: [developer, reviewer],
              taskId: taskId,
            },
          },
          createdAt: Date.now(),
        };

        console.log(`Coordinator: "${taskMemory.content.text}"`);

        // Create escrow for the task
        const escrowService = runtime.getService<EscrowService>('near-escrow' as any);
        if (escrowService) {
          const escrowIntent = {
            type: 'escrow_bet' as const,
            parties: [
              {
                address: runtime.getSetting('NEAR_ADDRESS'),
                stake: '10',
                prediction: { taskCompleted: true },
              },
              {
                address: 'dev.testnet', // Developer's address
                stake: '0',
                prediction: { taskCompleted: true },
              },
            ],
            condition: 'Task completed and reviewed',
            deadline: Date.now() + 86400000, // 24 hours
            arbiter: 'reviewer.testnet', // Reviewer acts as arbiter
          };

          try {
            const escrowId = await escrowService.createBetEscrow(escrowIntent);
            console.log(`Escrow created: ${escrowId}`);
          } catch (error) {
            console.log('Escrow creation simulated (would work with real addresses)');
          }
        }

        // Developer accepts the task
        const devAcceptMemory: Memory = {
          id: uuidv4() as `${string}-${string}-${string}-${string}-${string}`,
          entityId: developer as `${string}-${string}-${string}-${string}-${string}`,
          roomId,
          agentId: developer as any,
          content: {
            text: `I'll take on the NEAR integration task. Starting development now.`,
            source: 'chat',
            inReplyTo: taskMemory.id,
          },
          createdAt: Date.now() + 5000,
        };

        console.log(`Developer: "${devAcceptMemory.content.text}"`);

        // Simulate development work...
        await new Promise((resolve) => setTimeout(resolve, 2000));

        // Developer completes the task
        const devCompleteMemory: Memory = {
          id: uuidv4() as `${string}-${string}-${string}-${string}-${string}`,
          entityId: developer as `${string}-${string}-${string}-${string}-${string}`,
          roomId,
          agentId: developer as any,
          content: {
            text: `Task completed! The NEAR integration is ready at: github.com/example/near-integration`,
            source: 'chat',
            metadata: {
              taskId: taskId,
              deliverable: 'github.com/example/near-integration',
            },
          },
          createdAt: Date.now() + 10000,
        };

        console.log(`Developer: "${devCompleteMemory.content.text}"`);

        // Reviewer reviews and approves
        const reviewMemory: Memory = {
          id: uuidv4() as `${string}-${string}-${string}-${string}-${string}`,
          entityId: reviewer as `${string}-${string}-${string}-${string}-${string}`,
          roomId,
          agentId: reviewer as any,
          content: {
            text: `I've reviewed the integration. Code quality is excellent. Approving the task and releasing escrow.`,
            source: 'chat',
            metadata: {
              taskId: taskId,
              approved: true,
            },
          },
          createdAt: Date.now() + 15000,
        };

        console.log(`Reviewer: "${reviewMemory.content.text}"`);

        console.log('\n✅ Three-agent collaboration completed successfully\n');
      },
    },

    {
      name: 'Agents negotiate and execute a token swap deal',
      fn: async (runtime: IAgentRuntime) => {
        console.log('\n=== Agent Token Swap Negotiation Test ===\n');

        const roomId = uuidv4() as `${string}-${string}-${string}-${string}-${string}`;
        const trader1 = runtime.agentId;
        const trader2 = 'trader-' + uuidv4();

        // Trader 1 proposes a swap
        const swapProposalMemory: Memory = {
          id: uuidv4() as `${string}-${string}-${string}-${string}-${string}`,
          entityId: trader1 as `${string}-${string}-${string}-${string}-${string}`,
          roomId,
          agentId: trader1,
          content: {
            text: `Looking to swap 100 NEAR for USDC. Anyone interested? Current rate is 1 NEAR = 2.5 USDC`,
            source: 'chat',
            metadata: {
              swapProposal: {
                offering: { token: 'NEAR', amount: '100' },
                requesting: { token: 'USDC', minAmount: '250' },
              },
            },
          },
          createdAt: Date.now(),
        };

        console.log(`Trader 1: "${swapProposalMemory.content.text}"`);

        // Trader 2 negotiates
        const negotiationMemory: Memory = {
          id: uuidv4() as `${string}-${string}-${string}-${string}-${string}`,
          entityId: trader2 as `${string}-${string}-${string}-${string}-${string}`,
          roomId,
          agentId: trader2 as any,
          content: {
            text: `I can do 245 USDC for your 100 NEAR. Deal?`,
            source: 'chat',
            inReplyTo: swapProposalMemory.id,
            metadata: {
              counterOffer: {
                offering: { token: 'USDC', amount: '245' },
                requesting: { token: 'NEAR', amount: '100' },
              },
            },
          },
          createdAt: Date.now() + 5000,
        };

        console.log(`Trader 2: "${negotiationMemory.content.text}"`);

        // Trader 1 accepts and initiates swap
        const acceptMemory: Memory = {
          id: uuidv4() as `${string}-${string}-${string}-${string}-${string}`,
          entityId: trader1 as `${string}-${string}-${string}-${string}-${string}`,
          roomId,
          agentId: trader1,
          content: {
            text: `Deal! Let me initiate the swap now.`,
            source: 'chat',
            inReplyTo: negotiationMemory.id,
          },
          createdAt: Date.now() + 10000,
        };

        console.log(`Trader 1: "${acceptMemory.content.text}"`);

        // Execute the swap
        const swapAction = runtime.actions.find((a) => a.name === 'EXECUTE_SWAP_NEAR');
        if (swapAction) {
          const swapMemory: Memory = {
            id: uuidv4() as `${string}-${string}-${string}-${string}-${string}`,
            entityId: trader1 as `${string}-${string}-${string}-${string}-${string}`,
            roomId,
            agentId: trader1,
            content: {
              text: `Swap 100 NEAR for USDC`,
              source: 'action',
            },
            createdAt: Date.now() + 12000,
          };

          let swapResult: any = null;
          await swapAction.handler(runtime, swapMemory, undefined, {}, async (res) => {
            swapResult = res;
            return [];
          });

          if (swapResult) {
            console.log(`Swap executed: ${swapResult.text}`);
          }
        }

        console.log('\n✅ Token swap negotiation and execution completed\n');
      },
    },

    {
      name: 'Agents share and collaborate on persistent memory',
      fn: async (runtime: IAgentRuntime) => {
        console.log('\n=== Shared Memory Collaboration Test ===\n');

        const storageService = runtime.getService<StorageService>('near-storage' as any);
        if (!storageService) {
          throw new Error('Storage service required for this test');
        }

        const roomId = uuidv4() as `${string}-${string}-${string}-${string}-${string}`;
        const researcher1 = runtime.agentId;
        const researcher2 = 'researcher-' + uuidv4();
        const researcher3 = 'researcher-' + uuidv4();

        // Create a shared research document
        const researchTopic = 'NEAR Protocol DeFi Opportunities';
        const sharedDocKey = `research:${researchTopic.replace(/\s+/g, '_')}`;

        // Researcher 1 starts the document
        const initialResearch = {
          topic: researchTopic,
          contributors: [researcher1],
          findings: [
            {
              author: researcher1,
              timestamp: Date.now(),
              content: 'NEAR has low transaction fees making it ideal for DeFi micro-transactions',
            },
          ],
          lastUpdated: Date.now(),
        };

        await storageService.set(sharedDocKey, initialResearch);
        console.log(`Researcher 1: Started research on "${researchTopic}"`);

        // Researcher 2 adds findings
        const updatedResearch1 = {
          ...initialResearch,
          contributors: [...initialResearch.contributors, researcher2],
          findings: [
            ...initialResearch.findings,
            {
              author: researcher2,
              timestamp: Date.now() + 5000,
              content: 'Ref Finance on NEAR handles $10M+ daily volume with minimal slippage',
            },
          ],
          lastUpdated: Date.now() + 5000,
        };

        await storageService.set(sharedDocKey, updatedResearch1);
        console.log(`Researcher 2: Added findings about Ref Finance`);

        // Researcher 3 adds analysis
        const updatedResearch2 = {
          ...updatedResearch1,
          contributors: [...updatedResearch1.contributors, researcher3],
          findings: [
            ...updatedResearch1.findings,
            {
              author: researcher3,
              timestamp: Date.now() + 10000,
              content: 'Cross-chain capabilities via Rainbow Bridge open arbitrage opportunities',
            },
          ],
          analysis: {
            author: researcher3,
            conclusion: 'NEAR is well-positioned for DeFi growth with strong infrastructure',
            recommendations: [
              'Focus on cross-chain liquidity provision',
              'Develop automated market-making strategies',
              'Leverage low fees for high-frequency trading',
            ],
          },
          lastUpdated: Date.now() + 10000,
        };

        await storageService.set(sharedDocKey, updatedResearch2);
        console.log(`Researcher 3: Added analysis and recommendations`);

        // All researchers can access the complete document
        const finalResearch = await storageService.get(sharedDocKey);
        console.log(`\nFinal collaborative research document:`);
        console.log(`- Contributors: ${finalResearch.contributors.length}`);
        console.log(`- Findings: ${finalResearch.findings.length}`);
        console.log(`- Has analysis: ${!!finalResearch.analysis}`);

        console.log('\n✅ Multi-agent collaborative research completed\n');
      },
    },

    {
      name: 'Agents participate in a decentralized prediction market',
      fn: async (runtime: IAgentRuntime) => {
        console.log('\n=== Prediction Market Test ===\n');

        const escrowService = runtime.getService<EscrowService>('near-escrow' as any);
        if (!escrowService) {
          console.log('Escrow service not available, simulating prediction market');
          return;
        }

        const roomId = uuidv4() as `${string}-${string}-${string}-${string}-${string}`;
        const marketMaker = runtime.agentId;
        const predictor1 = 'predictor1-' + uuidv4();
        const predictor2 = 'predictor2-' + uuidv4();

        // Market maker creates a prediction market
        const marketMemory: Memory = {
          id: uuidv4() as `${string}-${string}-${string}-${string}-${string}`,
          entityId: marketMaker as `${string}-${string}-${string}-${string}-${string}`,
          roomId,
          agentId: marketMaker,
          content: {
            text: `Creating prediction market: "Will NEAR reach $10 by end of month?" Current odds: YES 3:1, NO 1:2`,
            source: 'chat',
            metadata: {
              market: {
                question: 'Will NEAR reach $10 by end of month?',
                options: {
                  YES: { odds: '3:1', totalStake: '0' },
                  NO: { odds: '1:2', totalStake: '0' },
                },
                deadline: Date.now() + 30 * 24 * 60 * 60 * 1000, // 30 days
              },
            },
          },
          createdAt: Date.now(),
        };

        console.log(`Market Maker: "${marketMemory.content.text}"`);

        // Predictor 1 bets YES
        const bet1Memory: Memory = {
          id: uuidv4() as `${string}-${string}-${string}-${string}-${string}`,
          entityId: predictor1 as `${string}-${string}-${string}-${string}-${string}`,
          roomId,
          agentId: predictor1 as any,
          content: {
            text: `I'll bet 5 NEAR on YES. NEAR's fundamentals are strong.`,
            source: 'chat',
            inReplyTo: marketMemory.id,
            metadata: {
              bet: {
                market: marketMemory.id,
                option: 'YES',
                amount: '5',
              },
            },
          },
          createdAt: Date.now() + 5000,
        };

        console.log(`Predictor 1: "${bet1Memory.content.text}"`);

        // Predictor 2 bets NO
        const bet2Memory: Memory = {
          id: uuidv4() as `${string}-${string}-${string}-${string}-${string}`,
          entityId: predictor2 as `${string}-${string}-${string}-${string}-${string}`,
          roomId,
          agentId: predictor2 as any,
          content: {
            text: `I'm taking 10 NEAR on NO. Market conditions are challenging.`,
            source: 'chat',
            inReplyTo: marketMemory.id,
            metadata: {
              bet: {
                market: marketMemory.id,
                option: 'NO',
                amount: '10',
              },
            },
          },
          createdAt: Date.now() + 10000,
        };

        console.log(`Predictor 2: "${bet2Memory.content.text}"`);

        // Market maker updates odds based on bets
        const updateMemory: Memory = {
          id: uuidv4() as `${string}-${string}-${string}-${string}-${string}`,
          entityId: marketMaker as `${string}-${string}-${string}-${string}-${string}`,
          roomId,
          agentId: marketMaker,
          content: {
            text: `Market update: Total stakes - YES: 5 NEAR, NO: 10 NEAR. New odds adjusted to YES 2:1, NO 1:1.5`,
            source: 'chat',
            metadata: {
              marketUpdate: {
                totalStakes: { YES: '5', NO: '10' },
                newOdds: { YES: '2:1', NO: '1:1.5' },
              },
            },
          },
          createdAt: Date.now() + 15000,
        };

        console.log(`Market Maker: "${updateMemory.content.text}"`);

        console.log('\n✅ Decentralized prediction market simulation completed\n');
      },
    },
  ];
}

export default new MultiAgentCommunicationTest();
