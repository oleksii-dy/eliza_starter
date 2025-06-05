console.log('🏪 Checking Market Status...');
console.log('=' .repeat(50));

const TOKEN_ID = '107816283868337218117379783608318587331517916696607930361272175815275915222107';

async function checkMarketStatus() {
    try {
        console.log('📍 **MARKET INFORMATION**');
        console.log(`   Token ID: ${TOKEN_ID}`);
        console.log();

        // Check market data from Polymarket API
        console.log('🔍 Fetching market data from Polymarket API...');
        
        const marketUrl = `https://clob.polymarket.com/markets/${TOKEN_ID}`;
        
        try {
            const response = await fetch(marketUrl);
            
            if (!response.ok) {
                console.log(`❌ Market API Error: ${response.status} ${response.statusText}`);
                console.log('   This could indicate the token ID is invalid or market is not active');
            } else {
                const marketData = await response.json();
                console.log('✅ Market data found:');
                console.log(`   Market: ${JSON.stringify(marketData, null, 2)}`);
            }
        } catch (apiError) {
            console.log(`❌ API Error: ${apiError.message}`);
        }

        console.log();
        
        // Check orderbook for this token
        console.log('📊 Checking orderbook data...');
        const orderbookUrl = `https://clob.polymarket.com/book?token_id=${TOKEN_ID}`;
        
        try {
            const orderbookResponse = await fetch(orderbookUrl);
            
            if (!orderbookResponse.ok) {
                console.log(`❌ Orderbook API Error: ${orderbookResponse.status} ${orderbookResponse.statusText}`);
            } else {
                const orderbookData = await orderbookResponse.json();
                console.log('✅ Orderbook data:');
                
                if (orderbookData.bids && orderbookData.asks) {
                    console.log(`   Bid orders: ${orderbookData.bids.length}`);
                    console.log(`   Ask orders: ${orderbookData.asks.length}`);
                    
                    if (orderbookData.bids.length > 0) {
                        const bestBid = orderbookData.bids[0];
                        console.log(`   Best bid: $${bestBid.price} for ${bestBid.size} shares`);
                    }
                    
                    if (orderbookData.asks.length > 0) {
                        const bestAsk = orderbookData.asks[0];
                        console.log(`   Best ask: $${bestAsk.price} for ${bestAsk.size} shares`);
                    }
                    
                    console.log();
                    console.log('💡 **ANALYSIS**:');
                    if (orderbookData.bids.length === 0 && orderbookData.asks.length === 0) {
                        console.log('   ⚠️  Market has no active orders (might be inactive)');
                    } else {
                        console.log('   ✅ Market appears to be active with orders');
                    }
                } else {
                    console.log('   ❌ Invalid orderbook format');
                }
            }
        } catch (orderbookError) {
            console.log(`❌ Orderbook Error: ${orderbookError.message}`);
        }

        console.log();
        console.log('🎯 **CONCLUSION**:');
        console.log();
        console.log('**Most likely causes of your "not enough balance/allowance" error:**');
        console.log();
        console.log('1. **Market Minimum Size**: Many markets have minimum order sizes');
        console.log('   • Try: "Buy 10 shares at $0.05" (same $0.50 total)');
        console.log('   • Try: "Buy 20 shares at $0.025" (same $0.50 total)');
        console.log();
        console.log('2. **Price Constraints**: Your $0.10 price might be outside market bounds');
        console.log('   • Check current market price from orderbook above');
        console.log('   • Try placing order closer to market price');
        console.log();
        console.log('3. **Platform Fees**: CLOB might reserve extra USDC for fees');
        console.log('   • Your $5.94 balance might need a buffer');
        console.log('   • Try: "Buy 4 shares at $0.10" ($0.40 total, more buffer)');
        console.log();
        console.log('4. **Market Session**: Market might be in auction/closed state');
        console.log('   • Some markets have trading windows');
        console.log('   • Try again during active trading hours');
        console.log();
        console.log('🚀 **IMMEDIATE SOLUTIONS TO TRY**:');
        console.log('   → "Buy 1 share at $0.10" (minimal order)');
        console.log('   → "Buy 10 shares at $0.04" (larger size, lower price)');
        console.log('   → Check the market price on polymarket.com first');
        console.log('   → Try the order on polymarket.com website to compare');
        
    } catch (error) {
        console.error('❌ Error checking market status:', error.message);
    }
}

// Run the check
checkMarketStatus()
    .then(() => {
        console.log('\n✅ Market status check complete');
        process.exit(0);
    })
    .catch(error => {
        console.error('\n❌ Fatal error:', error);
        process.exit(1);
    }); 