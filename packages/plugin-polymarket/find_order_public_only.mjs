const TARGET_TOKEN_ID = '112317011402266313285385277588643241746891964489709475346255125329717458492650';
const EXPECTED_PRICE = 0.01;
const EXPECTED_SIZE = 10;
const EXPECTED_SIDE = 'BUY';

// Known wallet address from your previous messages
const WALLET_ADDRESS = '0xBe901b0c23A0b91AB8B86B20D50F83c95d94Db88';

console.log('🔍 **FINDING YOUR ORDER VIA PUBLIC API CALLS**');
console.log('='.repeat(70));
console.log(`🎯 Looking for: ${EXPECTED_SIDE} order for ${EXPECTED_SIZE} shares at $${EXPECTED_PRICE}`);
console.log(`📦 Token ID: ${TARGET_TOKEN_ID}`);
console.log(`📱 Wallet: ${WALLET_ADDRESS}`);
console.log('='.repeat(70));

async function findOrderPublicAPI() {
    const clobApiUrl = 'https://clob.polymarket.com';
    const foundOrders = [];
    
    try {
        // Step 1: Try various public API endpoints
        console.log('\n🌐 **Step 1: Public API calls to find orders...**');
        
        const apiEndpoints = [
            // Public endpoints (no auth required)
            `${clobApiUrl}/orders/open?address=${WALLET_ADDRESS}`,
            `${clobApiUrl}/orders?address=${WALLET_ADDRESS}&status=OPEN`,
            `${clobApiUrl}/orders?address=${WALLET_ADDRESS}`,
            `${clobApiUrl}/v1/orders?address=${WALLET_ADDRESS}`,
            `${clobApiUrl}/api/orders?address=${WALLET_ADDRESS}`,
            `${clobApiUrl}/open-orders?address=${WALLET_ADDRESS}`,
            
            // Market-specific endpoints
            `${clobApiUrl}/orders/open?address=${WALLET_ADDRESS}&token=${TARGET_TOKEN_ID}`,
            `${clobApiUrl}/orders?address=${WALLET_ADDRESS}&token_id=${TARGET_TOKEN_ID}`,
            `${clobApiUrl}/orders?token_id=${TARGET_TOKEN_ID}&maker=${WALLET_ADDRESS}`,
            
            // Alternative formats
            `${clobApiUrl}/orders/by-address/${WALLET_ADDRESS}`,
            `${clobApiUrl}/wallet/${WALLET_ADDRESS}/orders`,
            `${clobApiUrl}/user/${WALLET_ADDRESS}/orders`,
            `${clobApiUrl}/accounts/${WALLET_ADDRESS}/orders`,
        ];

        for (const endpoint of apiEndpoints) {
            console.log(`\n📡 Testing: ${endpoint}`);
            
            try {
                const response = await fetch(endpoint, {
                    headers: {
                        'Content-Type': 'application/json',
                        'Accept': 'application/json',
                        'User-Agent': 'PolymarketOrderFinder/1.0'
                    }
                });
                
                console.log(`   Status: ${response.status} ${response.statusText}`);
                
                if (response.ok) {
                    const data = await response.json();
                    console.log('   ✅ SUCCESS! Got response');
                    
                    // Parse different response formats
                    let orders = [];
                    if (Array.isArray(data)) {
                        orders = data;
                    } else if (data && Array.isArray(data.data)) {
                        orders = data.data;
                    } else if (data && Array.isArray(data.orders)) {
                        orders = data.orders;
                    } else if (data && data.order) {
                        orders = [data.order];
                    } else if (data && typeof data === 'object') {
                        console.log('   📄 Response structure:');
                        console.log(JSON.stringify(data, null, 2));
                        
                        // Try to extract orders from nested structure
                        const possibleOrderArrays = Object.values(data).filter(v => Array.isArray(v));
                        if (possibleOrderArrays.length > 0) {
                            orders = possibleOrderArrays[0];
                            console.log(`   📊 Extracted ${orders.length} orders from response`);
                        }
                    }
                    
                    console.log(`   📊 Found ${orders.length} orders`);
                    
                    if (orders.length > 0) {
                        // Show all orders for debugging
                        console.log('   📋 All orders found:');
                        orders.slice(0, 5).forEach((order, index) => {
                            console.log(`      ${index + 1}. ID: ${order.order_id || order.id || 'N/A'}`);
                            console.log(`         Side: ${order.side || 'N/A'}, Price: $${order.price || 'N/A'}, Size: ${order.size || 'N/A'}`);
                            console.log(`         Token: ${order.token_id?.slice(0, 20) || 'N/A'}...`);
                            console.log(`         Status: ${order.status || 'N/A'}`);
                            if (order.created_at) {
                                console.log(`         Created: ${new Date(order.created_at).toLocaleString()}`);
                            }
                            console.log('');
                        });
                    }
                    
                    // Filter for matching orders
                    const matchingOrders = orders.filter(order => {
                        if (!order) return false;
                        
                        const matchesToken = order.token_id === TARGET_TOKEN_ID;
                        const matchesPrice = order.price && Math.abs(parseFloat(order.price) - EXPECTED_PRICE) < 0.001;
                        const matchesSize = order.size && Math.abs(parseFloat(order.size) - EXPECTED_SIZE) < 0.1;
                        const matchesSide = order.side === EXPECTED_SIDE;
                        
                        console.log(`   🔍 Checking order ${order.order_id || order.id}:`);
                        console.log(`      Token match: ${matchesToken} (${order.token_id === TARGET_TOKEN_ID})`);
                        console.log(`      Price match: ${matchesPrice} (${order.price} vs ${EXPECTED_PRICE})`);
                        console.log(`      Size match: ${matchesSize} (${order.size} vs ${EXPECTED_SIZE})`);
                        console.log(`      Side match: ${matchesSide} (${order.side} vs ${EXPECTED_SIDE})`);
                        
                        return matchesToken && matchesPrice && matchesSize && matchesSide;
                    });
                    
                    if (matchingOrders.length > 0) {
                        console.log(`   🎯 FOUND ${matchingOrders.length} MATCHING ORDER(S)!`);
                        foundOrders.push(...matchingOrders);
                        
                        // Show the orders immediately
                        matchingOrders.forEach((order, index) => {
                            console.log(`\n   📦 **✅ MATCHING ORDER ${index + 1}:**`);
                            console.log(`      🆔 ORDER ID: ${order.order_id || order.id}`);
                            console.log(`      📊 Side: ${order.side}`);
                            console.log(`      💰 Price: $${order.price}`);
                            console.log(`      📈 Size: ${order.size} shares`);
                            console.log(`      📊 Status: ${order.status}`);
                            if (order.created_at) {
                                const createdTime = new Date(order.created_at);
                                const minutesAgo = (Date.now() - createdTime.getTime()) / (1000 * 60);
                                console.log(`      ⏰ Created: ${createdTime.toLocaleString()}`);
                                console.log(`      🕐 ${minutesAgo.toFixed(1)} minutes ago`);
                            }
                        });
                        
                        // If we found exact matches, we can break
                        break;
                    }
                    
                } else if (response.status === 401) {
                    console.log('   ⚠️ Authentication required for this endpoint');
                } else if (response.status === 404) {
                    console.log('   ❌ Endpoint not found');
                } else {
                    console.log(`   ❌ Error: ${response.status}`);
                    try {
                        const errorText = await response.text();
                        if (errorText && errorText.length < 500) {
                            console.log(`   Error details: ${errorText}`);
                        }
                    } catch (e) {
                        // Ignore error text parsing errors
                    }
                }
                
            } catch (fetchError) {
                console.log(`   ❌ Request failed: ${fetchError.message}`);
            }
            
            // Small delay between requests to be respectful
            await new Promise(resolve => setTimeout(resolve, 200));
        }

        // Step 2: Try to get order book data
        console.log('\n📖 **Step 2: Checking order book for recent orders...**');
        
        const orderBookEndpoints = [
            `${clobApiUrl}/orderbook/${TARGET_TOKEN_ID}`,
            `${clobApiUrl}/orderbook?token_id=${TARGET_TOKEN_ID}`,
            `${clobApiUrl}/book/${TARGET_TOKEN_ID}`,
            `${clobApiUrl}/orders/book/${TARGET_TOKEN_ID}`,
            `${clobApiUrl}/market/${TARGET_TOKEN_ID}/orderbook`,
        ];
        
        for (const endpoint of orderBookEndpoints) {
            console.log(`📡 Testing order book: ${endpoint}`);
            
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
                    console.log('   ✅ Got order book data');
                    
                    // Look for our orders in the order book
                    const allBookOrders = [
                        ...(data.bids || []),
                        ...(data.asks || []),
                        ...(data.buy_orders || []),
                        ...(data.sell_orders || [])
                    ];
                    
                    console.log(`   📊 Order book has ${allBookOrders.length} total orders`);
                    
                    if (allBookOrders.length > 0) {
                        console.log('   📋 Sample order book entries:');
                        allBookOrders.slice(0, 3).forEach((order, index) => {
                            console.log(`      ${index + 1}. Price: $${order.price}, Size: ${order.size}, Maker: ${order.maker?.slice(0, 10)}...`);
                        });
                    }
                    
                    // Filter for our wallet's orders
                    const walletOrders = allBookOrders.filter(order => 
                        order.maker?.toLowerCase() === WALLET_ADDRESS.toLowerCase() || 
                        order.address?.toLowerCase() === WALLET_ADDRESS.toLowerCase() ||
                        order.owner?.toLowerCase() === WALLET_ADDRESS.toLowerCase()
                    );
                    
                    if (walletOrders.length > 0) {
                        console.log(`   🎯 Found ${walletOrders.length} orders from your wallet in order book!`);
                        walletOrders.forEach((order, index) => {
                            console.log(`      📦 Order ${index + 1}:`);
                            console.log(`         ID: ${order.order_id || order.id || 'N/A'}`);
                            console.log(`         Price: $${order.price}, Size: ${order.size}`);
                            console.log(`         Side: ${order.side || (order.price < 0.5 ? 'BUY' : 'SELL')}`);
                        });
                        
                        // Check if any match our criteria
                        const matchingBookOrders = walletOrders.filter(order => {
                            const matchesPrice = Math.abs(parseFloat(order.price) - EXPECTED_PRICE) < 0.001;
                            const matchesSize = Math.abs(parseFloat(order.size) - EXPECTED_SIZE) < 0.1;
                            return matchesPrice && matchesSize;
                        });
                        
                        if (matchingBookOrders.length > 0) {
                            console.log(`   🎯 FOUND ${matchingBookOrders.length} MATCHING ORDER(S) IN ORDER BOOK!`);
                            foundOrders.push(...matchingBookOrders.map(order => ({
                                ...order,
                                order_id: order.order_id || order.id,
                                side: order.side || 'BUY'
                            })));
                        }
                    }
                    
                    break; // If we got order book data, no need to try other endpoints
                }
                
            } catch (error) {
                console.log(`   ❌ Failed: ${error.message}`);
            }
        }

        // Step 3: Summary of findings
        console.log('\n' + '='.repeat(70));
        console.log('🎯 **SEARCH RESULTS SUMMARY**');
        console.log('='.repeat(70));
        
        if (foundOrders.length > 0) {
            console.log(`✅ **FOUND ${foundOrders.length} MATCHING ORDER(S)!**`);
            
            // Remove duplicates based on order_id
            const uniqueOrders = foundOrders.filter((order, index, arr) => 
                index === arr.findIndex(o => (o.order_id || o.id) === (order.order_id || order.id))
            );
            
            uniqueOrders.forEach((order, index) => {
                console.log(`\n📦 **Order ${index + 1}:**`);
                console.log(`   🆔 **ORDER ID**: ${order.order_id || order.id}`);
                console.log(`   📊 Side: ${order.side}`);
                console.log(`   💰 Price: $${order.price} (${(parseFloat(order.price) * 100).toFixed(2)}%)`);
                console.log(`   📈 Size: ${order.size} shares`);
                console.log(`   📊 Status: ${order.status || 'OPEN'}`);
                console.log(`   🏪 Market: ${order.market_id || 'N/A'}`);
                
                if (order.created_at) {
                    const createdTime = new Date(order.created_at);
                    const minutesAgo = (Date.now() - createdTime.getTime()) / (1000 * 60);
                    console.log(`   ⏰ Created: ${createdTime.toLocaleString()} (${minutesAgo.toFixed(1)} minutes ago)`);
                    
                    if (minutesAgo < 10) {
                        console.log(`   🕐 **RECENT ORDER** - This is likely the one you just placed!`);
                    }
                }
            });
            
            // Show the most recent order prominently
            const mostRecent = uniqueOrders.reduce((latest, order) => {
                const latestTime = latest.created_at ? new Date(latest.created_at) : new Date(0);
                const orderTime = order.created_at ? new Date(order.created_at) : new Date(0);
                return orderTime > latestTime ? order : latest;
            });
            
            console.log('\n🎯 **YOUR ORDER ID:**');
            console.log(`🆔 ${mostRecent.order_id || mostRecent.id}`);
            console.log('\n📋 **To check if this order is scoring:**');
            console.log(`   node check_order_scoring_public.mjs`);
            console.log(`   (Edit the TARGET_ORDER_ID to: ${mostRecent.order_id || mostRecent.id})`);
            
        } else {
            console.log('❌ **NO MATCHING ORDERS FOUND VIA PUBLIC API**');
            console.log('\n🔍 **Possible reasons:**');
            console.log('   • Order requires authentication to view');
            console.log('   • Order is still being processed');
            console.log('   • Order was immediately filled');
            console.log('   • Order was placed with different parameters');
            
            console.log('\n💡 **Next steps:**');
            console.log('   1. Check polymarket.com website directly');
            console.log('   2. Set up API credentials: node create_api_credentials.mjs');
            console.log('   3. Check your wallet transaction history on Polygon');
            console.log('   4. Look for the order ID in the Eliza response when you placed it');
        }
        
    } catch (error) {
        console.error('\n❌ Fatal error during order search:', error.message);
        console.error('Full error details:', error);
    }
}

// Run the public API search
findOrderPublicAPI()
    .then(() => {
        console.log('\n✅ Public API order search complete');
        process.exit(0);
    })
    .catch(error => {
        console.error('\n❌ Fatal error:', error);
        process.exit(1);
    }); 