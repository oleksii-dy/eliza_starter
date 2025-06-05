import { ethers } from 'ethers';

console.log('🔍 Investigating USDC Contract Mismatch...');
console.log('=' .repeat(60));

// Our wallet
const PRIVATE_KEY = "0xcb0b7dd13ac76649ce888771403f3a72f52ff1cd543e20a27afe62e4aa9e0346";
const wallet = new ethers.Wallet(PRIVATE_KEY);

// Different USDC contracts on Polygon
const USDC_CONTRACTS = {
    "Native USDC": "0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359", // Native USDC
    "Bridged USDC": "0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174", // Bridged USDC.e
    "PoS USDC": "0xA0b86a33E6B92C5c9C42c3C4b1B7Fca32F92F50f" // PoS USDC
};

// Different spender addresses that might be used
const SPENDER_ADDRESSES = {
    "CTF Exchange": "0x4bFb41d5B3570DeFd03C39a9A4D8dE6Bd8B8982E", // Known CTF Exchange
    "Polymarket Exchange": "0x4bFb41d5B3570DeFd03C39a9A4D8dE6Bd8B8982E",
    "Legacy Exchange": "0x9A202c932453fB3d04003979B121E80e5A14eE7b",
    "Router Contract": "0x4bFb41d5B3570DeFd03C39a9A4D8dE6Bd8B8982E",
    "Alternative Router": "0x1A5B0AaF478bf1FDA7b934c76E7692D722982a6D"
};

const provider = new ethers.JsonRpcProvider("https://polygon-rpc.com");
const connectedWallet = wallet.connect(provider);

const ERC20_ABI = [
    "function balanceOf(address owner) view returns (uint256)",
    "function allowance(address owner, address spender) view returns (uint256)",
    "function decimals() view returns (uint8)",
    "function symbol() view returns (string)",
    "function name() view returns (string)"
];

async function checkAllUSDCContracts() {
    try {
        console.log(`💰 **WALLET**: ${wallet.address}`);
        console.log();

        for (const [contractName, contractAddress] of Object.entries(USDC_CONTRACTS)) {
            console.log(`📋 **CHECKING ${contractName}** (${contractAddress})`);
            
            try {
                const contract = new ethers.Contract(contractAddress, ERC20_ABI, provider);
                
                // Get basic info
                const [balance, decimals, symbol, name] = await Promise.all([
                    contract.balanceOf(wallet.address),
                    contract.decimals(),
                    contract.symbol(),
                    contract.name()
                ]);

                const formattedBalance = ethers.formatUnits(balance, decimals);
                
                console.log(`   ✅ **Contract Info**:`);
                console.log(`      Name: ${name}`);
                console.log(`      Symbol: ${symbol}`);
                console.log(`      Decimals: ${decimals}`);
                console.log(`      Balance: ${formattedBalance} ${symbol}`);
                
                // Check allowances for different spenders
                console.log(`   🔐 **Allowances**:`);
                for (const [spenderName, spenderAddress] of Object.entries(SPENDER_ADDRESSES)) {
                    try {
                        const allowance = await contract.allowance(wallet.address, spenderAddress);
                        const formattedAllowance = ethers.formatUnits(allowance, decimals);
                        
                        if (parseFloat(formattedAllowance) > 0) {
                            console.log(`      ${spenderName}: ${formattedAllowance} ${symbol} ✅`);
                        } else {
                            console.log(`      ${spenderName}: 0 ${symbol} ❌`);
                        }
                    } catch (error) {
                        console.log(`      ${spenderName}: Error checking allowance`);
                    }
                }
                
            } catch (error) {
                console.log(`   ❌ Error checking contract: ${error.message}`);
            }
            
            console.log();
        }

        // Now let's check what the CLOB API might be using
        console.log('🔍 **ANALYZING CLOB API REQUIREMENTS**');
        console.log();
        
        // From our logs, we can see the order details
        console.log('📋 **ORDER ANALYSIS FROM LOGS**:');
        console.log('   • Order value: $0.50 USDC');
        console.log('   • makerAmount: 500000 (this suggests 6 decimals?)');
        console.log('   • takerAmount: 500000000 (this suggests different scaling)');
        console.log();
        
        // The ratio analysis
        const makerAmount = 500000;
        const takerAmount = 500000000;
        const ratio = takerAmount / makerAmount;
        
        console.log('🧮 **RATIO ANALYSIS**:');
        console.log(`   • Maker Amount: ${makerAmount}`);
        console.log(`   • Taker Amount: ${takerAmount}`);
        console.log(`   • Ratio: ${ratio} (${ratio === 1000 ? 'This suggests 1000:1 ratio!' : 'Unexpected ratio'})`);
        console.log();
        
        if (ratio === 1000) {
            console.log('💡 **HYPOTHESIS**: The CLOB might be using a different price/amount scaling!');
            console.log('   • Your 500 shares at $0.001 each = $0.50 total');
            console.log('   • But the amounts suggest different token scaling');
            console.log('   • makerAmount (500000) might be shares in micro-units');  
            console.log('   • takerAmount (500000000) might be USDC in micro-units');
            console.log();
        }

        // Test with the most likely USDC contract (Native USDC)
        const nativeUSDC = new ethers.Contract(USDC_CONTRACTS["Native USDC"], ERC20_ABI, provider);
        const mainExchangeAllowance = await nativeUSDC.allowance(wallet.address, SPENDER_ADDRESSES["CTF Exchange"]);
        const mainBalance = await nativeUSDC.balanceOf(wallet.address);
        
        console.log('🎯 **MOST LIKELY ISSUE**:');
        console.log(`   • Native USDC Balance: ${ethers.formatUnits(mainBalance, 6)} USDC`);
        console.log(`   • CTF Exchange Allowance: ${ethers.formatUnits(mainExchangeAllowance, 6)} USDC`);
        
        if (parseFloat(ethers.formatUnits(mainBalance, 6)) < 0.5) {
            console.log('   ❌ **INSUFFICIENT NATIVE USDC BALANCE!**');
            console.log('   • You have bridged USDC but need native USDC');
            console.log('   • Solution: Bridge some USDC to native USDC');
        } else if (parseFloat(ethers.formatUnits(mainExchangeAllowance, 6)) < 0.5) {
            console.log('   ❌ **INSUFFICIENT NATIVE USDC ALLOWANCE!**');
            console.log('   • You need to approve the CTF Exchange contract');
            console.log('   • Solution: Approve native USDC for the exchange');
        } else {
            console.log('   ❓ **STILL UNCLEAR** - Both balance and allowance look sufficient');
            console.log('   • This might be a different issue entirely');
        }

    } catch (error) {
        console.error('❌ **ERROR IN ANALYSIS**:', error);
    }
}

// Run the analysis
checkAllUSDCContracts()
    .then(() => {
        console.log('\n✅ USDC contract analysis complete');
        process.exit(0);
    })
    .catch(error => {
        console.error('\n❌ Fatal error:', error);
        process.exit(1);
    }); 