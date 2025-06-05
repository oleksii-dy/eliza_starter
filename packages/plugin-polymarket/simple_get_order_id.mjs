import { initializeClobClientWithCreds } from './dist/index.js';
import { ethers } from 'ethers';

const TARGET_TOKEN_ID = '112317011402266313285385277588643241746891964489709475346255125329717458492650';
const EXPECTED_PRICE = 0.02;
const EXPECTED_SIZE = 15;
const WALLET_ADDRESS = "0xD952175d6A20187d7A5803DcC9741472F640A9b8";
const WALLET_PRIVATE_KEY = "cb0b7dd13ac76649ce888771403f3a72f52ff1cd543e20a27afe62e4aa9e0346";

console.log('🔍 **SIMPLE ORDER ID LOOKUP**');
console.log('='.repeat(50));
console.log(`🎯 Looking for: BUY ${EXPECTED_SIZE} shares at $${EXPECTED_PRICE}`);
console.log(`👛 Wallet: ${WALLET_ADDRESS}`);
console.log('='.repeat(50));

// Mock runtime for credentials
const mockRuntime = {
    getSetting: (key) => {
        const settings = {
            'CLOB_API_URL': 'https://clob.polymarket.com',
            'WALLET_PRIVATE_KEY': WALLET_PRIVATE_KEY,
            'PRIVATE_KEY': WALLET_PRIVATE_KEY,
            'POLYMARKET_PRIVATE_KEY': WALLET_PRIVATE_KEY
        };
        return settings[key];
    }
};

async function simpleGetOrderId() {
    try {
        console.log('\n🔑 **Step 1: Attempting to initialize CLOB client...**');
        
        // Try to initialize the client with credentials
        const client = await initializeClobClientWithCreds(mockRuntime);
        console.log('✅ CLOB client initialized successfully');

        console.log('\n📊 **Step 2: Fetching your open orders...**');
        
        // Get all open orders for your wallet
        const ordersResponse = await client.getOpenOrders({
            address: WALLET_ADDRESS,
        });
        
        console.log('✅ Successfully retrieved orders data');
        
        // Parse the orders
        let allOrders = [];
        if (Array.isArray(ordersResponse)) {
            allOrders = ordersResponse;
        } else if (ordersResponse && Array.isArray(ordersResponse.data)) {
            allOrders = ordersResponse.data;
        } else if (ordersResponse && ordersResponse.orders) {
            allOrders = ordersResponse.orders;
        }
        
        console.log(`📋 Found ${allOrders.length} total open orders`);
        
        if (allOrders.length === 0) {
            console.log('\n❌ **No open orders found**');
            console.log('This could mean:');
            console.log('  • Your order was already filled/matched');
            console.log('  • Your order was cancelled');
            console.log('  • There\'s a delay in the API');
            console.log('  • The order is in a different status');
            return;
        }
        
        // Filter for matching orders
        const matchingOrders = allOrders.filter(order => {
            if (!order) return false;
            
            const matchesToken = order.token_id === TARGET_TOKEN_ID || order.asset_id === TARGET_TOKEN_ID;
            const priceMatch = order.price && Math.abs(parseFloat(order.price) - EXPECTED_PRICE) < 0.001;
            const sizeMatch = order.size && Math.abs(parseFloat(order.size) - EXPECTED_SIZE) < 0.1;
            const sideMatch = order.side === 'BUY';
            
            return matchesToken && priceMatch && sizeMatch && sideMatch;
        });
        
        console.log('\n🎯 **SEARCH RESULTS:**');
        console.log('='.repeat(50));
        
        if (matchingOrders.length > 0) {
            console.log(`✅ **FOUND ${matchingOrders.length} MATCHING ORDER(S)!**`);
            
            matchingOrders.forEach((order, index) => {
                console.log(`\n📦 **Order ${index + 1}:**`);
                console.log(`🆔 **ORDER ID**: ${order.id || order.order_id}`);
                console.log(`💰 Price: $${order.price} (${(parseFloat(order.price) * 100).toFixed(2)}%)`);
                console.log(`📈 Size: ${order.size} shares`);
                console.log(`📊 Status: ${order.status}`);
                console.log(`🏪 Market: ${order.market || order.market_id}`);
                console.log(`📅 Created: ${order.created_at ? new Date(order.created_at).toLocaleString() : 'Unknown'}`);
                
                // Highlight if this is recent
                if (order.created_at) {
                    const minutesAgo = (Date.now() - new Date(order.created_at).getTime()) / (1000 * 60);
                    if (minutesAgo < 30) {
                        console.log(`⚡ **RECENT**: Created ${minutesAgo.toFixed(1)} minutes ago!`);
                    }
                }
            });
            
            // Show the main result
            const mainOrder = matchingOrders[0];
            console.log('\n🎉 **YOUR ORDER ID:**');
            console.log(`🆔 ${mainOrder.id || mainOrder.order_id}`);
            
        } else {
            console.log('❌ **No exact matches found**');
            console.log('\n📋 **All your open orders:**');
            
            allOrders.slice(0, 5).forEach((order, index) => {
                console.log(`\n${index + 1}. Order ID: ${order.id || order.order_id || 'No ID'}`);
                console.log(`   Side: ${order.side || 'N/A'}`);
                console.log(`   Price: $${order.price || 'N/A'}`);
                console.log(`   Size: ${order.size || 'N/A'} shares`);
                console.log(`   Token: ${(order.token_id || order.asset_id || 'N/A').slice(0, 20)}...`);
                console.log(`   Status: ${order.status || 'N/A'}`);
            });
            
            if (allOrders.length > 5) {
                console.log(`\n... and ${allOrders.length - 5} more orders`);
            }
        }
        
    } catch (error) {
        console.error('\n❌ **Error occurred:**', error.message);
        
        if (error.message.includes('credentials') || error.message.includes('authentication')) {
            console.log('\n💡 **Authentication Issue:**');
            console.log('API credentials may need to be created first.');
            console.log('\n🔧 **Solutions:**');
            console.log('1. Run: node create_api_credentials.mjs');
            console.log('2. Check polymarket.com manually');
            console.log('3. Look at your wallet transaction history');
        }
        
        console.log('\n🔍 **Manual Check Options:**');
        console.log(`1. Visit polymarket.com and connect wallet ${WALLET_ADDRESS}`);
        console.log('2. Check "Portfolio" > "Orders" section');
        console.log('3. Look for your recent BUY order');
        console.log('4. Check your Polygon wallet transaction history');
    }
}

// Run the simple order ID lookup
simpleGetOrderId()
    .then(() => {
        console.log('\n✅ Order ID lookup complete!');
    })
    .catch((error) => {
        console.error('❌ Script failed:', error.message);
    }); 