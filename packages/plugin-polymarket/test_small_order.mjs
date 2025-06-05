import { placeOrderAction } from './dist/index.js';
import { ethers } from 'ethers';

console.log('🧪 Testing Small Order to Isolate Issue...');
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

const testOrders = [
    {
        name: "Micro Order",
        text: 'buy 1 shares at $0.001 for 107816283868337218117379783608318587331517916696607930361272175815275915222107',
        expectedValue: 0.001
    },
    {
        name: "Tiny Order", 
        text: 'buy 10 shares at $0.001 for 107816283868337218117379783608318587331517916696607930361272175815275915222107',
        expectedValue: 0.01
    },
    {
        name: "Small Order",
        text: 'buy 100 shares at $0.001 for 107816283868337218117379783608318587331517916696607930361272175815275915222107', 
        expectedValue: 0.1
    }
];

async function testMultipleSizes() {
    console.log(`💰 **WALLET**: 0xD952175d6A20187d7A5803DcC9741472F640A9b8`);
    console.log(`📊 **USDC BALANCE**: 5.940284 USDC`);
    console.log(`🔐 **ALLOWANCE**: Unlimited`);
    console.log();

    for (const testOrder of testOrders) {
        console.log(`🧪 **TESTING ${testOrder.name.toUpperCase()}**`);
        console.log(`   • Order: ${testOrder.text}`);
        console.log(`   • Expected Value: $${testOrder.expectedValue} USDC`);
        console.log(`   • Can Afford: ${testOrder.expectedValue < 5.94 ? '✅ YES' : '❌ NO'}`);
        console.log();

        // Create message for this test
        const mockMessage = {
            content: {
                text: testOrder.text
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
                console.log(`      Order placed successfully for $${testOrder.expectedValue} USDC`);
                if (orderResult.orderResponse && orderResult.orderResponse.orderId) {
                    console.log(`      Order ID: ${orderResult.orderResponse.orderId}`);
                }
                console.log(`      ✅ **BREAKTHROUGH**: Found working order size!`);
                console.log();
                break; // Found a working size, no need to test larger ones
            } else {
                console.log(`   ❌ **FAILED** (${duration}ms)`);
                console.log(`      Error: ${orderResult ? orderResult.error : 'Unknown error'}`);
                
                if (orderResult && orderResult.error && orderResult.error.includes('balance')) {
                    console.log(`      • Still getting balance error even for $${testOrder.expectedValue}`);
                }
            }

        } catch (error) {
            console.log(`   💥 **EXCEPTION**: ${error.message}`);
            
            if (error.message.includes('balance') || error.message.includes('allowance')) {
                console.log(`      • Balance/allowance error for $${testOrder.expectedValue} order`);
            } else if (error.message.includes('minimum')) {
                console.log(`      • Possible minimum order size restriction`);
            } else if (error.message.includes('market')) {
                console.log(`      • Possible market restriction or invalid token`);
            }
        }

        console.log();
    }

    console.log('🎯 **ANALYSIS COMPLETE**');
    console.log();
    console.log('📋 **POSSIBLE NEXT STEPS**:');
    console.log('   1. If ALL orders failed with balance error: Issue is not order size');
    console.log('   2. If smaller orders worked: Issue is with order size limits');
    console.log('   3. If all failed with market error: Issue is with token ID or market');
    console.log('   4. If all failed with different errors: Need to investigate further');
}

// Run the tests
testMultipleSizes()
    .then(() => {
        console.log('\n✅ Multiple order size test complete');
        process.exit(0);
    })
    .catch(error => {
        console.error('\n❌ Fatal error:', error);
        process.exit(1);
    }); 