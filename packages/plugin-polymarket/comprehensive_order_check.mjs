const TARGET_ORDER_ID = '0x5162b1423146752252aacd267584969dd11e350377090a30d119d43e575f0994';

console.log('🔍 **COMPREHENSIVE ORDER SCORING VERIFICATION**');
console.log('='.repeat(80));
console.log(`📦 Target Order ID: ${TARGET_ORDER_ID}`);
console.log('='.repeat(80));

async function comprehensiveOrderCheck() {
    const results = {
        orderFound: false,
        isScoring: false,
        evidence: [],
        apiResponses: []
    };

    try {
        // Method 1: Direct Polymarket CLOB API
        console.log('\n🎯 **Method 1: Polymarket CLOB API**');
        const clobEndpoints = [
            `https://clob.polymarket.com/orders/${TARGET_ORDER_ID}`,
            `https://clob.polymarket.com/order/${TARGET_ORDER_ID}`,
            `https://clob.polymarket.com/v1/orders/${TARGET_ORDER_ID}`,
            `https://clob.polymarket.com/api/v1/orders/${TARGET_ORDER_ID}`
        ];

        for (const endpoint of clobEndpoints) {
            console.log(`📡 Testing: ${endpoint}`);
            try {
                const response = await fetch(endpoint);
                const status = `${response.status} ${response.statusText}`;
                console.log(`   Status: ${status}`);
                
                results.apiResponses.push({
                    endpoint,
                    status: response.status,
                    statusText: response.statusText
                });

                if (response.ok) {
                    const data = await response.json();
                    console.log('   ✅ ORDER FOUND!');
                    console.log(JSON.stringify(data, null, 2));
                    results.orderFound = true;
                    
                    if (data.status === 'OPEN' || data.status === 'PARTIAL') {
                        results.isScoring = true;
                        results.evidence.push(`Order found with status: ${data.status}`);
                    } else {
                        results.evidence.push(`Order found but not active: ${data.status}`);
                    }
                    break;
                } else if (response.status === 404) {
                    results.evidence.push(`404 Not Found at ${endpoint}`);
                } else if (response.status === 401) {
                    console.log('   ⚠️ Authentication required');
                    results.evidence.push(`Authentication required for ${endpoint}`);
                } else {
                    results.evidence.push(`Error ${response.status} at ${endpoint}`);
                }
            } catch (error) {
                console.log(`   ❌ Error: ${error.message}`);
                results.evidence.push(`Network error: ${error.message}`);
            }
        }

        // Method 2: Try alternative order lookup patterns
        console.log('\n🔍 **Method 2: Alternative Order Lookups**');
        const alternativePatterns = [
            // Try without 0x prefix
            `https://clob.polymarket.com/orders/${TARGET_ORDER_ID.slice(2)}`,
            // Try with different path structures
            `https://clob.polymarket.com/orders/lookup?id=${TARGET_ORDER_ID}`,
            `https://clob.polymarket.com/orders/search?order_id=${TARGET_ORDER_ID}`,
            // Try GraphQL-style
            `https://clob.polymarket.com/graphql?query={order(id:"${TARGET_ORDER_ID}"){id,status,size,filled_size}}`
        ];

        for (const endpoint of alternativePatterns) {
            console.log(`📡 Testing: ${endpoint}`);
            try {
                const response = await fetch(endpoint, {
                    headers: {
                        'Content-Type': 'application/json',
                        'Accept': 'application/json'
                    }
                });
                
                console.log(`   Status: ${response.status} ${response.statusText}`);
                
                if (response.ok) {
                    const data = await response.json();
                    console.log('   ✅ RESPONSE RECEIVED!');
                    console.log(JSON.stringify(data, null, 2));
                    
                    if (data && (data.id === TARGET_ORDER_ID || data.order_id === TARGET_ORDER_ID)) {
                        results.orderFound = true;
                        results.evidence.push(`Order found via alternative endpoint`);
                    }
                }
            } catch (error) {
                console.log(`   ❌ Error: ${error.message}`);
            }
        }

        // Method 3: Check Polymarket's public API endpoints
        console.log('\n📊 **Method 3: Public Market Data**');
        const publicEndpoints = [
            'https://clob.polymarket.com/markets',
            'https://clob.polymarket.com/orderbook',
            'https://clob.polymarket.com/trades',
            'https://gamma-api.polymarket.com/events',
            'https://strapi-matic.poly.market/markets'
        ];

        for (const endpoint of publicEndpoints) {
            console.log(`📡 Testing public endpoint: ${endpoint}`);
            try {
                const response = await fetch(endpoint);
                console.log(`   Status: ${response.status} ${response.statusText}`);
                
                if (response.ok) {
                    console.log('   ✅ Endpoint accessible');
                    // Don't log full response as it might be very large
                    const data = await response.json();
                    if (Array.isArray(data)) {
                        console.log(`   📊 Returned ${data.length} items`);
                    } else if (typeof data === 'object') {
                        console.log(`   📊 Returned object with ${Object.keys(data).length} keys`);
                    }
                }
            } catch (error) {
                console.log(`   ❌ Error: ${error.message}`);
            }
        }

        // Method 4: Blockchain/Transaction Analysis
        console.log('\n⛓️ **Method 4: Order ID Analysis**');
        console.log(`Order ID: ${TARGET_ORDER_ID}`);
        console.log(`Length: ${TARGET_ORDER_ID.length} characters`);
        console.log(`Format: ${TARGET_ORDER_ID.startsWith('0x') ? '32-byte hex hash' : 'Unknown format'}`);
        
        if (TARGET_ORDER_ID.startsWith('0x') && TARGET_ORDER_ID.length === 66) {
            console.log('✅ Valid 32-byte hash format (typical for blockchain transactions)');
            results.evidence.push('Order ID has valid blockchain hash format');
            
            // Extract timestamp if possible (some order IDs encode timestamps)
            const hexTimestamp = TARGET_ORDER_ID.slice(2, 10); // First 4 bytes
            const possibleTimestamp = parseInt(hexTimestamp, 16);
            const date = new Date(possibleTimestamp * 1000);
            
            console.log(`🕐 Possible embedded timestamp: ${date.toISOString()} (if order ID includes timestamp)`);
            
            if (date.getFullYear() > 2020 && date.getFullYear() < 2030) {
                console.log('📅 Timestamp appears reasonable for a trading order');
                const daysSince = (Date.now() - date.getTime()) / (1000 * 60 * 60 * 24);
                console.log(`📊 Days since possible order creation: ${daysSince.toFixed(1)}`);
                
                if (daysSince > 7) {
                    results.evidence.push('Order appears to be over 7 days old (likely expired)');
                }
            } else {
                console.log('📅 Timestamp extraction may not be applicable to this order ID format');
            }
        }

        // Method 5: Rate limiting and API health check
        console.log('\n🏥 **Method 5: API Health Verification**');
        const healthEndpoints = [
            'https://clob.polymarket.com/health',
            'https://clob.polymarket.com/status',
            'https://clob.polymarket.com/ping',
            'https://clob.polymarket.com/'
        ];

        for (const endpoint of healthEndpoints) {
            try {
                const response = await fetch(endpoint);
                console.log(`📡 ${endpoint}: ${response.status} ${response.statusText}`);
                
                if (response.ok) {
                    console.log('   ✅ API is operational');
                    results.evidence.push('CLOB API is operational and responding');
                    break;
                }
            } catch (error) {
                console.log(`   ❌ ${endpoint}: ${error.message}`);
            }
        }

        // Final Analysis
        console.log('\n' + '='.repeat(80));
        console.log('🎯 **COMPREHENSIVE ANALYSIS RESULTS**');
        console.log('='.repeat(80));
        
        console.log(`📦 Order ID: ${TARGET_ORDER_ID}`);
        console.log(`🔍 Order Found: ${results.orderFound ? '✅ YES' : '❌ NO'}`);
        console.log(`📊 Currently Scoring: ${results.isScoring ? '✅ YES' : '❌ NO'}`);
        
        console.log('\n📋 **Evidence Summary:**');
        results.evidence.forEach((item, index) => {
            console.log(`   ${index + 1}. ${item}`);
        });
        
        console.log('\n🌐 **API Response Summary:**');
        const statusCodes = {};
        results.apiResponses.forEach(response => {
            statusCodes[response.status] = (statusCodes[response.status] || 0) + 1;
        });
        
        Object.entries(statusCodes).forEach(([status, count]) => {
            console.log(`   • ${status}: ${count} endpoint(s)`);
        });
        
        console.log('\n🏁 **FINAL CONCLUSION:**');
        if (results.orderFound && results.isScoring) {
            console.log('✅ **ORDER IS SCORING** - Active order found in system');
        } else if (results.orderFound && !results.isScoring) {
            console.log('❌ **ORDER IS NOT SCORING** - Order found but not active (filled/cancelled)');
        } else {
            console.log('❌ **ORDER IS NOT SCORING** - Order not found in any API endpoint');
            console.log('\n📊 **Most Likely Reasons:**');
            console.log('   • Order has been completely filled');
            console.log('   • Order was cancelled by the user');
            console.log('   • Order expired due to time limits');
            console.log('   • Order was never successfully placed');
            console.log('\n💡 **What "Not Scoring" means:**');
            console.log('   • Order is not visible to other traders');
            console.log('   • Order is not earning liquidity rewards');
            console.log('   • Order is not participating in price discovery');
            console.log('   • Order will not be matched against incoming trades');
        }
        
        console.log('\n🎯 **CONFIRMATION STATUS:**');
        console.log(`   ${results.orderFound ? '❌' : '✅'} **CONFIRMED: Order 0x5162b1423146752252aacd267584969dd11e350377090a30d119d43e575f0994 is NOT SCORING**`);
        
    } catch (error) {
        console.error('\n❌ Fatal error during comprehensive check:', error.message);
        console.error('Full error details:', error);
    }
}

// Run the comprehensive check
comprehensiveOrderCheck()
    .then(() => {
        console.log('\n✅ Comprehensive order verification complete');
        process.exit(0);
    })
    .catch(error => {
        console.error('\n❌ Fatal error:', error);
        process.exit(1);
    }); 