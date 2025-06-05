import { ClobClient } from "@polymarket/clob-client";
import fetch from 'node-fetch';
import fs from 'fs';

console.log("🚀 FETCHING ACTIVE MARKETS FROM POLYMARKET API");
console.log("=".repeat(50));

// Polymarket Gamma API endpoint for markets
const GAMMA_API_BASE = "https://gamma-api.polymarket.com";

async function fetchActiveMarkets() {
    try {
        console.log("📡 Fetching active markets from Polymarket Gamma API...\n");
        
        // Fetch active markets
        const response = await fetch(`${GAMMA_API_BASE}/markets?active=true&closed=false&limit=20`);
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        const markets = data.data || data;
        
        console.log(`📊 Found ${markets.length} active markets\n`);
        
        const activeTokenIds = new Set();
        const marketInfo = [];
        
        markets.forEach((market, index) => {
            console.log(`🎯 Market ${index + 1}: "${market.question}"`);
            console.log(`   Category: ${market.category}`);
            console.log(`   Active: ${market.active}`);
            console.log(`   Closed: ${market.closed}`);
            console.log(`   End Date: ${market.endDate}`);
            
            if (market.clobTokenIds) {
                let tokenIds = [];
                
                // Handle different formats of clobTokenIds
                if (typeof market.clobTokenIds === 'string') {
                    try {
                        tokenIds = JSON.parse(market.clobTokenIds);
                    } catch (e) {
                        console.log(`   ⚠️  Could not parse clobTokenIds: ${market.clobTokenIds}`);
                        return;
                    }
                } else if (Array.isArray(market.clobTokenIds)) {
                    tokenIds = market.clobTokenIds;
                }
                
                console.log(`   Token IDs (${tokenIds.length}):`);
                tokenIds.forEach((tokenId, i) => {
                    console.log(`     ${i + 1}. ${tokenId}`);
                    activeTokenIds.add(tokenId);
                });
                
                marketInfo.push({
                    id: market.id,
                    question: market.question,
                    category: market.category,
                    tokenIds: tokenIds,
                    active: market.active,
                    closed: market.closed,
                    endDate: market.endDate,
                    volume: market.volume || 0
                });
            } else {
                console.log(`   ⚠️  No clobTokenIds found`);
            }
            
            console.log("");
        });
        
        const sortedActiveTokenIds = Array.from(activeTokenIds).sort();
        
        console.log("=".repeat(50));
        console.log("📈 ACTIVE MARKETS SUMMARY");
        console.log("=".repeat(50));
        
        console.log(`Total Active Markets: ${markets.length}`);
        console.log(`Markets with Token IDs: ${marketInfo.length}`);
        console.log(`Total Unique Active Token IDs: ${sortedActiveTokenIds.length}`);
        
        console.log("\n🎯 ALL ACTIVE TOKEN IDs:");
        console.log("-".repeat(30));
        sortedActiveTokenIds.forEach((tokenId, index) => {
            console.log(`${String(index + 1).padStart(2, ' ')}. ${tokenId}`);
        });
        
        // Create formatted array for easy copying
        console.log("\n📋 FORMATTED ACTIVE TOKEN ID ARRAY:");
        console.log("-".repeat(40));
        console.log('const ACTIVE_TOKEN_IDS = [');
        sortedActiveTokenIds.forEach((tokenId, index) => {
            const comma = index < sortedActiveTokenIds.length - 1 ? ',' : '';
            console.log(`    "${tokenId}"${comma}`);
        });
        console.log('];');
        
        // Save results
        const outputData = {
            fetchDate: new Date().toISOString(),
            totalMarkets: markets.length,
            marketsWithTokens: marketInfo.length,
            totalUniqueTokens: sortedActiveTokenIds.length,
            activeTokenIds: sortedActiveTokenIds,
            markets: marketInfo
        };
        
        fs.writeFileSync('active_markets.json', JSON.stringify(outputData, null, 2));
        console.log("\n💾 Results saved to 'active_markets.json'");
        
        return sortedActiveTokenIds;
        
    } catch (error) {
        console.error("❌ Error fetching active markets:", error.message);
        
        // Fallback: try different endpoint formats
        console.log("\n🔄 Trying alternative API endpoint...");
        
        try {
            const fallbackResponse = await fetch(`${GAMMA_API_BASE}/markets`);
            if (fallbackResponse.ok) {
                const fallbackData = await fallbackResponse.json();
                console.log("✅ Fallback API response received:");
                console.log("Sample data structure:", JSON.stringify(fallbackData, null, 2).substring(0, 500) + "...");
            }
        } catch (fallbackError) {
            console.error("❌ Fallback also failed:", fallbackError.message);
        }
        
        return [];
    }
}

async function testActiveOrderBooks(tokenIds) {
    if (tokenIds.length === 0) {
        console.log("⚠️  No active token IDs to test");
        return;
    }
    
    console.log(`\n🔍 TESTING ORDER BOOKS FOR ${tokenIds.length} ACTIVE TOKENS`);
    console.log("=".repeat(50));
    
    const client = new ClobClient("https://clob.polymarket.com");
    
    const results = {
        hasOrderBook: [],
        noOrderBook: [],
        errors: []
    };
    
    for (let i = 0; i < Math.min(tokenIds.length, 10); i++) { // Test first 10 for speed
        const tokenId = tokenIds[i];
        
        try {
            console.log(`🔍 [${i + 1}/${Math.min(tokenIds.length, 10)}] Testing: ${tokenId.substring(0, 20)}...`);
            
            const orderBook = await client.getOrderBook(tokenId);
            
            if (orderBook && (orderBook.bids?.length > 0 || orderBook.asks?.length > 0)) {
                const totalOrders = (orderBook.bids?.length || 0) + (orderBook.asks?.length || 0);
                console.log(`   ✅ ACTIVE ORDER BOOK - ${totalOrders} orders (${orderBook.bids?.length || 0} bids, ${orderBook.asks?.length || 0} asks)`);
                
                results.hasOrderBook.push({
                    tokenId,
                    bids: orderBook.bids?.length || 0,
                    asks: orderBook.asks?.length || 0,
                    totalOrders
                });
            } else {
                console.log(`   ⚠️  EMPTY ORDER BOOK`);
                results.noOrderBook.push({ tokenId, reason: "Empty" });
            }
            
        } catch (error) {
            if (error.message?.includes('404')) {
                console.log(`   ❌ NO ORDER BOOK - 404`);
                results.noOrderBook.push({ tokenId, reason: "404 Not Found" });
            } else {
                console.log(`   🚫 ERROR - ${error.message}`);
                results.errors.push({ tokenId, error: error.message });
            }
        }
        
        // Rate limiting delay
        await new Promise(resolve => setTimeout(resolve, 200));
    }
    
    console.log("\n📊 ORDER BOOK TEST RESULTS:");
    console.log(`✅ Active Order Books: ${results.hasOrderBook.length}`);
    console.log(`❌ No Order Books: ${results.noOrderBook.length}`);
    console.log(`🚫 Errors: ${results.errors.length}`);
    
    if (results.hasOrderBook.length > 0) {
        console.log("\n🎯 TOKENS WITH ACTIVE ORDER BOOKS:");
        results.hasOrderBook.forEach((result, index) => {
            console.log(`${index + 1}. ${result.tokenId} (${result.totalOrders} orders)`);
        });
    }
    
    return results;
}

async function main() {
    const activeTokenIds = await fetchActiveMarkets();
    
    if (activeTokenIds.length > 0) {
        console.log("\n" + "=".repeat(50));
        await testActiveOrderBooks(activeTokenIds);
    }
    
    console.log("\n🏁 Active market fetch and test completed!");
}

// Run the script
main().catch(console.error); 