#!/usr/bin/env node

import { config } from 'dotenv';
import axios from 'axios';

config();

const API_KEY = process.env.CROSSMINT_API_KEY;

console.log('🔍 Debugging CrossMint API');
console.log('API Key length:', API_KEY?.length);
console.log('API Key prefix:', API_KEY?.substring(0, 15));

// Test multiple endpoint variations
const testEndpoints = [
  'https://www.crossmint.com/api/2022-06-09/wallets',
  'https://www.crossmint.com/api/v1/wallets',
  'https://www.crossmint.com/api/wallets',
  'https://staging.crossmint.com/api/2022-06-09/wallets',
  'https://api.crossmint.com/2022-06-09/wallets',
  'https://www.crossmint.com/v1/wallets',
];

for (const url of testEndpoints) {
  console.log(`\n🌐 Testing: ${url}`);
  try {
    const response = await axios.get(url, {
      headers: {
        'X-API-KEY': API_KEY,
        'Content-Type': 'application/json',
      },
      timeout: 10000,
    });
    console.log(`✅ SUCCESS: ${response.status}`);
    console.log(`Data: ${JSON.stringify(response.data).substring(0, 100)}...`);
  } catch (error) {
    if (error.response) {
      console.log(`❌ ${error.response.status}: ${error.response.statusText}`);
      if (error.response.data) {
        console.log(`Error: ${JSON.stringify(error.response.data)}`);
      }
    } else {
      console.log(`❌ Network error: ${error.message}`);
    }
  }
}

// Test authentication specifically
console.log('\n🔐 Testing API Key Authentication...');
try {
  await axios.get('https://www.crossmint.com/api/2022-06-09/wallets', {
    headers: {
      Authorization: `Bearer ${API_KEY}`,
      'Content-Type': 'application/json',
    },
    timeout: 10000,
  });
  console.log('✅ Bearer auth worked');
} catch (error) {
  console.log('❌ Bearer auth failed:', error.response?.status);
}
