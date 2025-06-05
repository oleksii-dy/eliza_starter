import { cancelOrderByIdAction } from './src/actions/cancelOrderById.js';

console.log('🔍 Testing Cancel Order Action Recognition...');
console.log('=' .repeat(50));

// Mock runtime
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

// Mock message
const mockMessage = {
    content: {
        text: 'Cancel the order with ID 0x5162b1423146752252aacd267584969dd11e350377090a30d119d43e575f0994'
    },
    roomId: 'test-room'
};

async function testActionValidation() {
    try {
        console.log('📋 Action Details:');
        console.log(`   • Name: ${cancelOrderByIdAction.name}`);
        console.log(`   • Similes: ${cancelOrderByIdAction.similes?.slice(0, 5).join(', ')}...`);
        console.log(`   • Description: ${cancelOrderByIdAction.description.substring(0, 100)}...`);
        
        console.log('\n🔍 Testing action validation...');
        
        const isValid = await cancelOrderByIdAction.validate(mockRuntime, mockMessage);
        
        console.log(`✅ Action validation result: ${isValid}`);
        
        if (!isValid) {
            console.log('❌ Validation failed - checking each requirement:');
            
            const clobApiUrl = mockRuntime.getSetting('CLOB_API_URL');
            console.log(`   • CLOB_API_URL: ${clobApiUrl ? '✅' : '❌'}`);
            
            const apiKey = mockRuntime.getSetting('CLOB_API_KEY');
            console.log(`   • CLOB_API_KEY: ${apiKey ? '✅' : '❌'}`);
            
            const apiSecret = mockRuntime.getSetting('CLOB_API_SECRET');
            console.log(`   • CLOB_API_SECRET: ${apiSecret ? '✅' : '❌'}`);
            
            const apiPassphrase = mockRuntime.getSetting('CLOB_API_PASSPHRASE');
            console.log(`   • CLOB_API_PASSPHRASE: ${apiPassphrase ? '✅' : '❌'}`);
            
            const privateKey = mockRuntime.getSetting('POLYMARKET_PRIVATE_KEY');
            console.log(`   • POLYMARKET_PRIVATE_KEY: ${privateKey ? '✅' : '❌'}`);
        }
        
        console.log('\n🔍 Testing action matching patterns...');
        
        const testMessages = [
            'Cancel the order with ID 0x5162b1423146752252aacd267584969dd11e350377090a30d119d43e575f0994',
            'CANCEL_ORDER 0x5162b1423146752252aacd267584969dd11e350377090a30d119d43e575f0994',
            'Cancel order abc123def456',
            'Stop order ID 789xyz012abc',
            'Remove the order with ID order-123-456-789'
        ];
        
        for (const testText of testMessages) {
            // Check if message contains action keywords
            const actionKeywords = ['cancel', 'stop', 'remove', 'delete'];
            const orderKeywords = ['order', 'ID', 'id'];
            
            const hasActionKeyword = actionKeywords.some(keyword => 
                testText.toLowerCase().includes(keyword.toLowerCase())
            );
            
            const hasOrderKeyword = orderKeywords.some(keyword => 
                testText.toLowerCase().includes(keyword.toLowerCase())
            );
            
            console.log(`   "${testText.substring(0, 50)}..."`);
            console.log(`      Action keyword: ${hasActionKeyword ? '✅' : '❌'}`);
            console.log(`      Order keyword: ${hasOrderKeyword ? '✅' : '❌'}`);
        }
        
    } catch (error) {
        console.error('❌ Error testing action:', error.message);
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