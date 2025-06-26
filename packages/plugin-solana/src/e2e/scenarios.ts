import type { IAgentRuntime, TestSuite } from '@elizaos/core';
import { strict as assert } from 'node:assert';
import { setupScenario, sendMessageAndWaitForResponse, getResponseText } from './test-utils.js';

/**
 * Defines a suite of E2E tests for LP Manager plugin real-world Discord/Telegram scenarios.
 *
 * These scenarios simulate authentic user interactions with the LP management agent,
 * covering the complete user journey from onboarding to advanced yield optimization.
 */
export const lpManagerScenariosSuite: TestSuite = {
  name: 'LP Manager Plugin Real-World Scenarios',
  tests: [
    {
      name: 'Scenario 1: New User Onboarding - First Time LP Experience',
      fn: async (runtime: IAgentRuntime) => {
        const { user, room } = await setupScenario(runtime);

        // Simulate natural Discord message from crypto newcomer
        const response = await sendMessageAndWaitForResponse(
          runtime,
          room,
          user,
          'Hey! I keep hearing about providing liquidity to earn yield. Can you help me get started? I have some SOL and USDC sitting around doing nothing.'
        );

        const resp = getResponseText(response);
        console.log('Agent Response for New User Onboarding:', resp.text);

        assert(
          typeof resp.text === 'string' && resp.text.length > 0,
          'Agent response should have a non-empty text property.'
        );

        // Should explain LP management and mention onboarding
        assert.match(
          resp.text,
          /liquidity|yield|onboard|vault|start|LP|provide/i,
          `Expected response to acknowledge LP onboarding context, but got: "${resp.text}"`
        );
      },
    },

    {
      name: 'Scenario 2: User Vault Creation and Setup',
      fn: async (runtime: IAgentRuntime) => {
        const { user, room } = await setupScenario(runtime);

        // User decides to proceed with onboarding
        const response = await sendMessageAndWaitForResponse(
          runtime,
          room,
          user,
          'Yes, I want to start LP management. Set me up with a vault please!'
        );

        const resp = getResponseText(response);
        console.log('Agent Response for Vault Creation:', resp.text);

        assert(
          typeof resp.text === 'string' && resp.text.length > 0,
          'Agent response should have a non-empty text property.'
        );

        // Should mention vault creation, public key, and auto-rebalance settings
        assert.match(
          resp.text,
          /vault|public key|onboard|auto.*rebalance|enabled|disabled/i,
          `Expected response to acknowledge vault creation, but got: "${resp.text}"`
        );
      },
    },

    {
      name: "Scenario 3: Simple LP Deposit - 'LP all my SOL and USDC'",
      fn: async (runtime: IAgentRuntime) => {
        const { user, room } = await setupScenario(runtime);

        // User wants to deposit all their tokens
        const response = await sendMessageAndWaitForResponse(
          runtime,
          room,
          user,
          'I want to LP all my SOL and USDC. Find me the best pool with good APR!'
        );

        const resp = getResponseText(response);
        console.log('Agent Response for LP All Tokens:', resp.text);

        assert(
          typeof resp.text === 'string' && resp.text.length > 0,
          'Agent response should have a non-empty text property.'
        );

        // Should reference pools, APR, and LP deposit process
        assert.match(
          resp.text,
          /pool|APR|deposit|liquidity|SOL|USDC|yield|best/i,
          `Expected response to acknowledge LP deposit request, but got: "${resp.text}"`
        );
      },
    },

    {
      name: "Scenario 4: Specific Amount LP Deposit - 'LP 10 USDC'",
      fn: async (runtime: IAgentRuntime) => {
        const { user, room } = await setupScenario(runtime);

        // User wants to deposit specific amount
        const response = await sendMessageAndWaitForResponse(
          runtime,
          room,
          user,
          'Just LP 10 USDC for now. What SOL amount do I need to pair with it?'
        );

        const resp = getResponseText(response);
        console.log('Agent Response for Specific Amount LP:', resp.text);

        assert(
          typeof resp.text === 'string' && resp.text.length > 0,
          'Agent response should have a non-empty text property.'
        );

        // Should calculate pairing amounts and explain ratio
        assert.match(
          resp.text,
          /10|USDC|SOL|pair|ratio|pool|amount|deposit/i,
          `Expected response to acknowledge specific amount LP request, but got: "${resp.text}"`
        );
      },
    },

    {
      name: "Scenario 5: Percentage-Based LP Deposit - 'LP 50% of my holdings'",
      fn: async (runtime: IAgentRuntime) => {
        const { user, room } = await setupScenario(runtime);

        // User wants percentage-based deposit
        const response = await sendMessageAndWaitForResponse(
          runtime,
          room,
          user,
          'I want to LP 50% of my SOL bag. Keep the rest for emergencies.'
        );

        const resp = getResponseText(response);
        console.log('Agent Response for Percentage LP:', resp.text);

        assert(
          typeof resp.text === 'string' && resp.text.length > 0,
          'Agent response should have a non-empty text property.'
        );

        // Should calculate percentage and mention pool selection
        assert.match(
          resp.text,
          /50%|SOL|percentage|deposit|pool|liquidity|amount/i,
          `Expected response to acknowledge percentage LP request, but got: "${resp.text}"`
        );
      },
    },

    {
      name: "Scenario 6: Check LP Positions - 'Show me my LP positions'",
      fn: async (runtime: IAgentRuntime) => {
        const { user, room } = await setupScenario(runtime);

        // User wants to see their current positions
        const response = await sendMessageAndWaitForResponse(
          runtime,
          room,
          user,
          "Show me all my LP positions. How am I doing? What's my current yield?"
        );

        const resp = getResponseText(response);
        console.log('Agent Response for LP Position Check:', resp.text);

        assert(
          typeof resp.text === 'string' && resp.text.length > 0,
          'Agent response should have a non-empty text property.'
        );

        // Should display positions with details
        assert.match(
          resp.text,
          /position|LP|value|yield|underlying|SOL|USDC|pool/i,
          `Expected response to show LP positions, but got: "${resp.text}"`
        );
      },
    },

    {
      name: 'Scenario 7: Yield Optimization Discovery - Auto-rebalance Alert',
      fn: async (runtime: IAgentRuntime) => {
        const { user, room } = await setupScenario(runtime);

        // Agent proactively suggests rebalancing
        const response = await sendMessageAndWaitForResponse(
          runtime,
          room,
          user,
          'I heard there are higher yield opportunities. Can you check if I should move my LP to a better pool?'
        );

        const resp = getResponseText(response);
        console.log('Agent Response for Yield Optimization:', resp.text);

        assert(
          typeof resp.text === 'string' && resp.text.length > 0,
          'Agent response should have a non-empty text property.'
        );

        // Should mention yield comparison and rebalancing opportunities
        assert.match(
          resp.text,
          /yield|APR|opportunity|rebalance|pool|higher|optimize|move/i,
          `Expected response to acknowledge yield optimization request, but got: "${resp.text}"`
        );
      },
    },

    {
      name: 'Scenario 8: Auto-Rebalance Configuration - Risk Preferences',
      fn: async (runtime: IAgentRuntime) => {
        const { user, room } = await setupScenario(runtime);

        // User wants to configure auto-rebalancing
        const response = await sendMessageAndWaitForResponse(
          runtime,
          room,
          user,
          'I want to enable auto-rebalancing but only if the gain is at least 5%. Also, keep slippage under 1%. Can you set that up?'
        );

        const resp = getResponseText(response);
        console.log('Agent Response for Auto-Rebalance Setup:', resp.text);

        assert(
          typeof resp.text === 'string' && resp.text.length > 0,
          'Agent response should have a non-empty text property.'
        );

        // Should acknowledge configuration settings
        assert.match(
          resp.text,
          /auto.*rebalance|5%|gain|slippage|1%|enable|configure|preference/i,
          `Expected response to acknowledge auto-rebalance configuration, but got: "${resp.text}"`
        );
      },
    },

    {
      name: "Scenario 9: Partial LP Withdrawal - 'Take profits'",
      fn: async (runtime: IAgentRuntime) => {
        const { user, room } = await setupScenario(runtime);

        // User wants to take partial profits
        const response = await sendMessageAndWaitForResponse(
          runtime,
          room,
          user,
          'SOL is pumping! I want to withdraw 30% of my LP position to take some profits.'
        );

        const resp = getResponseText(response);
        console.log('Agent Response for Partial Withdrawal:', resp.text);

        assert(
          typeof resp.text === 'string' && resp.text.length > 0,
          'Agent response should have a non-empty text property.'
        );

        // Should handle percentage withdrawal
        assert.match(
          resp.text,
          /withdraw|30%|profit|LP|position|SOL|partial|remove/i,
          `Expected response to acknowledge partial withdrawal request, but got: "${resp.text}"`
        );
      },
    },

    {
      name: "Scenario 10: Emergency Full Withdrawal - 'Exit all positions'",
      fn: async (runtime: IAgentRuntime) => {
        const { user, room } = await setupScenario(runtime);

        // User needs emergency withdrawal
        const response = await sendMessageAndWaitForResponse(
          runtime,
          room,
          user,
          'Market is crashing! I need to exit all my LP positions immediately and get back to stablecoins.'
        );

        const resp = getResponseText(response);
        console.log('Agent Response for Emergency Withdrawal:', resp.text);

        assert(
          typeof resp.text === 'string' && resp.text.length > 0,
          'Agent response should have a non-empty text property.'
        );

        // Should handle emergency exit scenario
        assert.match(
          resp.text,
          /exit|withdraw|all|position|emergency|market|crash|stable/i,
          `Expected response to acknowledge emergency withdrawal, but got: "${resp.text}"`
        );
      },
    },

    {
      name: 'Scenario 11: Advanced Strategy - Stablecoin Focus',
      fn: async (runtime: IAgentRuntime) => {
        const { user, room } = await setupScenario(runtime);

        // User wants conservative strategy
        const response = await sendMessageAndWaitForResponse(
          runtime,
          room,
          user,
          "I'm risk-averse. Only show me stable pools like USDC/USDT. I want steady yield without impermanent loss risk."
        );

        const resp = getResponseText(response);
        console.log('Agent Response for Stablecoin Strategy:', resp.text);

        assert(
          typeof resp.text === 'string' && resp.text.length > 0,
          'Agent response should have a non-empty text property.'
        );

        // Should focus on stable pairs and low risk
        assert.match(
          resp.text,
          /stable|USDC|USDT|risk|impermanent.*loss|steady|yield|conservative/i,
          `Expected response to acknowledge stablecoin strategy, but got: "${resp.text}"`
        );
      },
    },

    {
      name: 'Scenario 12: Pool Comparison and Analysis',
      fn: async (runtime: IAgentRuntime) => {
        const { user, room } = await setupScenario(runtime);

        // User wants detailed pool analysis
        const response = await sendMessageAndWaitForResponse(
          runtime,
          room,
          user,
          'Compare all SOL/USDC pools across different DEXs. Show me TVL, APR, and fees for each.'
        );

        const resp = getResponseText(response);
        console.log('Agent Response for Pool Comparison:', resp.text);

        assert(
          typeof resp.text === 'string' && resp.text.length > 0,
          'Agent response should have a non-empty text property.'
        );

        // Should provide detailed pool comparison
        assert.match(
          resp.text,
          /pool|compare|TVL|APR|fee|DEX|SOL|USDC|analysis/i,
          `Expected response to provide pool comparison, but got: "${resp.text}"`
        );
      },
    },

    {
      name: 'Scenario 13: Multi-DEX Strategy - Diversification',
      fn: async (runtime: IAgentRuntime) => {
        const { user, room } = await setupScenario(runtime);

        // User wants to diversify across DEXs
        const response = await sendMessageAndWaitForResponse(
          runtime,
          room,
          user,
          'I want to spread my risk. Can you help me LP across multiple DEXs? Maybe 40% on Orca, 40% on Raydium, and 20% on Meteora?'
        );

        const resp = getResponseText(response);
        console.log('Agent Response for Multi-DEX Strategy:', resp.text);

        assert(
          typeof resp.text === 'string' && resp.text.length > 0,
          'Agent response should have a non-empty text property.'
        );

        // Should acknowledge multi-DEX strategy
        assert.match(
          resp.text,
          /diversify|multiple|DEX|Orca|Raydium|Meteora|spread|risk|40%|20%/i,
          `Expected response to acknowledge multi-DEX strategy, but got: "${resp.text}"`
        );
      },
    },

    {
      name: 'Scenario 14: Impermanent Loss Concern',
      fn: async (runtime: IAgentRuntime) => {
        const { user, room } = await setupScenario(runtime);

        // User is worried about impermanent loss
        const response = await sendMessageAndWaitForResponse(
          runtime,
          room,
          user,
          "I'm worried about impermanent loss. Can you explain how it affects my SOL/USDC position and suggest ways to minimize it?"
        );

        const resp = getResponseText(response);
        console.log('Agent Response for IL Concern:', resp.text);

        assert(
          typeof resp.text === 'string' && resp.text.length > 0,
          'Agent response should have a non-empty text property.'
        );

        // Should explain IL and provide strategies
        assert.match(
          resp.text,
          /impermanent.*loss|IL|price|diverge|minimize|stable|strategy|risk/i,
          `Expected response to address impermanent loss concerns, but got: "${resp.text}"`
        );
      },
    },

    {
      name: 'Scenario 15: Performance Tracking Request',
      fn: async (runtime: IAgentRuntime) => {
        const { user, room } = await setupScenario(runtime);

        // User wants performance metrics
        const response = await sendMessageAndWaitForResponse(
          runtime,
          room,
          user,
          'How much have I earned from LP fees this week? Show me my total returns including both fees and price changes.'
        );

        const resp = getResponseText(response);
        console.log('Agent Response for Performance Tracking:', resp.text);

        assert(
          typeof resp.text === 'string' && resp.text.length > 0,
          'Agent response should have a non-empty text property.'
        );

        // Should provide performance metrics
        assert.match(
          resp.text,
          /earn|fee|return|performance|week|total|price.*change|profit|loss/i,
          `Expected response to show performance metrics, but got: "${resp.text}"`
        );
      },
    },
  ],
};

export default lpManagerScenariosSuite;
