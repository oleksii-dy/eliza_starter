import { placeOrderAction } from './dist/index.js';
import { ethers } from 'ethers';

console.log('🧪 Testing with Known Valid Token ID...');
console.log('=' .repeat(60));

// Set all environment variables
process.env.CLOB_API_URL = "https://clob.polymarket.com";
process.env.CLOB_API_KEY = "c6f85fb9-3b49-9726-9d15-e8584d975625";
process.env.CLOB_API_SECRET = "Yc8q_kEBhkcxncly4y611d-J7ptQbupduZLG_5XCKU0=";
process.env.CLOB_API_PASSPHRASE = "6096fa1e414abad51efdc8663bfd11e616feb09068a9eacbbef6090e211cdf01";
process.env.WALLET_PRIVATE_KEY = "0xcb0b7dd13ac76649ce888771403f3a72f52ff1cd543e20a27afe62e4aa9e0346";

// Mock runtime with all credentials
const mockRuntime = {
    getSetting: (key) => {
        const settings = {
            'CLOB_API_URL': process.env.CLOB_API_URL,
            'CLOB_API_KEY': process.env.CLOB_API_KEY,
            'CLOB_API_SECRET': process.env.CLOB_API_SECRET,
            'CLOB_API_PASSPHRASE': process.env.CLOB_API_PASSPHRASE,
            'WALLET_PRIVATE_KEY': process.env.WALLET_PRIVATE_KEY,
            'PRIVATE_KEY': process.env.WALLET_PRIVATE_KEY,
            'POLYMARKET_PRIVATE_KEY': process.env.WALLET_PRIVATE_KEY
        };
        return settings[key];
    },
    setSetting: (key, value, sensitive) => {
        console.log(`📝 Runtime setting ${key}: ${sensitive ? value.substring(0, 8) + '...' : value}`);
    }
};

// Test with different known token IDs from our data
const testTokens = [
    {
        name: "Trump 2020 Election (YES)",
        tokenId: "44804726753601178293652604511461891232965799888489574021036312274240304608626",
        question: "Will Trump win the 2020 U.S. presidential election?"
    },
    {
        name: "Trump 2020 Election (NO)", 
        tokenId: "94401806442428580808350321395221392306408700984448347080151499651427713760581",
        question: "Will Trump win the 2020 U.S. presidential election?"
    },
    {
        name: "BTC $15k 2020 (YES)",
        tokenId: "81489679527234870363655397325586438057198526422665424757123802116412728199295", 
        question: "Will BTC break $15k before 2021?"
    }
];

async function testKnownTokens() {
    console.log(`💰 **WALLET**: 0xD952175d6A20187d7A5803DcC9741472F640A9b8`);
    console.log(`📊 **USDC BALANCE**: 5.940284 USDC`);
    console.log(`🔐 **ALLOWANCE**: Unlimited`);
    console.log();

    console.log('🔍 **HYPOTHESIS**: The original token ID is invalid/inactive');
    console.log('Testing with known token IDs from 2020 markets...');
    console.log();

    for (const testToken of testTokens) {
        console.log(`🧪 **TESTING ${testToken.name}**`);
        console.log(`   • Token ID: ${testToken.tokenId}`);
        console.log(`   • Question: ${testToken.question}`);
        console.log(`   • Expected: Different error (market closed) or success`);
        console.log();

        // Create message for this test
        const mockMessage = {
            content: {
                text: `buy 1 shares at $0.001 for ${testToken.tokenId}`
            }
        };

        // Mock state and options
        const mockState = {};
        const mockOptions = {};

        // Callback to capture the response
        let orderResult = null;
        const mockCallback = (response) => {
            orderResult = response.data;
        };

        try {
            console.log('   ⚡ Executing order...');
            
            const startTime = Date.now();
            
            await placeOrderAction.handler(
                mockRuntime,
                mockMessage,
                mockState,
                mockOptions,
                mockCallback
            );

            const endTime = Date.now();
            const duration = endTime - startTime;

            if (orderResult && orderResult.success) {
                console.log(`   🎉 **SUCCESS!** (${duration}ms)`);
                console.log(`      Order placed successfully with valid token`);
                console.log(`      ✅ **CONFIRMED**: Issue was invalid token ID!`);
                if (orderResult.orderResponse && orderResult.orderResponse.orderId) {
                    console.log(`      Order ID: ${orderResult.orderResponse.orderId}`);
                }
                console.log();
                break; // Found a working token, problem confirmed
            } else {
                console.log(`   ❌ **FAILED** (${duration}ms)`);
                console.log(`      Error: ${orderResult ? orderResult.error : 'Unknown error'}`);
                
                if (orderResult && orderResult.error) {
                    const error = orderResult.error.toLowerCase();
                    if (error.includes('balance')) {
                        console.log(`      • Same balance error - token ID not the issue`);
                    } else if (error.includes('market') || error.includes('inactive') || error.includes('closed')) {
                        console.log(`      • Market error - token ID works but market closed`);
                    } else if (error.includes('minimum_tick_size') || error.includes('invalid')) {
                        console.log(`      • Different error - token ID might be valid but other issue`);
                    } else {
                        console.log(`      • New error type: ${orderResult.error}`);
                    }
                }
            }

        } catch (error) {
            console.log(`   💥 **EXCEPTION**: ${error.message}`);
            
            const errorMsg = error.message.toLowerCase();
            if (errorMsg.includes('balance') || errorMsg.includes('allowance')) {
                console.log(`      • Still balance/allowance error`);
            } else if (errorMsg.includes('minimum_tick_size')) {
                console.log(`      • Token ID is recognized but market data issue`);
            } else if (errorMsg.includes('market') || errorMsg.includes('inactive')) {
                console.log(`      • Market closed/inactive error - token ID works!`);
            } else if (errorMsg.includes('undefined is not an object')) {
                console.log(`      • Market data unavailable - token ID might be invalid`);
            } else {
                console.log(`      • Different error: ${error.message}`);
            }
        }

        console.log();
    }

    console.log('🎯 **CONCLUSION**:');
    console.log();
    console.log('If we get DIFFERENT errors with these tokens:');
    console.log('   ✅ **CONFIRMED**: Original token ID was invalid');
    console.log();
    console.log('If we get the SAME "balance/allowance" error:');
    console.log('   ❌ **NOT TOKEN ID**: Issue is something else entirely');
    console.log();
    console.log('Expected outcomes:');
    console.log('   • Market closed/inactive: Valid token but old market');
    console.log('   • Minimum tick size error: Valid token with pricing issue');
    console.log('   • Success: Valid token and everything works!');
}

// Run the tests
testKnownTokens()
    .then(() => {
        console.log('\n✅ Known token test complete');
        process.exit(0);
    })
    .catch(error => {
        console.error('\n❌ Fatal error:', error);
        process.exit(1);
    }); 