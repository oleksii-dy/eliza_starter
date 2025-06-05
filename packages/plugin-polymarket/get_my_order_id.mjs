import { ethers } from 'ethers';

// Your specific order details
const TARGET_TOKEN_ID = '112317011402266313285385277588643241746891964489709475346255125329717458492650';
const EXPECTED_PRICE = 0.02; // $0.02 as specified in your order
const EXPECTED_SIZE = 15; // 15 shares as specified
const EXPECTED_SIDE = 'BUY';

// Your wallet details
const WALLET_ADDRESS = "0xD952175d6A20187d7A5803DcC9741472F640A9b8";
const WALLET_PRIVATE_KEY = "cb0b7dd13ac76649ce888771403f3a72f52ff1cd543e20a27afe62e4aa9e0346";

console.log('🔍 **FETCHING YOUR RECENT ORDER ID**');
console.log('='.repeat(70));
console.log(`🎯 Looking for: ${EXPECTED_SIDE} order for ${EXPECTED_SIZE} shares at $${EXPECTED_PRICE}`);
console.log(`📦 Token ID: ${TARGET_TOKEN_ID}`);
console.log(`👛 Wallet: ${WALLET_ADDRESS}`);
console.log('='.repeat(70));

async function getMyOrderId() {
    const clobApiUrl = 'https://clob.polymarket.com';
    
    try {
        // Verify wallet connection
        console.log('\n👛 **Step 1: Verifying wallet connection...**');
        const formattedKey = WALLET_PRIVATE_KEY.startsWith('0x') ? WALLET_PRIVATE_KEY : '0x' + WALLET_PRIVATE_KEY;
        const wallet = new ethers.Wallet(formattedKey);
        const derivedAddress = wallet.address;
        
        console.log(`📱 Provided Address: ${WALLET_ADDRESS}`);
        console.log(`🔐 Derived Address: ${derivedAddress}`);
        
        if (derivedAddress.toLowerCase() === WALLET_ADDRESS.toLowerCase()) {
            console.log('✅ Wallet verification successful!');
        } else {
            console.log('⚠️ Warning: Address mismatch, but continuing...');
        }

        // Step 2: Try multiple API endpoints to find your orders
        console.log('\n🌐 **Step 2: Searching for your orders via API...**');
        
        const apiEndpoints = [
            // Most likely endpoints for open orders
            `${clobApiUrl}/orders?address=${WALLET_ADDRESS}&status=OPEN`,
            `${clobApiUrl}/orders?address=${WALLET_ADDRESS}`,
            `${clobApiUrl}/orders/open?address=${WALLET_ADDRESS}`,
            
            // Token-specific endpoints
            `${clobApiUrl}/orders?address=${WALLET_ADDRESS}&token_id=${TARGET_TOKEN_ID}`,
            `${clobApiUrl}/orders/open?address=${WALLET_ADDRESS}&token=${TARGET_TOKEN_ID}`,
            
            // Alternative formats
            `${clobApiUrl}/v1/orders?address=${WALLET_ADDRESS}`,
            `${clobApiUrl}/api/orders?address=${WALLET_ADDRESS}`,
        ];

        let foundOrders = [];
        
        for (let i = 0; i < apiEndpoints.length; i++) {
            const endpoint = apiEndpoints[i];
            console.log(`\n📡 [${i+1}/${apiEndpoints.length}] Testing: ${endpoint.replace(TARGET_TOKEN_ID, 'TOKEN_ID...')}`);
            
            try {
                const response = await fetch(endpoint, {
                    method: 'GET',
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
                    }
                    
                    console.log(`   📊 Found ${orders.length} orders`);
                    
                    if (orders.length > 0) {
                        // Filter for your specific order
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
                            
                            // Display the matching orders
                            matchingOrders.forEach((order, index) => {
                                console.log(`\n   📦 **Matching Order ${index + 1}:**`);
                                console.log(`      🆔 ORDER ID: ${order.order_id}`);
                                console.log(`      📊 Side: ${order.side}`);
                                console.log(`      💰 Price: $${order.price} (${(parseFloat(order.price) * 100).toFixed(2)}%)`);
                                console.log(`      📈 Size: ${order.size} shares`);
                                console.log(`      📊 Status: ${order.status}`);
                                if (order.created_at) {
                                    const createdTime = new Date(order.created_at);
                                    const minutesAgo = (Date.now() - createdTime.getTime()) / (1000 * 60);
                                    console.log(`      ⏰ Created: ${createdTime.toLocaleString()} (${minutesAgo.toFixed(1)} min ago)`);
                                }
                            });
                            
                            // If we found matches, we can stop here
                            break;
                        } else {
                            // Show sample orders for debugging
                            console.log('   📋 Sample orders (no exact match):');
                            orders.slice(0, 3).forEach((order, index) => {
                                console.log(`      ${index + 1}. ${order.order_id || 'No ID'} - ${order.side || 'N/A'} ${order.size || 'N/A'} @ $${order.price || 'N/A'}`);
                            });
                        }
                    }
                    
                } else if (response.status === 401) {
                    console.log('   ⚠️ Authentication required');
                } else if (response.status === 404) {
                    console.log('   ❌ Endpoint not found');
                } else {
                    console.log(`   ❌ Error: ${response.status}`);
                }
                
            } catch (fetchError) {
                console.log(`   ❌ Request failed: ${fetchError.message}`);
            }
            
            // Small delay between requests
            await new Promise(resolve => setTimeout(resolve, 200));
        }

        // Step 3: Check orderbook for recent orders
        if (foundOrders.length === 0) {
            console.log('\n📖 **Step 3: Checking orderbook for recent activity...**');
            
            try {
                const orderbookUrl = `${clobApiUrl}/orderbook/${TARGET_TOKEN_ID}`;
                console.log(`📡 Fetching orderbook: ${orderbookUrl}`);
                
                const response = await fetch(orderbookUrl, {
                    headers: {
                        'Content-Type': 'application/json',
                        'Accept': 'application/json'
                    }
                });
                
                if (response.ok) {
                    const orderbook = await response.json();
                    console.log('✅ Got orderbook data');
                    
                    // Check bids (buy orders) for your order
                    const bids = orderbook.bids || [];
                    console.log(`📊 Found ${bids.length} bid orders`);
                    
                    // Look for orders around your price
                    const nearbyBids = bids.filter(bid => 
                        Math.abs(parseFloat(bid.price) - EXPECTED_PRICE) < 0.005
                    );
                    
                    if (nearbyBids.length > 0) {
                        console.log(`🎯 Found ${nearbyBids.length} bids near your price ($${EXPECTED_PRICE})`);
                        nearbyBids.forEach((bid, index) => {
                            console.log(`   ${index + 1}. Price: $${bid.price}, Size: ${bid.size}, Maker: ${bid.maker || 'N/A'}`);
                            if (bid.maker && bid.maker.toLowerCase() === WALLET_ADDRESS.toLowerCase()) {
                                console.log(`      🎯 THIS COULD BE YOUR ORDER! Maker matches your wallet.`);
                            }
                        });
                    }
                }
            } catch (error) {
                console.log(`❌ Orderbook check failed: ${error.message}`);
            }
        }

        // Summary
        console.log('\n' + '='.repeat(70));
        console.log('📋 **SUMMARY**');
        console.log('='.repeat(70));
        
        if (foundOrders.length > 0) {
            console.log(`✅ Found ${foundOrders.length} matching order(s):`);
            
            foundOrders.forEach((order, index) => {
                console.log(`\n🎯 **Order ${index + 1}:**`);
                console.log(`🆔 **ORDER ID**: ${order.order_id}`);
                console.log(`💰 Price: $${order.price} | 📈 Size: ${order.size} | 📊 Status: ${order.status}`);
                
                if (order.created_at) {
                    const minutesAgo = (Date.now() - new Date(order.created_at).getTime()) / (1000 * 60);
                    if (minutesAgo < 10) {
                        console.log(`⚡ **RECENT**: This order was placed ${minutesAgo.toFixed(1)} minutes ago!`);
                    }
                }
            });
            
            // Highlight the most likely order
            if (foundOrders.length === 1) {
                console.log(`\n🎉 **YOUR ORDER ID**: ${foundOrders[0].order_id}`);
            } else {
                const mostRecent = foundOrders.reduce((latest, order) => 
                    new Date(order.created_at || 0) > new Date(latest.created_at || 0) ? order : latest
                );
                console.log(`\n🎉 **MOST RECENT ORDER ID**: ${mostRecent.order_id}`);
            }
            
        } else {
            console.log('❌ No matching orders found via API');
            console.log('\n💡 **Alternative methods to get your Order ID:**');
            console.log('1. 🌐 Check polymarket.com - connect wallet and view your orders');
            console.log('2. 📱 Check your wallet transaction history for recent Polygon transactions');
            console.log('3. 👁️ Look back at the Eliza response when you placed the order');
            console.log('4. ⏰ Wait a few minutes and try again (orders may take time to appear)');
        }
        
    } catch (error) {
        console.error('\n❌ Error occurred:', error.message);
        console.error('Full error details:', error);
    }
}

// Run the order ID fetcher
getMyOrderId()
    .then(() => {
        console.log('\n✅ Order ID search complete!');
    })
    .catch((error) => {
        console.error('❌ Script failed:', error.message);
    }); 