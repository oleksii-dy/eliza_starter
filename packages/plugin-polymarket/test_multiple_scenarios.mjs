import { cancelOrderByIdAction, placeOrderAction } from './dist/index.js';

console.log('🧪 Testing Multiple Cancel Order Scenarios...');
console.log('=' .repeat(60));

// Mock runtime with minimal settings for validation
const mockRuntime = {
    getSetting: (key) => {
        const settings = {
            'CLOB_API_URL': 'https://clob.polymarket.com',
            'CLOB_API_KEY': 'test-key',
            'CLOB_API_SECRET': 'test-secret',
            'CLOB_API_PASSPHRASE': 'test-passphrase',
            'POLYMARKET_PRIVATE_KEY': '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef',
        };
        return settings[key];
    }
};

// Test various cancel order message formats
const testMessages = [
    'cancel order with id 0x5162b1423146752252aacd267584969dd11e350377090a30d119d43e575f0994',
    'Cancel order 0x5162b1423146752252aacd267584969dd11e350377090a30d119d43e575f0994',
    'CANCEL_ORDER 0x5162b1423146752252aacd267584969dd11e350377090a30d119d43e575f0994',
    'stop order id 0x5162b1423146752252aacd267584969dd11e350377090a30d119d43e575f0994',
    'remove the order with ID 0x5162b1423146752252aacd267584969dd11e350377090a30d119d43e575f0994',
    'delete order 0x5162b1423146752252aacd267584969dd11e350377090a30d119d43e575f0994',
    'Please cancel order abc123def456',
    'Stop order ID 789xyz012abc',
];

// Test messages that should NOT trigger cancel order (should be place order)
const nonCancelMessages = [
    'buy 100 tokens of 123456 at $0.50',
    'sell 50 shares of token 789012 at $0.75',
    'place market order to buy 25 tokens',
    'create a limit order for token 456789',
];

async function testMessage(messageText, shouldTriggerCancel = true) {
    const testMessage = {
        content: { text: messageText },
        roomId: 'test-room'
    };
    
    try {
        // Test placeOrderAction validation 
        const placeOrderValid = await placeOrderAction.validate(mockRuntime, testMessage);
        
        // Test cancelOrderByIdAction validation
        const cancelOrderValid = await cancelOrderByIdAction.validate(mockRuntime, testMessage);
        
        // Test order ID extraction
        const regexPattern = /(?:cancel|stop|remove|delete)\s+(?:order\s+)?(?:id\s+|with\s+id\s+)?(0x[a-fA-F0-9]+|[a-zA-Z0-9\-_]{8,})/i;
        const regexMatch = messageText.match(regexPattern);
        
        const hexPattern = /(0x[a-fA-F0-9]{64})/;
        const hexMatch = messageText.match(hexPattern);
        
        const orderIdExtracted = regexMatch || hexMatch;
        
        console.log(`📝 "${messageText.substring(0, 50)}${messageText.length > 50 ? '...' : ''}"`);
        console.log(`   Place Order: ${placeOrderValid ? '✅' : '❌'}  Cancel Order: ${cancelOrderValid ? '✅' : '❌'}  Order ID: ${orderIdExtracted ? '✅' : '❌'}`);
        
        if (shouldTriggerCancel) {
            const success = !placeOrderValid && cancelOrderValid;
            console.log(`   Expected: Cancel action triggers - ${success ? '✅ PASS' : '❌ FAIL'}`);
            return success;
        } else {
            const success = placeOrderValid && !cancelOrderValid;
            console.log(`   Expected: Place action triggers - ${success ? '✅ PASS' : '❌ FAIL'}`);
            return success;
        }
        
    } catch (error) {
        console.log(`   ❌ ERROR: ${error.message}`);
        return false;
    }
}

async function runTests() {
    try {
        console.log('🎯 Testing Cancel Order Messages...');
        console.log('-'.repeat(60));
        
        let cancelTests = 0;
        let cancelPassed = 0;
        
        for (const message of testMessages) {
            cancelTests++;
            if (await testMessage(message, true)) {
                cancelPassed++;
            }
            console.log();
        }
        
        console.log('🎯 Testing Non-Cancel Messages...');
        console.log('-'.repeat(60));
        
        let placeTests = 0;
        let placePassed = 0;
        
        for (const message of nonCancelMessages) {
            placeTests++;
            if (await testMessage(message, false)) {
                placePassed++;
            }
            console.log();
        }
        
        console.log('📊 SUMMARY');
        console.log('=' .repeat(60));
        console.log(`Cancel Order Tests: ${cancelPassed}/${cancelTests} passed`);
        console.log(`Place Order Tests: ${placePassed}/${placeTests} passed`);
        
        const allPassed = cancelPassed === cancelTests && placePassed === placeTests;
        console.log(`\n${allPassed ? '🎉' : '❌'} Overall Result: ${allPassed ? 'ALL TESTS PASSED' : 'SOME TESTS FAILED'}`);
        
        if (allPassed) {
            console.log('\n✅ The cancel order action fix is working correctly!');
            console.log('✅ You should now be able to cancel orders using the specific order ID.');
        }
        
    } catch (error) {
        console.error('❌ Error during testing:', error.message);
    }
}

runTests()
    .then(() => {
        console.log('\n✅ Test complete');
        process.exit(0);
    })
    .catch(error => {
        console.error('❌ Fatal error:', error);
        process.exit(1);
    }); 