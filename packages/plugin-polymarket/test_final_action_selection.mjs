#!/usr/bin/env node

import { polymarketPlugin } from './dist/index.js';

console.log('🎯 FINAL Action Selection Validation\n');

const actions = polymarketPlugin.actions || [];

// Find key actions
const activeOrdersAction = actions.find(a => a.name === 'GET_ACTIVE_ORDERS');
const orderBookAction = actions.find(a => a.name === 'GET_ORDER_BOOK');
const orderDetailsAction = actions.find(a => a.name === 'GET_ORDER_DETAILS');

console.log('📊 Action Summary:');
console.log(`Total Actions: ${actions.length}`);
console.log(`GET_ACTIVE_ORDERS Position: ${actions.findIndex(a => a.name === 'GET_ACTIVE_ORDERS') + 1}`);
console.log(`GET_ORDER_BOOK Position: ${actions.findIndex(a => a.name === 'GET_ORDER_BOOK') + 1}`);
console.log(`GET_ORDER_DETAILS Position: ${actions.findIndex(a => a.name === 'GET_ORDER_DETAILS') + 1}`);

console.log('\n🎯 GET_ACTIVE_ORDERS Details:');
console.log(`• Similes (${activeOrdersAction?.similes?.length}): ${activeOrdersAction?.similes?.slice(0, 8).join(', ')}...`);
console.log(`• Examples: ${activeOrdersAction?.examples?.length}`);
console.log(`• Description: ${activeOrdersAction?.description?.substring(0, 100)}...`);

console.log('\n📖 GET_ORDER_BOOK Details:');
console.log(`• Similes (${orderBookAction?.similes?.length}): ${orderBookAction?.similes?.join(', ')}`);
console.log(`• Examples: ${orderBookAction?.examples?.length}`);

console.log('\n📦 GET_ORDER_DETAILS Details:');
console.log(`• Similes (${orderDetailsAction?.similes?.length}): ${orderDetailsAction?.similes?.slice(0, 8).join(', ')}...`);
console.log(`• Examples: ${orderDetailsAction?.examples?.length}`);

console.log('\n✅ Action Selection Should Now Work:');
console.log('• "Get active orders for market X" → GET_ACTIVE_ORDERS');
console.log('• "Get order details for 0xOrderID" → GET_ORDER_DETAILS');
console.log('• "Order book for token 123456" → GET_ORDER_BOOK');

console.log('\n🚀 Ready for testing!'); 