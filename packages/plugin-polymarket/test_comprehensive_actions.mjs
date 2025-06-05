#!/usr/bin/env node

import { polymarketPlugin } from './dist/index.js';

console.log('🎯 Comprehensive Action Selection Test\n');

const actions = polymarketPlugin.actions || [];

// Test order details action
const orderDetailsAction = actions.find(a => a.name === 'GET_ORDER_DETAILS');
const orderBookAction = actions.find(a => a.name === 'GET_ORDER_BOOK');

console.log('📦 GET_ORDER_DETAILS Action:');
console.log(`  • Position: ${actions.findIndex(a => a.name === 'GET_ORDER_DETAILS') + 1}`);
console.log(`  • Description: ${orderDetailsAction?.description?.substring(0, 100)}...`);
console.log(`  • Similes (${orderDetailsAction?.similes?.length}): ${orderDetailsAction?.similes?.slice(0, 5).join(', ')}...`);
console.log(`  • Examples: ${orderDetailsAction?.examples?.length}`);

console.log('\n📖 GET_ORDER_BOOK Action:');
console.log(`  • Position: ${actions.findIndex(a => a.name === 'GET_ORDER_BOOK') + 1}`);
console.log(`  • Description: ${orderBookAction?.description?.substring(0, 100)}...`);
console.log(`  • Similes (${orderBookAction?.similes?.length}): ${orderBookAction?.similes?.slice(0, 5).join(', ')}...`);
console.log(`  • Examples: ${orderBookAction?.examples?.length}`);

console.log('\n🔍 Action Conflicts Analysis:');
const orderDetailsSimiles = new Set(orderDetailsAction?.similes || []);
const orderBookSimiles = new Set(orderBookAction?.similes || []);

// Find overlapping similes
const overlaps = [...orderDetailsSimiles].filter(simile => orderBookSimiles.has(simile));
console.log(`  • Overlapping similes: ${overlaps.length === 0 ? 'None ✅' : overlaps.join(', ') + ' ❌'}`);

// Test specific phrases
const testPhrases = [
    'Get details for order 0x41483bba4be4734faf3cd6810e76d81023318267f7a5210f95141dbe91398245',
    'Show me order details for 0x123...',
    'ORDER_DETAILS 0x456...',
    'Check order status 0x789...',
    'Retrieve order 0xabc...',
    'Show order book for token 123456',
    'Get order book summary for token 789012',
    'ORDER_BOOK_SUMMARY 345678',
    'Show market depth for token 999999'
];

console.log('\n📝 Test Phrases Analysis:');
testPhrases.forEach((phrase, i) => {
    const isOrderPhrase = phrase.toLowerCase().includes('order 0x') || 
                         phrase.toLowerCase().includes('order details') ||
                         phrase.toLowerCase().includes('order status') ||
                         phrase.toLowerCase().includes('retrieve order');
    const isBookPhrase = phrase.toLowerCase().includes('token ') ||
                        phrase.toLowerCase().includes('book') ||
                        phrase.toLowerCase().includes('market depth');
    
    const expectedAction = isOrderPhrase ? 'GET_ORDER_DETAILS' : 
                          isBookPhrase ? 'GET_ORDER_BOOK' : 'UNCLEAR';
    
    console.log(`  ${i + 1}. "${phrase.substring(0, 50)}..." → Expected: ${expectedAction}`);
});

console.log('\n✅ Summary:');
console.log(`  • Order Details: Position ${actions.findIndex(a => a.name === 'GET_ORDER_DETAILS') + 1}, ${orderDetailsAction?.similes?.length} similes, ${orderDetailsAction?.examples?.length} examples`);
console.log(`  • Order Book: Position ${actions.findIndex(a => a.name === 'GET_ORDER_BOOK') + 1}, ${orderBookAction?.similes?.length} similes, ${orderBookAction?.examples?.length} examples`);
console.log(`  • Conflicts: ${overlaps.length === 0 ? '✅ None' : '❌ ' + overlaps.length}`);
console.log(`  • Ready for testing: ${overlaps.length === 0 && orderDetailsAction && orderBookAction ? '✅ YES' : '❌ NO'}`); 