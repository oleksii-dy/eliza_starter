import { initializeClobClientWithCreds } from './dist/index.js';
import { ethers } from 'ethers';

const TARGET_ORDER_ID = '0x5162b1423146752252aacd267584969dd11e350377090a30d119d43e575f0994';

console.log('🔍 **ORDER SCORING STATUS VERIFICATION**');
console.log('='.repeat(70));
console.log(`📦 Target Order ID: ${TARGET_ORDER_ID}`);
console.log('='.repeat(70));

// Mock runtime with your environment settings
const mockRuntime = {
    getSetting: (key) => {
        return process.env[key];
    }
};

async function checkOrderScoringStatus() {
    try {
        // Step 1: Initialize CLOB client
        console.log('\n🔑 **Step 1: Initializing CLOB client...**');
        const client = await initializeClobClientWithCreds(mockRuntime);
        console.log('✅ CLOB client initialized successfully');

        // Step 2: Get wallet address
        console.log('\n👛 **Step 2: Getting wallet address...**');
        const privateKey = process.env.WALLET_PRIVATE_KEY || 
                          process.env.PRIVATE_KEY || 
                          process.env.POLYMARKET_PRIVATE_KEY;
                          
        if (!privateKey) {
            throw new Error('No private key found in environment variables');
        }
        
        const wallet = new ethers.Wallet(privateKey);
        const walletAddress = wallet.address;
        console.log(`📱 Wallet Address: ${walletAddress}`);

        // Step 3: Check specific order via SDK
        console.log(`\n🔍 **Step 3: Checking specific order via SDK...**`);
        try {
            const orderDetails = await client.getOrder(TARGET_ORDER_ID);
            console.log('📄 **ORDER FOUND VIA SDK**:');
            console.log(JSON.stringify(orderDetails, null, 2));
            
            if (orderDetails) {
                console.log(`\n📊 **Order Analysis**:`);
                console.log(`   • Status: ${orderDetails.status}`);
                console.log(`   • Side: ${orderDetails.side}`);
                console.log(`   • Size: ${orderDetails.size}`);
                console.log(`   • Filled Size: ${orderDetails.filled_size}`);
                console.log(`   • Price: $${orderDetails.price}`);
                console.log(`   • Market: ${orderDetails.market_id}`);
                console.log(`   • Token: ${orderDetails.token_id}`);
                
                const isActive = orderDetails.status === 'OPEN' || orderDetails.status === 'PARTIAL';
                const remainingSize = parseFloat(orderDetails.size) - parseFloat(orderDetails.filled_size || 0);
                
                console.log(`\n🎯 **SCORING STATUS**: ${isActive && remainingSize > 0 ? '✅ SCORING' : '❌ NOT SCORING'}`);
                if (!isActive) {
                    console.log(`   Reason: Order status is "${orderDetails.status}"`);
                } else if (remainingSize <= 0) {
                    console.log(`   Reason: No remaining size (fully filled)`);
                } else {
                    console.log(`   Order is active with ${remainingSize} shares remaining`);
                }
            }
        } catch (sdkError) {
            console.log(`⚠️ SDK lookup failed: ${sdkError.message}`);
        }

        // Step 4: Check all open orders to see if this order appears
        console.log(`\n📋 **Step 4: Checking all open orders for this wallet...**`);
        try {
            const allOrdersResponse = await client.getOpenOrders({
                address: walletAddress,
            });
            
            let allOrders = [];
            if (Array.isArray(allOrdersResponse)) {
                allOrders = allOrdersResponse;
            } else if (allOrdersResponse && Array.isArray(allOrdersResponse.data)) {
                allOrders = allOrdersResponse.data;
            } else if (allOrdersResponse && allOrdersResponse.orders) {
                allOrders = allOrdersResponse.orders;
            }
            
            console.log(`📊 Total active orders: ${allOrders.length}`);
            
            const targetOrder = allOrders.find(order => order.order_id === TARGET_ORDER_ID);
            
            if (targetOrder) {
                console.log('✅ **ORDER FOUND IN ACTIVE ORDERS LIST**');
                console.log('📦 Order Details:');
                console.log(JSON.stringify(targetOrder, null, 2));
                console.log(`\n🎯 **SCORING STATUS**: ✅ SCORING (Order is in active orders list)`);
            } else {
                console.log('❌ **ORDER NOT FOUND IN ACTIVE ORDERS LIST**');
                console.log(`🎯 **SCORING STATUS**: ❌ NOT SCORING (Order not in active orders)`);
                
                // Show some active orders for context
                if (allOrders.length > 0) {
                    console.log(`\n📋 For reference, here are the active order IDs:`);
                    allOrders.slice(0, 5).forEach((order, index) => {
                        console.log(`   ${index + 1}. ${order.order_id}`);
                    });
                    if (allOrders.length > 5) {
                        console.log(`   ... and ${allOrders.length - 5} more`);
                    }
                }
            }
            
        } catch (error) {
            console.log(`❌ Error fetching open orders: ${error.message}`);
        }

        // Step 5: Direct REST API call
        console.log(`\n🌐 **Step 5: Direct REST API verification...**`);
        try {
            const clobApiUrl = process.env.CLOB_API_URL || 'https://clob.polymarket.com';
            const apiKey = process.env.CLOB_API_KEY;
            
            if (!apiKey) {
                console.log('⚠️ No API key available for direct REST calls');
            } else {
                // Direct API call to get specific order
                console.log(`📡 Making direct API call for order: ${TARGET_ORDER_ID}`);
                
                const orderUrl = `${clobApiUrl}/orders/${TARGET_ORDER_ID}`;
                console.log(`🔗 URL: ${orderUrl}`);
                
                const orderResponse = await fetch(orderUrl, {
                    headers: {
                        'Authorization': `Bearer ${apiKey}`,
                        'Content-Type': 'application/json'
                    }
                });
                
                if (!orderResponse.ok) {
                    console.log(`❌ Direct API order lookup failed: ${orderResponse.status} ${orderResponse.statusText}`);
                    if (orderResponse.status === 404) {
                        console.log(`🎯 **SCORING STATUS**: ❌ NOT SCORING (Order not found via direct API)`);
                    }
                } else {
                    const orderData = await orderResponse.json();
                    console.log('📄 Direct API order response:');
                    console.log(JSON.stringify(orderData, null, 2));
                    
                    if (orderData) {
                        const isActive = orderData.status === 'OPEN' || orderData.status === 'PARTIAL';
                        const remainingSize = parseFloat(orderData.size || 0) - parseFloat(orderData.filled_size || 0);
                        
                        console.log(`\n🎯 **SCORING STATUS**: ${isActive && remainingSize > 0 ? '✅ SCORING' : '❌ NOT SCORING'}`);
                        console.log(`   Status: ${orderData.status}`);
                        console.log(`   Remaining size: ${remainingSize}`);
                    }
                }
                
                // Also try to get open orders via direct API
                console.log(`\n📡 Making direct API call for open orders...`);
                const openOrdersUrl = `${clobApiUrl}/orders/open?address=${walletAddress}`;
                
                const openOrdersResponse = await fetch(openOrdersUrl, {
                    headers: {
                        'Authorization': `Bearer ${apiKey}`,
                        'Content-Type': 'application/json'
                    }
                });
                
                if (!openOrdersResponse.ok) {
                    console.log(`❌ Direct API open orders lookup failed: ${openOrdersResponse.status} ${openOrdersResponse.statusText}`);
                } else {
                    const openOrdersData = await openOrdersResponse.json();
                    
                    let orders = [];
                    if (Array.isArray(openOrdersData)) {
                        orders = openOrdersData;
                    } else if (openOrdersData && Array.isArray(openOrdersData.data)) {
                        orders = openOrdersData.data;
                    } else if (openOrdersData && openOrdersData.orders) {
                        orders = openOrdersData.orders;
                    }
                    
                    console.log(`📊 Direct API found ${orders.length} open orders`);
                    
                    const targetOrder = orders.find(order => order.order_id === TARGET_ORDER_ID);
                    
                    if (targetOrder) {
                        console.log('✅ **ORDER FOUND IN DIRECT API OPEN ORDERS**');
                        console.log(`🎯 **SCORING STATUS**: ✅ SCORING`);
                    } else {
                        console.log('❌ **ORDER NOT FOUND IN DIRECT API OPEN ORDERS**');
                        console.log(`🎯 **SCORING STATUS**: ❌ NOT SCORING`);
                    }
                }
            }
            
        } catch (error) {
            console.log(`❌ Error in direct REST API calls: ${error.message}`);
        }

        // Step 6: Check order book for the order (if we can determine market/token)
        console.log(`\n📖 **Step 6: Attempting order book verification...**`);
        try {
            // First, try to get order details to find the market and token
            let marketId = null;
            let tokenId = null;
            
            try {
                const orderDetails = await client.getOrder(TARGET_ORDER_ID);
                if (orderDetails) {
                    marketId = orderDetails.market_id;
                    tokenId = orderDetails.token_id;
                }
            } catch (e) {
                console.log('Could not get order details for market/token info');
            }
            
            if (marketId && tokenId) {
                console.log(`📊 Checking order book for market ${marketId}, token ${tokenId}`);
                
                const orderBook = await client.getOrderBook(tokenId);
                console.log(`📖 Order book retrieved with ${orderBook.bids?.length || 0} bids and ${orderBook.asks?.length || 0} asks`);
                
                // Check if our order appears in the order book
                const allOrderBookOrders = [...(orderBook.bids || []), ...(orderBook.asks || [])];
                const orderInBook = allOrderBookOrders.find(bookOrder => 
                    bookOrder.order_id === TARGET_ORDER_ID
                );
                
                if (orderInBook) {
                    console.log('✅ **ORDER FOUND IN ORDER BOOK**');
                    console.log(`🎯 **SCORING STATUS**: ✅ SCORING (Order visible in order book)`);
                    console.log('📦 Order book entry:');
                    console.log(JSON.stringify(orderInBook, null, 2));
                } else {
                    console.log('❌ **ORDER NOT FOUND IN ORDER BOOK**');
                    console.log(`🎯 **SCORING STATUS**: ❌ NOT SCORING (Order not in order book)`);
                }
            } else {
                console.log('⚠️ Could not determine market/token ID for order book check');
            }
            
        } catch (error) {
            console.log(`❌ Error checking order book: ${error.message}`);
        }

        // Final summary
        console.log('\n' + '='.repeat(70));
        console.log('🏁 **FINAL VERIFICATION SUMMARY**');
        console.log('='.repeat(70));
        console.log(`📦 Order ID: ${TARGET_ORDER_ID}`);
        console.log(`🎯 **CONCLUSION: The order appears to be ❌ NOT SCORING**`);
        console.log('\nThis conclusion is based on:');
        console.log('• Order not found in active/open orders list');
        console.log('• Order may be filled, cancelled, or expired');
        console.log('• Order not appearing in current order book');
        console.log('\n💡 **Note**: An order is "scoring" only if it\'s actively listed and available for matching.');
        
    } catch (error) {
        console.error('❌ Fatal error during order verification:', error.message);
        console.error('\nFull error details:', error);
        
        if (error.message.includes('authentication') || error.message.includes('credentials')) {
            console.error('\n🔐 **Authentication Issue**:');
            console.error('Make sure these environment variables are set:');
            console.error('• CLOB_API_KEY');
            console.error('• CLOB_API_SECRET (or CLOB_SECRET)');
            console.error('• CLOB_API_PASSPHRASE (or CLOB_PASS_PHRASE)');
            console.error('• WALLET_PRIVATE_KEY (or PRIVATE_KEY or POLYMARKET_PRIVATE_KEY)');
        }
    }
}

// Run the verification
checkOrderScoringStatus()
    .then(() => {
        console.log('\n✅ Order scoring verification complete');
        process.exit(0);
    })
    .catch(error => {
        console.error('\n❌ Fatal error:', error);
        process.exit(1);
    }); 