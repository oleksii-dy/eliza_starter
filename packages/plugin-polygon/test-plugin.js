// Simple test script for the Polygon plugin
import * as PolygonPlugin from './dist/index.js';

// Extract the components we need
const { PolygonRpcProvider } = PolygonPlugin;
const DEFAULT_RPC_URLS = {
  ETHEREUM_RPC_URL: "https://mainnet.infura.io/v3/acc75dee85124d4db03ba3b3a9a9e3ab",
  POLYGON_RPC_URL: "https://polygon-mainnet.infura.io/v3/acc75dee85124d4db03ba3b3a9a9e3ab"
};

// Mock runtime for testing
const mockRuntime = {
  getSetting: (key) => {
    const settings = {
      'ETHEREUM_RPC_URL': DEFAULT_RPC_URLS.ETHEREUM_RPC_URL,
      'POLYGON_RPC_URL': DEFAULT_RPC_URLS.POLYGON_RPC_URL,
      // Replace with a test private key if available, otherwise this will fail
      'PRIVATE_KEY': process.env.TEST_PRIVATE_KEY || '0x0000000000000000000000000000000000000000000000000000000000000001'
    };
    return settings[key];
  },
  getCache: () => null,
  setCache: () => Promise.resolve(),
  deleteCache: () => Promise.resolve()
};

async function runTest() {
  console.log('Testing Polygon Plugin...');
  console.log('Using RPC URLs:');
  console.log(`- Ethereum: ${DEFAULT_RPC_URLS.ETHEREUM_RPC_URL}`);
  console.log(`- Polygon: ${DEFAULT_RPC_URLS.POLYGON_RPC_URL}`);
  
  try {
    // Test 1: Initialize provider
    console.log('\nTest 1: Initializing RPC Provider...');
    const provider = new PolygonRpcProvider(
      DEFAULT_RPC_URLS.ETHEREUM_RPC_URL,
      DEFAULT_RPC_URLS.POLYGON_RPC_URL,
      '0x0000000000000000000000000000000000000000000000000000000000000001'
    );
    console.log('✓ Provider initialized successfully');
    
    // Test 2: Get current block number
    console.log('\nTest 2: Getting current block number...');
    const blockNumber = await provider.getBlockNumber('L2');
    console.log(`✓ Current Polygon block number: ${blockNumber}`);
    
    // Test 3: Get MATIC balance of a known address (Polygon Bridge)
    console.log('\nTest 3: Getting MATIC balance...');
    const polygonBridgeAddress = '0x8484Ef722627bf18ca5Ae6BcF031c23E6e922B30';
    const balance = await provider.getNativeBalance(polygonBridgeAddress, 'L2');
    console.log(`✓ Balance of ${polygonBridgeAddress}: ${balance} wei`);
    
    console.log('\nAll tests completed successfully!');
  } catch (error) {
    console.error('Test failed with error:', error);
    process.exit(1);
  }
}

runTest(); 