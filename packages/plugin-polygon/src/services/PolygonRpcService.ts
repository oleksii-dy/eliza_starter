import { Service, type IAgentRuntime, logger } from '@elizaos/core';
import {
  JsonRpcProvider,
  Contract,
  Wallet
} from 'ethers'; // Importing directly from ethers v6+

// Import JSON ABIs
import StakeManagerABI from '../contracts/StakeManagerABI.json';
import ValidatorShareABI from '../contracts/ValidatorShareABI.json';
import RootChainManagerABI from '../contracts/RootChainManagerABI.json';
import Erc20ABI from '../contracts/ERC20ABI.json';
import CheckpointManagerABI from '../contracts/CheckpointManagerABI.json';

// Re-import GasService components
import { getGasPriceEstimates, type GasPriceEstimates } from './GasService';

// Minimal ERC20 ABI fragment for balanceOf
const ERC20_ABI_BALANCEOF = [
  {
    constant: true,
    inputs: [{ name: '_owner', type: 'address' }],
    name: 'balanceOf',
    outputs: [{ name: 'balance', type: 'uint256' }],
    type: 'function',
  },
];

export type NetworkType = 'L1' | 'L2';

// --- Staking Contract Addresses (Ethereum Mainnet) ---
const STAKE_MANAGER_ADDRESS_L1 = '0x5e3Ef299fDDf15eAa0432E6e66473ace8c13D908';
const ROOT_CHAIN_MANAGER_ADDRESS_L1 = '0xA0c68C638235ee32657e8f720a23ceC1bFc77C77';

// --- Type Definitions for Staking Info ---

// Enum mapping based on StakeManager contract inspection (adjust if needed)
export enum ValidatorStatus { // Renamed for clarity
  Inactive = 0,
  Active = 1,
  Unbonding = 2,
  Jailed = 3,
}

export interface ValidatorInfo {
  status: ValidatorStatus;
  totalStake: bigint; // Combined self-stake + delegated amount
  commissionRate: number; // Percentage (e.g., 0.1 for 10%)
  signerAddress: string;
  activationEpoch: bigint;
  deactivationEpoch: bigint;
  jailEndEpoch: bigint;
  contractAddress: string; // Address of the ValidatorShare contract
  lastRewardUpdateEpoch: bigint;
  // Add other relevant fields from the struct if needed
}

export interface DelegatorInfo {
  delegatedAmount: bigint;
  pendingRewards: bigint;
}

/**
 * Service for interacting with Ethereum (L1) and Polygon (L2) networks.
 * Provides methods for both standard RPC operations and Polygon-specific functionality.
 */
export class PolygonRpcService extends Service {
  static serviceType = 'polygonRpc';
  capabilityDescription =
    'Provides access to Ethereum (L1) and Polygon (L2) JSON-RPC nodes and L1 staking operations.';

  // Legacy ethers.js providers - keep for compatibility with existing code
  private l1Provider: JsonRpcProvider | null = null;
  private l2Provider: JsonRpcProvider | null = null;
  private l1Signer: Wallet | null = null;
  private stakeManagerContractL1: Contract | null = null;
  private rootChainManagerContractL1: Contract | null = null;
  
  // Cache settings
  private cacheKey = 'polygon/rpc';
  private cacheExpiryMs = 60000; // 1 minute

  constructor(runtime?: IAgentRuntime) {
    super(runtime);
  }

  /**
   * Initializes providers for both L1 and L2 networks.
   */
  private async initializeProviders(): Promise<void> {
    if (!this.runtime) {
      throw new Error('Runtime required for provider initialization');
    }

    try {
      // Initialize legacy ethers.js providers for backward compatibility
      const l1RpcUrl = this.runtime.getSetting('ETHEREUM_RPC_URL');
      const l2RpcUrl = this.runtime.getSetting('POLYGON_RPC_URL');
      const privateKey = this.runtime.getSetting('PRIVATE_KEY');
    
      if (!privateKey) {
        throw new Error('Missing required private key');
      }
      
      if (!l1RpcUrl) {
        throw new Error('Missing required Ethereum RPC URL');
      }
      
      if (!l2RpcUrl) {
        throw new Error('Missing required Polygon RPC URL');
      }

      this.l1Provider = new JsonRpcProvider(l1RpcUrl);
      this.l2Provider = new JsonRpcProvider(l2RpcUrl);
      this.l1Signer = new Wallet(privateKey, this.l1Provider);

      // Initialize contract instances
      this.stakeManagerContractL1 = new Contract(
        STAKE_MANAGER_ADDRESS_L1,
        StakeManagerABI,
        this.l1Provider
      );
      await this.stakeManagerContractL1.validatorThreshold(); // Test connection
      logger.info('StakeManager L1 contract instance created and connection verified.');
      
      this.rootChainManagerContractL1 = new Contract(
        ROOT_CHAIN_MANAGER_ADDRESS_L1,
        RootChainManagerABI,
        this.l1Signer
      );
      
      logger.info('PolygonRpcService initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize PolygonRpcService:', error);
      // Reset all components on failure
      this.l1Provider = null;
      this.l2Provider = null;
      this.l1Signer = null;
      this.stakeManagerContractL1 = null;
      this.rootChainManagerContractL1 = null;
      throw error;
    }
  }

  static async start(runtime: IAgentRuntime): Promise<PolygonRpcService> {
    logger.info('Starting PolygonRpcService...');
    const service = new PolygonRpcService(runtime);
    await service.initializeProviders();
    return service;
  }

  static async stop(runtime: IAgentRuntime): Promise<void> {
    logger.info('Stopping PolygonRpcService...');
    const service = runtime.getService<PolygonRpcService>(PolygonRpcService.serviceType);
    if (service) {
      await service.stop();
    }
  }

  async stop(): Promise<void> {
    logger.info('PolygonRpcService instance stopped.');
    this.l1Provider = null;
    this.l2Provider = null;
    this.l1Signer = null;
    this.stakeManagerContractL1 = null;
    this.rootChainManagerContractL1 = null;
  }

  /**
   * Gets the current gas price for the specified network.
   * @param network Which network to query (L1 or L2)
   * @returns The gas price in wei as a bigint
   */
  async getGasPrice(network: NetworkType = 'L2'): Promise<bigint> {
    const provider = network === 'L1' ? this.l1Provider : this.l2Provider;
    if (!provider) {
      throw new Error(`Provider for ${network} not available`);
    }
    return await provider.getGasPrice();
  }

  // --- Standard RPC Methods with Network Selection ---

  /**
   * Gets the current block number for the specified network
   */
  async getBlockNumber(network: NetworkType = 'L2'): Promise<number> {
    const provider = network === 'L1' ? this.l1Provider : this.l2Provider;
    if (!provider) {
      throw new Error(`Provider for ${network} not available`);
    }
    
    return await provider.getBlockNumber();
  }

  /**
   * Gets the balance of native tokens (ETH/MATIC) for an address on the specified network
   */
  async getBalance(address: Address, network: NetworkType = 'L2'): Promise<bigint> {
    const provider = network === 'L1' ? this.l1Provider : this.l2Provider;
    if (!provider) {
      throw new Error(`Provider for ${network} not available`);
    }
    
    return await provider.getBalance(address);
  }

  /**
   * Gets transaction details by hash from the specified network
   */
  async getTransaction(txHash: Hash, network: NetworkType = 'L2'): Promise<any> {
    const provider = network === 'L1' ? this.l1Provider : this.l2Provider;
    if (!provider) {
      throw new Error(`Provider for ${network} not available`);
    }
    
    return await provider.getTransaction(txHash);
  }

  /**
   * Gets transaction receipt by hash from the specified network
   */
  async getTransactionReceipt(txHash: Hash, network: NetworkType = 'L2'): Promise<any> {
    const provider = network === 'L1' ? this.l1Provider : this.l2Provider;
    if (!provider) {
      throw new Error(`Provider for ${network} not available`);
    }
    
    return await provider.getTransactionReceipt(txHash);
  }

  /**
   * Gets block details by number or hash from the specified network
   */
  async getBlock(blockIdentifier: BlockIdentifier, network: NetworkType = 'L2'): Promise<any> {
    const provider = network === 'L1' ? this.l1Provider : this.l2Provider;
    if (!provider) {
      throw new Error(`Provider for ${network} not available`);
    }
    
    return await provider.getBlock(blockIdentifier);
  }

  /**
   * Performs a contract call on the specified network
   */
  async call(
    to: Address, 
    data: Hash, 
    network: NetworkType = 'L2'
  ): Promise<Hash> {
    const provider = network === 'L1' ? this.l1Provider : this.l2Provider;
    if (!provider) {
      throw new Error(`Provider for ${network} not available`);
    }
    
    const client = provider.getPublicClient();
    const result = await client.call({
      to,
      data,
    });
    
    return result.data as Hash;
  }

  /**
   * Estimates gas for a transaction on the specified network
   */
  async estimateGas(
    tx: { to: Address; data?: Hash; value?: bigint },
    network: NetworkType = 'L2'
  ): Promise<bigint> {
    const provider = network === 'L1' ? this.l1Provider : this.l2Provider;
    if (!provider) {
      throw new Error(`Provider for ${network} not available`);
    }
    
    const account = await provider.getAddress();
    
    const gasEstimate = await provider.estimateGas({
      to: tx.to,
      data: tx.data,
      value: tx.value,
      account,
    });
    
    return gasEstimate;
  }

  /**
   * Sends a transaction on the specified network
   */
  async sendTransaction(
    to: Address,
    value: bigint,
    data: Hash = '0x' as Hash,
    network: NetworkType = 'L2'
  ): Promise<Hash> {
    const provider = network === 'L1' ? this.l1Provider : this.l2Provider;
    if (!provider) {
      throw new Error(`Provider for ${network} not available`);
    }
    
    try {
      // Use the provider's sendTransaction method which is safer and properly handles gas estimation
      const txHash = await provider.sendTransaction(to, value, data);
      logger.info(`Transaction sent on ${network}: ${txHash}`);
      
      return txHash;
    } catch (error) {
      logger.error(`Error sending transaction on ${network}:`, error);
      throw new Error(`Failed to send transaction: ${error.message}`);
    }
  }

  // --- Convenience Methods for L1/L2 Specific Operations ---

  /**
   * Gets the current Ethereum (L1) block number
   */
  async getCurrentL1BlockNumber(): Promise<number> {
    return this.getBlockNumber('L1');
  }

  /**
   * Gets the current Polygon (L2) block number
   */
  async getCurrentL2BlockNumber(): Promise<number> {
    return this.getBlockNumber('L2');
  }

  /**
   * Gets ETH balance for an address on Ethereum (L1)
   */
  async getNativeL1Balance(address: Address): Promise<bigint> {
    return this.getBalance(address, 'L1');
  }

  /**
   * Gets MATIC balance for an address on Polygon (L2)
   */
  async getNativeL2Balance(address: Address): Promise<bigint> {
    return this.getBalance(address, 'L2');
  }

  // --- The Five Basic Read Functions ---
  
  /**
   * Gets the current block number from Polygon (L2)
   * This is a convenient wrapper over getCurrentL2BlockNumber for better semantic naming
   * 
   * @returns The latest block number on the Polygon network
   */
  async getCurrentBlockNumber(): Promise<number> {
    try {
      const cacheKey = `${this.cacheKey}/currentBlockNumber`;
      const cachedBlockNumber = await this.getCachedValue<number>(cacheKey);
      
      if (cachedBlockNumber) {
        logger.debug('Returning cached current block number');
        return cachedBlockNumber;
      }
      
      logger.info('Fetching current Polygon block number');
      const blockNumber = await this.getBlockNumber('L2');
      
      // Cache block number with shorter expiry (10 seconds)
      await this.setCacheValue(cacheKey, blockNumber, 10000);
      return blockNumber;
    } catch (error) {
      logger.error('Error getting current block number:', error);
      throw new Error(`Failed to get current block number: ${error.message}`);
    }
  }

  /**
   * Gets detailed block information by number or hash from Polygon (L2)
   * 
   * @param identifier Block number or hash
   * @returns Detailed block information including transactions
   */
  async getBlockDetails(identifier: BlockIdentifier): Promise<BlockInfo> {
    try {
      // Create cache key based on block identifier
      const cacheKey = `${this.cacheKey}/block/${typeof identifier === 'number' ? 'num_' + identifier : identifier}`;
      const cachedBlock = await this.getCachedValue<BlockInfo>(cacheKey);
      
      if (cachedBlock) {
        logger.debug(`Returning cached block details for ${identifier}`);
        return cachedBlock;
      }
      
      logger.info(`Fetching details for block ${identifier}`);
      
      // Fetch block with full transaction objects
      const block = await this.getBlock(identifier, 'L2');
      
      if (!block) {
        throw new Error(`Block not found: ${identifier}`);
      }
      
      // Transform block into our standardized format
      const blockInfo: BlockInfo = {
        number: Number(block.number),
        hash: block.hash,
        parentHash: block.parentHash,
        timestamp: block.timestamp,
        nonce: block.nonce,
        difficulty: block.difficulty,
        gasLimit: block.gasLimit,
        gasUsed: block.gasUsed,
        miner: block.miner,
        extraData: block.extraData,
        baseFeePerGas: block.baseFeePerGas,
        transactions: block.transactions
      };
      
      // Cache the result for 60 seconds
      await this.setCacheValue(cacheKey, blockInfo, 60000);
      return blockInfo;
    } catch (error) {
      logger.error(`Error getting block details for ${identifier}:`, error);
      throw new Error(`Failed to get block details: ${error.message}`);
    }
  }
  
  /**
   * Gets detailed transaction information by hash from Polygon (L2)
   * 
   * @param txHash Transaction hash
   * @returns Transaction details and receipt
   */
  async getTransactionDetails(txHash: Hash): Promise<TransactionDetails | null> {
    try {
      // Check cache first
      const cacheKey = `${this.cacheKey}/tx/${txHash}`;
      const cachedTx = await this.getCachedValue<TransactionDetails>(cacheKey);
      
      if (cachedTx) {
        logger.debug(`Returning cached transaction details for ${txHash}`);
        return cachedTx;
      }
      
      logger.info(`Fetching details for transaction ${txHash}`);
      
      // Fetch both transaction and receipt in parallel
      const [txResponse, txReceipt] = await Promise.all([
        this.getTransaction(txHash, 'L2'),
        this.getTransactionReceipt(txHash, 'L2')
      ]);
      
      // If neither is found, return null
      if (!txResponse && !txReceipt) {
        logger.info(`Transaction ${txHash} not found`);
        return null;
      }
      
      // Format the result
      const result: TransactionDetails = {
        transaction: txResponse,
        receipt: txReceipt
      };
      
      // Cache the result permanently (transaction data doesn't change)
      await this.setCacheValue(cacheKey, result);
      return result;
    } catch (error) {
      logger.error(`Error getting transaction details for ${txHash}:`, error);
      throw new Error(`Failed to get transaction details: ${error.message}`);
    }
  }

  // --- L1 Staking Write Operations ---

  /**
   * Delegates MATIC to a validator on L1.
   * @param validatorId The ID of the validator.
   * @param amountWei Amount of MATIC/POL to delegate in Wei.
   * @returns Transaction hash of the delegation transaction.
   */
  async delegate(validatorId: number, amountWei: bigint): Promise<string> {
    logger.info(
      `Initiating delegation of ${ethers.formatEther(amountWei)} MATIC to validator ${validatorId} on L1...`
    );
    if (amountWei <= 0n) {
      throw new Error('Delegation amount must be greater than zero.');
    }
    const signer = this.getL1Signer();
    const l1Provider = this.getProvider('L1');
    const contract = await this._getValidatorShareContract(validatorId);

    try {
      const stakeManager = this.getStakeManagerContract();
      const txData = await stakeManager.delegate.populateTransaction(validatorId, amountWei);

      const { maxFeePerGas, maxPriorityFeePerGas } = await this._getL1FeeDetails();

      // Estimate gas for the specific transaction
      const gasLimit = await signer.estimateGas({ ...txData });
      const gasLimitBuffered = (gasLimit * 120n) / 100n; // Add 20% buffer

      // Construct Full Transaction
      const tx: TransactionRequest = {
        ...txData,
        value: amountWei,
        gasLimit: gasLimitBuffered,
        maxFeePerGas: maxFeePerGas,
        maxPriorityFeePerGas: maxPriorityFeePerGas,
        chainId: (await l1Provider.getNetwork()).chainId, // Ensure correct chain ID
      };

      // Sign Transaction
      logger.debug('Signing delegation transaction...', tx);
      const signedTx = await signer.signTransaction(tx);

      // Broadcast Transaction
      logger.info(`Broadcasting L1 delegation transaction for validator ${validatorId}...`);
      const txResponse = await this.sendRawTransaction(signedTx, 'L1');
      logger.info(`Delegation transaction sent: ${txResponse.hash}`);

      // Return Hash (Consider adding wait option later)
      return txResponse.hash;
    } catch (error: unknown) {
      logger.error(`Delegation to validator ${validatorId} failed:`, error);
      // Add more specific error handling (insufficient funds, etc.)
      const errorMessage = error instanceof Error ? error.message : String(error);
      throw new Error(`Delegation failed: ${errorMessage}`);
    }
  }

  /**
   * Gets MATIC balance for an address on Polygon (L2)
   * 
   * @param address The address to check
   * @returns Native MATIC balance in wei (as bigint)
   */
  async getNativeBalance(address: Address): Promise<bigint> {
    try {
      if (!address.startsWith('0x')) {
        throw new Error('Invalid address format');
      }
      
      // Check cache first
      const cacheKey = `${this.cacheKey}/balance/${address.toLowerCase()}`;
      const cachedBalance = await this.getCachedValue<bigint>(cacheKey);
      
      if (cachedBalance !== undefined) {
        logger.debug(`Returning cached MATIC balance for ${address}`);
        return cachedBalance;
      }
      
      logger.info(`Fetching MATIC balance for ${address}`);
      
      // Get balance using the provider
      const balance = await this.getBalance(address, 'L2');
      
      // Cache for 30 seconds (balances may change frequently)
      await this.setCacheValue(cacheKey, balance, 30000);
      return balance;
    } catch (error) {
      logger.error(`Error getting MATIC balance for ${address}:`, error);
      throw new Error(`Failed to get MATIC balance: ${error.message}`);
    }
  }

  /**
   * Gets token balance for an ERC20 token on Polygon (L2)
   * 
   * @param tokenAddress The token contract address
   * @param accountAddress The address holding the tokens
   * @returns Token balance in the smallest denomination (as bigint)
   */
  async getErc20Balance(tokenAddress: Address, accountAddress: Address): Promise<bigint> {
    try {
      if (!tokenAddress.startsWith('0x') || !accountAddress.startsWith('0x')) {
        throw new Error('Invalid address format');
      }
      
      // Check cache first
      const cacheKey = `${this.cacheKey}/erc20/${tokenAddress.toLowerCase()}/${accountAddress.toLowerCase()}`;
      const cachedBalance = await this.getCachedValue<bigint>(cacheKey);
      
      if (cachedBalance !== undefined) {
        logger.debug(`Returning cached token balance for ${accountAddress} (token: ${tokenAddress})`);
        return cachedBalance;
      }
      
      logger.info(`Fetching token balance for ${accountAddress} (token: ${tokenAddress})`);
      
      // Get token balance using the provider
      const balance = await this.getBalance(tokenAddress, 'L2');
      
      // Cache for 30 seconds (balances may change frequently)
      await this.setCacheValue(cacheKey, balance, 30000);
      return balance;
    } catch (error) {
      logger.error(`Error getting token balance for ${accountAddress} (token: ${tokenAddress}):`, error);
      throw new Error(`Failed to get token balance: ${error.message}`);
    }
  }

  // --- Cache Helpers ---
  
  /**
   * Gets a value from the cache if it exists and hasn't expired
   */
  private async getCachedValue<T>(key: string): Promise<T | undefined> {
    if (!this.runtime) {
      return undefined;
    }
    
    try {
      const cache = await this.runtime.getCache<CacheEntry<T>>(key);
      
      if (!cache) {
        return undefined;
      }
      
      // Check if cache has expired
      const now = Date.now();
      if (now - cache.timestamp > this.cacheExpiryMs) {
        // Clean up expired cache
        await this.runtime.deleteCache(key);
        return undefined;
      }
      
      return cache.value;
    } catch (error) {
      logger.error(`Error retrieving from cache (${key}):`, error);
      return undefined;
    }
  }
  
  /**
   * Sets a value in the cache with timestamp
   */
  private async setCacheValue<T>(key: string, value: T, expiryMs?: number): Promise<void> {
    if (!this.runtime) {
      return;
    }
    
    try {
      const cacheEntry: CacheEntry<T> = {
        value,
        timestamp: Date.now()
      };
      
      // Set custom expiry if provided, otherwise use default from config
      if (expiryMs) {
        this.cacheExpiryMs = expiryMs;
      } else {
        this.cacheExpiryMs = CACHE_EXPIRY.DEFAULT;
      }
      
      await this.runtime.setCache(key, cacheEntry);
    } catch (error) {
      logger.error(`Error setting cache (${key}):`, error);
    }
  }

  // Helper for L1 Fee Details
  private async _getL1FeeDetails(): Promise<{
    maxFeePerGas: bigint;
    maxPriorityFeePerGas: bigint;
  }> {
    if (!this.l1Provider) throw new Error('L1 provider not initialized for fee data.');
    // Runtime check is inside getGasPriceEstimates, but good to be explicit if we use it directly often
    if (!this.runtime) throw new Error('Runtime not available for GasService access.');

    try {
      const gasServiceEstimates = await getGasPriceEstimates(this.runtime);
      // Check if GasService provided sufficient EIP-1559 data
      if (
        gasServiceEstimates?.estimatedBaseFee &&
        gasServiceEstimates?.average?.maxPriorityFeePerGas
      ) {
        const maxPriorityFeePerGas = gasServiceEstimates.average.maxPriorityFeePerGas;
        const maxFeePerGas = gasServiceEstimates.estimatedBaseFee + maxPriorityFeePerGas;
        logger.debug('Using L1 fee details from GasService.');
        return { maxFeePerGas, maxPriorityFeePerGas };
      }
    } catch (gsError) {
      logger.warn(
        `GasService call failed or returned insufficient data: ${gsError.message}. Falling back to l1Provider.getFeeData().`
      );
    }

    // Fallback to l1Provider.getFeeData()
    logger.debug('Falling back to l1Provider.getFeeData() for L1 fee details.');
    const feeData = await this.l1Provider.getFeeData();
    let maxFeePerGas = feeData.maxFeePerGas;
    let maxPriorityFeePerGas = feeData.maxPriorityFeePerGas;

    if (maxFeePerGas === null || maxPriorityFeePerGas === null) {
      if (feeData.gasPrice !== null) {
        logger.warn(
          'L1 fee data: maxFeePerGas or maxPriorityFeePerGas is null, using gasPrice as fallback (legacy transaction type).'
        );
        // For legacy tx, or if EIP-1559 not fully supported by provider via getFeeData, use gasPrice.
        // maxFeePerGas and maxPriorityFeePerGas will effectively be the same as gasPrice.
        maxFeePerGas = feeData.gasPrice;
        maxPriorityFeePerGas = feeData.gasPrice;
      } else {
        throw new Error(
          'Unable to obtain L1 fee data: getFeeData() returned all null for EIP-1559 fields and gasPrice.'
        );
      }
    }

    if (maxFeePerGas === null || maxPriorityFeePerGas === null) {
      // This should ideally not be reached if gasPrice fallback worked.
      throw new Error('Unable to determine L1 fee details even after fallback attempts.');
    }

    return { maxFeePerGas, maxPriorityFeePerGas };
  }

  // --- L2 Checkpoint Status Check (L1) ---

  /**
   * Fetches the last L2 block number included in a checkpoint on L1.
   * @returns A promise resolving to the last checkpointed L2 block number as a bigint.
   */
  async getLastCheckpointedL2Block(): Promise<bigint> {
    logger.debug(
      'Getting last checkpointed L2 block number from L1 RootChainManager/CheckpointManager...'
    );
    try {
      const rootChainManager = this.getRootChainManagerContract();
      if (!this.l1Provider) {
        throw new Error('L1 provider not initialized for CheckpointManager interaction.');
      }

      const checkpointManagerAddr = await rootChainManager.checkpointManagerAddress();
      if (!checkpointManagerAddr || checkpointManagerAddr === ZeroAddress) {
        throw new Error(
          'CheckpointManager address not found or is zero address from RootChainManager.'
        );
      }

      const checkpointManager = new Contract(
        checkpointManagerAddr,
        CheckpointManagerABI,
        this.l1Provider
      );

      const lastHeaderNum = await checkpointManager.currentHeaderBlock();
      if (lastHeaderNum === undefined || lastHeaderNum === null) {
        throw new Error('Failed to retrieve currentHeaderBlock from CheckpointManager.');
      }

      const headerBlockDetails = await checkpointManager.headerBlocks(lastHeaderNum);

      if (!headerBlockDetails || headerBlockDetails.endBlock === undefined) {
        throw new Error(
          'Failed to retrieve valid headerBlockDetails or endBlock from CheckpointManager.'
        );
      }

      const endBlock = headerBlockDetails.endBlock;
      const lastBlock = BigInt(endBlock.toString());
      logger.info(`Last L2 block checkpointed on L1 (via CheckpointManager): ${lastBlock}`);
      return lastBlock;
    } catch (error: unknown) {
      logger.error('Error fetching last checkpointed L2 block from L1:', error);
      const errorMessage = error instanceof Error ? error.message : String(error);
      // Rethrow with a more specific message if needed, or just the original error
      throw new Error(`Failed to get last checkpointed L2 block: ${errorMessage}`);
    }
  }

  /**
   * Gets the ethers provider for the specified network
   * This is needed for compatibility with contracts that require ethers.js
   */
  getEthersProvider(network: NetworkType = 'L2'): JsonRpcProvider {
    if (network === 'L1') {
      if (!this.l1Provider) {
        throw new Error('L1 provider not initialized');
      }
      return this.l1Provider;
    } else {
      if (!this.l2Provider) {
        throw new Error('L2 provider not initialized');
      }
      return this.l2Provider;
    }
  }

  async isL2BlockCheckpointed(l2BlockNumber: number | bigint): Promise<boolean> {
    const targetBlock = BigInt(l2BlockNumber.toString());
    logger.debug(`Checking if L2 block ${targetBlock} is checkpointed on L1...`);
    try {
      const lastCheckpointedBlock = await this.getLastCheckpointedL2Block();
      const isCheckpointed = targetBlock <= lastCheckpointedBlock;
      logger.info(
        `L2 block ${targetBlock} checkpointed status: ${isCheckpointed} (Last Checkpointed: ${lastCheckpointedBlock})`
      );
      return isCheckpointed;
    } catch (error: unknown) {
      logger.error(
        `Could not determine checkpoint status for L2 block ${targetBlock} due to error fetching last checkpoint.`,
        error
      );
      // Consistent with user plan: if getLastCheckpointedL2Block fails, this should also fail rather than return false.
      const errorMessage = error instanceof Error ? error.message : String(error);
      throw new Error(
        `Failed to determine checkpoint status for L2 block ${targetBlock}: ${errorMessage}`
      );
    }
  }
}
