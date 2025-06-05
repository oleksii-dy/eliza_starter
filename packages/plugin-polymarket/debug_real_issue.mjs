import { ethers } from 'ethers';

console.log('🔍 Debugging the Real Balance/Allowance Issue...');
console.log('=' .repeat(60));

// Configuration from the plugin
const PRIVATE_KEY = "0xcb0b7dd13ac76649ce888771403f3a72f52ff1cd543e20a27afe62e4aa9e0346";
const USDC_ADDRESS = '0x2791bca1f2de4661ed88a30c99a7a9449aa84174'; // Plugin's USDC address
const CLOB_CONTRACT = '0x4bFb41d5B3570DeFd03C39a9A4D8dE6Bd8B8982E'; // Plugin's CLOB contract
const provider = new ethers.JsonRpcProvider("https://polygon-rpc.com");
const wallet = new ethers.Wallet(PRIVATE_KEY, provider);

const ERC20_ABI = [
    "function balanceOf(address owner) view returns (uint256)",
    "function allowance(address owner, address spender) view returns (uint256)",
    "function decimals() view returns (uint8)",
    "function symbol() view returns (string)",
    "function name() view returns (string)"
];

async function debugRealIssue() {
    try {
        console.log(`💰 **WALLET**: ${wallet.address}`);
        console.log(`📋 **USDC CONTRACT**: ${USDC_ADDRESS} (from plugin config)`);
        console.log(`🏢 **CLOB CONTRACT**: ${CLOB_CONTRACT} (from plugin config)`);
        console.log();

        // Create contract instance with the exact same config as plugin
        const usdcContract = new ethers.Contract(USDC_ADDRESS, ERC20_ABI, provider);
        
        // Get contract info
        const [balance, allowance, decimals, symbol, name] = await Promise.all([
            usdcContract.balanceOf(wallet.address),
            usdcContract.allowance(wallet.address, CLOB_CONTRACT),
            usdcContract.decimals(),
            usdcContract.symbol(),
            usdcContract.name()
        ]);

        const balanceFormatted = ethers.formatUnits(balance, decimals);
        const allowanceFormatted = ethers.formatUnits(allowance, decimals);

        console.log('✅ **CONTRACT VERIFICATION**:');
        console.log(`   • Name: ${name}`);
        console.log(`   • Symbol: ${symbol}`);
        console.log(`   • Decimals: ${decimals}`);
        console.log();

        console.log('💰 **CURRENT STATE**:');
        console.log(`   • USDC Balance: ${balanceFormatted} ${symbol}`);
        console.log(`   • CLOB Allowance: ${allowanceFormatted} ${symbol}`);
        console.log();

        // Test the exact order from our previous attempt
        const orderValue = 0.5; // $0.50 for 500 shares at $0.001
        const requiredAmount = ethers.parseUnits(orderValue.toString(), decimals);
        const requiredFormatted = ethers.formatUnits(requiredAmount, decimals);

        console.log('📋 **ORDER REQUIREMENTS**:');
        console.log(`   • Order Value: $${orderValue} USDC`);
        console.log(`   • Required Amount: ${requiredFormatted} ${symbol}`);
        console.log();

        // Check if requirements are met
        const hasBalance = balance >= requiredAmount;
        const hasAllowance = allowance >= requiredAmount;

        console.log('🔍 **REQUIREMENT CHECK**:');
        console.log(`   • Has Sufficient Balance: ${hasBalance ? '✅ YES' : '❌ NO'}`);
        console.log(`   • Has Sufficient Allowance: ${hasAllowance ? '✅ YES' : '❌ NO'}`);

        if (hasBalance && hasAllowance) {
            console.log('\n✅ **BALANCE & ALLOWANCE ARE SUFFICIENT!**');
            console.log('The "not enough balance / allowance" error is NOT due to actual insufficient funds.');
            console.log();
            console.log('🔍 **POSSIBLE CAUSES**:');
            console.log('   1. **Order Size Calculation Error**: The plugin might be miscalculating order amounts');
            console.log('   2. **Contract State Issue**: The CLOB contract might have internal restrictions');
            console.log('   3. **API Parameter Error**: Wrong parameters being sent to CLOB API');
            console.log('   4. **Timing Issue**: Balance/allowance checks happening at different times');
            console.log('   5. **Fee Calculation**: Hidden fees not accounted for in balance checks');
            console.log();
            
            // Let's analyze the order parameters from the logs
            console.log('📊 **ORDER PARAMETER ANALYSIS**:');
            console.log('From the previous test logs:');
            console.log('   • makerAmount: 500000');
            console.log('   • takerAmount: 500000000');
            console.log('   • Price: 0.001');
            console.log('   • Size: 500');
            console.log();
            
            // Calculate what these amounts represent
            const makerAmountUSDC = ethers.formatUnits('500000000', 6); // takerAmount
            const shareAmount = ethers.formatUnits('500000', 6); // makerAmount  
            
            console.log('🧮 **AMOUNT BREAKDOWN**:');
            console.log(`   • takerAmount (500000000) = ${makerAmountUSDC} USDC`);
            console.log(`   • makerAmount (500000) = ${shareAmount} (shares?)`);
            console.log();
            
            if (parseFloat(makerAmountUSDC) > parseFloat(balanceFormatted)) {
                console.log('❌ **FOUND THE ISSUE!**');
                console.log(`   The plugin is trying to spend ${makerAmountUSDC} USDC`);
                console.log(`   But you only have ${balanceFormatted} USDC`);
                console.log('   • This suggests a calculation error in the plugin!');
            } else {
                console.log('❓ **STILL INVESTIGATING...**');
                console.log('   The order amounts look reasonable. Need to dig deeper.');
            }
            
        } else {
            console.log('\n❌ **INSUFFICIENT FUNDS CONFIRMED**');
            if (!hasBalance) {
                const shortfall = ethers.formatUnits(requiredAmount - balance, decimals);
                console.log(`   • Balance shortfall: ${shortfall} ${symbol}`);
            }
            if (!hasAllowance) {
                const allowanceNeeded = ethers.formatUnits(requiredAmount - allowance, decimals);
                console.log(`   • Allowance needed: ${allowanceNeeded} ${symbol}`);
            }
        }

        // Check if there might be decimal precision issues
        console.log('\n🔢 **PRECISION CHECK**:');
        console.log(`   • Balance (raw): ${balance.toString()}`);
        console.log(`   • Required (raw): ${requiredAmount.toString()}`);
        console.log(`   • Allowance (raw): ${allowance.toString()}`);

    } catch (error) {
        console.error('❌ **ERROR IN DEBUGGING**:', error);
    }
}

// Run the debug
debugRealIssue()
    .then(() => {
        console.log('\n✅ Debug analysis complete');
        process.exit(0);
    })
    .catch(error => {
        console.error('\n❌ Fatal error:', error);
        process.exit(1);
    }); 