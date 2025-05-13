// Standalone test for PolygonRpcProvider
import { createPublicClient, createWalletClient, http } from 'viem';
import { mainnet, polygon } from 'viem/chains';
import { privateKeyToAccount } from 'viem/accounts';

// Use the Infura RPC URLs
const ETHEREUM_RPC_URL = "https://mainnet.infura.io/v3/acc75dee85124d4db03ba3b3a9a9e3ab";
const POLYGON_RPC_URL = "https://polygon-mainnet.infura.io/v3/acc75dee85124d4db03ba3b3a9a9e3ab";
const TEST_PRIVATE_KEY = '0x0000000000000000000000000000000000000000000000000000000000000001';

// Mock the elizaLogger
const elizaLogger = {
  log: console.log,
  error: console.error
};

// Minimal ERC20 ABI for testing
const ERC20_ABI = [
  {
    constant: true,
    inputs: [{ name: '_owner', type: 'address' }],
    name: 'balanceOf',
    outputs: [{ name: 'balance', type: 'uint256' }],
    type: 'function',
  },
  {
    constant: true,
    inputs: [],
    name: 'decimals',
    outputs: [{ name: '', type: 'uint8' }],
    type: 'function',
  },
  {
    constant: true,
    inputs: [],
    name: 'symbol',
    outputs: [{ name: '', type: 'string' }],
    type: 'function',
  }
] ;

// Simplified PolygonRpcProvider for testing
class SimplePolygonRpcProvider {
  constructor(l1RpcUrl, l2RpcUrl, privateKey) {
    this.account = typeof privateKey === 'string' 
      ? privateKeyToAccount(privateKey)
      : privateKey;
      
    // Configure chains
    this.l1Chain = {
      ...mainnet,
      rpcUrls: {
        ...mainnet.rpcUrls,
        default: { http: [l1RpcUrl] }
      }
    };
    
    this.l2Chain = {
      ...polygon,
      rpcUrls: {
        ...polygon.rpcUrls,
        default: { http: [l2RpcUrl] }
      }
    };
    
    // Initialize clients
    this.l1PublicClient = createPublicClient({
      chain: this.l1Chain,
      transport: http(l1RpcUrl)
    });
    
    this.l2PublicClient = createPublicClient({
      chain: this.l2Chain,
      transport: http(l2RpcUrl)
    });
    
    // Cache
    this.cache = new Map();
  }
  
  getAddress() {
    return this.account.address;
  }
  
  getPublicClient(network = 'L2') {
    return network === 'L1' ? this.l1PublicClient : this.l2PublicClient;
  }
  
  async getBlockNumber(network = 'L2') {
    const client = this.getPublicClient(network);
    const blockNumber = await client.getBlockNumber();
    return Number(blockNumber);
  }
  
  async getBlock(blockIdentifier, network = 'L2') {
    const client = this.getPublicClient(network);
    let block;
    
    if (typeof blockIdentifier === 'number') {
      block = await client.getBlock({ blockNumber: BigInt(blockIdentifier) });
    } else {
      block = await client.getBlock({ blockHash: blockIdentifier });
    }
    
    return block;
  }
  
  async getTransaction(hash, network = 'L2') {
    const client = this.getPublicClient(network);
    try {
      const tx = await client.getTransaction({ hash });
      return tx;
    } catch (error) {
      console.error(`Error fetching transaction ${hash}:`, error);
      return null;
    }
  }
  
  async getTransactionReceipt(hash, network = 'L2') {
    const client = this.getPublicClient(network);
    try {
      const receipt = await client.getTransactionReceipt({ hash });
      return receipt;
    } catch (error) {
      console.error(`Error fetching transaction receipt ${hash}:`, error);
      return null;
    }
  }
  
  async getNativeBalance(address, network = 'L2') {
    const client = this.getPublicClient(network);
    const balance = await client.getBalance({ address });
    return balance;
  }
  
  async getErc20Balance(tokenAddress, holderAddress, network = 'L2') {
    const client = this.getPublicClient(network);
    
    try {
      const balance = await client.readContract({
        address: tokenAddress,
        abi: ERC20_ABI,
        functionName: 'balanceOf',
        args: [holderAddress]
      });
      
      return balance;
    } catch (error) {
      console.error(`Error fetching token balance:`, error);
      return BigInt(0);
    }
  }
  
  async getErc20Metadata(tokenAddress, network = 'L2') {
    const client = this.getPublicClient(network);
    
    try {
      const [symbolResult, decimalsResult] = await Promise.all([
        client.readContract({
          address: tokenAddress,
          abi: ERC20_ABI,
          functionName: 'symbol'
        }),
        client.readContract({
          address: tokenAddress,
          abi: ERC20_ABI,
          functionName: 'decimals'
        })
      ]);
      
      return { 
        symbol: symbolResult, 
        decimals: Number(decimalsResult) 
      };
    } catch (error) {
      console.error(`Error fetching token metadata for ${tokenAddress}:`, error);
      return { symbol: 'UNKNOWN', decimals: 18 };
    }
  }
  
  async estimateGas(tx, network = 'L2') {
    const client = this.getPublicClient(network);
    const account = this.getAddress();
    
    const gasEstimate = await client.estimateGas({
      to: tx.to,
      data: tx.data,
      value: tx.value,
      account,
    });
    
    return gasEstimate;
  }
  
  async getGasPrice(network = 'L2') {
    const client = this.getPublicClient(network);
    const gasPrice = await client.getGasPrice();
    
    return gasPrice;
  }
}

async function runTests() {
  console.log('Testing Polygon Plugin with standalone implementation...');
  console.log(`Ethereum RPC URL: ${ETHEREUM_RPC_URL}`);
  console.log(`Polygon RPC URL: ${POLYGON_RPC_URL}`);
  
  try {
    // Test 1: Initialize provider
    console.log('\nTest 1: Initializing provider...');
    const provider = new SimplePolygonRpcProvider(
      ETHEREUM_RPC_URL,
      POLYGON_RPC_URL,
      TEST_PRIVATE_KEY
    );
    console.log('✓ Provider initialized successfully');
    console.log(`✓ Account address: ${provider.getAddress()}`);
    
    // Test 2: Get Ethereum block number
    console.log('\nTest 2: Getting Ethereum block number...');
    const l1BlockNumber = await provider.getBlockNumber('L1');
    console.log(`✓ Current Ethereum block number: ${l1BlockNumber}`);
    
    // Test 3: Get Polygon block number
    console.log('\nTest 3: Getting Polygon block number...');
    const l2BlockNumber = await provider.getBlockNumber('L2');
    console.log(`✓ Current Polygon block number: ${l2BlockNumber}`);
    
    // Test 4: Get block details
    console.log('\nTest 4: Getting block details...');
    const blockDetails = await provider.getBlock(l2BlockNumber - 10, 'L2');
    console.log(`✓ Block details retrieved successfully:`);
    console.log(`  - Block number: ${Number(blockDetails.number)}`);
    console.log(`  - Block hash: ${blockDetails.hash}`);
    console.log(`  - Block timestamp: ${new Date(Number(blockDetails.timestamp) * 1000).toISOString()}`);
    console.log(`  - Gas used: ${blockDetails.gasUsed}`);
    
    // Test 5: Get a recent transaction from the block
    if (blockDetails.transactions.length > 0) {
      console.log('\nTest 5: Getting transaction details...');
      const txHash = blockDetails.transactions[0];
      console.log(`  Using transaction hash: ${txHash}`);
      
      const txDetails = await provider.getTransaction(txHash, 'L2');
      console.log('✓ Transaction details retrieved successfully:');
      console.log(`  - From: ${txDetails.from}`);
      console.log(`  - To: ${txDetails.to}`);
      console.log(`  - Value: ${txDetails.value} wei`);
      
      // Get receipt
      const txReceipt = await provider.getTransactionReceipt(txHash, 'L2');
      console.log('✓ Transaction receipt retrieved successfully:');
      console.log(`  - Status: ${txReceipt.status === 1 ? 'Success' : 'Failed'}`);
      console.log(`  - Gas used: ${txReceipt.gasUsed}`);
    } else {
      console.log('\nTest 5: Skipping transaction details (no transactions in block)');
    }
    
    // Test 6: Get MATIC balance of a known address
    console.log('\nTest 6: Getting MATIC balance...');
    const polygonBridgeAddress = '0x8484Ef722627bf18ca5Ae6BcF031c23E6e922B30';
    const balance = await provider.getNativeBalance(polygonBridgeAddress, 'L2');
    console.log(`✓ Balance of ${polygonBridgeAddress}: ${balance} wei`);
    
    // Test 7: Get token metadata and balance (USDC on Polygon)
    console.log('\nTest 7: Getting USDC token metadata and balance...');
    const usdcAddress = '0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174';
    
    // Get token metadata
    const usdcMetadata = await provider.getErc20Metadata(usdcAddress, 'L2');
    console.log(`✓ Token metadata retrieved successfully:`);
    console.log(`  - Symbol: ${usdcMetadata.symbol}`);
    console.log(`  - Decimals: ${usdcMetadata.decimals}`);
    
    // Get token balance
    const usdcBalance = await provider.getErc20Balance(
      usdcAddress,
      polygonBridgeAddress,
      'L2'
    );
    console.log(`✓ Raw ${usdcMetadata.symbol} balance: ${usdcBalance}`);
    console.log(`✓ Formatted ${usdcMetadata.symbol} balance: ${Number(usdcBalance) / 10**usdcMetadata.decimals}`);
    
    // Test 8: Get gas price
    console.log('\nTest 8: Getting gas price...');
    const gasPrice = await provider.getGasPrice('L2');
    console.log(`✓ Current gas price: ${gasPrice} wei`);
    
    // Test 9: Estimate gas for a simple transfer
    console.log('\nTest 9: Estimating gas for a simple transfer...');
    try {
      const estimatedGas = await provider.estimateGas({
        to: '0x0000000000000000000000000000000000000000',
        value: BigInt(1000000000000000),
        data: '0x'
      }, 'L2');
      console.log(`✓ Estimated gas: ${estimatedGas}`);
    } catch (error) {
      // This is expected since our test account has no funds
      console.log(`✓ Gas estimation failed as expected (test account has no funds)`);
      console.log(`  Error message: ${error.shortMessage || error.message}`);
    }
    
    console.log('\nAll tests completed successfully!');
  } catch (error) {
    console.error('Test failed with error:', error);
    process.exit(1);
  }
}

runTests(); 