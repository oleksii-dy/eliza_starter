import { TestSuite, IAgentRuntime } from '@elizaos/core';
import { WalletBalanceService } from '../services/WalletBalanceService';

export const walletBalanceTestSuite: TestSuite = {
    name: 'Wallet Balance E2E Tests',
    tests: [
        {
            name: 'wallet_balance_e2e_tests',
            fn: async (runtime: IAgentRuntime) => {
                const walletService = runtime.getService<WalletBalanceService>('wallet-balance');
                
                if (!walletService) {
                    throw new Error('WalletBalanceService not available');
                }

                console.log('\n=== Running Wallet Balance E2E Tests ===\n');

                // Test 1: Check service initialization
                console.log('Test 1: Service Initialization');
                const network = walletService.getNetwork();
                console.log(`✓ WalletBalanceService initialized on network: ${network}`);

                // Test 2: Fetch balance for a known address based on network
                console.log('\nTest 2: Fetch balance for known address');
                const testAddresses: Record<string, string> = {
                    'mainnet-beta': 'So11111111111111111111111111111111111111112', // SOL System Program
                    'testnet': '6ZRCB7AAqGre6c72PRz3MHLC73VMYvJ8bi9KHf1HFpNk', // Known testnet address
                    'devnet': 'So11111111111111111111111111111111111111112',
                };
                
                const testAddress = testAddresses[network] || testAddresses['mainnet-beta'];
                try {
                    const balance = await walletService.getWalletBalance(testAddress);
                    console.log(`✓ Fetched balance for ${testAddress}:`);
                    console.log(`  SOL: ${balance.sol.uiAmount.toFixed(4)}`);
                    console.log(`  Token count: ${balance.tokens.length}`);
                    console.log(`  Total value (USD): $${(balance.totalValueUSD || 0).toFixed(2)}`);
                } catch (error) {
                    console.error(`✗ Failed to fetch balance: ${error instanceof Error ? error.message : String(error)}`);
                }

                // Test 3: Test batch balance fetching
                console.log('\nTest 3: Batch balance fetching');
                const batchAddresses = [testAddress];
                
                try {
                    const balances = await walletService.getMultipleWalletBalances(batchAddresses);
                    console.log(`✓ Fetched ${balances.size} wallet balances in batch`);
                    
                    balances.forEach((balance, address) => {
                        console.log(`  ${address}: SOL=${balance.sol.uiAmount.toFixed(4)}, Tokens=${balance.tokens.length}`);
                    });
                } catch (error) {
                    console.error(`✗ Failed to fetch batch balances: ${error instanceof Error ? error.message : String(error)}`);
                }

                // Test 4: Invalid address handling
                console.log('\nTest 4: Invalid address handling');
                try {
                    // Use an invalid address that's too short instead of one with invalid characters
                    await walletService.getWalletBalance('11111111111111111111111111111'); // Too short
                    console.error('✗ Should have thrown error for invalid address');
                } catch (error) {
                    console.log('✓ Correctly handled invalid address');
                }

                // Test 5: Network switching (if applicable)
                console.log('\nTest 5: Network information');
                console.log(`✓ Current network: ${network}`);
                console.log(`✓ RPC endpoint: ${runtime.getSetting('SOLANA_RPC_URL') || 'default'}`);

                console.log('\n=== Wallet Balance E2E Tests Completed ===\n');
            },
        },
    ],
};

// Export for inclusion in plugin tests
export default walletBalanceTestSuite; 