import { ethers } from 'ethers';

console.log('🔍 Debugging CLOB Amount Calculation...');
console.log('=' .repeat(60));

// Test calculation
const price = 0.001;
const size = 500;
const expectedValue = price * size; // Should be 0.5 USDC

console.log('📊 **ORDER PARAMETERS**:');
console.log(`   • Price: $${price} per share`);
console.log(`   • Size: ${size} shares`);
console.log(`   • Expected Total: $${expectedValue} USDC`);
console.log();

// From the logs, we saw these amounts
const makerAmount = 500000;     // What was sent 
const takerAmount = 500000000;  // What was sent (1000x too much!)

console.log('🔍 **ACTUAL AMOUNTS SENT**:');
console.log(`   • makerAmount: ${makerAmount}`);
console.log(`   • takerAmount: ${takerAmount}`);
console.log();

// Decode what these represent
const makerAmountDecimal = makerAmount / 1000000; // Assuming 6 decimals
const takerAmountDecimal = takerAmount / 1000000; // Assuming 6 decimals

console.log('🧮 **DECODED AMOUNTS (6 decimals)**:');
console.log(`   • makerAmount (${makerAmount}) = ${makerAmountDecimal} (shares?)`);
console.log(`   • takerAmount (${takerAmount}) = ${takerAmountDecimal} USDC`);
console.log();

// What should the amounts be?
// For a BUY order: we're making (giving) USDC, taking (getting) shares
// makerAmount = USDC amount (what we give)
// takerAmount = Share amount (what we get)

const correctMakerAmount = expectedValue * 1000000; // 0.5 * 10^6 = 500,000
const correctTakerAmount = size * 1000000;         // 500 * 10^6 = 500,000,000

console.log('✅ **CORRECT AMOUNTS SHOULD BE**:');
console.log(`   • makerAmount: ${correctMakerAmount} (USDC in micro-units)`);
console.log(`   • takerAmount: ${correctTakerAmount} (shares in micro-units)`);
console.log();

console.log('🎯 **COMPARISON**:');
console.log(`   • makerAmount: ${makerAmount} vs ${correctMakerAmount} ${makerAmount === correctMakerAmount ? '✅' : '❌'}`);
console.log(`   • takerAmount: ${takerAmount} vs ${correctTakerAmount} ${takerAmount === correctTakerAmount ? '✅' : '❌'}`);
console.log();

if (makerAmount === correctMakerAmount && takerAmount === correctTakerAmount) {
    console.log('✅ **AMOUNTS ARE CORRECT!**');
    console.log('The issue might be elsewhere in the order structure.');
} else {
    console.log('❌ **AMOUNTS ARE WRONG!**');
    console.log();
    console.log('🔧 **ANALYSIS**:');
    
    if (makerAmount !== correctMakerAmount) {
        console.log(`   • makerAmount is off by factor: ${makerAmount / correctMakerAmount}`);
    }
    
    if (takerAmount !== correctTakerAmount) {
        console.log(`   • takerAmount is off by factor: ${takerAmount / correctTakerAmount}`);
    }
}

// Actually, let me reconsider the interpretation
console.log();
console.log('🤔 **ALTERNATIVE INTERPRETATION**:');
console.log('What if the amounts are swapped in our understanding?');
console.log();

// For a BUY order on a prediction market:
// - We want to BUY 500 shares at $0.001 each
// - We give 0.5 USDC, we get 500 shares

// But in CLOB terms for a BUY:
// - maker = the person placing the order (us)
// - taker = the person who takes our order
// - If we're buying shares, we're the taker of someone's sell order?

console.log('📋 **REINTERPRETATION**:');
console.log('If we are BUYING shares:');
console.log('   • We give: 0.5 USDC');
console.log('   • We get: 500 shares');
console.log();
console.log('In terms of maker/taker amounts:');
console.log('   • makerAmount: What we put on the order book');
console.log('   • takerAmount: What we want in return');
console.log();

// Let's check both interpretations
console.log('🔄 **INTERPRETATION 1** (shares = maker, USDC = taker):');
console.log(`   • makerAmount should be: ${size * 1000000} (shares)`);
console.log(`   • takerAmount should be: ${expectedValue * 1000000} (USDC)`);
console.log(`   • Actual: maker=${makerAmount}, taker=${takerAmount}`);

const interp1Correct = (makerAmount === size * 1000000) && (takerAmount === expectedValue * 1000000);
console.log(`   • Matches: ${interp1Correct ? '✅' : '❌'}`);
console.log();

console.log('🔄 **INTERPRETATION 2** (USDC = maker, shares = taker):');
console.log(`   • makerAmount should be: ${expectedValue * 1000000} (USDC)`);
console.log(`   • takerAmount should be: ${size * 1000000} (shares)`);
console.log(`   • Actual: maker=${makerAmount}, taker=${takerAmount}`);

const interp2Correct = (makerAmount === expectedValue * 1000000) && (takerAmount === size * 1000000);
console.log(`   • Matches: ${interp2Correct ? '✅' : '❌'}`);
console.log();

if (interp1Correct) {
    console.log('✅ **INTERPRETATION 1 IS CORRECT**');
    console.log('   The CLOB thinks we have enough USDC to take the order');
    console.log('   But the API balance check is failing');
} else if (interp2Correct) {
    console.log('✅ **INTERPRETATION 2 IS CORRECT**');
    console.log('   The amounts are being calculated correctly');
} else {
    console.log('❌ **NEITHER INTERPRETATION MATCHES**');
    console.log('   There\'s a bug in the amount calculation');
}

console.log();
console.log('💡 **CONCLUSION**:');
console.log('The balance error might not be about the total amounts, but about:');
console.log('   1. Wrong decimal precision in the API call');
console.log('   2. The API checking balances differently than our local checks');
console.log('   3. Hidden fees or minimum balance requirements');
console.log('   4. API using different USDC contract than expected'); 