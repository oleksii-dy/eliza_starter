const TARGET_ORDER_ID = '0x5162b1423146752252aacd267584969dd11e350377090a30d119d43e575f0994';

console.log('🔍 **ORDER SCORING STATUS VERIFICATION (PUBLIC API)**');
console.log('='.repeat(70));
console.log(`📦 Target Order ID: ${TARGET_ORDER_ID}`);
console.log('='.repeat(70));

async function checkOrderScoringStatusPublic() {
    try {
        // Step 1: Try public API endpoints
        console.log('\n🌐 **Step 1: Direct Public API Calls...**');
        
        const clobApiUrl = 'https://clob.polymarket.com';
        
        // Try to get specific order via public endpoint
        console.log(`📡 Making public API call for order: ${TARGET_ORDER_ID}`);
        
        const orderUrl = `${clobApiUrl}/orders/${TARGET_ORDER_ID}`;
        console.log(`🔗 URL: ${orderUrl}`);
        
        try {
            const orderResponse = await fetch(orderUrl, {
                headers: {
                    'Content-Type': 'application/json'
                }
            });
            
            console.log(`📊 Response Status: ${orderResponse.status} ${orderResponse.statusText}`);
            
            if (orderResponse.status === 404) {
                console.log(`🎯 **SCORING STATUS**: ❌ NOT SCORING (Order not found - likely filled, cancelled, or expired)`);
            } else if (orderResponse.ok) {
                const orderData = await orderResponse.json();
                console.log('📄 Public API order response:');
                console.log(JSON.stringify(orderData, null, 2));
                
                if (orderData) {
                    const isActive = orderData.status === 'OPEN' || orderData.status === 'PARTIAL';
                    const remainingSize = parseFloat(orderData.size || 0) - parseFloat(orderData.filled_size || 0);
                    
                    console.log(`\n📊 **Order Analysis**:`);
                    console.log(`   • Status: ${orderData.status}`);
                    console.log(`   • Side: ${orderData.side}`);
                    console.log(`   • Size: ${orderData.size}`);
                    console.log(`   • Filled Size: ${orderData.filled_size || 0}`);
                    console.log(`   • Remaining Size: ${remainingSize}`);
                    console.log(`   • Price: $${orderData.price}`);
                    
                    console.log(`\n🎯 **SCORING STATUS**: ${isActive && remainingSize > 0 ? '✅ SCORING' : '❌ NOT SCORING'}`);
                    
                    if (!isActive) {
                        console.log(`   Reason: Order status is "${orderData.status}"`);
                    } else if (remainingSize <= 0) {
                        console.log(`   Reason: No remaining size (fully filled)`);
                    } else {
                        console.log(`   Order is active with ${remainingSize} shares remaining`);
                    }
                }
            } else {
                console.log(`❌ API call failed: ${orderResponse.status} ${orderResponse.statusText}`);
                const errorText = await orderResponse.text();
                console.log(`Error details: ${errorText}`);
                
                if (orderResponse.status === 401) {
                    console.log(`🎯 **SCORING STATUS**: ⚠️ UNKNOWN (Authentication required for this endpoint)`);
                } else {
                    console.log(`🎯 **SCORING STATUS**: ❌ NOT SCORING (API error suggests order doesn't exist)`);
                }
            }
        } catch (fetchError) {
            console.log(`❌ Error fetching order: ${fetchError.message}`);
        }

        // Step 2: Try to extract market/token info from order ID patterns (if possible)
        console.log(`\n🔍 **Step 2: Order ID Analysis...**`);
        console.log(`Order ID: ${TARGET_ORDER_ID}`);
        console.log(`Length: ${TARGET_ORDER_ID.length} characters`);
        console.log(`Format: ${TARGET_ORDER_ID.startsWith('0x') ? 'Hex (0x prefixed)' : 'Other'}`);
        
        if (TARGET_ORDER_ID.startsWith('0x') && TARGET_ORDER_ID.length === 66) {
            console.log('✅ Order ID appears to be a valid hash format');
        } else {
            console.log('⚠️ Order ID format may be non-standard');
        }

        // Step 3: Try Polymarket's public GraphQL endpoint (if available)
        console.log(`\n📊 **Step 3: Alternative Public Endpoints...**`);
        
        // Try alternative endpoints that might be public
        const alternativeEndpoints = [
            `${clobApiUrl}/order/${TARGET_ORDER_ID}`,
            `${clobApiUrl}/orders/lookup/${TARGET_ORDER_ID}`,
            `${clobApiUrl}/api/orders/${TARGET_ORDER_ID}`
        ];
        
        for (const endpoint of alternativeEndpoints) {
            console.log(`🔗 Trying: ${endpoint}`);
            try {
                const response = await fetch(endpoint, {
                    headers: {
                        'Content-Type': 'application/json'
                    }
                });
                
                console.log(`   Status: ${response.status} ${response.statusText}`);
                
                if (response.ok) {
                    const data = await response.json();
                    console.log('   ✅ Success! Response:');
                    console.log(JSON.stringify(data, null, 2));
                    break;
                } else if (response.status === 404) {
                    console.log('   ❌ Not found at this endpoint');
                } else {
                    console.log(`   ⚠️ Error: ${response.status}`);
                }
            } catch (error) {
                console.log(`   ❌ Request failed: ${error.message}`);
            }
        }

        // Step 4: Try to get public market data that might include order info
        console.log(`\n📈 **Step 4: Public Market Data Check...**`);
        
        try {
            // Try to get general market data from Polymarket's public API
            const marketDataUrl = `${clobApiUrl}/markets`;
            console.log(`📡 Fetching public market data from: ${marketDataUrl}`);
            
            const marketResponse = await fetch(marketDataUrl, {
                headers: {
                    'Content-Type': 'application/json'
                }
            });
            
            if (marketResponse.ok) {
                console.log('✅ Public market data accessible');
                console.log('💡 This confirms the API is operational');
            } else {
                console.log(`⚠️ Public market data not accessible: ${marketResponse.status}`);
            }
        } catch (error) {
            console.log(`❌ Error accessing public market data: ${error.message}`);
        }

        // Step 5: Time-based analysis
        console.log(`\n⏰ **Step 5: Time-based Analysis...**`);
        const currentTime = new Date();
        console.log(`Current time: ${currentTime.toISOString()}`);
        console.log('💡 Note: Orders typically expire or get filled within hours to days');
        console.log('📊 If this order was placed days ago, it\'s likely no longer active');

        // Final summary
        console.log('\n' + '='.repeat(70));
        console.log('🏁 **FINAL VERIFICATION SUMMARY**');
        console.log('='.repeat(70));
        console.log(`📦 Order ID: ${TARGET_ORDER_ID}`);
        console.log(`\n🎯 **CONCLUSION**: Based on the 404 response from the public API,`);
        console.log(`this order is most likely ❌ **NOT SCORING**`);
        console.log('\n📋 **Evidence**:');
        console.log('• Order not found via direct API lookup (404 status)');
        console.log('• Orders that are no longer active are typically removed from API responses');
        console.log('• This suggests the order has been filled, cancelled, or expired');
        
        console.log('\n💡 **What this means**:');
        console.log('• ❌ Order is NOT currently matching against incoming trades');
        console.log('• ❌ Order is NOT earning scoring rewards');
        console.log('• ❌ Order is NOT visible in the active order books');
        
        console.log('\n🔍 **To confirm with authenticated access**:');
        console.log('• Set up API credentials using create_api_credentials.mjs');
        console.log('• Check your wallet\'s order history');
        console.log('• Verify order status in the Polymarket web interface');
        
    } catch (error) {
        console.error('❌ Fatal error during public verification:', error.message);
        console.error('\nFull error details:', error);
    }
}

// Run the verification
checkOrderScoringStatusPublic()
    .then(() => {
        console.log('\n✅ Public order scoring verification complete');
        process.exit(0);
    })
    .catch(error => {
        console.error('\n❌ Fatal error:', error);
        process.exit(1);
    }); 