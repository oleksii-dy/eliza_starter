#!/usr/bin/env node

import { polymarketPlugin } from './dist/index.js';

// Test the plugin actions array order
console.log('🔍 Testing Polymarket Plugin Action Order\n');

const actions = polymarketPlugin.actions || [];

console.log('✅ Action Priority Order:');
actions.forEach((action, index) => {
    console.log(`${index + 1}. ${action.name} - ${action.description?.substring(0, 60)}...`);
});

console.log('\n📊 Key Action Positions:');
const orderDetailsIndex = actions.findIndex(a => a.name === 'GET_ORDER_DETAILS');
const marketDetailsIndex = actions.findIndex(a => a.name === 'GET_MARKET_DETAILS');

console.log(`• GET_ORDER_DETAILS: Position ${orderDetailsIndex + 1}`);
console.log(`• GET_MARKET_DETAILS: Position ${marketDetailsIndex + 1}`);

if (orderDetailsIndex < marketDetailsIndex && orderDetailsIndex !== -1) {
    console.log('✅ Order actions are correctly prioritized over market actions!');
} else {
    console.log('❌ Action prioritization needs fixing');
}

// Test similes
const orderAction = actions.find(a => a.name === 'GET_ORDER_DETAILS');
if (orderAction) {
    console.log('\n🎯 Order Details Action Similes:');
    orderAction.similes?.forEach(simile => console.log(`  • ${simile}`));
} 