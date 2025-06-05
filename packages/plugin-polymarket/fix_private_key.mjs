import { ethers } from 'ethers';

console.log('🔧 PRIVATE KEY FORMAT FIXER');
console.log('===========================');

// Get the current private key from environment
const rawPrivateKey = process.env.PRIVATE_KEY;

if (!rawPrivateKey) {
    console.log('❌ No PRIVATE_KEY found in environment');
    process.exit(1);
}

console.log(`📋 Raw private key length: ${rawPrivateKey.length} characters`);
console.log(`📋 First 20 chars: ${rawPrivateKey.slice(0, 20)}...`);
console.log(`📋 Last 20 chars: ...${rawPrivateKey.slice(-20)}`);

// Try to clean the private key
let cleanedKey = rawPrivateKey.trim(); // Remove whitespace
console.log(`🧹 After trim: ${cleanedKey.length} characters`);

// Remove quotes if present
if ((cleanedKey.startsWith('"') && cleanedKey.endsWith('"')) || 
    (cleanedKey.startsWith("'") && cleanedKey.endsWith("'"))) {
    cleanedKey = cleanedKey.slice(1, -1);
    console.log(`🧹 After removing quotes: ${cleanedKey.length} characters`);
}

// Check if it has 0x prefix
if (cleanedKey.startsWith('0x')) {
    console.log('✅ Has 0x prefix');
    if (cleanedKey.length === 66) {
        console.log('✅ Correct length with 0x prefix (66 chars)');
    } else {
        console.log(`❌ Wrong length with 0x prefix (${cleanedKey.length} chars, should be 66)`);
    }
} else {
    console.log('❌ No 0x prefix');
    if (cleanedKey.length === 64) {
        console.log('✅ Correct length without 0x prefix (64 chars)');
        cleanedKey = '0x' + cleanedKey;
        console.log('🔧 Added 0x prefix');
    } else {
        console.log(`❌ Wrong length without 0x prefix (${cleanedKey.length} chars, should be 64)`);
    }
}

// Check if it's valid hex
const hexPattern = /^0x[0-9a-fA-F]+$/;
if (hexPattern.test(cleanedKey)) {
    console.log('✅ Valid hex format');
} else {
    console.log('❌ Invalid hex format - contains non-hex characters');
    
    // Show which characters are invalid
    const invalidChars = cleanedKey.split('').filter((char, i) => {
        if (i < 2) return false; // Skip 0x
        return !/[0-9a-fA-F]/.test(char);
    });
    
    if (invalidChars.length > 0) {
        console.log(`❌ Invalid characters found: ${[...new Set(invalidChars)].join(', ')}`);
    }
}

// Try to create a wallet with the cleaned key
console.log('\n🧪 TESTING WALLET CREATION:');
console.log('-'.repeat(40));

try {
    const wallet = new ethers.Wallet(cleanedKey);
    console.log('✅ Wallet created successfully!');
    console.log(`📍 Wallet Address: ${wallet.address}`);
    
    // Test the USDC balance check with the fixed key
    console.log('\n💰 TESTING USDC BALANCE CHECK:');
    console.log('-'.repeat(40));
    
    // Connect to Polygon
    const provider = new ethers.JsonRpcProvider('https://polygon-bor-rpc.publicnode.com');
    
    // USDC contract
    const USDC_ADDRESS = '0x2791bca1f2de4661ed88a30c99a7a9449aa84174';
    const USDC_ABI = [
        'function balanceOf(address owner) view returns (uint256)',
        'function decimals() view returns (uint8)'
    ];
    
    const usdcContract = new ethers.Contract(USDC_ADDRESS, USDC_ABI, provider);
    
    const balance = await usdcContract.balanceOf(wallet.address);
    const decimals = await usdcContract.decimals();
    const balanceFormatted = ethers.formatUnits(balance, decimals);
    
    console.log(`💵 USDC Balance: ${balanceFormatted} USDC`);
    
    // Check MATIC balance
    const maticBalance = await provider.getBalance(wallet.address);
    const maticFormatted = ethers.formatEther(maticBalance);
    console.log(`⛽ MATIC Balance: ${maticFormatted} MATIC`);
    
    // Test order calculation
    const testOrderValue = 0.44;
    const canPlaceOrder = parseFloat(balanceFormatted) >= testOrderValue;
    
    console.log('\n🎯 ORDER TEST:');
    console.log('-'.repeat(20));
    console.log(`📋 Required: ${testOrderValue} USDC`);
    console.log(`💰 Available: ${balanceFormatted} USDC`);
    console.log(`✅ Can Place Order: ${canPlaceOrder ? '✅ YES' : '❌ NO'}`);
    
    if (canPlaceOrder) {
        console.log('\n🎉 SUCCESS! Your wallet has sufficient USDC to place the order!');
        console.log('You can now try the place order command again.');
    } else {
        const shortfall = testOrderValue - parseFloat(balanceFormatted);
        console.log(`\n❌ Still need ${shortfall.toFixed(4)} more USDC to place the order.`);
    }
    
} catch (error) {
    console.log(`❌ Failed to create wallet: ${error.message}`);
    
    console.log('\n🔧 SUGGESTED FIXES:');
    console.log('-'.repeat(30));
    console.log('1. Check your .env file for the correct PRIVATE_KEY format');
    console.log('2. Private key should be exactly 64 hex characters (or 66 with 0x)');
    console.log('3. Remove any extra spaces, quotes, or newlines');
    console.log('4. Example format: PRIVATE_KEY=0x1234567890abcdef...');
    
    if (cleanedKey.length > 66) {
        console.log('\n💡 Your key is too long. It might contain:');
        console.log('   • Extra spaces or newlines');
        console.log('   • Multiple keys concatenated');
        console.log('   • Additional metadata');
        console.log('   • Copy-paste artifacts');
    }
} 