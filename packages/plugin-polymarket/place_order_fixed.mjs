import { ethers } from 'ethers';

console.log('🛒 Placing Polymarket Order (Fixed Version)...');
console.log('=' .repeat(60));

// USDC contract details for Polygon
const USDC_ADDRESS = '0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174';
const CLOB_CONTRACT = '0x4bFb41d5B3570DeFd03C39a9A4D8dE6Bd8B8982E';

// Order details
const ORDER_DETAILS = {
    tokenId: '107816283868337218117379783608318587331517916696607930361272175815275915222107',
    side: 'BUY',
    price: 0.05,
    size: 6
};

// Standard ERC-20 ABI
const ERC20_ABI = [
    'function balanceOf(address owner) view returns (uint256)',
    'function allowance(address owner, address spender) view returns (uint256)',
    'function decimals() view returns (uint8)',
    'function symbol() view returns (string)',
    'function approve(address spender, uint256 amount) returns (bool)',
];

function fixFloatingPoint(value, decimals = 6) {
    // Fix floating point precision by rounding to the appropriate decimal places
    const multiplier = Math.pow(10, decimals);
    return Math.round(value * multiplier) / multiplier;
}

function formatUSDCAmount(amount, decimals = 6) {
    // Convert to fixed decimal places to avoid floating point issues
    const fixed = fixFloatingPoint(amount, decimals);
    return ethers.parseUnits(fixed.toFixed(decimals), decimals);
}

async function placeOrderFixed() {
    try {
        console.log('🔑 Setting up wallet and provider...');
        
        // Get wallet private key
        const privateKey = process.env.WALLET_PRIVATE_KEY || 
                          process.env.PRIVATE_KEY || 
                          process.env.POLYMARKET_PRIVATE_KEY ||
                          'cb0b7dd13ac76649ce888771403f3a72f52ff1cd543e20a27afe62e4aa9e0346';
        
        if (!privateKey || privateKey.length < 60) {
            throw new Error('Invalid or missing private key');
        }
        
        // Format private key
        const formattedKey = privateKey.startsWith('0x') ? privateKey : '0x' + privateKey;
        
        // Create wallet and provider
        const wallet = new ethers.Wallet(formattedKey);
        const polygonRpcUrl = process.env.POLYGON_RPC_URL || 'https://polygon-bor-rpc.publicnode.com';
        const provider = new ethers.JsonRpcProvider(polygonRpcUrl);
        const connectedWallet = wallet.connect(provider);
        
        const walletAddress = wallet.address;
        console.log(`📱 Wallet Address: ${walletAddress}`);
        console.log();
        
        // Calculate order value with proper precision
        const rawTotal = ORDER_DETAILS.price * ORDER_DETAILS.size;
        const orderValue = fixFloatingPoint(rawTotal, 6);
        
        console.log('📋 **ORDER DETAILS**');
        console.log(`   Token ID: ${ORDER_DETAILS.tokenId}`);
        console.log(`   Side: ${ORDER_DETAILS.side}`);
        console.log(`   Price: $${ORDER_DETAILS.price.toFixed(4)}`);
        console.log(`   Size: ${ORDER_DETAILS.size} shares`);
        console.log(`   Raw Total: ${rawTotal} (floating point)`);
        console.log(`   Fixed Total: $${orderValue.toFixed(6)} USDC`);
        console.log();
        
        // Check current balances
        console.log('💰 Checking current balances...');
        
        // Get MATIC balance
        const maticBalance = await provider.getBalance(walletAddress);
        const maticFormatted = ethers.formatEther(maticBalance);
        
        // Get USDC contract
        const usdcContract = new ethers.Contract(USDC_ADDRESS, ERC20_ABI, provider);
        
        // Get USDC balance and allowance
        const [usdcBalance, usdcDecimals, usdcSymbol, currentAllowance] = await Promise.all([
            usdcContract.balanceOf(walletAddress),
            usdcContract.decimals(),
            usdcContract.symbol(),
            usdcContract.allowance(walletAddress, CLOB_CONTRACT)
        ]);
        
        const usdcFormatted = ethers.formatUnits(usdcBalance, usdcDecimals);
        const allowanceFormatted = ethers.formatUnits(currentAllowance, usdcDecimals);
        
        console.log(`   MATIC Balance: ${parseFloat(maticFormatted).toFixed(6)} MATIC`);
        console.log(`   USDC Balance: ${parseFloat(usdcFormatted).toFixed(6)} ${usdcSymbol}`);
        console.log(`   USDC Allowance: ${parseFloat(allowanceFormatted).toFixed(6)} ${usdcSymbol}`);
        console.log();
        
        // Check if we have sufficient USDC
        const usdcNum = parseFloat(usdcFormatted);
        if (usdcNum < orderValue) {
            console.log('❌ **Insufficient USDC Balance**');
            console.log(`   Required: $${orderValue.toFixed(6)} USDC`);
            console.log(`   Available: $${usdcNum.toFixed(6)} USDC`);
            console.log(`   Shortfall: $${(orderValue - usdcNum).toFixed(6)} USDC`);
            console.log();
            console.log('💡 **Solutions**:');
            console.log('   • Bridge more USDC from Ethereum');
            console.log('   • Reduce order size or price');
            console.log('   • Use: https://portal.polygon.technology/');
            return;
        }
        
        // Check if we have sufficient allowance
        const requiredAmount = formatUSDCAmount(orderValue, usdcDecimals);
        const needsApproval = currentAllowance < requiredAmount;
        
        if (needsApproval) {
            console.log('🔐 **USDC Approval Required**');
            console.log(`   Current Allowance: $${allowanceFormatted} USDC`);
            console.log(`   Required: $${orderValue.toFixed(6)} USDC`);
            console.log();
            console.log('⚡ Approving unlimited USDC for trading...');
            
            // Connect wallet to contract for approval
            const usdcContractWithSigner = usdcContract.connect(connectedWallet);
            
            // Approve unlimited amount for better UX
            const approveTx = await usdcContractWithSigner.approve(CLOB_CONTRACT, ethers.MaxUint256);
            console.log(`   Transaction Hash: ${approveTx.hash}`);
            
            // Wait for confirmation
            console.log('   ⏳ Waiting for confirmation...');
            const receipt = await approveTx.wait();
            console.log(`   ✅ Approved! Block: ${receipt.blockNumber}`);
            
            // Calculate gas cost
            const gasCostWei = receipt.gasUsed * receipt.gasPrice;
            const gasCostMatic = ethers.formatEther(gasCostWei);
            console.log(`   Gas Cost: ${parseFloat(gasCostMatic).toFixed(6)} MATIC`);
            console.log();
        } else {
            console.log('✅ **USDC Approval**: Sufficient allowance available');
            console.log();
        }
        
        console.log('🚀 **ORDER READY**');
        console.log('   ✅ Sufficient USDC balance');
        console.log('   ✅ USDC approved for trading');
        console.log('   ✅ Proper precision handling');
        console.log();
        
        console.log('📝 **Next Steps**:');
        console.log('   1. The USDC approval is now complete');
        console.log('   2. You can retry the order placement');
        console.log('   3. Future orders will be faster (no approval needed)');
        console.log();
        
        console.log('🎯 **Retry Command**:');
        console.log(`   "Buy ${ORDER_DETAILS.size} shares of ${ORDER_DETAILS.tokenId} at $${ORDER_DETAILS.price}"`);
        
    } catch (error) {
        console.error('❌ Error placing order:', error.message);
        console.error();
        
        if (error.message.includes('insufficient funds')) {
            console.error('💰 **Insufficient Funds**:');
            console.error('   • You need more MATIC for gas fees');
            console.error('   • Current transaction requires gas fees');
        } else if (error.message.includes('user rejected')) {
            console.error('🚫 **Transaction Rejected**:');
            console.error('   • Transaction was cancelled');
        } else if (error.message.includes('nonce')) {
            console.error('🔄 **Nonce Error**:');
            console.error('   • Try again in a moment');
            console.error('   • Network may be congested');
        } else {
            console.error('🔧 **Technical Error**:');
            console.error('   • Check network connection');
            console.error('   • Verify contract addresses');
            console.error('   • Try again in a moment');
        }
        
        console.error();
        console.error('Full error details:', error);
    }
}

// Run the function
placeOrderFixed()
    .then(() => {
        console.log('\n✅ Order placement preparation complete');
        process.exit(0);
    })
    .catch(error => {
        console.error('\n❌ Fatal error:', error);
        process.exit(1);
    }); 