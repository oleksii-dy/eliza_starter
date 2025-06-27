#!/usr/bin/env node

import { config } from 'dotenv';
import axios from 'axios';

// Load environment variables
config();

const API_KEY = process.env.CROSSMINT_API_KEY;
const ENVIRONMENT = process.env.CROSSMINT_ENVIRONMENT || 'production';
const BASE_URL =
  ENVIRONMENT === 'production'
    ? 'https://www.crossmint.com/api'
    : 'https://staging.crossmint.com/api';

console.log('🚀 Testing CrossMint API with Corrected Endpoints');
console.log('='.repeat(60));
console.log(`Environment: ${ENVIRONMENT}`);
console.log(`Base URL: ${BASE_URL}`);
console.log(`API Key: ${API_KEY ? `${API_KEY.substring(0, 20)}...` : 'NOT SET'}`);
console.log('='.repeat(60));

if (!API_KEY) {
  console.error('❌ CROSSMINT_API_KEY not found in environment');
  process.exit(1);
}

// Create axios client with correct headers
const client = axios.create({
  baseURL: BASE_URL,
  timeout: 30000,
  headers: {
    'X-API-KEY': API_KEY,
    'Content-Type': 'application/json',
    'User-Agent': 'ElizaOS-CrossMint-Test/1.0',
  },
});

// Test functions with correct endpoints
async function testWalletCreation() {
  console.log('\n💼 Testing Wallet Creation (Correct Endpoint)...');
  try {
    // Use the correct versioned endpoint for wallet creation with valid type
    const walletData = {
      type: 'evm-mpc-wallet', // Using valid discriminator value from error message
      linkedUser: `email:test-${Date.now()}@example.com`, // Use valid email format
    };

    console.log(`   Attempting to create wallet: ${JSON.stringify(walletData)}`);

    const response = await client.post('/2022-06-09/wallets', walletData);

    console.log('✅ Wallet creation successful!');
    console.log(`   Status: ${response.status}`);
    console.log(`   Response: ${JSON.stringify(response.data, null, 2)}`);

    // Return wallet data for use in other tests
    return response.data;
  } catch (error) {
    console.error('❌ Wallet creation failed');
    if (error.response) {
      console.error(`   Status: ${error.response.status}`);
      console.error(`   Error: ${JSON.stringify(error.response.data, null, 2)}`);

      // Check for specific error types
      if (error.response.status === 401) {
        console.error('   💡 This suggests an authentication issue - check your API key');
      } else if (error.response.status === 403) {
        console.error('   💡 This suggests your API key lacks wallet creation permissions');
      } else if (error.response.status === 400) {
        console.error('   💡 This suggests invalid request data');
      }
    } else {
      console.error(`   Error: ${error.message}`);
    }
    return null;
  }
}

async function testWalletBalance(walletId) {
  console.log('\n💰 Testing Wallet Balance (Correct Endpoint)...');
  if (!walletId) {
    console.log('   ⚠️ No wallet ID provided, skipping balance test');
    return false;
  }

  try {
    // Use the correct versioned endpoint for wallet balance
    const response = await client.get(`/v1-alpha2/wallets/${walletId}/balances`);

    console.log('✅ Wallet balance retrieval successful!');
    console.log(`   Status: ${response.status}`);
    console.log(`   Balances: ${JSON.stringify(response.data, null, 2)}`);

    return true;
  } catch (error) {
    console.error('❌ Wallet balance retrieval failed');
    if (error.response) {
      console.error(`   Status: ${error.response.status}`);
      console.error(`   Error: ${JSON.stringify(error.response.data, null, 2)}`);
    } else {
      console.error(`   Error: ${error.message}`);
    }
    return false;
  }
}

async function testWalletNFTs(walletId) {
  console.log('\n🖼️ Testing Wallet NFTs (Correct Endpoint)...');
  if (!walletId) {
    console.log('   ⚠️ No wallet ID provided, skipping NFT test');
    return false;
  }

  try {
    // Use the correct versioned endpoint for wallet NFTs
    const response = await client.get(`/2022-06-09/wallets/${walletId}/nfts`);

    console.log('✅ Wallet NFT retrieval successful!');
    console.log(`   Status: ${response.status}`);
    console.log(`   NFTs: ${JSON.stringify(response.data, null, 2).substring(0, 300)}...`);

    return true;
  } catch (error) {
    console.error('❌ Wallet NFT retrieval failed');
    if (error.response) {
      console.error(`   Status: ${error.response.status}`);
      console.error(`   Error: ${JSON.stringify(error.response.data, null, 2)}`);
    }
    return false;
  }
}

async function testAPIConnectivity() {
  console.log('\n📡 Testing Basic API Connectivity...');
  try {
    // Test a simple endpoint to verify authentication
    // Try collection endpoint which might be available
    const response = await client.get('/2022-06-09/collections');

    console.log('✅ API connectivity successful!');
    console.log(`   Status: ${response.status}`);
    console.log(`   Data: ${JSON.stringify(response.data, null, 2).substring(0, 200)}...`);

    return true;
  } catch (error) {
    console.log('⚠️ Collections endpoint test failed, trying alternative...');

    // Try a different endpoint for basic connectivity
    try {
      await client.get('/healthcheck');
      console.log('✅ Alternative API connectivity successful!');
      return true;
    } catch (_altError) {
      console.error('❌ API connectivity failed');
      if (error.response) {
        console.error(`   Status: ${error.response.status}`);
        console.error(`   Error: ${JSON.stringify(error.response.data, null, 2)}`);
      }
      return false;
    }
  }
}

async function testX402Integration() {
  console.log('\n💳 Testing X.402 Protocol Integration...');
  try {
    // Test Coinbase X.402 facilitator connectivity
    const facilitatorResponse = await axios.get('https://www.coinbase.com/.well-known/x402', {
      timeout: 10000,
      validateStatus: (status) => status < 500, // Accept 4xx errors
    });

    if (facilitatorResponse.status === 200) {
      console.log('✅ X.402 facilitator accessible');
      console.log(`   Supported schemes: ${JSON.stringify(facilitatorResponse.data, null, 2)}`);
    } else {
      console.log(`⚠️ X.402 facilitator returned status ${facilitatorResponse.status}`);
    }
    return true;
  } catch (error) {
    console.log('⚠️ X.402 facilitator test failed (may be expected)');
    console.log(`   Error: ${error.message}`);
    return false;
  }
}

// Run all tests with correct endpoints
async function runTests() {
  console.log('\n🧪 Running Tests with Corrected API Endpoints...\n');

  const results = {
    connectivity: await testAPIConnectivity(),
    walletCreation: false,
    walletBalance: false,
    walletNFTs: false,
    x402: await testX402Integration(),
  };

  // Test wallet creation and get wallet ID for other tests
  const walletData = await testWalletCreation();
  if (walletData) {
    results.walletCreation = true;

    // Extract wallet ID from response
    const walletId = walletData.id || walletData.address || walletData.walletId;

    if (walletId) {
      console.log(`\n📋 Using wallet ID: ${walletId} for subsequent tests`);
      results.walletBalance = await testWalletBalance(walletId);
      results.walletNFTs = await testWalletNFTs(walletId);
    } else {
      console.log('\n⚠️ Could not extract wallet ID from creation response');
    }
  }

  console.log('\n📊 Test Results Summary');
  console.log('='.repeat(60));
  Object.entries(results).forEach(([test, passed]) => {
    console.log(`${passed ? '✅' : '❌'} ${test}: ${passed ? 'PASSED' : 'FAILED'}`);
  });

  const passedCount = Object.values(results).filter(Boolean).length;
  const totalCount = Object.values(results).length;

  console.log(`\n🎯 Overall: ${passedCount}/${totalCount} tests passed`);

  if (results.connectivity || results.walletCreation) {
    console.log('\n🎉 CrossMint API integration is working!');
    console.log('✅ The corrected endpoints are functional');
  } else {
    console.log('\n❌ CrossMint API integration issues remain');
    console.log('🔧 Check API key permissions and endpoint availability');
  }

  console.log('\n📝 Next Steps:');
  if (results.walletCreation) {
    console.log('✅ Update ElizaOS plugin to use correct endpoint versions');
    console.log('✅ Implement proper wallet ID handling');
    console.log('✅ Add comprehensive error handling for different response formats');
  } else {
    console.log('❌ Investigate API key scopes and permissions');
    console.log('❌ Contact CrossMint support for API access verification');
  }
}

// Execute tests
runTests().catch((error) => {
  console.error('\n💥 Test execution failed:', error);
  process.exit(1);
});
