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

console.log('🔍 INVESTIGATING CLOB USDC CONTRACT ISSUE');
console.log('=========================================');

// Both USDC contracts
const LEGACY_USDC = '0x2791bca1f2de4661ed88a30c99a7a9449aa84174'; // Legacy USDC
const NEW_USDC = '0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359';     // USDC.e (where we have funds)
const CLOB_CONTRACT = '0x4bFb41d5B3570DeFd03C39a9A4D8dE6Bd8B8982E';

async function investigateCLOBIssue() {
    try {
        // Get wallet from environment
        const privateKey = process.env.WALLET_PRIVATE_KEY;
        const wallet = new ethers.Wallet(privateKey);
        
        console.log(`📍 Wallet Address: ${wallet.address}`);
        console.log(`🏢 CLOB Contract: ${CLOB_CONTRACT}`);
        
        // Connect to Polygon
        const provider = new ethers.JsonRpcProvider('https://polygon-bor-rpc.publicnode.com');
        const connectedWallet = wallet.connect(provider);
        
        const USDC_ABI = [
            'function balanceOf(address owner) view returns (uint256)',
            'function allowance(address owner, address spender) view returns (uint256)',
            'function decimals() view returns (uint8)',
            'function symbol() view returns (string)',
            'function name() view returns (string)'
        ];
        
        console.log('\n💰 CHECKING BOTH USDC CONTRACTS:');
        console.log('-'.repeat(45));
        
        // Check both contracts
        const contracts = [
            { address: LEGACY_USDC, name: 'Legacy USDC', symbol: '🔴' },
            { address: NEW_USDC, name: 'USDC.e (Fixed)', symbol: '🟢' }
        ];
        
        for (const contractInfo of contracts) {
            console.log(`\n${contractInfo.symbol} ${contractInfo.name}:`);
            console.log(`   Contract: ${contractInfo.address}`);
            
            const contract = new ethers.Contract(contractInfo.address, USDC_ABI, provider);
            
            try {
                const [balance, allowance, decimals, symbol, name] = await Promise.all([
                    contract.balanceOf(wallet.address),
                    contract.allowance(wallet.address, CLOB_CONTRACT),
                    contract.decimals(),
                    contract.symbol(),
                    contract.name()
                ]);
                
                const balanceFormatted = ethers.formatUnits(balance, decimals);
                const allowanceFormatted = ethers.formatUnits(allowance, decimals);
                
                console.log(`   Name: ${name}`);
                console.log(`   Symbol: ${symbol}`);
                console.log(`   Balance: ${balanceFormatted} ${symbol}`);
                console.log(`   CLOB Allowance: ${allowanceFormatted} ${symbol}`);
                
                // Check if this contract has enough for the order
                const orderValue = 0.4;
                const hasBalance = parseFloat(balanceFormatted) >= orderValue;
                const hasAllowance = parseFloat(allowanceFormatted) >= orderValue;
                
                console.log(`   ✅ Has Balance (≥$0.4): ${hasBalance ? 'YES' : 'NO'}`);
                console.log(`   🔑 Has Allowance (≥$0.4): ${hasAllowance ? 'YES' : 'NO'}`);
                console.log(`   🎯 Ready for CLOB: ${hasBalance && hasAllowance ? 'YES' : 'NO'}`);
                
            } catch (error) {
                console.log(`   ❌ Error: ${error.message}`);
            }
        }
        
        console.log('\n🔍 ANALYSIS:');
        console.log('-'.repeat(20));
        console.log('From the logs, we see:');
        console.log('✅ USDC approval transaction successful');
        console.log('❌ CLOB rejects order: "not enough balance / allowance"');
        console.log('');
        console.log('This suggests the CLOB might expect:');
        console.log('1. Legacy USDC contract (0x2791...) for allowances');
        console.log('2. Different approval amount');
        console.log('3. Both contracts to have allowances');
        
        // Let's check what the CLOB contract actually expects
        console.log('\n🎯 POTENTIAL SOLUTION:');
        console.log('-'.repeat(25));
        console.log('We may need to approve BOTH USDC contracts:');
        console.log(`1. Legacy USDC: ${LEGACY_USDC}`);
        console.log(`2. New USDC.e: ${NEW_USDC}`);
        console.log('');
        console.log('Or investigate which contract Polymarket actually uses for trading.');
        
        // Create test approval for legacy contract if needed
        const legacyContract = new ethers.Contract(LEGACY_USDC, USDC_ABI, connectedWallet);
        const legacyAllowance = await legacyContract.allowance(wallet.address, CLOB_CONTRACT);
        const legacyAllowanceFormatted = ethers.formatUnits(legacyAllowance, 6);
        
        if (parseFloat(legacyAllowanceFormatted) === 0) {
            console.log('\n💡 RECOMMENDATION:');
            console.log('-'.repeat(20));
            console.log('The legacy USDC contract has 0 allowance.');
            console.log('Even though we have no balance there, the CLOB might check it.');
            console.log('Consider approving the legacy contract as well.');
        }
        
    } catch (error) {
        console.error('❌ Error investigating CLOB issue:', error.message);
    }
}

investigateCLOBIssue(); 