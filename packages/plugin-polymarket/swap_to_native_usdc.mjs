import { ethers } from 'ethers';

console.log('🔄 Swapping Bridged USDC to Native USDC...');
console.log('=' .repeat(60));

// Configuration
const PRIVATE_KEY = "0xcb0b7dd13ac76649ce888771403f3a72f52ff1cd543e20a27afe62e4aa9e0346";
const provider = new ethers.JsonRpcProvider("https://polygon-rpc.com");
const wallet = new ethers.Wallet(PRIVATE_KEY, provider);

// USDC Contracts
const BRIDGED_USDC = "0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174"; // Your current USDC
const NATIVE_USDC = "0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359";   // Target USDC

// QuickSwap Router (popular DEX on Polygon)
const QUICKSWAP_ROUTER = "0xa5E0829CaCEd8fFDD4De3c43696c57F7D7A678ff";

// Uniswap V3 Router (alternative)
const UNISWAP_V3_ROUTER = "0xE592427A0AEce92De3Edee1F18E0157C05861564";

const ERC20_ABI = [
    "function balanceOf(address owner) view returns (uint256)",
    "function allowance(address owner, address spender) view returns (uint256)",
    "function approve(address spender, uint256 amount) returns (bool)",
    "function decimals() view returns (uint8)",
    "function symbol() view returns (string)"
];

// QuickSwap Router ABI (simplified)
const ROUTER_ABI = [
    "function swapExactTokensForTokens(uint amountIn, uint amountOutMin, address[] calldata path, address to, uint deadline) external returns (uint[] memory amounts)",
    "function getAmountsOut(uint amountIn, address[] calldata path) external view returns (uint[] memory amounts)"
];

async function swapBridgedToNativeUSDC() {
    try {
        console.log(`💰 **WALLET**: ${wallet.address}`);
        console.log();

        // Check current balances
        const bridgedUSDC = new ethers.Contract(BRIDGED_USDC, ERC20_ABI, wallet);
        const nativeUSDC = new ethers.Contract(NATIVE_USDC, ERC20_ABI, wallet);
        
        const [bridgedBalance, nativeBalance] = await Promise.all([
            bridgedUSDC.balanceOf(wallet.address),
            nativeUSDC.balanceOf(wallet.address)
        ]);

        const bridgedFormatted = ethers.formatUnits(bridgedBalance, 6);
        const nativeFormatted = ethers.formatUnits(nativeBalance, 6);

        console.log('📊 **CURRENT BALANCES**:');
        console.log(`   • Bridged USDC: ${bridgedFormatted} USDC`);
        console.log(`   • Native USDC: ${nativeFormatted} USDC`);
        console.log();

        if (parseFloat(bridgedFormatted) < 1) {
            console.log('❌ **INSUFFICIENT BRIDGED USDC**');
            console.log('   You need at least some bridged USDC to swap.');
            return;
        }

        // Amount to swap (let's swap $1 worth to be safe)
        const swapAmount = ethers.parseUnits("1.0", 6); // 1 USDC
        const swapAmountFormatted = "1.0";

        console.log(`🔄 **SWAP PLAN**:`);
        console.log(`   • Swap Amount: ${swapAmountFormatted} USDC`);
        console.log(`   • From: Bridged USDC (${BRIDGED_USDC})`);
        console.log(`   • To: Native USDC (${NATIVE_USDC})`);
        console.log(`   • Router: QuickSwap (${QUICKSWAP_ROUTER})`);
        console.log();

        // Check allowance
        const router = new ethers.Contract(QUICKSWAP_ROUTER, ROUTER_ABI, wallet);
        const allowance = await bridgedUSDC.allowance(wallet.address, QUICKSWAP_ROUTER);

        if (allowance < swapAmount) {
            console.log('🔓 **APPROVING ROUTER**...');
            const approveTx = await bridgedUSDC.approve(QUICKSWAP_ROUTER, ethers.parseUnits("10", 6)); // Approve $10 worth
            console.log(`   • Approve TX: ${approveTx.hash}`);
            console.log('   • Waiting for confirmation...');
            await approveTx.wait();
            console.log('   ✅ Approval confirmed');
            console.log();
        } else {
            console.log('✅ **ROUTER APPROVED** (sufficient allowance)');
            console.log();
        }

        // Get expected output
        const path = [BRIDGED_USDC, NATIVE_USDC];
        let expectedOutput;
        
        try {
            const amounts = await router.getAmountsOut(swapAmount, path);
            expectedOutput = ethers.formatUnits(amounts[1], 6);
            console.log(`📈 **SWAP QUOTE**:`);
            console.log(`   • Input: ${swapAmountFormatted} Bridged USDC`);
            console.log(`   • Expected Output: ${expectedOutput} Native USDC`);
            console.log(`   • Rate: ${(parseFloat(expectedOutput) / parseFloat(swapAmountFormatted)).toFixed(6)}`);
        } catch (error) {
            console.log('⚠️ **QUOTE ERROR** - Proceeding with minimal slippage protection');
            expectedOutput = (parseFloat(swapAmountFormatted) * 0.99).toString(); // 1% slippage
        }

        console.log();

        // Calculate minimum output (5% slippage tolerance)
        const minOutput = ethers.parseUnits((parseFloat(expectedOutput) * 0.95).toString(), 6);
        const deadline = Math.floor(Date.now() / 1000) + 60 * 20; // 20 minutes

        console.log('⚡ **EXECUTING SWAP**...');
        console.log(`   • Minimum Output: ${ethers.formatUnits(minOutput, 6)} USDC`);
        console.log(`   • Deadline: ${new Date(deadline * 1000).toLocaleTimeString()}`);
        
        try {
            const swapTx = await router.swapExactTokensForTokens(
                swapAmount,
                minOutput,
                path,
                wallet.address,
                deadline,
                {
                    gasLimit: 200000, // Set reasonable gas limit
                    gasPrice: ethers.parseUnits("30", "gwei") // 30 gwei
                }
            );

            console.log(`   • Swap TX: ${swapTx.hash}`);
            console.log('   • Waiting for confirmation...');
            
            const receipt = await swapTx.wait();
            console.log(`   ✅ **SWAP SUCCESSFUL!** (Block: ${receipt.blockNumber})`);
            console.log();

            // Check new balances
            const [newBridgedBalance, newNativeBalance] = await Promise.all([
                bridgedUSDC.balanceOf(wallet.address),
                nativeUSDC.balanceOf(wallet.address)
            ]);

            const newBridgedFormatted = ethers.formatUnits(newBridgedBalance, 6);
            const newNativeFormatted = ethers.formatUnits(newNativeBalance, 6);

            console.log('📊 **NEW BALANCES**:');
            console.log(`   • Bridged USDC: ${newBridgedFormatted} USDC (was ${bridgedFormatted})`);
            console.log(`   • Native USDC: ${newNativeFormatted} USDC (was ${nativeFormatted})`);
            console.log();

            const nativeReceived = parseFloat(newNativeFormatted) - parseFloat(nativeFormatted);
            console.log(`🎉 **SUCCESS!** Received ${nativeReceived.toFixed(6)} Native USDC`);
            console.log();
            console.log('✅ **YOU CAN NOW PLACE ORDERS ON POLYMARKET!**');
            console.log('   The CLOB API should now accept your orders.');

        } catch (swapError) {
            console.error('❌ **SWAP FAILED**:', swapError.message);
            
            if (swapError.message.includes('insufficient')) {
                console.error('   • Possible issue: Insufficient liquidity or balance');
            } else if (swapError.message.includes('slippage')) {
                console.error('   • Possible issue: Price slippage too high');
            } else if (swapError.message.includes('gas')) {
                console.error('   • Possible issue: Gas estimation failed');
            }
            
            console.log();
            console.log('🔄 **ALTERNATIVE SOLUTION**:');
            console.log('   1. Use a DEX aggregator like 1inch');
            console.log('   2. Use Polygon PoS Bridge to convert USDC');
            console.log('   3. Buy native USDC directly from an exchange');
        }

    } catch (error) {
        console.error('❌ **ERROR IN SWAP PROCESS**:', error);
    }
}

// Run the swap
swapBridgedToNativeUSDC()
    .then(() => {
        console.log('\n✅ Swap process complete');
        process.exit(0);
    })
    .catch(error => {
        console.error('\n❌ Fatal error:', error);
        process.exit(1);
    }); 