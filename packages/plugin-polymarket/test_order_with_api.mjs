import { placeOrderAction } from './dist/index.js';
import { ethers } from 'ethers';

console.log('🚀 Testing Order Placement with API Credentials...');
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

// Test order message
const mockMessage = {
    content: {
        text: 'buy 500 shares at $0.001 for 107816283868337218117379783608318587331517916696607930361272175815275915222107'
    }
};

// Mock state and options
const mockState = {};
const mockOptions = {};

// Callback to capture the response
let orderResult = null;
const mockCallback = (response) => {
    console.log('\n📋 **ORDER PLACEMENT RESPONSE**');
    console.log(response.text);
    console.log();
    
    if (response.data) {
        orderResult = response.data;
        console.log('📊 **ORDER DATA**');
        console.log(JSON.stringify(orderResult, null, 2));
    }
};

async function testOrderWithApi() {
    try {
        console.log('🔧 **CONFIGURATION CHECK**');
        
        // Verify all credentials are set
        const requiredEnvVars = [
            'CLOB_API_URL',
            'CLOB_API_KEY', 
            'CLOB_API_SECRET',
            'CLOB_API_PASSPHRASE',
            'WALLET_PRIVATE_KEY'
        ];

        for (const envVar of requiredEnvVars) {
            const value = mockRuntime.getSetting(envVar);
            if (value) {
                const displayValue = envVar.includes('KEY') || envVar.includes('SECRET') || envVar.includes('PASSPHRASE')
                    ? value.substring(0, 12) + '...'
                    : value;
                console.log(`   ✅ ${envVar}: ${displayValue}`);
            } else {
                console.log(`   ❌ ${envVar}: Not set`);
                throw new Error(`Missing required environment variable: ${envVar}`);
            }
        }

        console.log();
        
        // Get wallet info
        const privateKey = mockRuntime.getSetting('WALLET_PRIVATE_KEY');
        const wallet = new ethers.Wallet(privateKey);
        
        console.log('💰 **WALLET INFORMATION**');
        console.log(`   Address: ${wallet.address}`);
        console.log(`   Private Key: ${privateKey.substring(0, 10)}...${privateKey.substring(privateKey.length - 4)}`);
        console.log();

        // Test order details
        console.log('📋 **ORDER DETAILS**');
        console.log('   Token ID: 107816283868337218117379783608318587331517916696607930361272175815275915222107');
        console.log('   Side: BUY');
        console.log('   Price: $0.001');
        console.log('   Size: 500 shares');
        console.log('   Total Value: $0.50 USDC');
        console.log();

        // Validate the action
        console.log('🔍 **VALIDATING ORDER ACTION**');
        const isValid = await placeOrderAction.validate(mockRuntime, mockMessage);
        
        if (!isValid) {
            console.log('❌ **VALIDATION FAILED**');
            console.log('The placeOrderAction validation failed.');
            return;
        }
        
        console.log('✅ **VALIDATION PASSED**');
        console.log();

        // Execute the order
        console.log('⚡ **EXECUTING ORDER PLACEMENT**');
        console.log('Now attempting to place the order with full API authentication...');
        console.log();

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

        console.log(`\n⏱️ **ORDER EXECUTION TIME**: ${duration}ms`);

        if (orderResult) {
            if (orderResult.success) {
                console.log('🎉 **ORDER PLACEMENT SUCCESSFUL!**');
                console.log();
                console.log('✅ **FINAL STATUS**:');
                console.log('   • API credentials: Working perfectly');
                console.log('   • Wallet balance: Sufficient');
                console.log('   • Order placement: Successful');
                console.log('   • Authentication: Passed');
                console.log();
                console.log('🎯 **YOU CAN NOW TRADE ON POLYMARKET!**');
                console.log('Your setup is complete and orders are working!');
                
                if (orderResult.orderResponse && orderResult.orderResponse.orderId) {
                    console.log(`   Order ID: ${orderResult.orderResponse.orderId}`);
                }
            } else {
                console.log('⚠️ **ORDER PLACEMENT FAILED**');
                console.log('Even with proper API credentials, the order failed.');
                console.log('This might be due to market-specific restrictions or other factors.');
                console.log();
                console.log('**Error details:**');
                console.log(`   Error: ${orderResult.error || 'Unknown error'}`);
            }
        } else {
            console.log('❓ **UNKNOWN RESULT**');
            console.log('Order action completed but no clear result was captured.');
        }

    } catch (error) {
        console.error('\n❌ **ERROR TESTING ORDER**');
        console.error(`Error: ${error.message}`);
        console.error();
        
        // Error analysis
        if (error.message.includes('401') || error.message.includes('unauthorized')) {
            console.error('🔐 **AUTHENTICATION ERROR**:');
            console.error('   • API credentials might be invalid');
            console.error('   • Check if credentials were generated correctly');
        } else if (error.message.includes('400') || error.message.includes('bad request')) {
            console.error('📝 **REQUEST ERROR**:');
            console.error('   • Order parameters might be invalid');
            console.error('   • Market might have restrictions');
        } else if (error.message.includes('insufficient') || error.message.includes('balance')) {
            console.error('💰 **BALANCE ERROR**:');
            console.error('   • Despite our checks, there might be a balance issue');
            console.error('   • Could be a different USDC contract or hidden fees');
        } else {
            console.error('🔧 **TECHNICAL ERROR**:');
            console.error('   • Network connectivity issues');
            console.error('   • Polymarket API problems');
            console.error('   • Plugin configuration issues');
        }
        
        console.error();
        console.error('Full error details:', error);
    }
}

// Run the test
testOrderWithApi()
    .then(() => {
        console.log('\n✅ Order test complete');
        process.exit(0);
    })
    .catch(error => {
        console.error('\n❌ Fatal error:', error);
        process.exit(1);
    }); 