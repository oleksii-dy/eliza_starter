import { initializeClobClientWithCreds } from './dist/index.js';
import { ethers } from 'ethers';

const TARGET_TOKEN_ID = '112317011402266313285385277588643241746891964489709475346255125329717458492650';
const EXPECTED_PRICE = 0.01;
const EXPECTED_SIZE = 10;

console.log('🔍 **FINDING YOUR RECENT ORDER ID**');
console.log('='.repeat(60));
console.log(`🎯 Looking for: BUY order for ${EXPECTED_SIZE} shares at $${EXPECTED_PRICE}`);
console.log(`📦 Token ID: ${TARGET_TOKEN_ID}`);
console.log('='.repeat(60));

// Mock runtime with your environment settings
const mockRuntime = {
    getSetting: (key) => {
        return process.env[key];
    }
};

async function findRecentOrderId() {
    try {
        // Method 1: Try with SDK and credentials
        console.log('\n🔑 **Method 1: Using SDK with credentials...**');
        try {
            const client = await initializeClobClientWithCreds(mockRuntime);
            console.log('✅ CLOB client initialized successfully');

            // Get wallet address
            const privateKey = process.env.WALLET_PRIVATE_KEY || 
                              process.env.PRIVATE_KEY || 
                              process.env.POLYMARKET_PRIVATE_KEY;
                              
            if (!privateKey) {
                throw new Error('No private key found in environment variables');
            }
            
            const wallet = new ethers.Wallet(privateKey);
            const walletAddress = wallet.address;
            console.log(`📱 Wallet Address: ${walletAddress}`);

            // Get all open orders
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
            
            console.log(`📊 Found ${allOrders.length} total active orders`);
            
            // Filter for orders matching our criteria
            const matchingOrders = allOrders.filter(order => {
                const matchesToken = order.token_id === TARGET_TOKEN_ID;
                const matchesPrice = Math.abs(parseFloat(order.price) - EXPECTED_PRICE) < 0.001;
                const matchesSize = Math.abs(parseFloat(order.size) - EXPECTED_SIZE) < 0.1;
                const isBuy = order.side === 'BUY';
                
                return matchesToken && matchesPrice && matchesSize && isBuy;
            });
            
            console.log(`🎯 Found ${matchingOrders.length} orders matching your criteria:`);
            
            if (matchingOrders.length > 0) {
                console.log('\n✅ **YOUR RECENT ORDER(S):**');
                matchingOrders.forEach((order, index) => {
                    console.log(`\n📦 **Order ${index + 1}:**`);
                    console.log(`   🆔 **ORDER ID**: ${order.order_id}`);
                    console.log(`   📊 Side: ${order.side}`);
                    console.log(`   💰 Price: $${order.price} (${(parseFloat(order.price) * 100).toFixed(2)}%)`);
                    console.log(`   📈 Size: ${order.size} shares`);
                    console.log(`   ⏰ Created: ${new Date(order.created_at).toLocaleString()}`);
                    console.log(`   📊 Status: ${order.status}`);
                    console.log(`   🏪 Market: ${order.market_id}`);
                    
                    // Check if this is likely the most recent
                    const createdTime = new Date(order.created_at);
                    const minutesAgo = (Date.now() - createdTime.getTime()) / (1000 * 60);
                    
                    if (minutesAgo < 5) {
                        console.log(`   🕐 **RECENT**: Created ${minutesAgo.toFixed(1)} minutes ago - This is likely your order!`);
                    }
                });
                
                // Show the most recent one prominently
                const mostRecent = matchingOrders.reduce((latest, order) => 
                    new Date(order.created_at) > new Date(latest.created_at) ? order : latest
                );
                
                console.log('\n🎯 **MOST RECENT MATCHING ORDER:**');
                console.log(`🆔 **ORDER ID: ${mostRecent.order_id}**`);
                console.log(`⏰ Created: ${new Date(mostRecent.created_at).toLocaleString()}`);
                
                return mostRecent.order_id;
            } else {
                console.log('❌ No orders found matching your criteria');
                
                // Show all orders for debugging
                if (allOrders.length > 0) {
                    console.log('\n📋 **All your active orders for reference:**');
                    allOrders.slice(0, 3).forEach((order, index) => {
                        console.log(`   ${index + 1}. ${order.order_id} - ${order.side} ${order.size} @ $${order.price} (Token: ${order.token_id.slice(0, 20)}...)`);
                    });
                }
            }
            
        } catch (credError) {
            console.log(`❌ SDK method failed: ${credError.message}`);
            
            if (credError.message.includes('credentials')) {
                console.log('\n💡 **SDK requires API credentials. Let\'s try alternative methods...**');
            }
        }

        // Method 2: Manual Order ID extraction tips
        console.log('\n🔍 **Method 2: Alternative ways to get your Order ID**');
        console.log('\n📋 **Option A: Check the Eliza response**');
        console.log('   • Look back at the response when you placed the order');
        console.log('   • The Order ID should appear once the order is confirmed');
        console.log('   • It will be a 64-character hex string starting with "0x"');
        
        console.log('\n📋 **Option B: Check Polymarket web interface**');
        console.log('   • Go to polymarket.com');
        console.log('   • Connect your wallet');
        console.log('   • Check "Portfolio" or "Orders" section');
        console.log('   • Look for your recent BUY order');
        
        console.log('\n📋 **Option C: Set up API credentials**');
        console.log('   • Run: node create_api_credentials.mjs');
        console.log('   • Follow the prompts to create API keys');
        console.log('   • Then run this script again');
        
        console.log('\n📋 **Option D: Check your wallet transaction**');
        console.log('   • The order placement creates a blockchain transaction');
        console.log('   • Check your wallet transaction history');
        console.log('   • Look for recent Polygon transactions');
        
        // Method 3: Expected Order ID format
        console.log('\n📝 **Method 3: What to expect**');
        console.log('Your Order ID should look like:');
        console.log('   Format: 0x[64 hex characters]');
        console.log('   Example: 0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef');
        console.log('   Length: 66 characters total (including 0x prefix)');
        
        // Method 4: Quick verification once you have the ID
        console.log('\n✅ **Method 4: Verify your Order ID**');
        console.log('Once you have the Order ID, you can verify it\'s scoring by running:');
        console.log('   node check_order_scoring_public.mjs');
        console.log('   (Edit the TARGET_ORDER_ID variable in that file)');
        
    } catch (error) {
        console.error('❌ Error finding recent order ID:', error.message);
        console.error('\nFull error details:', error);
    }
}

// Additional helper function to check if a given order ID matches our criteria
function validateOrderId(orderId) {
    console.log('\n🔍 **Order ID Validation**');
    console.log(`Checking: ${orderId}`);
    
    if (!orderId) {
        console.log('❌ No order ID provided');
        return false;
    }
    
    if (!orderId.startsWith('0x')) {
        console.log('❌ Order ID should start with "0x"');
        return false;
    }
    
    if (orderId.length !== 66) {
        console.log(`❌ Order ID should be 66 characters, got ${orderId.length}`);
        return false;
    }
    
    const hexPattern = /^0x[a-fA-F0-9]{64}$/;
    if (!hexPattern.test(orderId)) {
        console.log('❌ Order ID contains invalid characters');
        return false;
    }
    
    console.log('✅ Order ID format looks valid');
    return true;
}

// Run the order ID finder
findRecentOrderId()
    .then(() => {
        console.log('\n' + '='.repeat(60));
        console.log('🎯 **SUMMARY: How to get your Order ID**');
        console.log('='.repeat(60));
        console.log('1. ✅ Check the Eliza response when you placed the order');
        console.log('2. 🌐 Check polymarket.com in your browser');
        console.log('3. 🔑 Set up API credentials for programmatic access');
        console.log('4. 📱 Check your wallet transaction history');
        console.log('\n✅ Order ID search complete');
        process.exit(0);
    })
    .catch(error => {
        console.error('\n❌ Fatal error:', error);
        process.exit(1);
    }); 