// Simple test to verify RPC URLs
import { createPublicClient, http } from 'viem';
import { mainnet, polygon } from 'viem/chains';

// Use the Infura RPC URLs
const ETHEREUM_RPC_URL = "https://mainnet.infura.io/v3/acc75dee85124d4db03ba3b3a9a9e3ab";
const POLYGON_RPC_URL = "https://polygon-mainnet.infura.io/v3/acc75dee85124d4db03ba3b3a9a9e3ab";

async function testRpcConnectivity() {
  console.log('Testing RPC connectivity...');
  console.log(`Ethereum RPC URL: ${ETHEREUM_RPC_URL}`);
  console.log(`Polygon RPC URL: ${POLYGON_RPC_URL}`);
  
  try {
    // Test Ethereum RPC
    console.log('\nTesting Ethereum (L1) RPC connection...');
    const ethereumClient = createPublicClient({
      chain: mainnet,
      transport: http(ETHEREUM_RPC_URL)
    });
    
    const ethereumBlockNumber = await ethereumClient.getBlockNumber();
    console.log(`✓ Ethereum connection successful! Current block: ${ethereumBlockNumber}`);
    
    // Test Polygon RPC
    console.log('\nTesting Polygon (L2) RPC connection...');
    const polygonClient = createPublicClient({
      chain: polygon,
      transport: http(POLYGON_RPC_URL)
    });
    
    const polygonBlockNumber = await polygonClient.getBlockNumber();
    console.log(`✓ Polygon connection successful! Current block: ${polygonBlockNumber}`);
    
    console.log('\nAll RPC connections are working correctly!');
  } catch (error) {
    console.error('RPC connection test failed:', error);
    process.exit(1);
  }
}

testRpcConnectivity(); 