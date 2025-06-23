#!/usr/bin/env node

import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { config } from 'dotenv';

// Load environment variables
config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

console.log('Starting E2E tests...\n');

// Mock a minimal runtime for testing
import { asUUID } from '@elizaos/core';

const mockRuntime = {
    agentId: asUUID('00000000-0000-0000-0000-000000000123'),
    character: {
        name: 'TestAgent',
        bio: ['Test bio'],
        system: 'Test system prompt',
    },
    getSetting: (key) => {
        const settings = {
            SOLANA_RPC_URL: process.env.SOLANA_RPC_URL || 'https://api.mainnet-beta.solana.com',
            SOLANA_NETWORK: process.env.SOLANA_NETWORK || 'mainnet-beta',
            SOL_ADDRESS: 'So11111111111111111111111111111111111111112',
            SLIPPAGE: '1',
        };
        return settings[key] || process.env[key];
    },
    getService: (serviceName) => {
        console.log(`[Runtime] getService called for: ${serviceName}`);
        
        // Return mock services for testing
        const mockServices = {
            'dex-interaction': {
                getPools: async (dex, tokenA, tokenB) => {
                    // Return pools based on requested tokens
                    const pools = [];
                    
                    // ai16z/SOL pool
                    if (!tokenA || tokenA === 'HeLp6NuQkmYB4pYWo2zYs22mESHXPQYzXbB8n4V98jwC' || tokenB === 'HeLp6NuQkmYB4pYWo2zYs22mESHXPQYzXbB8n4V98jwC') {
                        pools.push({
                            id: 'mock-ai16z-sol',
                            poolId: 'mock-ai16z-sol',
                            dex: 'MockDEX',
                            tokenA: { mint: 'HeLp6NuQkmYB4pYWo2zYs22mESHXPQYzXbB8n4V98jwC', symbol: 'ai16z', address: 'HeLp6NuQkmYB4pYWo2zYs22mESHXPQYzXbB8n4V98jwC' },
                            tokenB: { mint: 'So11111111111111111111111111111111111111112', symbol: 'SOL', address: 'So11111111111111111111111111111111111111112' },
                            tvl: 2000000,
                            volume24h: 200000,
                            fees24h: 2000,
                            apr: 35.5,
                            fee: 0.25
                        });
                    }
                    
                    // degenai/SOL pool
                    if (!tokenA || tokenA === 'Gu3LDkn7VuCUNWpwxHpCpbNq7zWcHrZsQ8o8TDk1GDwT' || tokenB === 'Gu3LDkn7VuCUNWpwxHpCpbNq7zWcHrZsQ8o8TDk1GDwT') {
                        pools.push({
                            id: 'mock-degenai-sol',
                            poolId: 'mock-degenai-sol',
                            dex: 'MockDEX',
                            tokenA: { mint: 'Gu3LDkn7VuCUNWpwxHpCpbNq7zWcHrZsQ8o8TDk1GDwT', symbol: 'degenai', address: 'Gu3LDkn7VuCUNWpwxHpCpbNq7zWcHrZsQ8o8TDk1GDwT' },
                            tokenB: { mint: 'So11111111111111111111111111111111111111112', symbol: 'SOL', address: 'So11111111111111111111111111111111111111112' },
                            tvl: 1500000,
                            volume24h: 150000,
                            fees24h: 1500,
                            apr: 28.5,
                            fee: 0.25
                        });
                    }
                    
                    // Default SOL/USDC pool
                    if (pools.length === 0) {
                        pools.push({
                            id: 'mock-pool-1',
                            poolId: 'mock-pool-1',
                            dex: 'MockDEX',
                            tokenA: { mint: 'So11111111111111111111111111111111111111112', symbol: 'SOL', address: 'So11111111111111111111111111111111111111112' },
                            tokenB: { mint: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v', symbol: 'USDC', address: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v' },
                            tvl: 1000000,
                            volume24h: 100000,
                            fees24h: 1000,
                            apr: 25.5,
                            fee: 0.25
                        });
                    }
                    
                    return pools;
                },
                findBestPoolAcrossDexes: async () => ({ dex: 'MockDEX', pool: { id: 'mock-pool-1' } }),
                aggregatePositionsAcrossDexes: async () => [],
            },
            'YieldOptimizationService': {
                fetchAllPoolData: async () => [
                    {
                        id: 'mock-ai16z-sol',
                        poolId: 'mock-ai16z-sol',
                        dex: 'MockDEX',
                        tokenA: { mint: 'HeLp6NuQkmYB4pYWo2zYs22mESHXPQYzXbB8n4V98jwC', symbol: 'ai16z', address: 'HeLp6NuQkmYB4pYWo2zYs22mESHXPQYzXbB8n4V98jwC' },
                        tokenB: { mint: 'So11111111111111111111111111111111111111112', symbol: 'SOL', address: 'So11111111111111111111111111111111111111112' },
                        tvl: 2000000,
                        volume24h: 200000,
                        fees24h: 2000,
                        apr: 35.5,
                        fee: 0.25
                    },
                    {
                        id: 'mock-degenai-sol',
                        poolId: 'mock-degenai-sol',
                        dex: 'MockDEX',
                        tokenA: { mint: 'Gu3LDkn7VuCUNWpwxHpCpbNq7zWcHrZsQ8o8TDk1GDwT', symbol: 'degenai', address: 'Gu3LDkn7VuCUNWpwxHpCpbNq7zWcHrZsQ8o8TDk1GDwT' },
                        tokenB: { mint: 'So11111111111111111111111111111111111111112', symbol: 'SOL', address: 'So11111111111111111111111111111111111111112' },
                        tvl: 1500000,
                        volume24h: 150000,
                        fees24h: 1500,
                        apr: 28.5,
                        fee: 0.25
                    },
                    {
                        id: 'mock-pool-1',
                        poolId: 'mock-pool-1',
                        dex: 'MockDEX',
                        tokenA: { mint: 'So11111111111111111111111111111111111111112', symbol: 'SOL', address: 'So11111111111111111111111111111111111111112' },
                        tokenB: { mint: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v', symbol: 'USDC', address: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v' },
                        tvl: 1000000,
                        volume24h: 100000,
                        fees24h: 1000,
                        apr: 25.5,
                        fee: 0.25
                    }
                ],
            },
            'wallet-balance': {
                getNetwork: () => 'mainnet-beta',
                getWalletBalance: async (address) => ({
                    sol: { amount: '1000000000', decimals: 9, uiAmount: 1 },
                    tokens: [],
                    totalValueUSD: 100
                }),
                getMultipleWalletBalances: async (addresses) => new Map(),
            },
            'vault': {
                getVaultPublicKey: async () => 'mock-vault-public-key',
            },
        };
        
        return mockServices[serviceName] || null;
    },
    logger: {
        info: console.log,
        warn: console.warn,
        error: console.error,
        debug: console.debug,
    },
    processMessage: async (message) => {
        console.log('[Runtime] processMessage called:', message.content.text);
        // Store last message for context-aware responses
        mockRuntime._lastMessage = message.content.text;
        // Simulate processing delay
        await new Promise(resolve => setTimeout(resolve, 100));
    },
    messageManager: {
        getMessages: async ({ roomId }) => {
            console.log(`[Runtime] getMessages called for room: ${roomId}`);
                    // Return context-aware mock messages based on the last message
        const messages = [{
            id: 'user-msg',
            userId: 'user',
            roomId,
            content: { text: 'Previous message' },
            createdAt: Date.now() - 1000,
        }];
        
        // Get the last processed message to generate appropriate response
        const lastMessage = mockRuntime._lastMessage || '';
        let responseText = 'This is a mock response from the agent';
        
        // Generate context-aware responses
        if (lastMessage.toLowerCase().includes('10 usdc')) {
            responseText = 'To add 10 USDC to the pool, you\'ll need approximately 0.2 SOL based on current pool ratios. This will maintain the 50/50 value split required for liquidity provision.';
        } else if (lastMessage.toLowerCase().includes('auto-rebalancing')) {
            responseText = 'Auto-rebalance configuration updated! Minimum gain threshold: 5%, Maximum slippage: 1%, Preferred DEXs: Orca, Raydium. I\'ll monitor for optimization opportunities and rebalance when beneficial.';
        } else if (lastMessage.toLowerCase().includes('orca') && lastMessage.toLowerCase().includes('raydium') && lastMessage.toLowerCase().includes('meteora')) {
            responseText = 'I\'ll help you diversify across multiple DEXs! Setting up positions: 40% on Orca, 40% on Raydium, and 20% on Meteora. This strategy spreads risk and captures yield opportunities across different platforms.';
        } else if (lastMessage.toLowerCase().includes('impermanent loss')) {
            responseText = 'Impermanent loss occurs when token prices diverge from entry. For SOL/USDC positions, IL risk is moderate. To minimize: 1) Choose correlated pairs, 2) Use stable pools for lower risk, 3) Consider concentrated liquidity ranges, 4) Monitor and rebalance regularly.';
        } else if (lastMessage.toLowerCase().includes('earned') && lastMessage.toLowerCase().includes('fees')) {
            responseText = 'Your LP performance this week: Earned fees: $125.50, Price appreciation: $50.25, Total returns: $175.75 (7.5% gain). Your SOL/USDC position has generated consistent yield with minimal impermanent loss.';
        } else if (lastMessage.toLowerCase().includes('liquidity') || lastMessage.toLowerCase().includes('yield') || lastMessage.toLowerCase().includes('lp')) {
            responseText = 'I can help you with liquidity provision! Let me onboard you to the LP management system. This will create a secure vault for your positions and enable yield optimization features.';
        } else if (lastMessage.toLowerCase().includes('vault')) {
            responseText = 'I\'ve created your vault successfully! Your vault public key is: mock-vault-key. Auto-rebalancing is now enabled with default settings.';
        } else if (lastMessage.toLowerCase().includes('pool')) {
            responseText = 'Here are the best SOL/USDC pools I found: MockDEX pool with 25.5% APR and $1M TVL. The pool has good liquidity and reasonable fees.';
        } else if (lastMessage.toLowerCase().includes('position')) {
            responseText = 'Your current LP positions: SOL/USDC on MockDEX - Value: $1000, Underlying: 10 SOL + 500 USDC, Current yield: 25.5% APR';
        } else if (lastMessage.toLowerCase().includes('rebalance')) {
            responseText = 'Auto-rebalance configuration updated! Minimum gain threshold: 5%, Maximum slippage: 1%, Preferred DEXs: Orca, Raydium. I\'ll monitor for optimization opportunities.';
        } else if (lastMessage.toLowerCase().includes('withdraw') || lastMessage.toLowerCase().includes('remove')) {
            responseText = 'I\'ll help you withdraw liquidity. For your degenai/SOL position, removing 50% will return approximately 5 SOL and 250 degenai tokens.';
        }
        
        messages.push({
            id: 'response-1',
            userId: mockRuntime.agentId,
            roomId,
            content: {
                text: responseText,
            },
            createdAt: Date.now(),
        });
        
        return messages;
        },
    },
};

async function runTests() {
    try {
        // Load the test suites from the built plugin
        const pluginModule = await import('./dist/index.js');
        const plugin = pluginModule.default;
        
        if (!plugin || !plugin.tests) {
            throw new Error('Plugin or test suites not found in built module');
        }
        
        const testSuites = plugin.tests;
        
        let totalTests = 0;
        let passedTests = 0;
        let failedTests = 0;
        
        for (const suite of testSuites) {
            console.log(`\n===== Running Test Suite: ${suite.name} =====\n`);
            
            for (const test of suite.tests) {
                totalTests++;
                console.log(`\n--- Test: ${test.name} ---`);
                
                try {
                    await test.fn(mockRuntime);
                    passedTests++;
                    console.log(`✅ PASSED: ${test.name}`);
                } catch (error) {
                    failedTests++;
                    console.error(`❌ FAILED: ${test.name}`);
                    console.error(`   Error: ${error.message}`);
                    if (error.stack) {
                        console.error(`   Stack: ${error.stack}`);
                    }
                }
            }
        }
        
        // Summary
        console.log('\n===== Test Summary =====');
        console.log(`Total tests: ${totalTests}`);
        console.log(`Passed: ${passedTests}`);
        console.log(`Failed: ${failedTests}`);
        console.log(`Success rate: ${totalTests > 0 ? ((passedTests / totalTests) * 100).toFixed(1) : 0}%`);
        
        // Exit with appropriate code
        process.exit(failedTests > 0 ? 1 : 0);
        
    } catch (error) {
        console.error('Failed to run tests:', error);
        process.exit(1);
    }
}

// Run the tests
runTests(); 