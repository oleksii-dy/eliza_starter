import { ethers } from 'ethers';

console.log('🔬 Comprehensive Polymarket Diagnosis...');
console.log('=' .repeat(60));

// Test order details
const TEST_ORDER = {
    tokenId: '107816283868337218117379783608318587331517916696607930361272175815275915222107',
    price: 0.001,
    size: 500,
    totalValue: 0.5
};

// Contract addresses
const CONTRACTS = {
    USDC_BRIDGED: '0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174',
    USDC_NATIVE: '0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359',
    CLOB: '0x4bFb41d5B3570DeFd03C39a9A4D8dE6Bd8B8982E'
};

const ERC20_ABI = [
    'function balanceOf(address owner) view returns (uint256)',
    'function allowance(address owner, address spender) view returns (uint256)',
    'function decimals() view returns (uint8)',
    'function symbol() view returns (string)',
    'function name() view returns (string)',
];

async function comprehensiveDiagnosis() {
    try {
        console.log('📋 **TEST ORDER DETAILS**');
        console.log(`   Token ID: ${TEST_ORDER.tokenId}`);
        console.log(`   Price: $${TEST_ORDER.price.toFixed(3)}`);
        console.log(`   Size: ${TEST_ORDER.size} shares`);
        console.log(`   Total Value: $${TEST_ORDER.totalValue.toFixed(3)} USDC`);
        console.log();

        // Setup wallet
        const privateKey = process.env.WALLET_PRIVATE_KEY || 
                          'cb0b7dd13ac76649ce888771403f3a72f52ff1cd543e20a27afe62e4aa9e0346';
        
        const formattedKey = privateKey.startsWith('0x') ? privateKey : '0x' + privateKey;
        const wallet = new ethers.Wallet(formattedKey);
        const polygonRpcUrl = 'https://polygon-bor-rpc.publicnode.com';
        const provider = new ethers.JsonRpcProvider(polygonRpcUrl);
        
        const walletAddress = wallet.address;
        console.log(`💰 **WALLET INFORMATION**`);
        console.log(`   Address: ${walletAddress}`);
        console.log(`   Private Key: ${privateKey.substring(0, 10)}...${privateKey.substring(privateKey.length - 4)}`);
        console.log();

        // Check MATIC balance
        const maticBalance = await provider.getBalance(walletAddress);
        const maticFormatted = parseFloat(ethers.formatEther(maticBalance));
        console.log(`   MATIC Balance: ${maticFormatted.toFixed(6)} MATIC`);

        // Check both USDC contracts
        console.log('🏦 **USDC CONTRACT ANALYSIS**');
        
        // Bridged USDC
        const bridgedUsdcContract = new ethers.Contract(CONTRACTS.USDC_BRIDGED, ERC20_ABI, provider);
        const [bridgedBalance, bridgedAllowance, bridgedDecimals, bridgedSymbol, bridgedName] = await Promise.all([
            bridgedUsdcContract.balanceOf(walletAddress),
            bridgedUsdcContract.allowance(walletAddress, CONTRACTS.CLOB),
            bridgedUsdcContract.decimals(),
            bridgedUsdcContract.symbol(),
            bridgedUsdcContract.name()
        ]);

        const bridgedBalanceFormatted = parseFloat(ethers.formatUnits(bridgedBalance, bridgedDecimals));
        const bridgedAllowanceFormatted = parseFloat(ethers.formatUnits(bridgedAllowance, bridgedDecimals));

        console.log('   📊 **Bridged USDC (USD Coin - PoS)**');
        console.log(`      Address: ${CONTRACTS.USDC_BRIDGED}`);
        console.log(`      Name: ${bridgedName}`);
        console.log(`      Symbol: ${bridgedSymbol}`);
        console.log(`      Balance: ${bridgedBalanceFormatted.toFixed(6)} USDC`);
        console.log(`      Allowance: ${bridgedAllowanceFormatted > 1000000 ? 'Unlimited' : bridgedAllowanceFormatted.toFixed(6)} USDC`);
        console.log();

        // Native USDC
        const nativeUsdcContract = new ethers.Contract(CONTRACTS.USDC_NATIVE, ERC20_ABI, provider);
        const [nativeBalance, nativeAllowance, nativeDecimals, nativeSymbol, nativeName] = await Promise.all([
            nativeUsdcContract.balanceOf(walletAddress),
            nativeUsdcContract.allowance(walletAddress, CONTRACTS.CLOB),
            nativeUsdcContract.decimals(),
            nativeUsdcContract.symbol(),
            nativeUsdcContract.name()
        ]);

        const nativeBalanceFormatted = parseFloat(ethers.formatUnits(nativeBalance, nativeDecimals));
        const nativeAllowanceFormatted = parseFloat(ethers.formatUnits(nativeAllowance, nativeDecimals));

        console.log('   🆕 **Native USDC**');
        console.log(`      Address: ${CONTRACTS.USDC_NATIVE}`);
        console.log(`      Name: ${nativeName}`);
        console.log(`      Symbol: ${nativeSymbol}`);
        console.log(`      Balance: ${nativeBalanceFormatted.toFixed(6)} USDC`);
        console.log(`      Allowance: ${nativeAllowanceFormatted > 1000000 ? 'Unlimited' : nativeAllowanceFormatted.toFixed(6)} USDC`);
        console.log();

        // Determine which USDC to use
        const usingBridged = bridgedBalanceFormatted > 0;
        const usingNative = nativeBalanceFormatted > 0;
        
        console.log('🔍 **USDC ANALYSIS**');
        console.log(`   Bridged USDC Available: ${usingBridged ? '✅ YES' : '❌ NO'} (${bridgedBalanceFormatted.toFixed(6)})`);
        console.log(`   Native USDC Available: ${usingNative ? '✅ YES' : '❌ NO'} (${nativeBalanceFormatted.toFixed(6)})`);
        
        if (!usingBridged && !usingNative) {
            console.log('   ❌ **CRITICAL**: No USDC found in either contract!');
            console.log('   💡 You need to bridge USDC to Polygon first');
            return;
        }

        const primaryUSDC = usingBridged ? 'bridged' : 'native';
        const primaryBalance = usingBridged ? bridgedBalanceFormatted : nativeBalanceFormatted;
        const primaryAllowance = usingBridged ? bridgedAllowanceFormatted : nativeAllowanceFormatted;
        
        console.log(`   🎯 **Primary USDC**: ${primaryUSDC} (${primaryBalance.toFixed(6)} USDC)`);
        console.log();

        // Check if we have enough for the order
        const hasEnoughUSDC = primaryBalance >= TEST_ORDER.totalValue;
        const hasEnoughAllowance = primaryAllowance >= TEST_ORDER.totalValue || primaryAllowance > 1000000;
        
        console.log('✅ **ORDER FEASIBILITY CHECK**');
        console.log(`   Required: $${TEST_ORDER.totalValue.toFixed(3)} USDC`);
        console.log(`   Available: $${primaryBalance.toFixed(6)} USDC`);
        console.log(`   Sufficient Funds: ${hasEnoughUSDC ? '✅ YES' : '❌ NO'}`);
        console.log(`   Sufficient Allowance: ${hasEnoughAllowance ? '✅ YES' : '❌ NO'}`);
        console.log(`   Sufficient MATIC: ${maticFormatted > 0.01 ? '✅ YES' : '❌ NO'}`);
        console.log();

        if (!hasEnoughUSDC) {
            console.log('❌ **INSUFFICIENT FUNDS**');
            console.log(`   Shortfall: $${(TEST_ORDER.totalValue - primaryBalance).toFixed(6)} USDC`);
            return;
        }

        // Test Polymarket API endpoints
        console.log('🌐 **POLYMARKET API TESTS**');
        
        // Test orderbook
        try {
            const orderbookUrl = `https://clob.polymarket.com/book?token_id=${TEST_ORDER.tokenId}`;
            const orderbookResponse = await fetch(orderbookUrl);
            
            if (orderbookResponse.ok) {
                const orderbookData = await orderbookResponse.json();
                console.log('   ✅ Orderbook API: Working');
                console.log(`      Bids: ${orderbookData.bids?.length || 0}`);
                console.log(`      Asks: ${orderbookData.asks?.length || 0}`);
                
                if (orderbookData.bids && orderbookData.bids.length > 0) {
                    const bestBid = orderbookData.bids[0];
                    console.log(`      Best Bid: $${bestBid.price} for ${bestBid.size} shares`);
                }
            } else {
                console.log('   ❌ Orderbook API: Failed');
            }
        } catch (error) {
            console.log(`   ❌ Orderbook API: Error - ${error.message}`);
        }

        // Test market data
        try {
            const marketUrl = `https://clob.polymarket.com/markets/${TEST_ORDER.tokenId}`;
            const marketResponse = await fetch(marketUrl);
            
            if (marketResponse.ok) {
                console.log('   ✅ Market API: Working');
            } else {
                console.log(`   ❌ Market API: ${marketResponse.status} ${marketResponse.statusText}`);
            }
        } catch (error) {
            console.log(`   ❌ Market API: Error - ${error.message}`);
        }

        console.log();

        // Environment check
        console.log('⚙️ **ENVIRONMENT CONFIGURATION**');
        const envVars = [
            'CLOB_API_URL',
            'CLOB_API_KEY', 
            'CLOB_API_SECRET',
            'CLOB_API_PASSPHRASE',
            'WALLET_PRIVATE_KEY',
            'PRIVATE_KEY',
            'POLYMARKET_PRIVATE_KEY'
        ];

        for (const envVar of envVars) {
            const value = process.env[envVar];
            if (value) {
                const displayValue = envVar.includes('KEY') || envVar.includes('SECRET') || envVar.includes('PASSPHRASE') 
                    ? value.substring(0, 8) + '...' + value.substring(value.length - 4)
                    : value;
                console.log(`   ✅ ${envVar}: ${displayValue}`);
            } else {
                console.log(`   ❌ ${envVar}: Not set`);
            }
        }

        console.log();
        console.log('🔧 **DIAGNOSIS SUMMARY**');
        console.log();

        if (hasEnoughUSDC && hasEnoughAllowance && maticFormatted > 0.01) {
            console.log('✅ **All balances and allowances are sufficient**');
            console.log();
            console.log('🤔 **Possible causes of "not enough balance/allowance" error:**');
            console.log();
            console.log('1. **API Authentication Issue**');
            console.log('   • CLOB API credentials might be missing or invalid');
            console.log('   • Check CLOB_API_KEY, CLOB_API_SECRET, CLOB_API_PASSPHRASE');
            console.log();
            console.log('2. **Wrong USDC Contract**');
            console.log(`   • Plugin might be checking ${primaryUSDC === 'bridged' ? 'Native' : 'Bridged'} USDC instead`);
            console.log('   • Try converting between USDC types');
            console.log();
            console.log('3. **Order Size/Price Validation**');
            console.log('   • Minimum order size requirements');
            console.log('   • Price tick size restrictions');
            console.log('   • Market-specific rules');
            console.log();
            console.log('4. **Network/Timing Issues**');
            console.log('   • Temporary API issues');
            console.log('   • Network connectivity problems');
            console.log('   • Try again in a few minutes');
            console.log();
            console.log('🚀 **RECOMMENDED NEXT STEPS**:');
            console.log('1. Try an even smaller order: "Buy 1 share at $0.001"');
            console.log('2. Test on polymarket.com website first');
            console.log('3. Check if you have API credentials set up');
            console.log('4. Try a different market with higher liquidity');
        } else {
            console.log('❌ **Balance/Allowance issues detected**');
            if (!hasEnoughUSDC) console.log('   • Insufficient USDC balance');
            if (!hasEnoughAllowance) console.log('   • Insufficient USDC allowance');
            if (maticFormatted <= 0.01) console.log('   • Insufficient MATIC for gas');
        }

    } catch (error) {
        console.error('❌ Diagnosis error:', error.message);
        console.error('Full error:', error);
    }
}

// Run the diagnosis
comprehensiveDiagnosis()
    .then(() => {
        console.log('\n✅ Comprehensive diagnosis complete');
        process.exit(0);
    })
    .catch(error => {
        console.error('\n❌ Fatal error:', error);
        process.exit(1);
    }); 