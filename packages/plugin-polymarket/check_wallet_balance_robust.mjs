import { ethers } from 'ethers';

console.log('💰 Checking Your Wallet Balance...');
console.log('=' .repeat(50));

// USDC contract details for Polygon
const USDC_ADDRESS = '0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174'; // USDC on Polygon
const CLOB_CONTRACT = '0x4bFb41d5B3570DeFd03C39a9A4D8dE6Bd8B8982E'; // Polymarket CLOB contract

// Standard ERC-20 ABI (minimal required functions)
const ERC20_ABI = [
  'function balanceOf(address owner) view returns (uint256)',
  'function allowance(address owner, address spender) view returns (uint256)',
  'function decimals() view returns (uint8)',
  'function symbol() view returns (string)',
  'function name() view returns (string)',
];

function formatPrivateKey(key) {
    if (!key) return null;
    
    // Remove any whitespace
    key = key.trim();
    
    // If it doesn't start with 0x, add it
    if (!key.startsWith('0x')) {
        key = '0x' + key;
    }
    
    // Check if it's the right length (66 characters including 0x)
    if (key.length !== 66) {
        throw new Error(`Private key should be 64 hex characters (found ${key.length - 2})`);
    }
    
    // Validate hex characters
    if (!/^0x[0-9a-fA-F]{64}$/.test(key)) {
        throw new Error('Private key contains invalid characters. Should only contain hex characters (0-9, a-f, A-F)');
    }
    
    return key;
}

async function checkWalletBalance() {
    try {
        console.log('🔑 Getting wallet information...');
        
        // Check for environment variables
        console.log('📋 Checking environment variables...');
        const envVars = {
            'WALLET_PRIVATE_KEY': process.env.WALLET_PRIVATE_KEY,
            'PRIVATE_KEY': process.env.PRIVATE_KEY,
            'POLYMARKET_PRIVATE_KEY': process.env.POLYMARKET_PRIVATE_KEY,
            'POLYGON_RPC_URL': process.env.POLYGON_RPC_URL
        };
        
        for (const [name, value] of Object.entries(envVars)) {
            if (value) {
                console.log(`   ✅ ${name}: Set (${name.includes('KEY') ? 'length=' + value.length : value})`);
            } else {
                console.log(`   ❌ ${name}: Not set`);
            }
        }
        console.log();
        
        // Get wallet private key from environment
        let privateKey = process.env.WALLET_PRIVATE_KEY || 
                        process.env.PRIVATE_KEY || 
                        process.env.POLYMARKET_PRIVATE_KEY;
                        
        if (!privateKey) {
            throw new Error('No private key found in environment variables. Please set one of: WALLET_PRIVATE_KEY, PRIVATE_KEY, or POLYMARKET_PRIVATE_KEY');
        }
        
        console.log('🔧 Formatting private key...');
        try {
            privateKey = formatPrivateKey(privateKey);
            console.log('   ✅ Private key format validated');
        } catch (error) {
            throw new Error(`Private key format error: ${error.message}`);
        }
        
        // Create wallet and provider for Polygon
        console.log('🔗 Creating wallet and provider...');
        const wallet = new ethers.Wallet(privateKey);
        const polygonRpcUrl = process.env.POLYGON_RPC_URL || 'https://polygon-bor-rpc.publicnode.com';
        const provider = new ethers.JsonRpcProvider(polygonRpcUrl);
        
        const walletAddress = wallet.address;
        console.log(`📱 Wallet Address: ${walletAddress}`);
        console.log(`🌐 RPC URL: ${polygonRpcUrl}`);
        console.log();
        
        console.log('⏳ Fetching balances...');
        
        // Test RPC connection first
        try {
            const blockNumber = await provider.getBlockNumber();
            console.log(`   ✅ Connected to Polygon (Block: ${blockNumber})`);
        } catch (rpcError) {
            throw new Error(`Failed to connect to Polygon RPC: ${rpcError.message}`);
        }
        
        // Get MATIC balance (native token)
        const maticBalance = await provider.getBalance(walletAddress);
        const maticFormatted = ethers.formatEther(maticBalance);
        
        // Get USDC contract instance
        const usdcContract = new ethers.Contract(USDC_ADDRESS, ERC20_ABI, provider);
        
        // Get USDC details and balance
        let usdcBalance, usdcDecimals, usdcSymbol, usdcName, usdcAllowance;
        try {
            [usdcBalance, usdcDecimals, usdcSymbol, usdcName, usdcAllowance] = await Promise.all([
                usdcContract.balanceOf(walletAddress),
                usdcContract.decimals(),
                usdcContract.symbol(),
                usdcContract.name(),
                usdcContract.allowance(walletAddress, CLOB_CONTRACT)
            ]);
        } catch (contractError) {
            console.log(`   ⚠️ USDC contract error: ${contractError.message}`);
            // Set default values if contract calls fail
            usdcBalance = 0n;
            usdcDecimals = 6;
            usdcSymbol = 'USDC';
            usdcName = 'USD Coin';
            usdcAllowance = 0n;
        }
        
        const usdcFormatted = ethers.formatUnits(usdcBalance, usdcDecimals);
        const allowanceFormatted = ethers.formatUnits(usdcAllowance, usdcDecimals);
        
        console.log();
        console.log('💰 **WALLET BALANCE SUMMARY**');
        console.log('=' .repeat(50));
        console.log();
        
        // MATIC Balance
        console.log('🟣 **MATIC (Polygon Network)**');
        console.log(`   Balance: ${parseFloat(maticFormatted).toFixed(6)} MATIC`);
        console.log(`   USD Value: ~$${(parseFloat(maticFormatted) * 0.90).toFixed(2)} (est.)`); // Rough MATIC price estimate
        console.log(`   Purpose: Gas fees for transactions`);
        console.log();
        
        // USDC Balance
        console.log('💵 **USDC (Trading Currency)**');
        console.log(`   Balance: ${parseFloat(usdcFormatted).toFixed(2)} ${usdcSymbol}`);
        console.log(`   Contract: ${USDC_ADDRESS}`);
        console.log(`   Purpose: Primary trading currency for Polymarket`);
        console.log();
        
        // USDC Allowance for Polymarket
        console.log('🔐 **Polymarket Trading Allowance**');
        console.log(`   Current Allowance: ${parseFloat(allowanceFormatted).toFixed(2)} ${usdcSymbol}`);
        console.log(`   CLOB Contract: ${CLOB_CONTRACT}`);
        
        const isUnlimitedAllowance = usdcAllowance >= ethers.parseUnits('1000000000', usdcDecimals);
        if (isUnlimitedAllowance) {
            console.log(`   Status: ✅ Unlimited allowance (optimal for trading)`);
        } else if (parseFloat(allowanceFormatted) > 0) {
            console.log(`   Status: ⚠️ Limited allowance`);
        } else {
            console.log(`   Status: ❌ No allowance (approval needed before trading)`);
        }
        console.log();
        
        // Analysis and Recommendations
        console.log('📊 **ANALYSIS & RECOMMENDATIONS**');
        console.log('-'.repeat(40));
        
        // MATIC Analysis
        const maticNum = parseFloat(maticFormatted);
        if (maticNum < 0.01) {
            console.log('❌ **Low MATIC**: Your MATIC balance is very low');
            console.log('   • You may not be able to perform transactions');
            console.log('   • Recommended: Bridge some MATIC from Ethereum');
            console.log('   • Minimum recommended: 0.1 MATIC');
        } else if (maticNum < 0.1) {
            console.log('⚠️ **MATIC Warning**: Your MATIC balance is low');
            console.log('   • You can perform a few transactions');
            console.log('   • Consider adding more MATIC for frequent trading');
        } else {
            console.log('✅ **MATIC**: Sufficient for gas fees');
        }
        console.log();
        
        // USDC Analysis
        const usdcNum = parseFloat(usdcFormatted);
        if (usdcNum === 0) {
            console.log('❌ **No USDC**: You have no USDC for trading');
            console.log('   • Bridge USDC from Ethereum to Polygon');
            console.log('   • Use: https://portal.polygon.technology/');
            console.log('   • Recommended minimum: $10 USDC');
        } else if (usdcNum < 1) {
            console.log('⚠️ **Low USDC**: Your USDC balance is very low');
            console.log('   • Limited trading opportunities');
            console.log('   • Consider adding more USDC');
        } else if (usdcNum < 10) {
            console.log('⚠️ **Modest USDC**: Good for small trades');
            console.log('   • You can participate in prediction markets');
            console.log('   • Consider your risk tolerance');
        } else {
            console.log('✅ **USDC**: Good balance for trading');
        }
        console.log();
        
        // Allowance Analysis
        if (!isUnlimitedAllowance && parseFloat(allowanceFormatted) === 0) {
            console.log('📝 **Next Steps for Trading**:');
            console.log('1. Before placing buy orders, USDC approval will be automatically handled');
            console.log('2. First order may take slightly longer due to approval transaction');
            console.log('3. Subsequent orders will be faster with unlimited allowance');
        } else if (!isUnlimitedAllowance) {
            console.log('📝 **Allowance Notice**:');
            console.log(`• You have ${allowanceFormatted} USDC approved for trading`);
            console.log('• May need re-approval for larger orders');
        } else {
            console.log('✅ **Ready to Trade**: Your wallet is fully configured');
        }
        console.log();
        
        // Additional Information
        console.log('ℹ️ **Additional Information**:');
        console.log(`• Network: Polygon (Chain ID: 137)`);
        console.log(`• RPC URL: ${polygonRpcUrl}`);
        console.log(`• USDC Contract: ${USDC_ADDRESS}`);
        console.log(`• Block Explorer: https://polygonscan.com/address/${walletAddress}`);
        console.log();
        
        console.log('💡 **How to Add Funds**:');
        console.log('• USDC: Bridge from Ethereum using Polygon Portal');
        console.log('• MATIC: Bridge from Ethereum or buy directly on exchanges');
        console.log('• Bridge URL: https://portal.polygon.technology/');
        
    } catch (error) {
        console.error('❌ Error checking wallet balance:', error.message);
        console.error();
        
        if (error.message.includes('private key') || error.message.includes('Private key')) {
            console.error('🔐 **Private Key Issue**:');
            console.error('Make sure one of these environment variables is set with a valid private key:');
            console.error('• WALLET_PRIVATE_KEY');
            console.error('• PRIVATE_KEY');
            console.error('• POLYMARKET_PRIVATE_KEY');
            console.error();
            console.error('Private key format requirements:');
            console.error('• Should be 64 hex characters (0-9, a-f, A-F)');
            console.error('• Can start with or without "0x"');
            console.error('• Example: 0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef');
        } else if (error.message.includes('network') || error.message.includes('connection') || error.message.includes('RPC')) {
            console.error('🌐 **Network Issue**:');
            console.error('• Check your internet connection');
            console.error('• The Polygon RPC might be temporarily unavailable');
            console.error('• Try again in a few moments');
            console.error('• You can set POLYGON_RPC_URL to use a different RPC endpoint');
        } else {
            console.error('🔧 **Technical Error**:');
            console.error('Please check:');
            console.error('• Network connection');
            console.error('• RPC URL configuration');
            console.error('• Contract addresses');
        }
        
        console.error();
        console.error('Full error details:', error);
    }
}

// Run the function
checkWalletBalance()
    .then(() => {
        console.log('\n✅ Wallet balance check complete');
        process.exit(0);
    })
    .catch(error => {
        console.error('\n❌ Fatal error:', error);
        process.exit(1);
    }); 