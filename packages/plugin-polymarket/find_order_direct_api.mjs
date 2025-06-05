import { ethers } from 'ethers';

const TARGET_TOKEN_ID = '112317011402266313285385277588643241746891964489709475346255125329717458492650';
const EXPECTED_PRICE = 0.01;
const EXPECTED_SIZE = 10;
const EXPECTED_SIDE = 'BUY';

console.log('🔍 **FINDING YOUR ORDER VIA DIRECT API CALLS**');
console.log('='.repeat(70));
console.log(`🎯 Looking for: ${EXPECTED_SIDE} order for ${EXPECTED_SIZE} shares at $${EXPECTED_PRICE}`);
console.log(`📦 Token ID: ${TARGET_TOKEN_ID}`);
console.log('='.repeat(70));

async function findOrderDirectAPI() {
    const clobApiUrl = 'https://clob.polymarket.com';
    const foundOrders = [];
    
    try {
        // Step 1: Get wallet address from private key
        console.log('\n👛 **Step 1: Getting wallet address...**');
        const privateKey = process.env.WALLET_PRIVATE_KEY || 
                          process.env.PRIVATE_KEY || 
                          process.env.POLYMARKET_PRIVATE_KEY ||
                          'cb0b7dd13ac76649ce888771403f3a72f52ff1cd543e20a27afe62e4aa9e0346'; // fallback
                          
        const formattedKey = privateKey.startsWith('0x') ? privateKey : '0x' + privateKey;
        const wallet = new ethers.Wallet(formattedKey);
        const walletAddress = wallet.address;
        console.log(`📱 Wallet Address: ${walletAddress}`);

        // Step 2: Try various API endpoints to get orders
        console.log('\n🌐 **Step 2: Direct API calls to find orders...**');
        
        const apiEndpoints = [
            // Public endpoints (no auth required)
            `${clobApiUrl}/orders/open?address=${walletAddress}`,
            `${clobApiUrl}/orders?address=${walletAddress}&status=OPEN`,
            `${clobApiUrl}/orders?address=${walletAddress}`,
            `${clobApiUrl}/v1/orders?address=${walletAddress}`,
            `${clobApiUrl}/api/orders?address=${walletAddress}`,
            
            // Market-specific endpoints
            `${clobApiUrl}/orders/open?address=${walletAddress}&token=${TARGET_TOKEN_ID}`,
            `${clobApiUrl}/orders?address=${walletAddress}&token_id=${TARGET_TOKEN_ID}`,
            
            // Alternative formats
            `${clobApiUrl}/orders/by-address/${walletAddress}`,
            `${clobApiUrl}/wallet/${walletAddress}/orders`,
            `${clobApiUrl}/user/${walletAddress}/orders`,
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
                    } else if (data) {
                        console.log('   📄 Response structure:');
                        console.log(JSON.stringify(data, null, 2));
                    }
                    
                    console.log(`   📊 Found ${orders.length} orders`);
                    
                    // Filter for matching orders
                    const matchingOrders = orders.filter(order => {
                        if (!order) return false;
                        
                        const matchesToken = order.token_id === TARGET_TOKEN_ID;
                        const matchesPrice = order.price && Math.abs(parseFloat(order.price) - EXPECTED_PRICE) < 0.001;
                        const matchesSize = order.size && Math.abs(parseFloat(order.size) - EXPECTED_SIZE) < 0.1;
                        const matchesSide = order.side === EXPECTED_SIDE;
                        
                        return matchesToken && matchesPrice && matchesSize && matchesSide;
                    });
                    
                    if (matchingOrders.length > 0) {
                        console.log(`   🎯 FOUND ${matchingOrders.length} MATCHING ORDER(S)!`);
                        foundOrders.push(...matchingOrders);
                        
                        // Show the orders immediately
                        matchingOrders.forEach((order, index) => {
                            console.log(`\n   📦 **Matching Order ${index + 1}:**`);
                            console.log(`      🆔 ORDER ID: ${order.order_id}`);
                            console.log(`      📊 Side: ${order.side}`);
                            console.log(`      💰 Price: $${order.price}`);
                            console.log(`      📈 Size: ${order.size} shares`);
                            console.log(`      📊 Status: ${order.status}`);
                            if (order.created_at) {
                                console.log(`      ⏰ Created: ${new Date(order.created_at).toLocaleString()}`);
                            }
                        });
                    } else if (orders.length > 0) {
                        console.log('   📋 No exact matches, but found some orders:');
                        orders.slice(0, 3).forEach((order, index) => {
                            console.log(`      ${index + 1}. ${order.order_id || 'No ID'} - ${order.side || 'N/A'} ${order.size || 'N/A'} @ $${order.price || 'N/A'}`);
                        });
                    }
                    
                    // If we found matching orders, we can break early
                    if (matchingOrders.length > 0) {
                        break;
                    }
                    
                } else if (response.status === 401) {
                    console.log('   ⚠️ Authentication required for this endpoint');
                } else if (response.status === 404) {
                    console.log('   ❌ Endpoint not found');
                } else {
                    console.log(`   ❌ Error: ${response.status}`);
                    const errorText = await response.text();
                    if (errorText && errorText.length < 200) {
                        console.log(`   Error details: ${errorText}`);
                    }
                }
                
            } catch (fetchError) {
                console.log(`   ❌ Request failed: ${fetchError.message}`);
            }
            
            // Small delay between requests to be respectful
            await new Promise(resolve => setTimeout(resolve, 100));
        }

        // Step 3: Try to get order book data that might include our order
        console.log('\n📖 **Step 3: Checking order book for recent orders...**');
        
        const orderBookEndpoints = [
            `${clobApiUrl}/orderbook/${TARGET_TOKEN_ID}`,
            `${clobApiUrl}/orderbook?token_id=${TARGET_TOKEN_ID}`,
            `${clobApiUrl}/book/${TARGET_TOKEN_ID}`,
            `${clobApiUrl}/orders/book/${TARGET_TOKEN_ID}`,
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
                    
                    // Filter for our wallet's orders
                    const walletOrders = allBookOrders.filter(order => 
                        order.maker === walletAddress || 
                        order.address === walletAddress ||
                        order.owner === walletAddress
                    );
                    
                    if (walletOrders.length > 0) {
                        console.log(`   🎯 Found ${walletOrders.length} orders from your wallet in order book`);
                        walletOrders.forEach((order, index) => {
                            console.log(`      ${index + 1}. Price: $${order.price}, Size: ${order.size}, ID: ${order.order_id || 'N/A'}`);
                        });
                    }
                    
                    break; // If we got order book data, no need to try other endpoints
                }
                
            } catch (error) {
                console.log(`   ❌ Failed: ${error.message}`);
            }
        }

        // Step 4: Summary of findings
        console.log('\n' + '='.repeat(70));
        console.log('🎯 **SEARCH RESULTS SUMMARY**');
        console.log('='.repeat(70));
        
        if (foundOrders.length > 0) {
            console.log(`✅ **FOUND ${foundOrders.length} MATCHING ORDER(S)!**`);
            
            foundOrders.forEach((order, index) => {
                console.log(`\n📦 **Order ${index + 1}:**`);
                console.log(`   🆔 **ORDER ID**: ${order.order_id}`);
                console.log(`   📊 Side: ${order.side}`);
                console.log(`   💰 Price: $${order.price} (${(parseFloat(order.price) * 100).toFixed(2)}%)`);
                console.log(`   📈 Size: ${order.size} shares`);
                console.log(`   📊 Status: ${order.status}`);
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
            const mostRecent = foundOrders.reduce((latest, order) => {
                const latestTime = latest.created_at ? new Date(latest.created_at) : new Date(0);
                const orderTime = order.created_at ? new Date(order.created_at) : new Date(0);
                return orderTime > latestTime ? order : latest;
            });
            
            console.log('\n🎯 **YOUR ORDER ID:**');
            console.log(`🆔 ${mostRecent.order_id}`);
            console.log('\n📋 **To check if this order is scoring:**');
            console.log(`   node check_order_scoring_public.mjs`);
            console.log(`   (Edit the TARGET_ORDER_ID to: ${mostRecent.order_id})`);
            
        } else {
            console.log('❌ **NO MATCHING ORDERS FOUND**');
            console.log('\n🔍 **Possible reasons:**');
            console.log('   • Order is still being processed');
            console.log('   • Order was placed on a different wallet');
            console.log('   • API endpoints require authentication');
            console.log('   • Order was immediately filled');
            
            console.log('\n💡 **Alternative methods:**');
            console.log('   1. Check polymarket.com website');
            console.log('   2. Check your wallet transaction history');
            console.log('   3. Set up API credentials: node create_api_credentials.mjs');
            console.log('   4. Wait a few minutes and try again');
        }
        
    } catch (error) {
        console.error('\n❌ Fatal error during order search:', error.message);
        console.error('Full error details:', error);
    }
}

// Run the direct API search
findOrderDirectAPI()
    .then(() => {
        console.log('\n✅ Direct API order search complete');
        process.exit(0);
    })
    .catch(error => {
        console.error('\n❌ Fatal error:', error);
        process.exit(1);
    }); 