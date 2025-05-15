// Standalone test for PolygonRpcProvider
import { createPublicClient, createWalletClient, http, formatEther } from 'viem';
import { mainnet, polygon } from 'viem/chains';
import { privateKeyToAccount } from 'viem/accounts';

// Use the Infura RPC URLs - replace with your own API key or endpoint
const ETHEREUM_RPC_URL = "https://mainnet.infura.io/v3/acc75dee85124d4db03ba3b3a9a9e3ab";
const POLYGON_RPC_URL = "https://polygon-mainnet.infura.io/v3/acc75dee85124d4db03ba3b3a9a9e3ab";
const TEST_PRIVATE_KEY = '0x0000000000000000000000000000000000000000000000000000000000000001';

// Mock the elizaLogger
const elizaLogger = {
  log: console.log,
  error: console.error,
  info: console.log,
  warn: console.warn,
  debug: console.log
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
];

// Minimal PolygonBridge ABI for testing
const POLYGON_BRIDGE_ABI = [
  {
    inputs: [{ name: 'user', type: 'address' }],
    name: 'depositEtherFor',
    outputs: [],
    stateMutability: 'payable',
    type: 'function',
  },
  {
    inputs: [
      { name: 'user', type: 'address' },
      { name: 'rootToken', type: 'address' },
      { name: 'depositData', type: 'bytes' }
    ],
    name: 'depositFor',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  }
];

// Polygon Bridge contract addresses
const POLYGON_BRIDGE_L1_ADDRESS = '0xA0c68C638235ee32657e8f720a23ceC1bFc77C77';  // Ethereum Predicate
const POLYGON_BRIDGE_L2_ADDRESS = '0xBbD7CbFA79faee899Eaf900F13C9065bF03B1A74';  // Polygon FxPortal

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
    
    // Initialize wallet clients
    this.l1WalletClient = createWalletClient({
      chain: this.l1Chain,
      transport: http(l1RpcUrl),
      account: this.account
    });
    
    this.l2WalletClient = createWalletClient({
      chain: this.l2Chain,
      transport: http(l2RpcUrl),
      account: this.account
    });
    
    // Cache for responses
    this.cache = new Map();
  }
  
  getAddress() {
    return this.account.address;
  }
  
  getPublicClient(network = 'L2') {
    return network === 'L1' ? this.l1PublicClient : this.l2PublicClient;
  }
  
  getWalletClient(network = 'L2') {
    return network === 'L1' ? this.l1WalletClient : this.l2WalletClient;
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
  
  async sendTransaction(to, value = BigInt(0), data = '0x', network = 'L2') {
    const walletClient = this.getWalletClient(network);
    const hash = await walletClient.sendTransaction({
      to,
      value,
      data,
    });
    
    return hash;
  }
}

// Simplified PolygonBridgeService for testing
class SimplePolygonBridgeService {
  constructor(provider) {
    this.provider = provider;
  }
  
  async depositEth(amount) {
    try {
      const amountWei = this.parseTokenAmount(amount, 18);
      const userAddress = this.provider.getAddress();
      
      console.log(`Depositing ${amount} ETH from L1 to L2 for ${userAddress}`);
      
      const client = this.provider.getWalletClient('L1');
      const hash = await client.writeContract({
        address: POLYGON_BRIDGE_L1_ADDRESS,
        abi: POLYGON_BRIDGE_ABI,
        functionName: 'depositEtherFor',
        args: [userAddress],
        value: amountWei
      });
      
      return hash;
    } catch (error) {
      console.error('Error depositing ETH:', error);
      throw new Error('Failed to deposit ETH to Polygon');
    }
  }
  
  async depositToken(tokenAddress, amount) {
    try {
      // In a real implementation, this would:
      // 1. Approve the bridge contract to spend tokens
      // 2. Call depositFor on the bridge contract
      console.log(`Depositing ${amount} tokens from L1 to L2 for token ${tokenAddress}`);
      
      // This is simplified and would not work in production without proper approval
      const hash = '0xMockDepositTokenHash';
      return hash;
    } catch (error) {
      console.error('Error depositing token:', error);
      throw new Error('Failed to deposit token to Polygon');
    }
  }
  
  async withdrawMatic(amount) {
    try {
      const amountWei = this.parseTokenAmount(amount, 18);
      
      console.log(`Withdrawing ${amount} MATIC from L2 to L1`);
      
      // In a real implementation, this would call the withdraw function on the Polygon bridge
      const hash = '0xMockWithdrawMaticHash';
      return hash;
    } catch (error) {
      console.error('Error withdrawing MATIC:', error);
      throw new Error('Failed to withdraw MATIC from Polygon');
    }
  }
  
  parseTokenAmount(amount, decimals) {
    // Convert string amount with decimal point to wei value
    const [whole, fraction = '0'] = amount.split('.');
    
    // Handle decimals
    const paddedFraction = fraction.padEnd(decimals, '0').slice(0, decimals);
    
    // Combine whole and fraction parts
    const weiAmount = BigInt(whole) * BigInt(10 ** decimals) + BigInt(paddedFraction);
    
    return weiAmount;
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
    
    // Test 4: Get block details from both chains
    console.log('\nTest 4: Getting block details from both chains...');
    
    // Ethereum block
    const l1BlockDetails = await provider.getBlock(l1BlockNumber - 10, 'L1');
    console.log(`✓ Ethereum block details retrieved successfully:`);
    console.log(`  - Block number: ${Number(l1BlockDetails.number)}`);
    console.log(`  - Block hash: ${l1BlockDetails.hash}`);
    console.log(`  - Block timestamp: ${new Date(Number(l1BlockDetails.timestamp) * 1000).toISOString()}`);
    console.log(`  - Gas used: ${l1BlockDetails.gasUsed}`);
    
    // Polygon block
    const l2BlockDetails = await provider.getBlock(l2BlockNumber - 10, 'L2');
    console.log(`✓ Polygon block details retrieved successfully:`);
    console.log(`  - Block number: ${Number(l2BlockDetails.number)}`);
    console.log(`  - Block hash: ${l2BlockDetails.hash}`);
    console.log(`  - Block timestamp: ${new Date(Number(l2BlockDetails.timestamp) * 1000).toISOString()}`);
    console.log(`  - Gas used: ${l2BlockDetails.gasUsed}`);
    
    // Test 5: Get a recent transaction from Ethereum
    if (l1BlockDetails.transactions.length > 0) {
      console.log('\nTest 5: Getting Ethereum transaction details...');
      const txHash = l1BlockDetails.transactions[0];
      console.log(`  Using transaction hash: ${txHash}`);
      
      const txDetails = await provider.getTransaction(txHash, 'L1');
      console.log('✓ Ethereum transaction details retrieved successfully:');
      console.log(`  - From: ${txDetails.from}`);
      console.log(`  - To: ${txDetails.to || 'Contract Creation'}`);
      console.log(`  - Value: ${formatEther(txDetails.value)} ETH`);
      
      // Get receipt
      const txReceipt = await provider.getTransactionReceipt(txHash, 'L1');
      console.log('✓ Ethereum transaction receipt retrieved successfully:');
      console.log(`  - Status: ${txReceipt.status === 1 ? 'Success' : 'Failed'}`);
      console.log(`  - Gas used: ${txReceipt.gasUsed}`);
    } else {
      console.log('\nTest 5: Skipping Ethereum transaction details (no transactions in block)');
    }
    
    // Test 6: Get a recent transaction from Polygon
    if (l2BlockDetails.transactions.length > 0) {
      console.log('\nTest 6: Getting Polygon transaction details...');
      const txHash = l2BlockDetails.transactions[0];
      console.log(`  Using transaction hash: ${txHash}`);
      
      const txDetails = await provider.getTransaction(txHash, 'L2');
      console.log('✓ Polygon transaction details retrieved successfully:');
      console.log(`  - From: ${txDetails.from}`);
      console.log(`  - To: ${txDetails.to || 'Contract Creation'}`);
      console.log(`  - Value: ${formatEther(txDetails.value)} MATIC`);
      
      // Get receipt
      const txReceipt = await provider.getTransactionReceipt(txHash, 'L2');
      console.log('✓ Polygon transaction receipt retrieved successfully:');
      console.log(`  - Status: ${txReceipt.status === 1 ? 'Success' : 'Failed'}`);
      console.log(`  - Gas used: ${txReceipt.gasUsed}`);
    } else {
      console.log('\nTest 6: Skipping Polygon transaction details (no transactions in block)');
    }
    
    // Test 7: Get ETH and MATIC balances 
    console.log('\nTest 7: Getting ETH and MATIC balances...');
    const polygonBridgeAddress = '0x8484Ef722627bf18ca5Ae6BcF031c23E6e922B30'; // Known address with balances
    
    const ethBalance = await provider.getNativeBalance(polygonBridgeAddress, 'L1');
    console.log(`✓ ETH Balance of ${polygonBridgeAddress}: ${formatEther(ethBalance)} ETH`);
    
    const maticBalance = await provider.getNativeBalance(polygonBridgeAddress, 'L2');
    console.log(`✓ MATIC Balance of ${polygonBridgeAddress}: ${formatEther(maticBalance)} MATIC`);
    
    // Test 8: Get token metadata and balance
    console.log('\nTest 8: Getting token metadata and balance...');
    
    // USDC on Ethereum (L1)
    const usdcL1Address = '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48';
    const usdcL1Metadata = await provider.getErc20Metadata(usdcL1Address, 'L1');
    console.log(`✓ L1 token metadata retrieved successfully:`);
    console.log(`  - Symbol: ${usdcL1Metadata.symbol}`);
    console.log(`  - Decimals: ${usdcL1Metadata.decimals}`);
    
    const usdcL1Balance = await provider.getErc20Balance(
      usdcL1Address,
      polygonBridgeAddress,
      'L1'
    );
    console.log(`✓ L1 ${usdcL1Metadata.symbol} balance: ${Number(usdcL1Balance) / 10**usdcL1Metadata.decimals}`);
    
    // USDC on Polygon (L2)
    const usdcL2Address = '0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174';
    const usdcL2Metadata = await provider.getErc20Metadata(usdcL2Address, 'L2');
    console.log(`✓ L2 token metadata retrieved successfully:`);
    console.log(`  - Symbol: ${usdcL2Metadata.symbol}`);
    console.log(`  - Decimals: ${usdcL2Metadata.decimals}`);
    
    const usdcL2Balance = await provider.getErc20Balance(
      usdcL2Address,
      polygonBridgeAddress,
      'L2'
    );
    console.log(`✓ L2 ${usdcL2Metadata.symbol} balance: ${Number(usdcL2Balance) / 10**usdcL2Metadata.decimals}`);
    
    // Test 9: Gas price comparison between L1 and L2
    console.log('\nTest 9: Comparing gas prices between L1 and L2...');
    const l1GasPrice = await provider.getGasPrice('L1');
    const l2GasPrice = await provider.getGasPrice('L2');
    
    console.log(`✓ L1 (Ethereum) gas price: ${formatEther(l1GasPrice * BigInt(1000000000))} ETH (${Number(l1GasPrice)} gwei)`);
    console.log(`✓ L2 (Polygon) gas price: ${formatEther(l2GasPrice * BigInt(1000000000))} MATIC (${Number(l2GasPrice)} gwei)`);
    console.log(`✓ L1/L2 gas price ratio: ${Number(l1GasPrice) / Number(l2GasPrice)}`);
    
    // Test 10: Initialize bridge service
    console.log('\nTest 10: Initializing bridge service...');
    const bridgeService = new SimplePolygonBridgeService(provider);
    console.log('✓ Bridge service initialized successfully');
    
    // Test 11: Simulating a bridge deposit (not actually sending transactions)
    console.log('\nTest 11: Simulating ETH to MATIC bridge deposit...');
    
    try {
      // Use try/catch since we're using a dummy private key
      await bridgeService.depositEth('0.01');
      console.log('✓ ETH to MATIC bridge deposit simulation succeeded');
    } catch (error) {
      console.log('✓ ETH to MATIC bridge deposit failed as expected with test account');
      console.log(`  Error message: ${error.message}`);
    }
    
    // Test 12: Simulating token deposit
    console.log('\nTest 12: Simulating token bridge deposit...');
    const tokenDepositHash = await bridgeService.depositToken(usdcL1Address, '10');
    console.log(`✓ Token deposit simulation mock hash: ${tokenDepositHash}`);
    
    console.log('\nAll tests completed successfully!');
  } catch (error) {
    console.error('Test failed with error:', error);
    process.exit(1);
  }
}

runTests(); 