import { getOrderDetailsAction } from './dist/index.js';

const ORDER_ID = '0x41483bba4be4734faf3cd6810e76d81023318267f7a5210f95141dbe91398245';

console.log('🧪 **TESTING FIXED GET ORDER DETAILS ACTION**');
console.log('='.repeat(60));
console.log(`🆔 Testing Order ID: ${ORDER_ID}`);
console.log('='.repeat(60));

// Mock runtime with your environment settings
const mockRuntime = {
    getSetting: (key) => {
        return process.env[key];
    }
};

// Mock message for action context
const mockMessage = {
    content: {
        text: `Get details for order ${ORDER_ID}`
    }
};

// Mock state
const mockState = {};

// Mock options
const mockOptions = {};

// Callback to capture the response
const mockCallback = (response) => {
    console.log('\n📋 **ACTION RESPONSE**');
    console.log(response.text);
    console.log('\n📊 **Response Data:**');
    console.log(JSON.stringify(response.data, null, 2));
};

async function testFixedOrderDetailsAction() {
    try {
        console.log('\n🔍 **Validating action...**');
        const isValid = await getOrderDetailsAction.validate(mockRuntime, mockMessage);
        
        if (!isValid) {
            console.log('❌ **Validation Failed**');
            console.log('Check your environment variables and API credentials.');
            return;
        }
        
        console.log('✅ **Validation Passed**');

        console.log('\n⚡ **Executing action...**');
        await getOrderDetailsAction.handler(
            mockRuntime,
            mockMessage,
            mockState,
            mockOptions,
            mockCallback
        );

        console.log('\n🎉 **Success!** The fixed action worked correctly!');

    } catch (error) {
        console.error('\n❌ **Error testing fixed action:**', error.message);
        console.error('Full error:', error);
    }
}

// Run the test
testFixedOrderDetailsAction()
    .then(() => {
        console.log('\n' + '='.repeat(60));
        console.log('✅ Fixed order details action test complete!');
        console.log('='.repeat(60));
    })
    .catch((error) => {
        console.error('❌ Test failed:', error.message);
    }); 