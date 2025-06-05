const TARGET_TOKEN_ID = '10772588031551349729289948290557133829937274723962850186274243477468724950221';

console.log('🔍 **TOKEN DETAILS INVESTIGATION**');
console.log('='.repeat(70));
console.log(`🎯 Target Token ID: ${TARGET_TOKEN_ID}`);
console.log('='.repeat(70));

async function getTokenDetails() {
    try {
        const clobApiUrl = 'https://clob.polymarket.com';
        
        // Step 1: Get token basic info from orderbook
        console.log('\n📚 **Step 1: Getting token orderbook data...**');
        try {
            const orderbookUrl = `${clobApiUrl}/book?token_id=${TARGET_TOKEN_ID}`;
            console.log(`📡 GET ${orderbookUrl}`);
            
            const orderbookResponse = await fetch(orderbookUrl);
            console.log(`📊 Response status: ${orderbookResponse.status} ${orderbookResponse.statusText}`);
            
            if (orderbookResponse.ok) {
                const orderbookData = await orderbookResponse.json();
                
                console.log('✅ Token found in orderbook!');
                console.log('\n📈 **ORDERBOOK SUMMARY:**');
                
                const bids = orderbookData.bids || [];
                const asks = orderbookData.asks || [];
                
                console.log(`📊 Active bids: ${bids.length}`);
                console.log(`📊 Active asks: ${asks.length}`);
                
                if (bids.length > 0) {
                    console.log('\n🟢 **TOP BIDS (Buyers):**');
                    bids.slice(0, 5).forEach((bid, idx) => {
                        const probability = (parseFloat(bid.price) * 100).toFixed(2);
                        console.log(`   ${idx + 1}. $${bid.price} (${probability}%) for ${bid.size} shares`);
                    });
                    
                    const bestBid = bids[0];
                    console.log(`\n💰 Best Bid: $${bestBid.price} (${(parseFloat(bestBid.price) * 100).toFixed(2)}%)`);
                }
                
                if (asks.length > 0) {
                    console.log('\n🔴 **TOP ASKS (Sellers):**');
                    asks.slice(0, 5).forEach((ask, idx) => {
                        const probability = (parseFloat(ask.price) * 100).toFixed(2);
                        console.log(`   ${idx + 1}. $${ask.price} (${probability}%) for ${ask.size} shares`);
                    });
                    
                    const bestAsk = asks[0];
                    console.log(`\n💰 Best Ask: $${bestAsk.price} (${(parseFloat(bestAsk.price) * 100).toFixed(2)}%)`);
                }
                
                // Calculate spread
                if (bids.length > 0 && asks.length > 0) {
                    const bestBidPrice = parseFloat(bids[0].price);
                    const bestAskPrice = parseFloat(asks[0].price);
                    const spread = bestAskPrice - bestBidPrice;
                    const spreadPercent = (spread / bestBidPrice * 100).toFixed(2);
                    
                    console.log(`\n📊 **SPREAD ANALYSIS:**`);
                    console.log(`   Bid-Ask Spread: $${spread.toFixed(4)} (${spreadPercent}%)`);
                    console.log(`   Midpoint Price: $${((bestBidPrice + bestAskPrice) / 2).toFixed(4)}`);
                }
                
                if (bids.length === 0 && asks.length === 0) {
                    console.log('⚠️ No active orders in orderbook');
                }
                
            } else if (orderbookResponse.status === 404) {
                console.log('❌ Token not found in orderbook');
            } else {
                console.log(`❌ Error fetching orderbook: ${orderbookResponse.status}`);
            }
        } catch (error) {
            console.log(`❌ Error in orderbook check: ${error.message}`);
        }
        
        // Step 2: Search for markets containing this token
        console.log('\n🔍 **Step 2: Finding associated market...**');
        try {
            // Try to find the market by searching common patterns
            const searchPatterns = [
                `https://clob.polymarket.com/markets?token_id=${TARGET_TOKEN_ID}`,
                `https://clob.polymarket.com/tokens/${TARGET_TOKEN_ID}`
            ];
            
            for (const url of searchPatterns) {
                try {
                    console.log(`📡 Trying: ${url}`);
                    const response = await fetch(url);
                    console.log(`📊 Response: ${response.status} ${response.statusText}`);
                    
                    if (response.ok) {
                        const data = await response.json();
                        console.log('📄 Response data:');
                        console.log(JSON.stringify(data, null, 2));
                        break;
                    }
                } catch (error) {
                    console.log(`   ❌ Error: ${error.message}`);
                }
            }
        } catch (error) {
            console.log(`❌ Error in market search: ${error.message}`);
        }
        
        // Step 3: Check recent trades for this token
        console.log('\n💱 **Step 3: Checking recent trades...**');
        try {
            const tradesUrl = `${clobApiUrl}/trades?token_id=${TARGET_TOKEN_ID}&limit=10`;
            console.log(`📡 GET ${tradesUrl}`);
            
            const tradesResponse = await fetch(tradesUrl);
            console.log(`📊 Trades response: ${tradesResponse.status} ${tradesResponse.statusText}`);
            
            if (tradesResponse.ok) {
                const tradesData = await tradesResponse.json();
                const trades = Array.isArray(tradesData) ? tradesData : tradesData.data || [];
                
                console.log(`💰 Recent trades found: ${trades.length}`);
                
                if (trades.length > 0) {
                    console.log('\n🔄 **RECENT TRADING ACTIVITY:**');
                    trades.slice(0, 10).forEach((trade, idx) => {
                        const timestamp = new Date(trade.timestamp).toLocaleString();
                        const probability = (parseFloat(trade.price) * 100).toFixed(2);
                        const side = trade.side || 'unknown';
                        console.log(`   ${idx + 1}. $${trade.price} (${probability}%) × ${trade.size} shares [${side}] @ ${timestamp}`);
                    });
                    
                    // Calculate recent trading stats
                    const recentTrade = trades[0];
                    const prices = trades.map(t => parseFloat(t.price));
                    const volumes = trades.map(t => parseFloat(t.size));
                    
                    const avgPrice = (prices.reduce((a, b) => a + b, 0) / prices.length).toFixed(4);
                    const totalVolume = volumes.reduce((a, b) => a + b, 0);
                    const maxPrice = Math.max(...prices).toFixed(4);
                    const minPrice = Math.min(...prices).toFixed(4);
                    
                    console.log('\n📈 **TRADING STATISTICS:**');
                    console.log(`   Last Trade Price: $${recentTrade.price} (${(parseFloat(recentTrade.price) * 100).toFixed(2)}%)`);
                    console.log(`   Average Price: $${avgPrice} (${(parseFloat(avgPrice) * 100).toFixed(2)}%)`);
                    console.log(`   Price Range: $${minPrice} - $${maxPrice}`);
                    console.log(`   Total Volume: ${totalVolume.toFixed(2)} shares`);
                    console.log(`   Last Activity: ${new Date(recentTrade.timestamp).toLocaleString()}`);
                } else {
                    console.log('   ✅ No recent trades found');
                }
            } else if (tradesResponse.status === 401) {
                console.log('⚠️ Trades endpoint requires authentication');
            } else {
                console.log(`❌ Could not fetch trades: ${tradesResponse.status}`);
            }
        } catch (error) {
            console.log(`❌ Error fetching trades: ${error.message}`);
        }
        
        // Step 4: Try to get price history/candles
        console.log('\n📊 **Step 4: Checking price history...**');
        try {
            const now = Math.floor(Date.now() / 1000);
            const oneDayAgo = now - (24 * 60 * 60);
            
            const candlesUrl = `${clobApiUrl}/candles?token_id=${TARGET_TOKEN_ID}&interval=1h&start_ts=${oneDayAgo}&end_ts=${now}`;
            console.log(`📡 GET ${candlesUrl}`);
            
            const candlesResponse = await fetch(candlesUrl);
            console.log(`📊 Candles response: ${candlesResponse.status} ${candlesResponse.statusText}`);
            
            if (candlesResponse.ok) {
                const candlesData = await candlesResponse.json();
                const candles = Array.isArray(candlesData) ? candlesData : candlesData.data || [];
                
                console.log(`📈 Price candles found: ${candles.length}`);
                
                if (candles.length > 0) {
                    console.log('\n📊 **24H PRICE HISTORY:**');
                    const recent = candles.slice(-5); // Last 5 hours
                    recent.forEach((candle, idx) => {
                        const time = new Date(candle.timestamp * 1000).toLocaleTimeString();
                        const probability = (parseFloat(candle.close) * 100).toFixed(2);
                        console.log(`   ${time}: Open $${candle.open} → Close $${candle.close} (${probability}%) Vol: ${candle.volume}`);
                    });
                    
                    // Calculate 24h stats
                    const prices = candles.map(c => parseFloat(c.close));
                    const volumes = candles.map(c => parseFloat(c.volume || 0));
                    
                    const currentPrice = prices[prices.length - 1];
                    const dayStartPrice = prices[0];
                    const change24h = currentPrice - dayStartPrice;
                    const changePercent = ((change24h / dayStartPrice) * 100).toFixed(2);
                    const volume24h = volumes.reduce((a, b) => a + b, 0);
                    
                    console.log('\n📈 **24H SUMMARY:**');
                    console.log(`   Current: $${currentPrice.toFixed(4)} (${(currentPrice * 100).toFixed(2)}%)`);
                    console.log(`   24h Change: ${change24h >= 0 ? '+' : ''}$${change24h.toFixed(4)} (${changePercent >= 0 ? '+' : ''}${changePercent}%)`);
                    console.log(`   24h Volume: ${volume24h.toFixed(2)} shares`);
                    console.log(`   High: $${Math.max(...prices).toFixed(4)}`);
                    console.log(`   Low: $${Math.min(...prices).toFixed(4)}`);
                }
            } else {
                console.log(`❌ Could not fetch price history: ${candlesResponse.status}`);
            }
        } catch (error) {
            console.log(`❌ Error fetching price history: ${error.message}`);
        }
        
        // Step 5: Try alternative endpoints for token info
        console.log('\n🔍 **Step 5: Additional token information...**');
        try {
            // Try some alternative endpoints
            const endpoints = [
                `${clobApiUrl}/midpoint?token_id=${TARGET_TOKEN_ID}`,
                `${clobApiUrl}/price?token_id=${TARGET_TOKEN_ID}`,
                `${clobApiUrl}/last-trade-price?token_id=${TARGET_TOKEN_ID}`
            ];
            
            for (const endpoint of endpoints) {
                try {
                    console.log(`\n📡 Trying: ${endpoint}`);
                    const response = await fetch(endpoint);
                    console.log(`📊 Response: ${response.status} ${response.statusText}`);
                    
                    if (response.ok) {
                        const data = await response.json();
                        console.log('📄 Data:');
                        console.log(JSON.stringify(data, null, 2));
                    }
                } catch (error) {
                    console.log(`   ❌ Error: ${error.message}`);
                }
            }
        } catch (error) {
            console.log(`❌ Error in additional checks: ${error.message}`);
        }
        
        console.log('\n' + '='.repeat(70));
        console.log('🏁 **TOKEN INVESTIGATION COMPLETE**');
        console.log('='.repeat(70));
        console.log('\n💡 **Summary:**');
        console.log(`• Token ID: ${TARGET_TOKEN_ID}`);
        console.log('• Used public API endpoints to gather all available data');
        console.log('• Checked orderbook, trades, price history, and market info');
        console.log('• All information available without authentication');
        
    } catch (error) {
        console.error('\n❌ **CRITICAL ERROR**:', error.message);
        console.error('📄 Full error details:', error);
    }
}

// Run the token investigation
getTokenDetails()
    .then(() => {
        console.log('\n✅ Token details investigation complete');
        process.exit(0);
    })
    .catch(error => {
        console.error('\n❌ Fatal error:', error);
        process.exit(1);
    }); 