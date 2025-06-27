import type { TestSuite, IAgentRuntime } from '@elizaos/core';

/**
 * Comprehensive user request scenarios covering explicit commands and implicit inference
 * These tests simulate real user interactions and validate the agent's ability to understand
 * and respond appropriately to various request patterns.
 */
export class AgentKitUserScenariosTestSuite implements TestSuite {
  name = 'agentkit-user-scenarios';
  description =
    'Comprehensive user request scenarios for AgentKit - explicit commands and implicit inference';

  tests = [
    {
      name: 'Explicit user requests: Direct blockchain commands',
      fn: async (runtime: IAgentRuntime) => {
        console.log('Testing explicit user requests for blockchain operations...');

        const explicitRequests = [
          {
            text: 'Send 0.5 ETH to 0x742d35Cc6634C0532925a3b844Bc9e7595f6FD70',
            expectedActions: ['TRANSFER'],
            category: 'wallet_transfer',
          },
          {
            text: 'Check my wallet balance',
            expectedActions: ['GET_BALANCE'],
            category: 'wallet_query',
          },
          {
            text: 'Supply 1000 USDC to Compound',
            expectedActions: ['CDP_COMPOUND_SUPPLY', 'SUPPLY'],
            category: 'defi_lending',
          },
          {
            text: 'Swap 100 USDC for ETH',
            expectedActions: ['CDP_TRADE', 'SWAP', 'TRADE'],
            category: 'trading',
          },
          {
            text: 'Bridge 500 USDC from Ethereum to Base',
            expectedActions: ['CDP_ACROSS_BRIDGE', 'BRIDGE'],
            category: 'cross_chain',
          },
          {
            text: 'Tweet about my DeFi success',
            expectedActions: ['POST_TWEET', 'TWEET'],
            category: 'social_media',
          },
          {
            text: 'Mint an NFT for my achievement',
            expectedActions: ['CDP_MINT_NFT', 'MINT'],
            category: 'nft',
          },
          {
            text: 'Get the current price of ETH',
            expectedActions: ['PYTH_FETCH_PRICE', 'PRICE'],
            category: 'data_query',
          },
        ];

        let validatedRequests = 0;
        for (const request of explicitRequests) {
          const foundActions = runtime.actions.filter((action) =>
            request.expectedActions.some(
              (expected) => action.name.includes(expected) || action.similes?.includes(expected)
            )
          );

          if (foundActions.length > 0) {
            console.log(
              `✓ Explicit request "${request.text}" -> Found ${foundActions.length} matching actions`
            );

            // Test validation for first matching action
            const testMessage = {
              id: `test-${Date.now()}`,
              entityId: 'test-user',
              roomId: 'test-room',
              agentId: runtime.agentId,
              content: { text: request.text },
              createdAt: Date.now(),
            };

            try {
              const isValid = await foundActions[0].validate(
                runtime,
                testMessage as any,
                {} as any
              );
              if (isValid) {
                validatedRequests++;
                console.log(`  ✓ Action ${foundActions[0].name} validates successfully`);
              }
            } catch (error) {
              console.warn(
                `  ⚠️ Validation error for ${foundActions[0].name}:`,
                error instanceof Error ? error.message : String(error)
              );
            }
          } else {
            console.warn(`⚠️ No actions found for explicit request: "${request.text}"`);
          }
        }

        console.log(
          `✓ Explicit requests test: ${validatedRequests}/${explicitRequests.length} requests validated`
        );
      },
    },
    {
      name: 'Implicit inference: Context-based request understanding',
      fn: async (runtime: IAgentRuntime) => {
        console.log('Testing implicit inference scenarios...');

        const implicitScenarios = [
          {
            text: 'I want to start earning yield on my crypto',
            context: 'User wants DeFi lending without specifying exact protocol',
            expectedCategories: ['defi', 'compound', 'supply'],
            reasoning: 'Agent should infer DeFi lending/supply operations',
          },
          {
            text: 'I think ETH is going to moon, what should I do?',
            context: 'User bullish on ETH, wants trading advice',
            expectedCategories: ['trade', 'swap', 'price'],
            reasoning: 'Agent should suggest buying ETH or checking prices',
          },
          {
            text: "I need some liquidity but don't want to sell my ETH",
            context: 'User wants to borrow against collateral',
            expectedCategories: ['borrow', 'compound', 'leverage'],
            reasoning: 'Agent should infer borrowing/lending operations',
          },
          {
            text: 'Gas fees are killing me, is there a cheaper alternative?',
            context: 'User frustrated with high fees, wants alternatives',
            expectedCategories: ['bridge', 'layer2', 'cross'],
            reasoning: 'Agent should suggest bridging to cheaper networks',
          },
          {
            text: 'I just made my first profitable trade!',
            context: 'User celebrating success, might want to share',
            expectedCategories: ['tweet', 'social', 'share'],
            reasoning: 'Agent should offer to help share achievement',
          },
          {
            text: 'My portfolio is all over the place, help me understand it',
            context: 'User wants portfolio analysis',
            expectedCategories: ['balance', 'portfolio', 'compound'],
            reasoning: 'Agent should check balances and positions',
          },
          {
            text: 'I want to commemorate this milestone',
            context: 'User wants to create something memorable',
            expectedCategories: ['nft', 'mint', 'create'],
            reasoning: 'Agent should suggest NFT creation',
          },
          {
            text: 'Base has better yields than Ethereum right now',
            context: 'User comparing chains, might want to move assets',
            expectedCategories: ['bridge', 'cross', 'compound'],
            reasoning: 'Agent should suggest bridging and supplying on Base',
          },
          {
            text: 'I heard about this arbitrage opportunity',
            context: 'User interested in arbitrage trading',
            expectedCategories: ['price', 'trade', 'bridge'],
            reasoning: 'Agent should help with price checking and trades',
          },
          {
            text: 'I want to be more active in the crypto community',
            context: 'User wants social engagement',
            expectedCategories: ['tweet', 'cast', 'social'],
            reasoning: 'Agent should suggest social media participation',
          },
        ];

        let inferenceMatches = 0;
        for (const scenario of implicitScenarios) {
          console.log(`Testing: "${scenario.text}"`);
          console.log(`  Context: ${scenario.context}`);
          console.log(`  Expected: ${scenario.reasoning}`);

          // Find actions that might match this implicit request
          const relevantActions = runtime.actions.filter((action) =>
            scenario.expectedCategories.some(
              (category) =>
                action.name.toLowerCase().includes(category.toLowerCase()) ||
                action.description?.toLowerCase().includes(category.toLowerCase())
            )
          );

          if (relevantActions.length > 0) {
            inferenceMatches++;
            console.log(
              `  ✓ Found ${relevantActions.length} relevant actions:`,
              relevantActions
                .slice(0, 3)
                .map((a) => a.name)
                .join(', ')
            );

            // Test if enhanced validation can detect contextual relevance
            const testMessage = {
              id: `implicit-${Date.now()}`,
              entityId: 'test-user',
              roomId: 'test-room',
              agentId: runtime.agentId,
              content: { text: scenario.text },
              createdAt: Date.now(),
            };

            const validActions: string[] = [];
            for (const action of relevantActions.slice(0, 2)) {
              // Test top 2 actions
              try {
                const isValid = await action.validate(runtime, testMessage as any, {} as any);
                if (isValid) {
                  validActions.push(action.name);
                }
              } catch {
                // Skip validation errors for implicit scenarios
              }
            }

            if (validActions.length > 0) {
              console.log(`  ✓ Actions would validate: ${validActions.join(', ')}`);
            }
          } else {
            console.warn('  ⚠️ No relevant actions found for implicit scenario');
          }
        }

        console.log(
          `✓ Implicit inference test: ${inferenceMatches}/${implicitScenarios.length} scenarios had relevant actions`
        );
      },
    },
    {
      name: 'Complex user journeys: Multi-step workflows',
      fn: async (runtime: IAgentRuntime) => {
        console.log('Testing complex user journeys...');

        const complexJourneys = [
          {
            title: 'DeFi newcomer journey',
            steps: [
              "I'm new to DeFi, what can I do with my ETH?",
              'Okay, I want to try lending on Compound',
              'First let me check my current balance',
              'Wrap my ETH to WETH for DeFi',
              'Supply the WETH to Compound',
              "How's my position looking?",
              'Tweet about my first DeFi experience',
            ],
            expectedFlow: ['education', 'balance', 'wrap', 'supply', 'portfolio', 'social'],
          },
          {
            title: 'Yield farming optimization',
            steps: [
              'I want to maximize my yield across chains',
              'Check current yields on Ethereum vs Base',
              'Bridge my USDC to Base for better rates',
              'Supply to Compound on Base',
              'Monitor my positions regularly',
              'Share my yield farming strategy',
            ],
            expectedFlow: ['research', 'bridge', 'supply', 'monitor', 'social'],
          },
          {
            title: 'Trading with sentiment',
            steps: [
              "I think we're in a bull market",
              "What's the current ETH price?",
              "If it's under $3500, I want to buy more",
              'Swap some USDC for ETH',
              'Maybe leverage this position',
              'Post about my bullish position',
            ],
            expectedFlow: ['price', 'trade', 'leverage', 'social'],
          },
          {
            title: 'Cross-chain arbitrage opportunity',
            steps: [
              'I found an arbitrage opportunity',
              'Check ETH prices on different chains',
              'Bridge to the cheaper chain',
              'Buy ETH there',
              'Bridge back to sell',
              'Calculate and celebrate profits',
            ],
            expectedFlow: ['price', 'bridge', 'trade', 'bridge', 'social'],
          },
          {
            title: 'NFT achievement creation',
            steps: [
              'I just hit my first $10k portfolio',
              'I want to commemorate this milestone',
              'Create an NFT for this achievement',
              'Maybe share it on social media',
              'List it on OpenSea as a flex',
            ],
            expectedFlow: ['mint', 'social', 'list'],
          },
        ];

        for (const journey of complexJourneys) {
          console.log(`\nTesting journey: ${journey.title}`);

          let stepProgress = 0;
          for (let index = 0; index < journey.steps.length; index++) {
            const step = journey.steps[index];
            console.log(`  Step ${index + 1}: "${step}"`);

            // Find actions that could handle this step
            const matchingActions = runtime.actions.filter((action) => {
              const stepLower = step.toLowerCase();
              const actionName = action.name.toLowerCase();

              // Check for keyword matches
              const keywords = [
                'balance',
                'wrap',
                'supply',
                'bridge',
                'trade',
                'swap',
                'price',
                'tweet',
                'post',
                'mint',
                'nft',
                'list',
                'compound',
              ];

              return keywords.some(
                (keyword) => stepLower.includes(keyword) && actionName.includes(keyword)
              );
            });

            if (matchingActions.length > 0) {
              stepProgress++;
              console.log(
                `    ✓ Found actions: ${matchingActions
                  .slice(0, 2)
                  .map((a) => a.name)
                  .join(', ')}`
              );
            } else {
              console.log('    ⚠️ No direct actions found (might need inference)');
            }
          }

          const completeness = (stepProgress / journey.steps.length) * 100;
          console.log(
            `  Journey completeness: ${stepProgress}/${journey.steps.length} steps (${completeness.toFixed(1)}%)`
          );
        }
      },
    },
    {
      name: 'Edge case user requests: Ambiguous and challenging scenarios',
      fn: async (runtime: IAgentRuntime) => {
        console.log('Testing edge case and ambiguous user requests...');

        const edgeCases = [
          {
            text: 'Do something with my crypto',
            challenge: 'Extremely vague request',
            expectation: 'Agent should ask for clarification or suggest options',
          },
          {
            text: 'I lost money, help me',
            challenge: 'Emotional context, needs empathy',
            expectation: 'Agent should provide supportive guidance',
          },
          {
            text: 'Is this a scam? Should I invest in SafeMoonCoin?',
            challenge: 'Potential security concern',
            expectation: 'Agent should provide educational response',
          },
          {
            text: 'Send all my money to myself',
            challenge: 'Potentially dangerous circular transaction',
            expectation: 'Agent should clarify or warn about fees',
          },
          {
            text: 'I want to do that thing we talked about yesterday',
            challenge: 'References previous conversation context',
            expectation: 'Agent should acknowledge lack of context',
          },
          {
            text: 'Make me rich quick',
            challenge: 'Unrealistic expectations',
            expectation: 'Agent should provide realistic education',
          },
          {
            text: "I don't understand anything about crypto but want to start",
            challenge: 'Complete beginner needs guidance',
            expectation: 'Agent should provide educational path',
          },
          {
            text: 'Execute order 66',
            challenge: 'Nonsensical command',
            expectation: 'Agent should clarify what they meant',
          },
        ];

        for (const edgeCase of edgeCases) {
          console.log(`\nTesting edge case: "${edgeCase.text}"`);
          console.log(`  Challenge: ${edgeCase.challenge}`);
          console.log(`  Expectation: ${edgeCase.expectation}`);

          // Test how many actions would validate this edge case
          const testMessage = {
            id: `edge-${Date.now()}`,
            entityId: 'test-user',
            roomId: 'test-room',
            agentId: runtime.agentId,
            content: { text: edgeCase.text },
            createdAt: Date.now(),
          };

          let validatingActions = 0;
          const sampleActions = runtime.actions.slice(0, 10); // Test subset for performance

          for (const action of sampleActions) {
            try {
              const isValid = await action.validate(runtime, testMessage as any, {} as any);
              if (isValid) {
                validatingActions++;
              }
            } catch {
              // Expected for edge cases
            }
          }

          if (validatingActions === 0) {
            console.log('  ✓ Correctly no actions validated (good for ambiguous request)');
          } else if (validatingActions <= 2) {
            console.log(
              `  ✓ Few actions validated: ${validatingActions} (reasonable for edge case)`
            );
          } else {
            console.log(
              `  ⚠️ Many actions validated: ${validatingActions} (might be too permissive)`
            );
          }
        }
      },
    },
    {
      name: 'User intent classification accuracy',
      fn: async (runtime: IAgentRuntime) => {
        console.log('Testing user intent classification accuracy...');

        const intentTests = [
          // Financial Operations
          { text: 'I need to pay my friend', intent: 'transfer', confidence: 'high' },
          { text: 'Show me what I own', intent: 'balance', confidence: 'high' },
          { text: 'I want to earn passive income', intent: 'defi_supply', confidence: 'medium' },
          { text: 'Buy the dip', intent: 'trade', confidence: 'medium' },

          // Information Seeking
          { text: "What's the market doing?", intent: 'price_data', confidence: 'high' },
          { text: 'How am I performing?', intent: 'portfolio_analysis', confidence: 'medium' },

          // Social Actions
          { text: 'I want to share this win', intent: 'social_post', confidence: 'high' },
          { text: 'Let everyone know about my success', intent: 'social_post', confidence: 'high' },

          // Technical Operations
          { text: 'Move my funds to a cheaper network', intent: 'bridge', confidence: 'high' },
          { text: 'I need wrapped tokens', intent: 'wrap', confidence: 'high' },

          // Creative/Achievement
          {
            text: 'Create something special for this moment',
            intent: 'nft_mint',
            confidence: 'medium',
          },
          { text: 'Preserve this memory on-chain', intent: 'nft_mint', confidence: 'medium' },
        ];

        let correctClassifications = 0;
        const intentMap = {
          transfer: ['TRANSFER', 'SEND', 'PAY'],
          balance: ['BALANCE', 'GET_BALANCE'],
          defi_supply: ['SUPPLY', 'COMPOUND', 'LEND'],
          trade: ['TRADE', 'SWAP', 'BUY', 'SELL'],
          price_data: ['PRICE', 'PYTH', 'MARKET'],
          portfolio_analysis: ['BALANCE', 'COMPOUND', 'PORTFOLIO'],
          social_post: ['TWEET', 'POST', 'CAST'],
          bridge: ['BRIDGE', 'ACROSS', 'CROSS'],
          wrap: ['WRAP', 'WETH'],
          nft_mint: ['MINT', 'NFT', 'CREATE'],
        };

        for (const test of intentTests) {
          const expectedActions = intentMap[test.intent as keyof typeof intentMap] || [];
          const matchingActions = runtime.actions.filter((action) =>
            expectedActions.some((expected: string) => action.name.includes(expected))
          );

          if (matchingActions.length > 0) {
            // Test if the first matching action would validate
            const testMessage = {
              id: `intent-${Date.now()}`,
              entityId: 'test-user',
              roomId: 'test-room',
              agentId: runtime.agentId,
              content: { text: test.text },
              createdAt: Date.now(),
            };

            try {
              const isValid = await matchingActions[0].validate(
                runtime,
                testMessage as any,
                {} as any
              );
              if (isValid) {
                correctClassifications++;
                console.log(`✓ Intent "${test.intent}" correctly identified for: "${test.text}"`);
              } else {
                console.log(
                  `⚠️ Intent "${test.intent}" identified but validation failed: "${test.text}"`
                );
              }
            } catch {
              console.log(`⚠️ Intent "${test.intent}" caused validation error: "${test.text}"`);
            }
          } else {
            console.warn(`✗ Intent "${test.intent}" not supported: "${test.text}"`);
          }
        }

        const accuracy = (correctClassifications / intentTests.length) * 100;
        console.log(
          `✓ Intent classification accuracy: ${correctClassifications}/${intentTests.length} (${accuracy.toFixed(1)}%)`
        );

        if (accuracy >= 70) {
          console.log('✓ Good intent classification performance');
        } else {
          console.warn('⚠️ Intent classification needs improvement');
        }
      },
    },
  ];
}

export default new AgentKitUserScenariosTestSuite();
