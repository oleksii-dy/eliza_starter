import { initializeClobClientWithCreds } from './dist/index.js';
import { ethers } from 'ethers';

// Your specific order parameters
const TARGET_TOKEN_ID = '14505191988566204513322725156912755292212124783422688051061622770756214184965';
const EXPECTED_PRICE = 0.1;
const EXPECTED_SIZE = 6;

console.log('🔍 **FINDING YOUR RECENT ORDER ID**');
console.log('='.repeat(70));
console.log(`🎯 Looking for: BUY order for ${EXPECTED_SIZE} shares at $${EXPECTED_PRICE}`);
console.log(`📦 Token ID: ${TARGET_TOKEN_ID}`);
console.log('='.repeat(70));

// Mock runtime with your environment settings
const mockRuntime = {
    getSetting: (key) => {
        return process.env[key];
    }
};

async function findYourRecentOrder() {
    try {
        console.log('\n🔑 **Initializing CLOB client...**');
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

        console.log('\n📊 **Fetching your open orders...**');
        
        // Get all open orders
        const allOrdersResponse = await client.getOpenOrders({
            address: walletAddress,
        });
        
        console.log('🔍 **Raw API Response:**');
        console.log(JSON.stringify(allOrdersResponse, null, 2));
        
        let allOrders = [];
        if (Array.isArray(allOrdersResponse)) {
            allOrders = allOrdersResponse;
        } else if (allOrdersResponse && Array.isArray(allOrdersResponse.data)) {
            allOrders = allOrdersResponse.data;
        } else if (allOrdersResponse && allOrdersResponse.orders) {
            allOrders = allOrdersResponse.orders;
        } else if (allOrdersResponse && allOrdersResponse.result) {
            allOrders = Array.isArray(allOrdersResponse.result) ? allOrdersResponse.result : [allOrdersResponse.result];
        }
        
        console.log(`📋 Found ${allOrders.length} total active orders`);
        
        if (allOrders.length === 0) {
            console.log('\n❌ **No active orders found**');
            console.log('This could mean:');
            console.log('• Your order was filled immediately');
            console.log('• Your order was cancelled');
            console.log('• Your order is still processing');
            return;
        }
        
        // Show all orders first for debugging
        console.log('\n📋 **All Your Active Orders:**');
        allOrders.forEach((order, index) => {
            console.log(`\n${index + 1}. **Order Debug Info:**`);
            console.log(`   Raw order object:`, JSON.stringify(order, null, 2));
            
            // Safe field access
            const orderId = order.order_id || order.id || order.orderId || 'NO_ID';
            const tokenId = order.token_id || order.tokenId || order.asset_id || order.assetId || 'NO_TOKEN';
            const price = order.price || order.priceLimit || 'NO_PRICE';
            const size = order.size || order.amount || order.quantity || 'NO_SIZE';
            const side = order.side || order.direction || 'NO_SIDE';
            const status = order.status || order.state || 'NO_STATUS';
            const createdAt = order.created_at || order.createdAt || order.timestamp || 'NO_TIMESTAMP';
            
            console.log(`   🆔 Order ID: ${orderId}`);
            console.log(`   🎯 Token ID: ${tokenId.toString().slice(0, 30)}...`);
            console.log(`   💰 Price: $${price}`);
            console.log(`   📈 Size: ${size}`);
            console.log(`   📊 Side: ${side}`);
            console.log(`   📊 Status: ${status}`);
            console.log(`   📅 Created: ${createdAt}`);
        });
        
        // Filter for your specific order with better error handling
        const matchingOrders = allOrders.filter(order => {
            try {
                const tokenId = order.token_id || order.tokenId || order.asset_id || order.assetId || '';
                const price = parseFloat(order.price || order.priceLimit || 0);
                const size = parseFloat(order.size || order.amount || order.quantity || 0);
                const side = (order.side || order.direction || '').toUpperCase();
                
                const matchesToken = tokenId.toString() === TARGET_TOKEN_ID;
                const matchesPrice = Math.abs(price - EXPECTED_PRICE) < 0.001;
                const matchesSize = Math.abs(size - EXPECTED_SIZE) < 0.1;
                const isBuy = side === 'BUY';
                
                console.log(`🔍 Checking order ${order.order_id || order.id || 'NO_ID'}:`);
                console.log(`   Token match: ${matchesToken} (${tokenId.toString().slice(0, 20)}... vs ${TARGET_TOKEN_ID.slice(0, 20)}...)`);
                console.log(`   Price match: ${matchesPrice} ($${price} vs $${EXPECTED_PRICE})`);
                console.log(`   Size match: ${matchesSize} (${size} vs ${EXPECTED_SIZE})`);
                console.log(`   Side match: ${isBuy} (${side})`);
                
                return matchesToken && matchesPrice && matchesSize && isBuy;
            } catch (filterError) {
                console.log(`   ❌ Error filtering order: ${filterError.message}`);
                return false;
            }
        });
        
        console.log(`\n🎯 **SEARCH RESULTS:**`);
        console.log('='.repeat(50));
        
        if (matchingOrders.length > 0) {
            console.log(`✅ **FOUND ${matchingOrders.length} MATCHING ORDER(S)!**`);
            
            matchingOrders.forEach((order, index) => {
                const orderId = order.order_id || order.id || order.orderId;
                const price = order.price || order.priceLimit;
                const size = order.size || order.amount || order.quantity;
                const status = order.status || order.state;
                const marketId = order.market_id || order.marketId || order.condition_id;
                const createdAt = order.created_at || order.createdAt || order.timestamp;
                
                console.log(`\n📦 **Order ${index + 1}:**`);
                console.log(`🆔 **ORDER ID**: ${orderId}`);
                console.log(`💰 Price: $${price} (${(parseFloat(price) * 100).toFixed(2)}%)`);
                console.log(`📈 Size: ${size} shares`);
                console.log(`📊 Status: ${status}`);
                console.log(`🏪 Market: ${marketId}`);
                console.log(`📅 Created: ${createdAt ? new Date(createdAt).toLocaleString() : 'Unknown'}`);
                
                // Check how recent this order is
                if (createdAt) {
                    try {
                        const createdTime = new Date(createdAt);
                        const minutesAgo = (Date.now() - createdTime.getTime()) / (1000 * 60);
                        
                        if (minutesAgo < 10) {
                            console.log(`⚡ **VERY RECENT**: Created ${minutesAgo.toFixed(1)} minutes ago!`);
                        } else if (minutesAgo < 60) {
                            console.log(`🕐 Created ${minutesAgo.toFixed(1)} minutes ago`);
                        } else {
                            const hoursAgo = minutesAgo / 60;
                            console.log(`🕐 Created ${hoursAgo.toFixed(1)} hours ago`);
                        }
                    } catch (timeError) {
                        console.log(`🕐 Created: ${createdAt}`);
                    }
                }
            });
            
            // Highlight the most recent one
            const mostRecent = matchingOrders.reduce((latest, order) => {
                const latestTime = latest.created_at || latest.createdAt || latest.timestamp || '1970-01-01';
                const orderTime = order.created_at || order.createdAt || order.timestamp || '1970-01-01';
                return new Date(orderTime) > new Date(latestTime) ? order : latest;
            });
            
            const mostRecentId = mostRecent.order_id || mostRecent.id || mostRecent.orderId;
            const mostRecentCreated = mostRecent.created_at || mostRecent.createdAt || mostRecent.timestamp;
            
            console.log('\n🎉 **YOUR ORDER ID:**');
            console.log(`🆔 ${mostRecentId}`);
            console.log(`⏰ Most recent order created: ${mostRecentCreated ? new Date(mostRecentCreated).toLocaleString() : 'Unknown'}`);
            
            return mostRecentId;
            
        } else {
            console.log('❌ **No exact matches found**');
            
            // Show recent orders for comparison
            console.log('\n🔍 **Your recent orders for comparison:**');
            const recentOrders = allOrders
                .sort((a, b) => {
                    const aTime = a.created_at || a.createdAt || a.timestamp || '1970-01-01';
                    const bTime = b.created_at || b.createdAt || b.timestamp || '1970-01-01';
                    return new Date(bTime) - new Date(aTime);
                })
                .slice(0, 5);
                
            recentOrders.forEach((order, index) => {
                const orderId = order.order_id || order.id || order.orderId || 'NO_ID';
                const side = order.side || order.direction || 'NO_SIDE';
                const price = order.price || order.priceLimit || 'NO_PRICE';
                const size = order.size || order.amount || order.quantity || 'NO_SIZE';
                const tokenId = order.token_id || order.tokenId || order.asset_id || order.assetId || 'NO_TOKEN';
                const createdAt = order.created_at || order.createdAt || order.timestamp || 'NO_TIMESTAMP';
                const status = order.status || order.state || 'NO_STATUS';
                
                console.log(`\n${index + 1}. Order ID: ${orderId}`);
                console.log(`   Side: ${side}`);
                console.log(`   Price: $${price}`);
                console.log(`   Size: ${size} shares`);
                console.log(`   Token: ${tokenId.toString().slice(0, 30)}...`);
                console.log(`   Created: ${createdAt}`);
                console.log(`   Status: ${status}`);
            });
            
            console.log('\n💡 **Possible reasons for no match:**');
            console.log('• Order may still be processing');
            console.log('• Order may have been filled immediately');
            console.log('• Order may have been cancelled');
            console.log('• Slight differences in price/size due to rounding');
        }
        
    } catch (error) {
        console.error('\n❌ **Error occurred:**', error.message);
        console.error('Full error:', error);
        
        if (error.message.includes('credentials') || error.message.includes('authentication')) {
            console.log('\n💡 **Authentication Issue:**');
            console.log('API credentials may need to be created first.');
            console.log('\n🔧 **Solution:**');
            console.log('1. Run: node create_api_credentials.mjs');
            console.log('2. Or check polymarket.com manually in your browser');
        }
        
        console.log('\n🌐 **Manual Check:**');
        console.log('1. Go to polymarket.com');
        console.log('2. Connect your wallet');
        console.log('3. Check "Portfolio" > "Orders" section');
        console.log('4. Look for your recent BUY order:');
        console.log(`   • 6 shares at $0.10`);
        console.log(`   • Token ending in ...${TARGET_TOKEN_ID.slice(-10)}`);
    }
}

// Run the order finder
findYourRecentOrder()
    .then(() => {
        console.log('\n' + '='.repeat(50));
        console.log('🎯 Order ID search complete!');
        console.log('='.repeat(50));
    })
    .catch((error) => {
        console.error('❌ Script failed:', error.message);
    }); 