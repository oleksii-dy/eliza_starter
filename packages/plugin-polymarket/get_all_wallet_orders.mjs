import { initializeClobClientWithCreds } from './dist/index.js';
import { ethers } from 'ethers';

console.log('🔍 Getting All Orders for Your Wallet...');
console.log('=' .repeat(50));

// Mock runtime with your environment settings
const mockRuntime = {
    getSetting: (key) => {
        // Get from actual environment or provide defaults
        return process.env[key];
    }
};

async function getAllWalletOrders() {
    try {
        console.log('🔑 Initializing CLOB client...');
        
        // Initialize the CLOB client with credentials
        const client = await initializeClobClientWithCreds(mockRuntime);
        
        // Get wallet address from private key
        const privateKey = process.env.WALLET_PRIVATE_KEY || 
                          process.env.PRIVATE_KEY || 
                          process.env.POLYMARKET_PRIVATE_KEY;
                          
        if (!privateKey) {
            throw new Error('No private key found in environment variables');
        }
        
        const wallet = new ethers.Wallet(privateKey);
        const walletAddress = wallet.address;
        
        console.log(`📱 Wallet Address: ${walletAddress}`);
        console.log();
        
        console.log('🔍 Fetching all open orders...');
        
        // Get all open orders for the wallet (no market filter)
        const openOrdersResponse = await client.getOpenOrders({
            address: walletAddress,
            // No market parameter = get orders from all markets
        });
        
        console.log('📊 Processing response...');
        
        // Handle different response formats
        let actualOrders = [];
        let nextCursor = undefined;
        
        if (Array.isArray(openOrdersResponse)) {
            actualOrders = openOrdersResponse;
        } else if (openOrdersResponse && Array.isArray(openOrdersResponse.data)) {
            actualOrders = openOrdersResponse.data;
            nextCursor = openOrdersResponse.next_cursor;
        } else if (openOrdersResponse && openOrdersResponse.orders) {
            actualOrders = openOrdersResponse.orders;
            nextCursor = openOrdersResponse.nextCursor;
        } else {
            console.log('Response structure:', JSON.stringify(openOrdersResponse, null, 2));
            actualOrders = [];
        }
        
        console.log();
        console.log('📋 **ALL ORDERS FOR YOUR WALLET**');
        console.log('=' .repeat(50));
        
        if (actualOrders.length === 0) {
            console.log('✅ No active orders found for your wallet.');
            console.log();
            console.log('This means you currently have:');
            console.log('• No pending buy orders');
            console.log('• No pending sell orders');
            console.log('• No open positions waiting to be filled');
            return;
        }
        
        console.log(`📊 Found ${actualOrders.length} active order(s):`);
        console.log();
        
        // Group orders by market for better organization
        const ordersByMarket = {};
        
        actualOrders.forEach(order => {
            const marketId = order.market_id || 'Unknown Market';
            if (!ordersByMarket[marketId]) {
                ordersByMarket[marketId] = [];
            }
            ordersByMarket[marketId].push(order);
        });
        
        // Display orders grouped by market
        Object.keys(ordersByMarket).forEach((marketId, marketIndex) => {
            const orders = ordersByMarket[marketId];
            
            console.log(`🏪 **Market ${marketIndex + 1}: ${marketId}**`);
            console.log();
            
            orders.forEach((order, orderIndex) => {
                console.log(`   📦 **Order ${orderIndex + 1}:**`);
                console.log(`      • **Order ID**: ${order.order_id}`);
                console.log(`      • **Token ID**: ${order.token_id}`);
                console.log(`      • **Side**: ${order.side} (${order.side === 'BUY' ? '🟢 Buying' : '🔴 Selling'})`);
                console.log(`      • **Type**: ${order.type || 'LIMIT'}`);
                console.log(`      • **Status**: ${order.status}`);
                console.log(`      • **Price**: $${order.price} (${(parseFloat(order.price) * 100).toFixed(2)}%)`);
                console.log(`      • **Size**: ${order.size} shares`);
                console.log(`      • **Filled**: ${order.filled_size} shares`);
                console.log(`      • **Total Value**: $${(parseFloat(order.price) * parseFloat(order.size)).toFixed(4)}`);
                console.log(`      • **Created**: ${new Date(order.created_at).toLocaleString()}`);
                console.log(`      • **Updated**: ${new Date(order.updated_at).toLocaleString()}`);
                
                if (order.fees_paid && parseFloat(order.fees_paid) > 0) {
                    console.log(`      • **Fees Paid**: $${order.fees_paid}`);
                }
                console.log();
            });
        });
        
        // Summary statistics
        const totalBuyOrders = actualOrders.filter(o => o.side === 'BUY').length;
        const totalSellOrders = actualOrders.filter(o => o.side === 'SELL').length;
        const totalValue = actualOrders.reduce((sum, order) => 
            sum + (parseFloat(order.price) * parseFloat(order.size)), 0
        );
        const totalUnfilled = actualOrders.reduce((sum, order) => 
            sum + (parseFloat(order.size) - parseFloat(order.filled_size)), 0
        );
        
        console.log('📈 **SUMMARY**');
        console.log('-'.repeat(30));
        console.log(`• **Total Active Orders**: ${actualOrders.length}`);
        console.log(`• **Buy Orders**: ${totalBuyOrders}`);
        console.log(`• **Sell Orders**: ${totalSellOrders}`);
        console.log(`• **Markets**: ${Object.keys(ordersByMarket).length}`);
        console.log(`• **Total Order Value**: $${totalValue.toFixed(4)}`);
        console.log(`• **Unfilled Shares**: ${totalUnfilled.toFixed(2)}`);
        
        if (nextCursor && nextCursor !== 'LTE=') {
            console.log();
            console.log(`🗒️ **Note**: More orders may be available. Use cursor \`${nextCursor}\` to fetch additional pages.`);
        }
        
        console.log();
        console.log('💡 **Next Steps**:');
        console.log('• To cancel a specific order: Use the order ID with the cancel order action');
        console.log('• To cancel all orders: Use the cancel all orders action');
        console.log('• To get details for a specific order: Use the get order details action');
        
    } catch (error) {
        console.error('❌ Error fetching wallet orders:', error.message);
        console.error();
        
        if (error.message.includes('authentication') || error.message.includes('credentials')) {
            console.error('🔐 **Authentication Issue**:');
            console.error('Make sure these environment variables are set:');
            console.error('• CLOB_API_KEY');
            console.error('• CLOB_API_SECRET (or CLOB_SECRET)');
            console.error('• CLOB_API_PASSPHRASE (or CLOB_PASS_PHRASE)');
            console.error('• WALLET_PRIVATE_KEY (or PRIVATE_KEY or POLYMARKET_PRIVATE_KEY)');
        } else if (error.message.includes('not found') || error.message.includes('404')) {
            console.error('📭 **No Orders Found**:');
            console.error('This could mean:');
            console.error('• You have no active orders');
            console.error('• The wallet address has no order history');
            console.error('• API endpoint may be temporarily unavailable');
        } else {
            console.error('🔧 **Technical Error**:');
            console.error('Please check:');
            console.error('• Network connection');
            console.error('• CLOB_API_URL configuration');
            console.error('• Polymarket API service status');
        }
        
        console.error();
        console.error('Full error details:', error);
    }
}

// Run the function
getAllWalletOrders()
    .then(() => {
        console.log('\n✅ Wallet orders retrieval complete');
        process.exit(0);
    })
    .catch(error => {
        console.error('\n❌ Fatal error:', error);
        process.exit(1);
    }); 