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

console.log('🔧 TESTING USDC CONTRACT FIX');
console.log('============================');

// The issue: place order action checks the wrong USDC contract
const LEGACY_USDC = '0x2791bca1f2de4661ed88a30c99a7a9449aa84174'; // Used by place order (0 balance)
const NEW_USDC = '0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359';     // Has the actual funds (7 USDC)

async function testUSDCContracts() {
    try {
        // Get wallet from environment
        const privateKey = process.env.WALLET_PRIVATE_KEY;
        const wallet = new ethers.Wallet(privateKey);
        
        console.log(`📍 Wallet Address: ${wallet.address}`);
        
        // Connect to Polygon
        const provider = new ethers.JsonRpcProvider('https://polygon-bor-rpc.publicnode.com');
        
        const USDC_ABI = [
            'function balanceOf(address owner) view returns (uint256)',
            'function decimals() view returns (uint8)',
            'function symbol() view returns (string)',
            'function name() view returns (string)'
        ];
        
        console.log('\n💰 USDC CONTRACT COMPARISON:');
        console.log('-'.repeat(40));
        
        // Check legacy USDC (what place order currently uses)
        const legacyContract = new ethers.Contract(LEGACY_USDC, USDC_ABI, provider);
        const [legacyBalance, legacyDecimals, legacySymbol, legacyName] = await Promise.all([
            legacyContract.balanceOf(wallet.address),
            legacyContract.decimals(),
            legacyContract.symbol(),
            legacyContract.name()
        ]);
        
        const legacyFormatted = ethers.formatUnits(legacyBalance, legacyDecimals);
        
        console.log('🔴 LEGACY USDC (Place Order Uses This):');
        console.log(`   Contract: ${LEGACY_USDC}`);
        console.log(`   Name: ${legacyName}`);
        console.log(`   Symbol: ${legacySymbol}`);
        console.log(`   Balance: ${legacyFormatted} ${legacySymbol}`);
        
        // Check new USDC.e (where funds actually are)
        const newContract = new ethers.Contract(NEW_USDC, USDC_ABI, provider);
        const [newBalance, newDecimals, newSymbol, newName] = await Promise.all([
            newContract.balanceOf(wallet.address),
            newContract.decimals(),
            newContract.symbol(),
            newContract.name()
        ]);
        
        const newFormatted = ethers.formatUnits(newBalance, newDecimals);
        
        console.log('\n🟢 NEW USDC.e (Where Funds Actually Are):');
        console.log(`   Contract: ${NEW_USDC}`);
        console.log(`   Name: ${newName}`);
        console.log(`   Symbol: ${newSymbol}`);
        console.log(`   Balance: ${newFormatted} ${newSymbol}`);
        
        console.log('\n🎯 ANALYSIS:');
        console.log('-'.repeat(20));
        console.log(`❌ Legacy Contract Balance: ${legacyFormatted} USDC`);
        console.log(`✅ New Contract Balance: ${newFormatted} USDC`);
        console.log(`🔧 Fix Required: Update USDC_ADDRESS in usdcApproval.ts`);
        
        // Calculate if order would work with correct contract
        const orderValue = 0.4; // 2 shares × $0.20 = $0.40
        const hasEnoughFunds = parseFloat(newFormatted) >= orderValue;
        
        console.log('\n💡 ORDER TEST:');
        console.log('-'.repeat(15));
        console.log(`📋 Order Value: $${orderValue} USDC`);
        console.log(`💰 Available (New Contract): ${newFormatted} USDC`);
        console.log(`✅ Can Place Order: ${hasEnoughFunds ? 'YES' : 'NO'}`);
        
        if (hasEnoughFunds) {
            console.log(`🎉 Order would succeed with ${(parseFloat(newFormatted) - orderValue).toFixed(6)} USDC remaining`);
        }
        
        console.log('\n🛠️  SOLUTION:');
        console.log('-'.repeat(15));
        console.log('Update the USDC_ADDRESS constant in:');
        console.log('eliza/packages/plugin-polymarket/src/utils/usdcApproval.ts');
        console.log(`From: ${LEGACY_USDC}`);
        console.log(`To:   ${NEW_USDC}`);
        
    } catch (error) {
        console.error('❌ Error testing USDC contracts:', error.message);
    }
}

testUSDCContracts(); 