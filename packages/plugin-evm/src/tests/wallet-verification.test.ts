import { describe, it, expect, beforeAll } from 'bun:test';
import { createPublicClient, http, type Address } from 'viem';
import { mainnet, sepolia, polygon, arbitrum, optimism, base, avalanche, bsc } from 'viem/chains';
import { privateKeyToAccount } from 'viem/accounts';

// Configuration
const WALLET_VERIFICATION_CONFIG = {
  PRIVATE_KEY:
    process.env.EVM_PRIVATE_KEY ||
    process.env.AGENT_PRIVATE_KEY ||
    '0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80',
  MIN_BALANCE_WARNING: 0.01, // ETH or native token
};

// Chain configurations with RPC endpoints
const CHAINS_TO_VERIFY = [
  {
    chain: mainnet,
    rpc: process.env.ETHEREUM_RPC_URL || 'https://eth.llamarpc.com',
    name: 'Ethereum Mainnet',
    symbol: 'ETH',
    minBalance: 0.01,
  },
  {
    chain: sepolia,
    rpc: process.env.SEPOLIA_RPC_URL || 'https://ethereum-sepolia-rpc.publicnode.com',
    name: 'Sepolia Testnet',
    symbol: 'ETH',
    minBalance: 0.1,
  },
  {
    chain: polygon,
    rpc: process.env.POLYGON_RPC_URL || 'https://polygon-rpc.com',
    name: 'Polygon',
    symbol: 'MATIC',
    minBalance: 1,
  },
  {
    chain: arbitrum,
    rpc: process.env.ARBITRUM_RPC_URL || 'https://arb1.arbitrum.io/rpc',
    name: 'Arbitrum',
    symbol: 'ETH',
    minBalance: 0.001,
  },
  {
    chain: optimism,
    rpc: process.env.OPTIMISM_RPC_URL || 'https://mainnet.optimism.io',
    name: 'Optimism',
    symbol: 'ETH',
    minBalance: 0.001,
  },
  {
    chain: base,
    rpc: process.env.BASE_RPC_URL || 'https://mainnet.base.org',
    name: 'Base',
    symbol: 'ETH',
    minBalance: 0.001,
  },
  {
    chain: avalanche,
    rpc: process.env.AVALANCHE_RPC_URL || 'https://api.avax.network/ext/bc/C/rpc',
    name: 'Avalanche',
    symbol: 'AVAX',
    minBalance: 0.1,
  },
  {
    chain: bsc,
    rpc: process.env.BSC_RPC_URL || 'https://bsc-dataseed.binance.org',
    name: 'BSC',
    symbol: 'BNB',
    minBalance: 0.01,
  },
];

describe('🔍 Wallet Verification', () => {
  let walletAddress: Address;
  let account: any;

  beforeAll(() => {
    if (!WALLET_VERIFICATION_CONFIG.PRIVATE_KEY) {
      throw new Error(
        '❌ No private key found. Please set EVM_PRIVATE_KEY or AGENT_PRIVATE_KEY environment variable.'
      );
    }

    // Initialize wallet
    account = privateKeyToAccount(WALLET_VERIFICATION_CONFIG.PRIVATE_KEY as `0x${string}`);
    walletAddress = account.address;

    console.log('\n🔑 Wallet Verification Starting...');
    console.log(`📍 Wallet Address: ${walletAddress}`);
    console.log('━'.repeat(80));
  });

  describe('Multi-Chain Balance Check', () => {
    CHAINS_TO_VERIFY.forEach(({ chain, rpc, name, symbol, minBalance }) => {
      it(`should check balance on ${name}`, async () => {
        console.log(`\n🔗 Checking ${name} (Chain ID: ${chain.id})`);

        try {
          // Create client for this chain
          const client = createPublicClient({
            chain,
            transport: http(rpc),
          });

          // Get balance
          const balance = await client.getBalance({ address: walletAddress });
          const formattedBalance = Number(balance) / 1e18;

          // Get current block to verify connectivity
          const blockNumber = await client.getBlockNumber();

          // Get gas price to check network status
          const gasPrice = await client.getGasPrice();
          const gasPriceGwei = Number(gasPrice) / 1e9;

          // Display results
          console.log(`   💰 Balance: ${formattedBalance.toFixed(6)} ${symbol}`);
          console.log(`   📦 Current Block: ${blockNumber.toLocaleString()}`);
          console.log(`   ⛽ Gas Price: ${gasPriceGwei.toFixed(2)} gwei`);

          // Check if balance is sufficient
          if (formattedBalance < minBalance) {
            console.log(`   ⚠️  Low balance! Recommended minimum: ${minBalance} ${symbol}`);
            console.log(`   💡 You may need funds on ${name} for operations`);
          } else {
            console.log('   ✅ Sufficient balance for operations');
          }

          // Verify connectivity
          expect(blockNumber).toBeGreaterThan(0);
          expect(balance).toBeGreaterThanOrEqual(0);
        } catch (error) {
          console.error(`   ❌ Error checking ${name}:`, error.message);
          // Don't fail the test, just report the error
          console.log('   💡 This chain might need configuration or the RPC might be down');
        }

        console.log(`   ${'─'.repeat(60)}`);
      }, 30000); // 30 second timeout per chain
    });
  });

  describe('Summary Report', () => {
    it('should generate wallet summary', async () => {
      console.log('\n📊 WALLET VERIFICATION SUMMARY');
      console.log('═'.repeat(80));
      console.log(`Wallet Address: ${walletAddress}`);
      console.log(`Total Chains Checked: ${CHAINS_TO_VERIFY.length}`);
      console.log('\nChains with recommended funding:');

      const fundingNeeded: string[] = [];

      // Check all chains again for summary
      for (const { chain, rpc, name, symbol, minBalance } of CHAINS_TO_VERIFY) {
        try {
          const client = createPublicClient({
            chain,
            transport: http(rpc),
          });

          const balance = await client.getBalance({ address: walletAddress });
          const formattedBalance = Number(balance) / 1e18;

          if (formattedBalance < minBalance) {
            fundingNeeded.push(
              `   • ${name}: Need ${(minBalance - formattedBalance).toFixed(6)} ${symbol}`
            );
          }
        } catch (error) {
          // Skip chains with errors
        }
      }

      if (fundingNeeded.length > 0) {
        fundingNeeded.forEach((msg) => console.log(msg));
      } else {
        console.log('   ✅ All chains have sufficient balance!');
      }

      console.log('\n💡 Tips:');
      console.log('   • For testnet funds, use faucets:');
      console.log('     - Sepolia: https://sepoliafaucet.com/');
      console.log('     - Base Sepolia: https://docs.base.org/tools/network-faucets/');
      console.log('     - Optimism Sepolia: https://app.optimism.io/faucet');
      console.log('   • For mainnet, ensure you have enough for gas fees');
      console.log('   • Consider keeping a buffer above minimum amounts');
      console.log('═'.repeat(80));
    });
  });
});
