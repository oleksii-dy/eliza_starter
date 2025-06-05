import { ethers } from 'ethers';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// Get current directory and find the main workspace .env file
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const elizaDir = path.resolve(__dirname, '../../');

// Load environment variables from the eliza directory
dotenv.config({ path: path.join(elizaDir, '.env') });

console.log('🔍 POLYMARKET ORDER FAILURE DIAGNOSIS');
console.log('====================================');
console.log('Based on official documentation at:');
console.log('https://docs.polymarket.com/developers/CLOB/orders/create-order');

// Known USDC contracts
const LEGACY_USDC = '0x2791bca1f2de4661ed88a30c99a7a9449aa84174'; // Legacy USDC (Polymarket official)
const USDC_E = '0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359';       // USDC.e (where we have funds)
const CLOB_CONTRACT = '0x4bFb41d5B3570DeFd03C39a9A4D8dE6Bd8B8982E';

const ERC20_ABI = [
    'function balanceOf(address owner) view returns (uint256)',
    'function allowance(address owner, address spender) view returns (uint256)',
    'function decimals() view returns (uint8)',
    'function symbol() view returns (string)',
    'function name() view returns (string)'
];

async function diagnosePolymarketError() {
    try {
        console.log('\n📋 ERROR ANALYSIS:');
        console.log('-'.repeat(30));
        console.log('❌ Error: "not enough balance / allowance"');
        console.log('🔍 Error Code: INVALID_ORDER_NOT_ENOUGH_BALANCE');
        console.log('📖 Meaning: Funder address lacks sufficient balance/allowance');
        
        // Get wallet from environment
        const privateKey = process.env.WALLET_PRIVATE_KEY;
        const wallet = new ethers.Wallet(privateKey);
        
        console.log(`\n📍 WALLET ANALYSIS:`);
        console.log('-'.repeat(25));
        console.log(`Address: ${wallet.address}`);
        
        // Connect to Polygon
        const provider = new ethers.JsonRpcProvider('https://polygon-bor-rpc.publicnode.com');
        
        console.log('\n💰 USDC CONTRACT ANALYSIS:');
        console.log('-'.repeat(35));
        
        // Check Legacy USDC (official Polymarket contract)
        console.log('\n🔴 LEGACY USDC (Polymarket Official):');
        const legacyContract = new ethers.Contract(LEGACY_USDC, ERC20_ABI, provider);
        const [legacyBalance, legacyAllowance, legacySymbol] = await Promise.all([
            legacyContract.balanceOf(wallet.address),
            legacyContract.allowance(wallet.address, CLOB_CONTRACT),
            legacyContract.symbol()
        ]);
        
        const legacyBalanceFormatted = ethers.formatUnits(legacyBalance, 6);
        const legacyAllowanceFormatted = ethers.formatUnits(legacyAllowance, 6);
        
        console.log(`   Contract: ${LEGACY_USDC}`);
        console.log(`   Balance: ${legacyBalanceFormatted} ${legacySymbol}`);
        console.log(`   CLOB Allowance: ${legacyAllowanceFormatted} ${legacySymbol}`);
        
        // Check USDC.e (where we have funds)
        console.log('\n🟢 USDC.e (Where We Have Funds):');
        const usdcEContract = new ethers.Contract(USDC_E, ERC20_ABI, provider);
        const [usdcEBalance, usdcEAllowance, usdcESymbol] = await Promise.all([
            usdcEContract.balanceOf(wallet.address),
            usdcEContract.allowance(wallet.address, CLOB_CONTRACT),
            usdcEContract.symbol()
        ]);
        
        const usdcEBalanceFormatted = ethers.formatUnits(usdcEBalance, 6);
        const usdcEAllowanceFormatted = ethers.formatUnits(usdcEAllowance, 6);
        
        console.log(`   Contract: ${USDC_E}`);
        console.log(`   Balance: ${usdcEBalanceFormatted} ${usdcESymbol}`);
        console.log(`   CLOB Allowance: ${usdcEAllowanceFormatted} ${usdcESymbol}`);
        
        console.log('\n🎯 DIAGNOSIS RESULTS:');
        console.log('-'.repeat(25));
        
        const orderValue = 0.4; // 2 shares × $0.20
        const hasLegacyBalance = parseFloat(legacyBalanceFormatted) >= orderValue;
        const hasLegacyAllowance = parseFloat(legacyAllowanceFormatted) >= orderValue;
        const hasUsdcEBalance = parseFloat(usdcEBalanceFormatted) >= orderValue;
        const hasUsdcEAllowance = parseFloat(usdcEAllowanceFormatted) >= orderValue;
        
        console.log(`📊 Order Value: $${orderValue} USDC`);
        console.log(`\n🔴 Legacy USDC (Polymarket expects this):`);
        console.log(`   ✅ Has Balance: ${hasLegacyBalance ? 'YES' : 'NO'} (${legacyBalanceFormatted})`);
        console.log(`   🔑 Has Allowance: ${hasLegacyAllowance ? 'YES' : 'NO'} (${legacyAllowanceFormatted})`);
        console.log(`   🎯 Ready for Order: ${hasLegacyBalance && hasLegacyAllowance ? 'YES' : 'NO'}`);
        
        console.log(`\n🟢 USDC.e (Where funds are):`);
        console.log(`   ✅ Has Balance: ${hasUsdcEBalance ? 'YES' : 'NO'} (${usdcEBalanceFormatted})`);
        console.log(`   🔑 Has Allowance: ${hasUsdcEAllowance ? 'YES' : 'NO'} (${usdcEAllowanceFormatted})`);
        console.log(`   🎯 Ready for Order: ${hasUsdcEBalance && hasUsdcEAllowance ? 'YES' : 'NO'}`);
        
        console.log('\n🔍 ROOT CAUSE:');
        console.log('-'.repeat(20));
        if (!hasLegacyBalance) {
            console.log('❌ PRIMARY ISSUE: No balance in Legacy USDC contract');
            console.log('   Polymarket expects funds in the legacy USDC contract');
            console.log('   But our funds are in the newer USDC.e contract');
        }
        
        if (!hasLegacyAllowance && hasLegacyBalance) {
            console.log('❌ SECONDARY ISSUE: No allowance for Legacy USDC contract');
        }
        
        console.log('\n💡 SOLUTIONS:');
        console.log('-'.repeat(15));
        
        if (!hasLegacyBalance) {
            console.log('🔄 SOLUTION 1: Swap USDC.e → Legacy USDC');
            console.log('   • Use QuickSwap: https://quickswap.exchange');
            console.log('   • Use 1inch: https://1inch.io');
            console.log('   • Amount needed: ~$1 USDC for testing');
            
            console.log('\n🔧 SOLUTION 2: Update Plugin Architecture');
            console.log('   • Modify plugin to handle both USDC contracts');
            console.log('   • Auto-detect which contract has funds');
            console.log('   • Guide users through token swaps');
            
            console.log('\n🏦 SOLUTION 3: Use Proxy Wallet (Advanced)');
            console.log('   • Create Polymarket proxy wallet');
            console.log('   • Fund proxy with Legacy USDC');
            console.log('   • Configure plugin for proxy usage');
        }
        
        console.log('\n⚡ IMMEDIATE ACTION:');
        console.log('-'.repeat(25));
        console.log('1. 🔄 Swap 1 USDC.e → Legacy USDC for testing');
        console.log('2. 🔑 Approve Legacy USDC for CLOB contract');
        console.log('3. 🧪 Test order placement');
        console.log('4. 🔧 Update plugin to handle this automatically');
        
        console.log('\n📚 POLYMARKET REQUIREMENTS:');
        console.log('-'.repeat(35));
        console.log('• Funder must have USDC balance in LEGACY contract');
        console.log('• Funder must approve CLOB for spending LEGACY USDC');
        console.log('• For EOA wallets: Set allowances manually');
        console.log('• For Proxy wallets: Different setup required');
        
        console.log('\n🔗 HELPFUL LINKS:');
        console.log('-'.repeat(20));
        console.log('• Polymarket Docs: https://docs.polymarket.com/');
        console.log('• QuickSwap DEX: https://quickswap.exchange/');
        console.log('• 1inch Aggregator: https://1inch.io/');
        console.log('• Polygon Bridge: https://portal.polygon.technology/');
        
    } catch (error) {
        console.error('❌ Error during diagnosis:', error.message);
    }
}

diagnosePolymarketError(); 