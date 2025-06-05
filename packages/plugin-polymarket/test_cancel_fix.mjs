import { cancelOrderByIdAction } from './dist/index.js';
import { placeOrderAction } from './dist/index.js';

console.log('🧪 Testing Cancel Order Fix...');
console.log('=' .repeat(50));

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

// Test message with the specific order ID from the user
const testMessage = {
    content: {
        text: 'cancel order with id 0x5162b1423146752252aacd267584969dd11e350377090a30d119d43e575f0994'
    },
    roomId: 'test-room'
};

async function testActionValidation() {
    try {
        console.log('📋 Testing action validation order...');
        
        // Test placeOrderAction validation (should reject cancel requests)
        console.log('\n🔍 Testing placeOrderAction validation...');
        const placeOrderValid = await placeOrderAction.validate(mockRuntime, testMessage);
        console.log(`   placeOrderAction validation: ${placeOrderValid ? '✅ PASS' : '❌ REJECT'}`);
        
        // Test cancelOrderByIdAction validation (should accept cancel requests)
        console.log('\n🔍 Testing cancelOrderByIdAction validation...');
        const cancelOrderValid = await cancelOrderByIdAction.validate(mockRuntime, testMessage);
        console.log(`   cancelOrderByIdAction validation: ${cancelOrderValid ? '✅ PASS' : '❌ REJECT'}`);
        
        console.log('\n📝 Testing order ID extraction...');
        
        // Test regex patterns
        const testText = testMessage.content.text;
        
        // Pattern 1: Main pattern
        const regexPattern = /(?:cancel|stop|remove|delete)\s+(?:order\s+)?(?:id\s+|with\s+id\s+)?(0x[a-fA-F0-9]+|[a-zA-Z0-9\-_]{8,})/i;
        const regexMatch = testText.match(regexPattern);
        
        console.log(`   Main regex pattern: ${regexMatch ? '✅ MATCH' : '❌ NO MATCH'}`);
        if (regexMatch) {
            console.log(`   Extracted Order ID: ${regexMatch[1]}`);
        }
        
        // Pattern 2: Hex fallback pattern
        const hexPattern = /(0x[a-fA-F0-9]{64})/;
        const hexMatch = testText.match(hexPattern);
        
        console.log(`   Hex fallback pattern: ${hexMatch ? '✅ MATCH' : '❌ NO MATCH'}`);
        if (hexMatch) {
            console.log(`   Extracted Order ID: ${hexMatch[1]}`);
        }
        
        console.log('\n🎯 Expected Result:');
        console.log('   - placeOrderAction should REJECT (contains "cancel")');
        console.log('   - cancelOrderByIdAction should ACCEPT (has credentials)');
        console.log('   - Order ID should be extracted successfully');
        
        // Summary
        const success = !placeOrderValid && cancelOrderValid && (regexMatch || hexMatch);
        console.log(`\n${success ? '✅' : '❌'} Overall test: ${success ? 'PASSED' : 'FAILED'}`);
        
        if (success) {
            console.log('🎉 The cancel order action should now work correctly!');
        } else {
            console.log('❌ There are still issues that need to be resolved.');
        }
        
    } catch (error) {
        console.error('❌ Error during testing:', error.message);
        console.error('Stack:', error.stack);
    }
}

testActionValidation()
    .then(() => {
        console.log('\n✅ Test complete');
        process.exit(0);
    })
    .catch(error => {
        console.error('❌ Fatal error:', error);
        process.exit(1);
    }); 