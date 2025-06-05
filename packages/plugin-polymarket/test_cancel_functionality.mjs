import { 
  cancelOrderByIdAction, 
  cancelAllOrdersAction,
  polymarketPlugin 
} from './dist/index.js';

console.log('🔍 Testing Available Cancel Order Functionality...');
console.log('=' .repeat(60));

// Mock runtime for testing
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

async function testCancelFunctionality() {
    console.log('📋 **AVAILABLE CANCEL ORDER FUNCTIONALITY**\n');

    // Check 1: Cancel Order by ID
    console.log('✅ **1. Cancel Order by ID**');
    console.log('   Action Name:', cancelOrderByIdAction.name);
    console.log('   Description:', cancelOrderByIdAction.description);
    console.log('   Similes:', cancelOrderByIdAction.similes.slice(0, 5).join(', '), '...');
    console.log();

    // Test validation
    const testMessage1 = {
        content: {
            text: 'cancel order with id 0x5162b1423146752252aacd267584969dd11e350377090a30d119d43e575f0994'
        }
    };
    
    const isValid1 = await cancelOrderByIdAction.validate(mockRuntime, testMessage1);
    console.log('   ✓ Validation Test (cancel order by ID):', isValid1 ? 'PASS' : 'FAIL');
    console.log();

    // Check 2: Cancel All Orders
    console.log('✅ **2. Cancel All Orders**');
    console.log('   Action Name:', cancelAllOrdersAction.name);
    console.log('   Description:', cancelAllOrdersAction.description);
    console.log('   Similes:', cancelAllOrdersAction.similes.slice(0, 5).join(', '), '...');
    console.log();

    // Test validation
    const testMessage2 = {
        content: {
            text: 'cancel all my orders'
        }
    };
    
    const isValid2 = await cancelAllOrdersAction.validate(mockRuntime, testMessage2);
    console.log('   ✓ Validation Test (cancel all orders):', isValid2 ? 'PASS' : 'FAIL');
    console.log();

    // Check 3: Look for Market-specific Cancel Action
    console.log('🔍 **3. Cancel Orders for Specific Market**');
    const allActions = polymarketPlugin.actions;
    const marketCancelAction = allActions.find(action => 
        action.name && (
            action.name.includes('MARKET') && action.name.includes('CANCEL') ||
            action.name === 'CANCEL_MARKET_ORDERS' ||
            action.name === 'CANCEL_ORDERS_FOR_MARKET'
        )
    );

    if (marketCancelAction) {
        console.log('   ✅ Found market-specific cancel action:', marketCancelAction.name);
        console.log('   Description:', marketCancelAction.description);
        if (marketCancelAction.similes) {
            console.log('   Similes:', marketCancelAction.similes.slice(0, 5).join(', '), '...');
        }
    } else {
        console.log('   ❌ No market-specific cancel action found');
        console.log('   Note: You can only cancel individual orders or all orders');
    }
    console.log();

    // Generate Test Prompts
    console.log('🧪 **TEST PROMPTS FOR USER**');
    console.log('=' .repeat(60));
    console.log();

    console.log('**✅ CANCEL ORDER BY ID - Test Prompts:**');
    console.log('1. "cancel order with id 0x5162b1423146752252aacd267584969dd11e350377090a30d119d43e575f0994"');
    console.log('2. "stop order abc123def456"');
    console.log('3. "remove order ID order-789xyz012"');
    console.log('4. "delete the order with ID 0x1234567890abcdef1234567890abcdef12345678"');
    console.log('5. "kill order trade-2024-001"');
    console.log('6. "abort order execution for limit_buy_999"');
    console.log('7. "terminate my order FOK_12345678"');
    console.log('8. "withdraw order request gtc_order_2024"');
    console.log('9. "revoke the order with identifier poly_trade_888"');
    console.log('10. "close my pending order limit_sell_777"');
    console.log();

    console.log('**✅ CANCEL ALL ORDERS - Test Prompts:**');
    console.log('1. "cancel all my open orders"');
    console.log('2. "stop all my trading and cancel everything"');
    console.log('3. "cancel all orders"');
    console.log('4. "close all my positions"');
    console.log('5. "stop all orders"');
    console.log('6. "cancel everything"');
    console.log('7. "clear all my orders"');
    console.log('8. "remove all orders"');
    console.log('9. "cancel all trades"');
    console.log('10. "stop all trading"');
    console.log();

    if (marketCancelAction) {
        console.log('**✅ CANCEL ORDERS FOR SPECIFIC MARKET - Test Prompts:**');
        console.log('1. "cancel all orders for market 0x1234567890abcdef and asset 123456"');
        console.log('2. "cancel orders in market abc123 for asset 789012"');
        console.log('3. "stop all orders for this market"');
        console.log('4. "clear orders for market condition XYZ"');
        console.log('5. "remove all orders from market 0xabcdef"');
    } else {
        console.log('**❌ CANCEL ORDERS FOR SPECIFIC MARKET:**');
        console.log('This functionality is NOT available in the current plugin.');
        console.log();
        console.log('**Alternative approaches:**');
        console.log('1. Get all your orders first: "get all my orders"');
        console.log('2. Then cancel them one by one using order IDs');
        console.log('3. Or cancel all orders if you want to clear everything');
    }
    console.log();

    console.log('**❌ INVALID TEST PROMPTS (should NOT work):**');
    console.log('1. "place order to buy 100 tokens" (this should trigger place order, not cancel)');
    console.log('2. "get my order history" (this should trigger different action)');
    console.log('3. "cancel order" (missing order ID)');
    console.log('4. "cancel" (too vague)');
    console.log();

    console.log('📊 **SUMMARY**');
    console.log('-'.repeat(40));
    console.log(`✅ Cancel Order by ID: AVAILABLE`);
    console.log(`✅ Cancel All Orders: AVAILABLE`);
    console.log(`${marketCancelAction ? '✅' : '❌'} Cancel Orders for Market: ${marketCancelAction ? 'AVAILABLE' : 'NOT AVAILABLE'}`);
    console.log();

    console.log('💡 **USAGE RECOMMENDATIONS**:');
    console.log('• For specific orders: Use cancel order by ID with the exact order identifier');
    console.log('• For clearing everything: Use cancel all orders');
    if (!marketCancelAction) {
        console.log('• For market-specific cancellation: First get orders, then cancel individually');
    }
    console.log('• Always include clear keywords like "cancel", "stop", "remove", etc.');
    console.log('• Provide exact order IDs when cancelling specific orders');
}

// Run the test
testCancelFunctionality()
    .then(() => {
        console.log('\n✅ Cancel functionality test complete');
        process.exit(0);
    })
    .catch(error => {
        console.error('\n❌ Test error:', error);
        process.exit(1);
    }); 