import { initializeClobClientWithCreds } from './dist/index.js';
import { ethers } from 'ethers';

const TARGET_MARKET_ID = '0x4364972f0b5f33379092da7564811c02acd0069d45c7c3046cfb17f9f01cd236';

console.log('🔍 **DIRECT API CALLS - MARKET ORDERS VERIFICATION**');
console.log('='.repeat(60));
console.log(`📊 Target Market ID: ${TARGET_MARKET_ID}`);
console.log('='.repeat(60));

// Mock runtime with your environment settings
const mockRuntime = {
    getSetting: (key) => {
        return process.env[key];
    }
};

async function checkMarketOrdersDirect() {
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

        // Step 3: Check all wallet orders first (to see if any exist)
        console.log('\n📋 **Step 3: Getting ALL wallet orders for context...**');
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
            
            console.log(`📊 Total active orders across all markets: ${allOrders.length}`);
            
            if (allOrders.length > 0) {
                const uniqueMarkets = [...new Set(allOrders.map(o => o.market_id))];
                console.log(`🏪 Active markets with orders: ${uniqueMarkets.length}`);
                uniqueMarkets.forEach((marketId, index) => {
                    const count = allOrders.filter(o => o.market_id === marketId).length;
                    console.log(`   ${index + 1}. ${marketId} (${count} orders)`);
                });
            }
        } catch (error) {
            console.log(`⚠️ Could not fetch all orders: ${error.message}`);
        }

        // Step 4: Get orders specifically for the target market
        console.log(`\n🎯 **Step 4: Getting orders for TARGET MARKET...**`);
        console.log(`Market ID: ${TARGET_MARKET_ID}`);
        
        try {
            const marketOrdersResponse = await client.getOpenOrders({
                address: walletAddress,
                market: TARGET_MARKET_ID
            });
            
            let marketOrders = [];
            let nextCursor = undefined;
            
            if (Array.isArray(marketOrdersResponse)) {
                marketOrders = marketOrdersResponse;
            } else if (marketOrdersResponse && Array.isArray(marketOrdersResponse.data)) {
                marketOrders = marketOrdersResponse.data;
                nextCursor = marketOrdersResponse.next_cursor;
            } else if (marketOrdersResponse && marketOrdersResponse.orders) {
                marketOrders = marketOrdersResponse.orders;
                nextCursor = marketOrdersResponse.nextCursor;
            } else {
                console.log('📄 Raw response structure:');
                console.log(JSON.stringify(marketOrdersResponse, null, 2));
            }
            
            console.log(`📊 Orders found for target market: ${marketOrders.length}`);
            
            if (marketOrders.length === 0) {
                console.log('✅ **CONFIRMED: No active orders found for this market.**');
                console.log('\nThis means:');
                console.log('• No pending buy orders on this market');
                console.log('• No pending sell orders on this market');
                console.log('• No partially filled orders on this market');
            } else {
                console.log(`🎯 **FOUND ${marketOrders.length} ACTIVE ORDER(S) for target market:**`);
                console.log('-'.repeat(50));
                
                marketOrders.forEach((order, index) => {
                    console.log(`\n📦 **Order ${index + 1}:**`);
                    console.log(`   • Order ID: ${order.order_id}`);
                    console.log(`   • Token ID: ${order.token_id}`);
                    console.log(`   • Side: ${order.side} (${order.side === 'BUY' ? '🟢 Buying' : '🔴 Selling'})`);
                    console.log(`   • Type: ${order.type || 'LIMIT'}`);
                    console.log(`   • Status: ${order.status}`);
                    console.log(`   • Price: $${order.price} (${(parseFloat(order.price) * 100).toFixed(2)}%)`);
                    console.log(`   • Size: ${order.size} shares`);
                    console.log(`   • Filled: ${order.filled_size} shares`);
                    console.log(`   • Remaining: ${(parseFloat(order.size) - parseFloat(order.filled_size)).toFixed(4)} shares`);
                    console.log(`   • Total Value: $${(parseFloat(order.price) * parseFloat(order.size)).toFixed(4)}`);
                    console.log(`   • Created: ${new Date(order.created_at).toLocaleString()}`);
                    console.log(`   • Updated: ${new Date(order.updated_at).toLocaleString()}`);
                    
                    if (order.fees_paid && parseFloat(order.fees_paid) > 0) {
                        console.log(`   • Fees Paid: $${order.fees_paid}`);
                    }
                });
                
                if (nextCursor && nextCursor !== 'LTE=') {
                    console.log(`\n🗒️ More orders available with cursor: ${nextCursor}`);
                }
            }
            
        } catch (error) {
            console.log(`❌ Error fetching market-specific orders: ${error.message}`);
            console.log('📄 Full error details:', error);
        }

        // Step 5: Alternative API approach - try without market filter and filter client-side
        console.log(`\n🔄 **Step 5: Alternative verification - Client-side filtering...**`);
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
            
            // Filter for target market
            const targetMarketOrders = allOrders.filter(order => 
                order.market_id === TARGET_MARKET_ID
            );
            
            console.log(`🔍 Client-side filtered results: ${targetMarketOrders.length} orders`);
            
            if (targetMarketOrders.length === 0) {
                console.log('✅ **DOUBLE CONFIRMED: No orders for target market in full order list**');
            } else {
                console.log('⚠️ **DISCREPANCY DETECTED**: Found orders via client-side filtering!');
                targetMarketOrders.forEach((order, index) => {
                    console.log(`   ${index + 1}. Order ${order.order_id} - ${order.side} ${order.size} @ $${order.price}`);
                });
            }
            
        } catch (error) {
            console.log(`❌ Error in alternative verification: ${error.message}`);
        }

        // Step 6: Direct REST API call (bypass SDK)
        console.log(`\n🌐 **Step 6: Direct REST API verification...**`);
        try {
            const clobApiUrl = process.env.CLOB_API_URL || 'https://clob.polymarket.com';
            const apiKey = process.env.CLOB_API_KEY;
            
            if (!apiKey) {
                console.log('⚠️ No API key available for direct REST calls');
            } else {
                // Direct API call to get orders
                const url = `${clobApiUrl}/orders/open?address=${walletAddress}&market=${TARGET_MARKET_ID}`;
                console.log(`📡 Making direct API call to: ${url}`);
                
                const response = await fetch(url, {
                    headers: {
                        'Authorization': `Bearer ${apiKey}`,
                        'Content-Type': 'application/json'
                    }
                });
                
                if (!response.ok) {
                    console.log(`❌ REST API error: ${response.status} ${response.statusText}`);
                    const errorText = await response.text();
                    console.log(`Error details: ${errorText}`);
                } else {
                    const directApiData = await response.json();
                    console.log('📄 Direct API response:');
                    console.log(JSON.stringify(directApiData, null, 2));
                    
                    // Extract orders from response
                    let directOrders = [];
                    if (Array.isArray(directApiData)) {
                        directOrders = directApiData;
                    } else if (directApiData && Array.isArray(directApiData.data)) {
                        directOrders = directApiData.data;
                    } else if (directApiData && directApiData.orders) {
                        directOrders = directApiData.orders;
                    }
                    
                    console.log(`🎯 Direct API orders count: ${directOrders.length}`);
                    
                    if (directOrders.length === 0) {
                        console.log('✅ **TRIPLE CONFIRMED: Direct REST API also shows no orders**');
                    } else {
                        console.log('🚨 **ALERT: Direct API found orders!**');
                        directOrders.forEach((order, index) => {
                            console.log(`   ${index + 1}. ${order.order_id} - ${order.side} ${order.size} @ $${order.price}`);
                        });
                    }
                }
            }
        } catch (error) {
            console.log(`❌ Error in direct REST API call: ${error.message}`);
        }

        console.log('\n' + '='.repeat(60));
        console.log('🏁 **VERIFICATION COMPLETE**');
        console.log('='.repeat(60));
        
    } catch (error) {
        console.error('\n❌ **CRITICAL ERROR**:', error.message);
        console.error();
        
        if (error.message.includes('authentication') || error.message.includes('credentials')) {
            console.error('🔐 **Authentication Issue**:');
            console.error('Make sure these environment variables are set:');
            console.error('• CLOB_API_KEY');
            console.error('• CLOB_API_SECRET (or CLOB_SECRET)');
            console.error('• CLOB_API_PASSPHRASE (or CLOB_PASS_PHRASE)');
            console.error('• WALLET_PRIVATE_KEY (or PRIVATE_KEY or POLYMARKET_PRIVATE_KEY)');
        } else if (error.message.includes('not found') || error.message.includes('404')) {
            console.error('📭 **Resource Not Found**:');
            console.error('This could mean:');
            console.error('• The market ID does not exist');
            console.error('• The market is closed/inactive');
            console.error('• API endpoint may be temporarily unavailable');
        } else {
            console.error('🔧 **Technical Error**:');
            console.error('Please check:');
            console.error('• Network connection');
            console.error('• CLOB_API_URL configuration');
            console.error('• Polymarket API service status');
        }
        
        console.error('\n📄 Full error details:', error);
    }
}

// Run the verification
checkMarketOrdersDirect()
    .then(() => {
        console.log('\n✅ Market orders verification complete');
        process.exit(0);
    })
    .catch(error => {
        console.error('\n❌ Fatal error:', error);
        process.exit(1);
    }); 