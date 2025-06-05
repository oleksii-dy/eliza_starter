import { ethers } from 'ethers';

console.log('🔍 Debugging Balance/Allowance Issue...');
console.log('=' .repeat(60));

// Order details that failed
const ORDER_DETAILS = {
    tokenId: '107816283868337218117379783608318587331517916696607930361272175815275915222107',
    side: 'BUY',
    price: 0.1,
    size: 5,
    totalValue: 0.5
};

// USDC contract details for Polygon
const USDC_ADDRESS = '0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174';
const CLOB_CONTRACT = '0x4bFb41d5B3570DeFd03C39a9A4D8dE6Bd8B8982E';

// Standard ERC-20 ABI
const ERC20_ABI = [
    'function balanceOf(address owner) view returns (uint256)',
    'function allowance(address owner, address spender) view returns (uint256)',
    'function decimals() view returns (uint8)',
    'function symbol() view returns (string)',
];

async function debugBalanceIssue() {
    try {
        console.log('📋 **FAILED ORDER DETAILS**');
        console.log(`   Token ID: ${ORDER_DETAILS.tokenId}`);
        console.log(`   Side: ${ORDER_DETAILS.side}`);
        console.log(`   Price: $${ORDER_DETAILS.price.toFixed(2)}`);
        console.log(`   Size: ${ORDER_DETAILS.size} shares`);
        console.log(`   Total Required: $${ORDER_DETAILS.totalValue.toFixed(2)} USDC`);
        console.log();

        // Setup wallet and provider
        const privateKey = process.env.WALLET_PRIVATE_KEY || 
                          'cb0b7dd13ac76649ce888771403f3a72f52ff1cd543e20a27afe62e4aa9e0346';
        
        const formattedKey = privateKey.startsWith('0x') ? privateKey : '0x' + privateKey;
        const wallet = new ethers.Wallet(formattedKey);
        const polygonRpcUrl = 'https://polygon-bor-rpc.publicnode.com';
        const provider = new ethers.JsonRpcProvider(polygonRpcUrl);
        
        const walletAddress = wallet.address;
        console.log(`💰 **WALLET ANALYSIS**`);
        console.log(`   Address: ${walletAddress}`);
        console.log();

        // Get USDC contract
        const usdcContract = new ethers.Contract(USDC_ADDRESS, ERC20_ABI, provider);

        // Get current balances
        const [usdcBalance, usdcDecimals, currentAllowance, maticBalance] = await Promise.all([
            usdcContract.balanceOf(walletAddress),
            usdcContract.decimals(),
            usdcContract.allowance(walletAddress, CLOB_CONTRACT),
            provider.getBalance(walletAddress)
        ]);

        const usdcFormatted = parseFloat(ethers.formatUnits(usdcBalance, usdcDecimals));
        const allowanceFormatted = parseFloat(ethers.formatUnits(currentAllowance, usdcDecimals));
        const maticFormatted = parseFloat(ethers.formatEther(maticBalance));

        console.log('📊 **CURRENT BALANCES**');
        console.log(`   USDC Balance: ${usdcFormatted.toFixed(6)} USDC`);
        console.log(`   USDC Allowance: ${allowanceFormatted > 1000000 ? 'Unlimited' : allowanceFormatted.toFixed(6)} USDC`);
        console.log(`   MATIC Balance: ${maticFormatted.toFixed(6)} MATIC`);
        console.log();

        // Check if balances are sufficient
        const hasEnoughUSDC = usdcFormatted >= ORDER_DETAILS.totalValue;
        const hasEnoughAllowance = allowanceFormatted >= ORDER_DETAILS.totalValue || allowanceFormatted > 1000000;
        const hasEnoughMATIC = maticFormatted > 0.01; // Need some MATIC for gas

        console.log('✅ **BALANCE CHECKS**');
        console.log(`   Sufficient USDC: ${hasEnoughUSDC ? '✅ YES' : '❌ NO'} (need $${ORDER_DETAILS.totalValue}, have $${usdcFormatted.toFixed(6)})`);
        console.log(`   Sufficient Allowance: ${hasEnoughAllowance ? '✅ YES' : '❌ NO'} (need $${ORDER_DETAILS.totalValue}, have ${allowanceFormatted > 1000000 ? 'unlimited' : '$' + allowanceFormatted.toFixed(6)})`);
        console.log(`   Sufficient MATIC: ${hasEnoughMATIC ? '✅ YES' : '❌ NO'} (need >0.01, have ${maticFormatted.toFixed(6)})`);
        console.log();

        if (hasEnoughUSDC && hasEnoughAllowance && hasEnoughMATIC) {
            console.log('🤔 **BALANCE ANALYSIS**: All balances look good!');
            console.log();
            console.log('🔍 **POSSIBLE CAUSES OF "not enough balance / allowance"**:');
            console.log();
            console.log('1. **Different USDC Contract**: The Polymarket API might be using a different USDC address');
            console.log('   • Standard USDC: 0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174');
            console.log('   • USDC.e (bridged): 0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174');
            console.log('   • Native USDC: 0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359');
            console.log();
            console.log('2. **Gas Fee Calculation**: The CLOB might require additional USDC for fees');
            console.log('   • Your order: $0.50 USDC');
            console.log('   • Platform fees: ~0.1-1% = $0.0005-0.005 USDC');
            console.log('   • Total might exceed your balance by a small margin');
            console.log();
            console.log('3. **Minimum Order Size**: The market might have minimum order requirements');
            console.log('   • Try a larger order size (10+ shares)');
            console.log('   • Try a different price point');
            console.log();
            console.log('4. **Market Status**: The specific market might be paused or have restrictions');
            console.log('   • Market might be in pre-market or post-market state');
            console.log('   • Token ID might be inactive');
            console.log();
            
            // Check the native USDC balance as well
            console.log('🔍 **CHECKING NATIVE USDC BALANCE**...');
            const NATIVE_USDC_ADDRESS = '0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359';
            
            try {
                const nativeUsdcContract = new ethers.Contract(NATIVE_USDC_ADDRESS, ERC20_ABI, provider);
                const [nativeBalance, nativeAllowance] = await Promise.all([
                    nativeUsdcContract.balanceOf(walletAddress),
                    nativeUsdcContract.allowance(walletAddress, CLOB_CONTRACT)
                ]);
                
                const nativeUsdcFormatted = parseFloat(ethers.formatUnits(nativeBalance, 6));
                const nativeAllowanceFormatted = parseFloat(ethers.formatUnits(nativeAllowance, 6));
                
                console.log(`   Native USDC Balance: ${nativeUsdcFormatted.toFixed(6)} USDC`);
                console.log(`   Native USDC Allowance: ${nativeAllowanceFormatted > 1000000 ? 'Unlimited' : nativeAllowanceFormatted.toFixed(6)} USDC`);
                
                if (nativeUsdcFormatted > 0) {
                    console.log();
                    console.log('💡 **POTENTIAL SOLUTION**: You have Native USDC! Polymarket might prefer Native USDC.');
                    console.log('   • Try approving Native USDC for trading');
                    console.log('   • Or convert your bridged USDC to Native USDC');
                }
            } catch (nativeError) {
                console.log(`   Native USDC check failed: ${nativeError.message}`);
            }
            
        } else {
            console.log('❌ **BALANCE ANALYSIS**: Insufficient balances detected');
            
            if (!hasEnoughUSDC) {
                const shortage = ORDER_DETAILS.totalValue - usdcFormatted;
                console.log(`   💰 Need $${shortage.toFixed(6)} more USDC`);
            }
            
            if (!hasEnoughAllowance) {
                console.log(`   🔐 Need to approve more USDC allowance`);
            }
            
            if (!hasEnoughMATIC) {
                console.log(`   ⛽ Need more MATIC for gas fees`);
            }
        }

        console.log();
        console.log('🎯 **RECOMMENDED ACTIONS**:');
        console.log();
        console.log('1. **Try a smaller order first**: "Buy 1 share at $0.10" (only $0.10)');
        console.log('2. **Check market status**: Verify the token ID is active');
        console.log('3. **Try different combinations**: "Buy 2 shares at $0.20" or "Buy 3 shares at $0.15"');
        console.log('4. **Add more USDC**: Bridge additional USDC to ensure buffer for fees');
        console.log('5. **Use Polymarket website**: Verify the order works there first');

    } catch (error) {
        console.error('❌ Debug error:', error.message);
        console.error('Full error:', error);
    }
}

// Run the debug function
debugBalanceIssue()
    .then(() => {
        console.log('\n✅ Debug analysis complete');
        process.exit(0);
    })
    .catch(error => {
        console.error('\n❌ Fatal error:', error);
        process.exit(1);
    }); 