import { initializeClobClientWithCreds } from './dist/index.js';
import { ethers } from 'ethers';

const ORDER_ID = '0x41483bba4be4734faf3cd6810e76d81023318267f7a5210f95141dbe91398245';

console.log('📦 **GETTING ORDER DETAILS**');
console.log('='.repeat(60));
console.log(`🆔 Order ID: ${ORDER_ID}`);
console.log('='.repeat(60));

// Mock runtime with your environment settings
const mockRuntime = {
    getSetting: (key) => {
        return process.env[key];
    }
};

async function getOrderDetails() {
    try {
        console.log('\n🔑 **Initializing CLOB client...**');
        const client = await initializeClobClientWithCreds(mockRuntime);
        console.log('✅ CLOB client initialized successfully');

        console.log('\n📊 **Fetching order details...**');
        
        // Method 1: Try to get the specific order
        let orderDetails = null;
        try {
            orderDetails = await client.getOrder(ORDER_ID);
            console.log('✅ Retrieved order via getOrder() method');
        } catch (getOrderError) {
            console.log(`⚠️ getOrder() method failed: ${getOrderError.message}`);
        }

        // Method 2: If that fails, get all orders and find this one
        if (!orderDetails) {
            console.log('\n🔍 **Searching through all orders...**');
            const privateKey = process.env.WALLET_PRIVATE_KEY || 
                              process.env.PRIVATE_KEY || 
                              process.env.POLYMARKET_PRIVATE_KEY;
            const wallet = new ethers.Wallet(privateKey);
            const walletAddress = wallet.address;

            const allOrdersResponse = await client.getOpenOrders({
                address: walletAddress,
            });
            
            let allOrders = [];
            if (Array.isArray(allOrdersResponse)) {
                allOrders = allOrdersResponse;
            } else if (allOrdersResponse && Array.isArray(allOrdersResponse.data)) {
                allOrders = allOrdersResponse.data;
            } else if (allOrdersResponse && allOrdersResponse.result) {
                allOrders = Array.isArray(allOrdersResponse.result) ? allOrdersResponse.result : [allOrdersResponse.result];
            }

            orderDetails = allOrders.find(order => 
                (order.id === ORDER_ID) || 
                (order.order_id === ORDER_ID) ||
                (order.orderId === ORDER_ID)
            );

            if (orderDetails) {
                console.log('✅ Found order in open orders list');
            } else {
                console.log('❌ Order not found in open orders');
            }
        }

        if (!orderDetails) {
            console.log('\n❌ **Order not found or no longer active**');
            console.log('Possible reasons:');
            console.log('• Order has been filled completely');
            console.log('• Order has been cancelled');
            console.log('• Order has expired');
            console.log('• Order ID is incorrect');
            return;
        }

        console.log('\n🔍 **Raw Order Data:**');
        console.log(JSON.stringify(orderDetails, null, 2));

        // Parse the order details with proper field mapping
        console.log('\n📦 **FORMATTED ORDER DETAILS:**');
        console.log('='.repeat(50));

        // Extract fields with fallbacks for different API response formats
        const orderId = orderDetails.id || orderDetails.order_id || orderDetails.orderId || ORDER_ID;
        const marketId = orderDetails.market || orderDetails.market_id || orderDetails.marketId || 'Unknown';
        const tokenId = orderDetails.asset_id || orderDetails.token_id || orderDetails.tokenId || orderDetails.assetId || 'Unknown';
        const side = orderDetails.side || orderDetails.direction || 'Unknown';
        const orderType = orderDetails.order_type || orderDetails.type || orderDetails.orderType || 'Unknown';
        const status = orderDetails.status || orderDetails.state || 'Unknown';
        const price = orderDetails.price || orderDetails.priceLimit || 'Unknown';
        const originalSize = orderDetails.original_size || orderDetails.size || orderDetails.amount || orderDetails.quantity || 'Unknown';
        const sizeMatched = orderDetails.size_matched || orderDetails.filled_size || orderDetails.filledSize || '0';
        const outcome = orderDetails.outcome || 'Unknown';
        const expiration = orderDetails.expiration || 'Unknown';
        const createdAt = orderDetails.created_at || orderDetails.createdAt || orderDetails.timestamp || null;
        const updatedAt = orderDetails.updated_at || orderDetails.updatedAt || null;

        console.log(`🆔 **Order ID**: ${orderId}`);
        console.log(`🏪 **Market ID**: ${marketId}`);
        console.log(`🎯 **Token/Asset ID**: ${tokenId}`);
        console.log(`📊 **Side**: ${side}`);
        console.log(`📝 **Order Type**: ${orderType}`);
        console.log(`📊 **Status**: ${status}`);
        console.log(`💰 **Price**: $${price} (${parseFloat(price) * 100}%)`);
        console.log(`📈 **Original Size**: ${originalSize} shares`);
        console.log(`✅ **Size Matched**: ${sizeMatched} shares`);
        console.log(`📊 **Remaining**: ${parseFloat(originalSize) - parseFloat(sizeMatched)} shares`);
        console.log(`🎭 **Outcome**: ${outcome}`);
        console.log(`⏰ **Expiration**: ${expiration === '0' ? 'Good Till Cancelled (GTC)' : expiration}`);

        // Format timestamps
        if (createdAt) {
            if (typeof createdAt === 'number') {
                console.log(`📅 **Created**: ${new Date(createdAt * 1000).toLocaleString()}`);
            } else {
                console.log(`📅 **Created**: ${new Date(createdAt).toLocaleString()}`);
            }
        }

        if (updatedAt) {
            if (typeof updatedAt === 'number') {
                console.log(`🔄 **Updated**: ${new Date(updatedAt * 1000).toLocaleString()}`);
            } else {
                console.log(`🔄 **Updated**: ${new Date(updatedAt).toLocaleString()}`);
            }
        }

        // Additional analysis
        console.log('\n📈 **ORDER ANALYSIS:**');
        const isActive = status === 'LIVE' || status === 'OPEN' || status === 'PARTIAL';
        const remainingShares = parseFloat(originalSize) - parseFloat(sizeMatched);
        const fillPercentage = (parseFloat(sizeMatched) / parseFloat(originalSize)) * 100;

        console.log(`🟢 **Active**: ${isActive ? 'Yes' : 'No'}`);
        console.log(`📊 **Fill Status**: ${fillPercentage.toFixed(1)}% filled`);
        console.log(`🎯 **Scoring**: ${isActive && remainingShares > 0 ? 'Yes - Eligible for rewards' : 'No'}`);
        
        if (isActive && remainingShares > 0) {
            console.log(`💡 **Your order is LIVE and earning rewards!**`);
        }

        // Show associated trades if any
        if (orderDetails.associate_trades && orderDetails.associate_trades.length > 0) {
            console.log('\n💱 **ASSOCIATED TRADES:**');
            orderDetails.associate_trades.forEach((trade, index) => {
                console.log(`   ${index + 1}. Trade: ${JSON.stringify(trade)}`);
            });
        } else {
            console.log('\n💱 **ASSOCIATED TRADES**: None (order hasn\'t been matched yet)');
        }

    } catch (error) {
        console.error('\n❌ **Error getting order details:**', error.message);
        console.error('Full error:', error);
        
        if (error.message.includes('credentials') || error.message.includes('authentication')) {
            console.log('\n💡 **Authentication Issue:**');
            console.log('API credentials may be invalid or expired.');
        } else if (error.message.includes('404') || error.message.includes('not found')) {
            console.log('\n💡 **Order Not Found:**');
            console.log('This order may have been filled, cancelled, or expired.');
        }
    }
}

// Run the order details fetcher
getOrderDetails()
    .then(() => {
        console.log('\n' + '='.repeat(50));
        console.log('✅ Order details retrieval complete!');
        console.log('='.repeat(50));
    })
    .catch((error) => {
        console.error('❌ Script failed:', error.message);
    }); 