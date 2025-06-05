const TARGET_MARKET_ID = '0x4364972f0b5f33379092da7564811c02acd0069d45c7c3046cfb17f9f01cd236';

console.log('🔍 **PUBLIC API CALLS - MARKET VERIFICATION**');
console.log('='.repeat(60));
console.log(`📊 Target Market ID: ${TARGET_MARKET_ID}`);
console.log('='.repeat(60));

async function checkMarketPublicData() {
    try {
        const clobApiUrl = 'https://clob.polymarket.com';
        
        // Step 1: Check if market exists
        console.log('\n🏪 **Step 1: Verifying market exists...**');
        try {
            const marketUrl = `${clobApiUrl}/markets/${TARGET_MARKET_ID}`;
            console.log(`📡 GET ${marketUrl}`);
            
            const marketResponse = await fetch(marketUrl);
            console.log(`📊 Response status: ${marketResponse.status} ${marketResponse.statusText}`);
            
            if (!marketResponse.ok) {
                console.log('❌ Market not found or API error');
                if (marketResponse.status === 404) {
                    console.log('   This market ID may not exist or may be inactive');
                }
            } else {
                const marketData = await marketResponse.json();
                console.log('✅ Market found:');
                console.log(`   Market Info:`, JSON.stringify(marketData, null, 2));
            }
        } catch (error) {
            console.log(`❌ Error checking market: ${error.message}`);
        }
        
        // Step 2: Check orderbook data (this should show active orders if any)
        console.log('\n📚 **Step 2: Checking orderbook data...**');
        try {
            // Get all tokens for this market first
            const marketUrl = `${clobApiUrl}/markets/${TARGET_MARKET_ID}`;
            const marketResponse = await fetch(marketUrl);
            
            if (marketResponse.ok) {
                const marketData = await marketResponse.json();
                console.log(`📊 Market has ${marketData.tokens?.length || 0} tokens`);
                
                if (marketData.tokens && marketData.tokens.length > 0) {
                    for (let i = 0; i < marketData.tokens.length; i++) {
                        const token = marketData.tokens[i];
                        console.log(`\n🎯 **Token ${i + 1}: ${token.token_id}**`);
                        console.log(`   Outcome: ${token.outcome}`);
                        
                        // Check orderbook for this token
                        const orderbookUrl = `${clobApiUrl}/book?token_id=${token.token_id}`;
                        console.log(`📡 GET ${orderbookUrl}`);
                        
                        try {
                            const orderbookResponse = await fetch(orderbookUrl);
                            console.log(`📊 Orderbook response: ${orderbookResponse.status} ${orderbookResponse.statusText}`);
                            
                            if (orderbookResponse.ok) {
                                const orderbookData = await orderbookResponse.json();
                                
                                const bids = orderbookData.bids || [];
                                const asks = orderbookData.asks || [];
                                
                                console.log(`   📈 Active bids: ${bids.length}`);
                                console.log(`   📉 Active asks: ${asks.length}`);
                                
                                if (bids.length > 0) {
                                    console.log(`   🟢 Top 3 bids:`);
                                    bids.slice(0, 3).forEach((bid, idx) => {
                                        console.log(`      ${idx + 1}. $${bid.price} for ${bid.size} shares`);
                                    });
                                }
                                
                                if (asks.length > 0) {
                                    console.log(`   🔴 Top 3 asks:`);
                                    asks.slice(0, 3).forEach((ask, idx) => {
                                        console.log(`      ${idx + 1}. $${ask.price} for ${ask.size} shares`);
                                    });
                                }
                                
                                if (bids.length === 0 && asks.length === 0) {
                                    console.log('   ✅ No active orders in orderbook for this token');
                                }
                            } else {
                                console.log(`   ❌ Could not fetch orderbook: ${orderbookResponse.status}`);
                            }
                        } catch (error) {
                            console.log(`   ❌ Error fetching orderbook: ${error.message}`);
                        }
                    }
                } else {
                    console.log('⚠️ No tokens found for this market');
                }
            } else {
                console.log('❌ Could not fetch market data for orderbook check');
            }
        } catch (error) {
            console.log(`❌ Error in orderbook check: ${error.message}`);
        }
        
        // Step 3: Check market stats
        console.log('\n📊 **Step 3: Checking market statistics...**');
        try {
            const statsUrl = `${clobApiUrl}/stats/markets/${TARGET_MARKET_ID}`;
            console.log(`📡 GET ${statsUrl}`);
            
            const statsResponse = await fetch(statsUrl);
            console.log(`📊 Stats response: ${statsResponse.status} ${statsResponse.statusText}`);
            
            if (statsResponse.ok) {
                const statsData = await statsResponse.json();
                console.log('📈 Market Statistics:');
                console.log(JSON.stringify(statsData, null, 2));
            } else {
                console.log('❌ Could not fetch market statistics');
            }
        } catch (error) {
            console.log(`❌ Error fetching market stats: ${error.message}`);
        }
        
        // Step 4: Alternative approach - check trades
        console.log('\n💱 **Step 4: Checking recent trades...**');
        try {
            const tradesUrl = `${clobApiUrl}/trades?market=${TARGET_MARKET_ID}&limit=10`;
            console.log(`📡 GET ${tradesUrl}`);
            
            const tradesResponse = await fetch(tradesUrl);
            console.log(`📊 Trades response: ${tradesResponse.status} ${tradesResponse.statusText}`);
            
            if (tradesResponse.ok) {
                const tradesData = await tradesResponse.json();
                const trades = Array.isArray(tradesData) ? tradesData : tradesData.data || [];
                
                console.log(`💰 Recent trades: ${trades.length}`);
                
                if (trades.length > 0) {
                    console.log('🔄 Last 5 trades:');
                    trades.slice(0, 5).forEach((trade, idx) => {
                        const timestamp = new Date(trade.timestamp).toLocaleString();
                        console.log(`   ${idx + 1}. $${trade.price} × ${trade.size} @ ${timestamp}`);
                    });
                } else {
                    console.log('   ✅ No recent trades found');
                }
            } else {
                console.log('❌ Could not fetch recent trades');
            }
        } catch (error) {
            console.log(`❌ Error fetching trades: ${error.message}`);
        }
        
        // Step 5: Direct orderbook check by token IDs
        console.log('\n🔍 **Step 5: Direct token orderbook verification...**');
        
        // These are common token patterns for the market
        const possibleTokenPatterns = [
            TARGET_MARKET_ID, // Sometimes the market ID is also a token ID
            TARGET_MARKET_ID.replace('0x', '').substring(0, 40), // Truncated version
            // Add more patterns if needed
        ];
        
        for (const tokenId of possibleTokenPatterns) {
            try {
                console.log(`\n🎯 Checking token: ${tokenId}`);
                const orderbookUrl = `${clobApiUrl}/book?token_id=${tokenId}`;
                console.log(`📡 GET ${orderbookUrl}`);
                
                const response = await fetch(orderbookUrl);
                console.log(`📊 Response: ${response.status} ${response.statusText}`);
                
                if (response.ok) {
                    const data = await response.json();
                    const bids = data.bids || [];
                    const asks = data.asks || [];
                    
                    console.log(`   📈 Bids: ${bids.length}`);
                    console.log(`   📉 Asks: ${asks.length}`);
                    
                    if (bids.length > 0 || asks.length > 0) {
                        console.log('   🎯 ACTIVE ORDERS FOUND!');
                        if (bids.length > 0) {
                            console.log(`   🟢 Best bid: $${bids[0].price} for ${bids[0].size}`);
                        }
                        if (asks.length > 0) {
                            console.log(`   🔴 Best ask: $${asks[0].price} for ${asks[0].size}`);
                        }
                    } else {
                        console.log('   ✅ No active orders for this token');
                    }
                } else if (response.status === 404) {
                    console.log('   ❌ Token not found');
                } else {
                    console.log(`   ❌ Error: ${response.status}`);
                }
            } catch (error) {
                console.log(`   ❌ Error checking token ${tokenId}: ${error.message}`);
            }
        }
        
        console.log('\n' + '='.repeat(60));
        console.log('🏁 **PUBLIC VERIFICATION COMPLETE**');
        console.log('='.repeat(60));
        console.log('\n💡 **Summary:**');
        console.log('• Used public API endpoints (no authentication required)');
        console.log('• Checked market existence and structure');
        console.log('• Verified orderbook data for active orders');
        console.log('• Examined recent trading activity');
        console.log('\n📝 **Note:** For wallet-specific orders, authentication is required.');
        
    } catch (error) {
        console.error('\n❌ **CRITICAL ERROR**:', error.message);
        console.error('📄 Full error details:', error);
    }
}

// Run the public verification
checkMarketPublicData()
    .then(() => {
        console.log('\n✅ Public market verification complete');
        process.exit(0);
    })
    .catch(error => {
        console.error('\n❌ Fatal error:', error);
        process.exit(1);
    }); 