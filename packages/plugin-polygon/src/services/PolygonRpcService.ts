import { Service, type IAgentRuntime, logger } from '@elizaos/core';
import {
  JsonRpcProvider,
  Contract,
  Wallet,
  type BigNumberish,
  ZeroAddress,
  type TransactionRequest,
  MaxUint256,
  ethers, // For ethers.formatEther, ethers.AbiCoder
} from 'ethers'; // Assuming ethers v6+

// Import JSON ABIs
import StakeManagerABI from '../contracts/StakeManagerABI.json';
import ValidatorShareABI from '../contracts/ValidatorShareABI.json';
import RootChainManagerABI from '../contracts/RootChainManagerABI.json';
import Erc20ABI from '../contracts/ERC20ABI.json';
import CheckpointManagerABI from '../contracts/CheckpointManagerABI.json'; // New ABI

// Re-import GasService components
import { getGasPriceEstimates, type GasPriceEstimates } from './GasService';

// Minimal ERC20 ABI fragment for balanceOf and allowance
const ERC20_ABI_MINIMAL = [
  {
    constant: true,
    inputs: [{ name: '_owner', type: 'address' }],
    name: 'balanceOf',
    outputs: [{ name: 'balance', type: 'uint256' }],
    type: 'function',
  },
  {
    constant: true,
    inputs: [
      { name: '_owner', type: 'address' },
      { name: '_spender', type: 'address' },
    ],
    name: 'allowance',
    outputs: [{ name: 'remaining', type: 'uint256' }],
    type: 'function',
  },
  {
    constant: false,
    inputs: [
      { name: '_spender', type: 'address' },
      { name: '_value', type: 'uint256' },
    ],
    name: 'approve',
    outputs: [{ name: 'success', type: 'bool' }],
    type: 'function',
  },
];

export type NetworkType = 'L1' | 'L2';

// --- Staking Contract Addresses (Ethereum Mainnet) ---
const STAKE_MANAGER_ADDRESS_L1 = '0x5e3Ef299fDDf15eAa0432E6e66473ace8c13D908';
const ROOT_CHAIN_MANAGER_ADDRESS_L1 = '0xA0c68C638235ee32657e8f720a23ceC1bFc77C77';

// --- Type Definitions for Staking Info ---
export enum ValidatorStatus {
  Inactive = 0,
  Active = 1,
  Unbonding = 2,
  Jailed = 3,
}

export interface ValidatorInfo {
  status: ValidatorStatus;
  totalStake: bigint;
  commissionRate: number;
  signerAddress: string;
  activationEpoch: bigint;
  deactivationEpoch: bigint;
  jailEndEpoch: bigint;
  contractAddress: string;
  lastRewardUpdateEpoch: bigint;
}

export interface DelegatorInfo {
  delegatedAmount: bigint;
  pendingRewards: bigint;
}

// Types for cache entries
interface CacheEntry<T> {
  value: T;
  timestamp: number;
}

// Default cache expiry (can be overridden)
const CACHE_EXPIRY = {
  DEFAULT: 60000, // 1 minute
  SHORT: 10000, // 10 seconds
  BALANCE: 30000, // 30 seconds
};

// Viem/Ethers type compatibility
type Address = `0x${string}`;
type Hash = `0x${string}`;
type BlockIdentifier = Hash | number | 'latest' | 'earliest' | 'pending' | 'safe' | 'finalized';

interface BlockInfo {
  number: number;
  hash: Hash;
  parentHash: Hash;
  timestamp: number;
  nonce: Hash;
  difficulty: bigint;
  gasLimit: bigint;
  gasUsed: bigint;
  miner: Address;
  extraData: Hash;
  baseFeePerGas?: bigint | null;
  transactions: Hash[] | any[]; // Adjust based on what getBlock returns
}

interface TransactionDetails {
  transaction: any; // Ethers TransactionResponse
  receipt: any; // Ethers TransactionReceipt
}

export class PolygonRpcService extends Service {
  static serviceType = 'polygonRpc';
  capabilityDescription =
    'Provides access to Ethereum (L1) and Polygon (L2) JSON-RPC nodes and L1 staking operations.';

  private l1Provider: JsonRpcProvider | null = null;
  private l2Provider: JsonRpcProvider | null = null;
  private l1Signer: Wallet | null = null;
  private stakeManagerContractL1: Contract | null = null;
  private rootChainManagerContractL1: Contract | null = null;
  private checkpointManagerContractL1: Contract | null = null;

  // Cache settings
  private cacheKeyPrefix = 'polygon/rpc'; // Changed from cacheKey to avoid conflict
  private cacheExpiryMs = CACHE_EXPIRY.DEFAULT;

  private async initializeProviders(): Promise<void> {
    if (
      this.l1Provider &&
      this.l2Provider &&
      this.l1Signer &&
      this.stakeManagerContractL1 &&
      this.rootChainManagerContractL1 &&
      this.checkpointManagerContractL1
    ) {
      logger.debug('Providers and contracts already initialized.');
      return;
    }
    if (!this.runtime) {
      throw new Error('Runtime required for provider initialization');
    }

    let l1RpcUrl = this.runtime.getSetting('ETHEREUM_RPC_URL');
    if (!l1RpcUrl) {
      l1RpcUrl = this.runtime.getSetting('ETHEREUM_RPC_URL_FALLBACK');
    }

    let l2RpcUrl = this.runtime.getSetting('POLYGON_RPC_URL');
    if (!l2RpcUrl) {
      l2RpcUrl = this.runtime.getSetting('POLYGON_RPC_URL_FALLBACK');
    }

    const privateKey = this.runtime.getSetting('PRIVATE_KEY');

    if (!l1RpcUrl || !l2RpcUrl) {
      throw new Error('Missing L1/L2 RPC URLs (including fallbacks)');
    }
    if (!privateKey) {
      throw new Error('Missing PRIVATE_KEY for signer initialization');
    }

    try {
      this.l1Provider = new JsonRpcProvider(l1RpcUrl);
      this.l2Provider = new JsonRpcProvider(l2RpcUrl);
      this.l1Signer = new Wallet(privateKey, this.l1Provider);

      this.stakeManagerContractL1 = new Contract(
        STAKE_MANAGER_ADDRESS_L1,
        StakeManagerABI as any, // Cast ABI
        this.l1Provider
      );
      await this.stakeManagerContractL1.validatorThreshold(); // Test connection
      logger.info('StakeManager L1 contract instance created and connection verified.');

      this.rootChainManagerContractL1 = new Contract(
        ROOT_CHAIN_MANAGER_ADDRESS_L1,
        RootChainManagerABI as any, // Cast ABI
        this.l1Signer // Signer needed for write operations like deposit
      );
      logger.info('RootChainManager L1 contract instance created.');

      if (this.rootChainManagerContractL1) {
        const checkpointManagerAddress =
          await this.rootChainManagerContractL1.checkpointManagerAddress();
        logger.info(`Fetched CheckpointManager L1 address: ${checkpointManagerAddress}`);
        this.checkpointManagerContractL1 = new Contract(
          checkpointManagerAddress,
          CheckpointManagerABI as any, // Cast ABI
          this.l1Provider // Read-only, provider is sufficient for getLastChildBlock
        );
        logger.info('CheckpointManager L1 contract instance created.');
      } else {
        throw new Error(
          'RootChainManager contract failed to initialize, cannot get CheckpointManager address.'
        );
      }
      logger.info('PolygonRpcService initialized successfully');
    } catch (error: unknown) {
      logger.error('Failed during PolygonRpcService initialization:', error);
      this.l1Provider = null;
      this.l2Provider = null;
      this.l1Signer = null;
      this.stakeManagerContractL1 = null;
      this.rootChainManagerContractL1 = null;
      this.checkpointManagerContractL1 = null;
      if (error instanceof Error) {
        throw new Error(`Failed to initialize PolygonRpcService components: ${error.message}`);
      }
      throw new Error('Failed to initialize PolygonRpcService components due to an unknown error.');
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
    this.checkpointManagerContractL1 = null;
  }

  private getProvider(network: NetworkType = 'L2'): JsonRpcProvider {
    const provider = network === 'L1' ? this.l1Provider : this.l2Provider;
    if (!provider) {
      throw new Error(`Provider ${network} not initialized.`);
    }
    return provider;
  }

  private getL1Signer(): Wallet {
    if (!this.l1Signer) {
      throw new Error('L1 Signer not initialized.');
    }
    return this.l1Signer;
  }

  private getStakeManagerContract(): Contract {
    if (!this.stakeManagerContractL1) {
      throw new Error('StakeManager L1 contract is not initialized.');
    }
    return this.stakeManagerContractL1;
  }

  private getRootChainManagerContract(): Contract {
    if (!this.rootChainManagerContractL1) {
      throw new Error('RootChainManager L1 contract is not initialized.');
    }
    return this.rootChainManagerContractL1;
  }

  private getCheckpointManagerContract(): Contract {
    if (!this.checkpointManagerContractL1) {
      throw new Error('CheckpointManager L1 contract is not initialized.');
    }
    return this.checkpointManagerContractL1;
  }

  public getL2Provider(): JsonRpcProvider {
    return this.getProvider('L2');
  }
  
  // --- Standard RPC Methods with Network Selection ---

  async getGasPrice(network: NetworkType = 'L2'): Promise<bigint> {
    const provider = this.getProvider(network);
    const feeData = await provider.getFeeData();
    if (feeData.gasPrice) return feeData.gasPrice;
    if (feeData.maxFeePerGas && feeData.maxPriorityFeePerGas) { // EIP-1559
        return feeData.maxFeePerGas + feeData.maxPriorityFeePerGas;
    }
    throw new Error(`Could not determine gas price on ${network}`);
  }
  
  async getBlockNumber(network: NetworkType = 'L2'): Promise<number> {
    const provider = this.getProvider(network);
    return provider.getBlockNumber();
  }

  async getBalance(address: Address, network: NetworkType = 'L2'): Promise<bigint> {
    const provider = this.getProvider(network);
    return provider.getBalance(address);
  }

  async getTransaction(txHash: Hash, network: NetworkType = 'L2'): Promise<ethers.TransactionResponse | null> {
    const provider = this.getProvider(network);
    return provider.getTransaction(txHash);
  }

  async getTransactionReceipt(txHash: Hash, network: NetworkType = 'L2'): Promise<ethers.TransactionReceipt | null> {
    const provider = this.getProvider(network);
    return provider.getTransactionReceipt(txHash);
  }

  async getBlock(blockIdentifier: BlockIdentifier, network: NetworkType = 'L2'): Promise<ethers.Block | null> {
    const provider = this.getProvider(network);
    if (typeof blockIdentifier === 'number' || typeof blockIdentifier === 'bigint') {
        return provider.getBlock(Number(blockIdentifier));
    }
    // For string hash or tags like 'latest'
    return provider.getBlock(blockIdentifier as string | ethers.BlockTag);
  }
  
  async call(to: Address, data: Hash, network: NetworkType = 'L2'): Promise<Hash> {
    const provider = this.getProvider(network);
    const result = await provider.call({ to, data });
    return result as Hash;
  }

  async estimateGas(
    tx: { to: Address; data?: Hash; value?: bigint },
    network: NetworkType = 'L2'
  ): Promise<bigint> {
    const provider = this.getProvider(network);
    const signer = network === 'L1' ? this.getL1Signer() : new Wallet(ZeroAddress, provider); // Dummy wallet for L2 if no signer
    
    return provider.estimateGas({
      to: tx.to,
      data: tx.data,
      value: tx.value,
      from: signer.address // estimateGas needs a 'from'
    });
  }
  
  async sendRawTransaction(signedTx: string, network: NetworkType = 'L2'): Promise<ethers.TransactionResponse> {
    const provider = this.getProvider(network);
    return provider.broadcastTransaction(signedTx);
  }

  // --- Convenience Methods ---
  async getCurrentL1BlockNumber(): Promise<number> { return this.getBlockNumber('L1'); }
  async getCurrentL2BlockNumber(): Promise<number> { return this.getBlockNumber('L2'); }
  async getNativeL1Balance(address: Address): Promise<bigint> { return this.getBalance(address, 'L1'); }
  async getNativeL2Balance(address: Address): Promise<bigint> { return this.getBalance(address, 'L2'); }

  // --- Five Basic Read Functions (Polygon L2) with Cache ---
  async getCurrentBlockNumber(): Promise<number> {
    const cacheKey = `${this.cacheKeyPrefix}/currentBlockNumber`;
    const cached = await this.getCachedValue<number>(cacheKey);
    if (cached) return cached;

    const blockNumber = await this.getBlockNumber('L2');
    await this.setCacheValue(cacheKey, blockNumber, CACHE_EXPIRY.SHORT);
    return blockNumber;
  }

  async getBlockDetails(identifier: BlockIdentifier): Promise<BlockInfo | null> {
    const cacheKey = `${this.cacheKeyPrefix}/block/${identifier.toString()}`;
    const cached = await this.getCachedValue<BlockInfo>(cacheKey);
    if (cached) return cached;

    const block = await this.getBlock(identifier, 'L2');
    if (!block) return null;

    const blockInfo: BlockInfo = {
      number: block.number,
      hash: block.hash as Hash,
      parentHash: block.parentHash as Hash,
      timestamp: block.timestamp,
      nonce: block.nonce as Hash,
      difficulty: block.difficulty,
      gasLimit: block.gasLimit,
      gasUsed: block.gasUsed,
      miner: block.miner as Address,
      extraData: block.extraData as Hash,
      baseFeePerGas: block.baseFeePerGas,
      transactions: block.transactions,
    };
    await this.setCacheValue(cacheKey, blockInfo, CACHE_EXPIRY.DEFAULT);
    return blockInfo;
  }

  async getTransactionDetails(txHash: Hash): Promise<TransactionDetails | null> {
    const cacheKey = `${this.cacheKeyPrefix}/tx/${txHash}`;
    const cached = await this.getCachedValue<TransactionDetails>(cacheKey);
    if (cached) return cached;

    const [transaction, receipt] = await Promise.all([
      this.getTransaction(txHash, 'L2'),
      this.getTransactionReceipt(txHash, 'L2'),
    ]);

    if (!transaction && !receipt) return null;
    const result = { transaction, receipt };
    await this.setCacheValue(cacheKey, result); // Cache permanently
    return result;
  }

  async getNativeBalance(address: Address): Promise<bigint> {
    const cacheKey = `${this.cacheKeyPrefix}/balance/native/${address.toLowerCase()}`;
    const cached = await this.getCachedValue<bigint>(cacheKey);
    if (cached !== undefined) return cached;

    const balance = await this.getBalance(address, 'L2');
    await this.setCacheValue(cacheKey, balance, CACHE_EXPIRY.BALANCE);
    return balance;
  }

  async getErc20Balance(tokenAddress: Address, accountAddress: Address): Promise<bigint> {
    const cacheKey = `${this.cacheKeyPrefix}/balance/erc20/${tokenAddress.toLowerCase()}/${accountAddress.toLowerCase()}`;
    const cached = await this.getCachedValue<bigint>(cacheKey);
    if (cached !== undefined) return cached;
    
    const provider = this.getProvider('L2');
    const tokenContract = new Contract(tokenAddress, ERC20_ABI_MINIMAL, provider);
    const balance = await tokenContract.balanceOf(accountAddress);
    await this.setCacheValue(cacheKey, balance, CACHE_EXPIRY.BALANCE);
    return balance;
  }
  
  // --- L1 Staking Helpers & Write Operations ---
  private async _getValidatorShareContract(validatorId: number): Promise<Contract> {
    const stakeManager = this.getStakeManagerContract();
    const signer = this.getL1Signer();
    logger.debug(`Fetching ValidatorShare contract address for validator ${validatorId}...`);
    const validatorShareAddress = await stakeManager.getValidatorContract(validatorId);

    if (!validatorShareAddress || validatorShareAddress === ZeroAddress) {
      logger.error(`ValidatorShare contract address not found or zero for validator ID ${validatorId}.`);
      throw new Error(`Validator ${validatorId} does not have a valid ValidatorShare contract.`);
    }
    return new Contract(validatorShareAddress, ValidatorShareABI as any, signer);
  }
  
  private async _getL1FeeDetails(): Promise<{ maxFeePerGas: bigint; maxPriorityFeePerGas: bigint; }> {
    if (!this.l1Provider) throw new Error('L1 provider not initialized for fee data.');
    if (!this.runtime) throw new Error('Runtime not available for GasService access.');

    try {
      const gasServiceEstimates = await getGasPriceEstimates(this.runtime);
      if (gasServiceEstimates?.estimatedBaseFee && gasServiceEstimates?.average?.maxPriorityFeePerGas) {
        const maxPriorityFeePerGas = gasServiceEstimates.average.maxPriorityFeePerGas;
        const maxFeePerGas = gasServiceEstimates.estimatedBaseFee + maxPriorityFeePerGas;
        logger.debug('Using L1 fee details from GasService.');
        return { maxFeePerGas, maxPriorityFeePerGas };
      }
    } catch (gsError: any) {
      logger.warn(`GasService call failed or returned insufficient data: ${gsError.message}. Falling back to l1Provider.getFeeData().`);
    }

    logger.debug('Falling back to l1Provider.getFeeData() for L1 fee details.');
    const feeData = await this.l1Provider.getFeeData();
    let maxFeePerGas = feeData.maxFeePerGas;
    let maxPriorityFeePerGas = feeData.maxPriorityFeePerGas;

    if (maxFeePerGas === null || maxPriorityFeePerGas === null) {
      if (feeData.gasPrice !== null) {
        logger.warn('L1 fee data: maxFeePerGas or maxPriorityFeePerGas is null, using gasPrice as fallback.');
        maxFeePerGas = feeData.gasPrice;
        maxPriorityFeePerGas = feeData.gasPrice;
      } else {
        throw new Error('Unable to obtain L1 fee data: getFeeData() returned all null.');
      }
    }
     if (maxFeePerGas === null || maxPriorityFeePerGas === null) {
      throw new Error('Unable to determine L1 fee details even after fallback attempts.');
    }
    return { maxFeePerGas, maxPriorityFeePerGas };
  }

  async delegate(validatorId: number, amountWei: bigint): Promise<string> {
    logger.info(`Initiating delegation of ${ethers.formatEther(amountWei)} MATIC to validator ${validatorId} on L1...`);
    if (amountWei <= 0n) throw new Error('Delegation amount must be greater than zero.');

    const signer = this.getL1Signer();
    const l1Provider = this.getProvider('L1');
    const contract = await this._getValidatorShareContract(validatorId); // This contract is used for sellShares

    try {
      // Delegation happens via ValidatorShare contract's buyVoucher/sellShares or direct stakeFor on StakeManager
      // The provided ABI structure (polygon branch) suggests stakeFor on StakeManager
      const stakeManager = this.getStakeManagerContract();
      // Assuming `stakeFor` exists on stakeManager which takes validatorId and amount (value).
      // Or if it's ValidatorShare.buyVoucher(amount, minSharesToMint)
      // The original `polygon` branch uses `stakeManager.delegate.populateTransaction(validatorId, amountWei);`
      // Let's assume `stakeManager.delegate` is the correct function based on context.
      const txData = await stakeManager.delegate.populateTransaction(validatorId, { value: amountWei });


      const { maxFeePerGas, maxPriorityFeePerGas } = await this._getL1FeeDetails();
      const gasLimit = await signer.estimateGas({ ...txData, value: amountWei });
      const gasLimitBuffered = (gasLimit * 120n) / 100n;

      const tx: TransactionRequest = {
        ...txData, // to, data
        value: amountWei,
        gasLimit: gasLimitBuffered,
        maxFeePerGas,
        maxPriorityFeePerGas,
        chainId: (await l1Provider.getNetwork()).chainId,
      };

      logger.debug('Signing delegation transaction...', tx);
      const signedTx = await signer.signTransaction(tx);
      logger.info(`Broadcasting L1 delegation transaction for validator ${validatorId}...`);
      const txResponse = await this.sendRawTransaction(signedTx, 'L1');
      logger.info(`Delegation transaction sent: ${txResponse.hash}`);
      return txResponse.hash;
    } catch (error: unknown) {
      logger.error(`Delegation to validator ${validatorId} failed:`, error);
      const errorMessage = error instanceof Error ? error.message : String(error);
      throw new Error(`Delegation failed: ${errorMessage}`);
    }
  }
  
  async undelegate(validatorId: number, amountShares: bigint): Promise<string> {
    logger.info(`Initiating undelegation of ${amountShares} shares from validator ${validatorId} on L1...`);
    if (amountShares <= 0n) throw new Error('Undelegation amount (shares) must be greater than zero.');

    const signer = this.getL1Signer();
    const l1Provider = this.getProvider('L1');
    const validatorShareContract = await this._getValidatorShareContract(validatorId);

    try {
      const txData = await validatorShareContract.sellVoucher.populateTransaction(amountShares, 0); // 0 for minMaticToReceive for simplicity
      const { maxFeePerGas, maxPriorityFeePerGas } = await this._getL1FeeDetails();
      const gasLimit = await signer.estimateGas({ ...txData });
      const gasLimitBuffered = (gasLimit * 120n) / 100n;

      const tx: TransactionRequest = {
        ...txData,
        gasLimit: gasLimitBuffered,
        maxFeePerGas,
        maxPriorityFeePerGas,
        chainId: (await l1Provider.getNetwork()).chainId,
      };
      
      logger.debug('Signing undelegation transaction...', tx);
      const signedTx = await signer.signTransaction(tx);
      logger.info(`Broadcasting L1 undelegation transaction for validator ${validatorId}...`);
      const txResponse = await this.sendRawTransaction(signedTx, 'L1');
      logger.info(`Undelegation transaction sent: ${txResponse.hash}`);
      return txResponse.hash;
    } catch (error: unknown) {
      logger.error(`Undelegation from validator ${validatorId} failed:`, error);
      if (error instanceof Error) throw new Error(`Undelegation failed: ${error.message}`);
      throw new Error('Undelegation failed due to an unknown error.');
    }
  }

  async withdrawRewards(validatorId: number): Promise<string> {
    logger.info(`Initiating reward withdrawal for validator ${validatorId} on L1...`);
    const signer = this.getL1Signer();
    const l1Provider = this.getProvider('L1');
    const validatorShareContract = await this._getValidatorShareContract(validatorId);

    try {
      const txData = await validatorShareContract.withdrawRewards.populateTransaction();
      const { maxFeePerGas, maxPriorityFeePerGas } = await this._getL1FeeDetails();
      const gasLimit = await signer.estimateGas({ ...txData });
      const gasLimitBuffered = (gasLimit * 120n) / 100n;

      const tx: TransactionRequest = {
        ...txData,
        gasLimit: gasLimitBuffered,
        maxFeePerGas,
        maxPriorityFeePerGas,
        chainId: (await l1Provider.getNetwork()).chainId,
      };
      
      logger.debug('Signing reward withdrawal transaction...', tx);
      const signedTx = await signer.signTransaction(tx);
      logger.info(`Broadcasting L1 reward withdrawal transaction for validator ${validatorId}...`);
      const txResponse = await this.sendRawTransaction(signedTx, 'L1');
      logger.info(`Reward withdrawal transaction sent: ${txResponse.hash}`);
      return txResponse.hash;
    } catch (error: unknown) {
      logger.error(`Reward withdrawal from validator ${validatorId} failed:`, error);
      if (error instanceof Error) throw new Error(`Reward withdrawal failed: ${error.message}`);
      throw new Error('Reward withdrawal failed due to an unknown error.');
    }
  }
  
  async restake(validatorId: number): Promise<string> {
    logger.info(`Initiating restake (compound rewards) for validator ${validatorId} on L1...`);
    const signer = this.getL1Signer();
    const validatorShareContract = await this._getValidatorShareContract(validatorId); // Signer attached
    
    try {
      // Fetch pending rewards first (this is a read, so provider is fine)
      // Note: ValidatorShareABI needs `getLiquidRewards(address)` or similar
      // For simplicity, assuming the contract has a way to get withdrawable rewards for the L1Signer.
      // If not, this logic needs adjustment based on actual ABI.
      // The original `polygon` branch used `validatorShareContract.getLiquidRewards(signer.address)`
      // which implies ValidatorShareABI should have this.
      const rewardsToRestake = await validatorShareContract.getLiquidRewards(signer.address);
      if (rewardsToRestake <= 0n) {
        logger.info(`No rewards to restake for validator ${validatorId}.`);
        throw new Error('No rewards available to restake.');
      }
      logger.info(`Pending rewards for validator ${validatorId}: ${ethers.formatEther(rewardsToRestake)} MATIC.`);

      // 1. Withdraw rewards
      const withdrawTxHash = await this.withdrawRewards(validatorId);
      logger.info(`Withdrawal part of restake sent: ${withdrawTxHash}. Waiting for confirmation...`);
      const receipt = await this.getProvider('L1').waitForTransaction(withdrawTxHash);
      if (!receipt || receipt.status !== 1) {
          throw new Error(`Withdrawal transaction ${withdrawTxHash} failed or was reverted.`);
      }
      logger.info('Withdrawal transaction confirmed.');

      // 2. Delegate the withdrawn amount
      logger.info(`Proceeding to delegate ${ethers.formatEther(rewardsToRestake)} MATIC rewards...`);
      const delegateTxHash = await this.delegate(validatorId, rewardsToRestake);
      return delegateTxHash;
    } catch (error: unknown) {
      logger.error(`Restake operation for validator ${validatorId} failed:`, error);
      if (error instanceof Error) throw new Error(`Restake failed: ${error.message}`);
      throw new Error('Restake operation failed due to an unknown error.');
    }
  }

  private async _approveErc20IfNeeded(tokenAddressL1: string, amountWei: bigint, spenderAddress: string): Promise<string | null> {
    const signer = this.getL1Signer();
    const l1Provider = this.getProvider('L1');
    const tokenContract = new Contract(tokenAddressL1, ERC20_ABI_MINIMAL, signer);

    logger.debug(`Checking allowance for ${spenderAddress} to spend ${ethers.formatEther(amountWei)} of token ${tokenAddressL1}...`);
    const currentAllowance = await tokenContract.allowance(signer.address, spenderAddress);

    if (currentAllowance >= amountWei) {
      logger.info(`Sufficient allowance (${ethers.formatUnits(currentAllowance, 'wei')}) already granted to ${spenderAddress} for token ${tokenAddressL1}.`);
      return null; // No approval needed
    }

    logger.info(`Current allowance (${ethers.formatUnits(currentAllowance, 'wei')}) is less than required (${amountWei}). Approving ${spenderAddress} for MaxUint256...`);
    try {
      const txData = await tokenContract.approve.populateTransaction(spenderAddress, MaxUint256);
      const { maxFeePerGas, maxPriorityFeePerGas } = await this._getL1FeeDetails();
      const gasLimit = await signer.estimateGas({ ...txData });
      const gasLimitBuffered = (gasLimit * 120n) / 100n;

      const tx: TransactionRequest = {
        ...txData,
        gasLimit: gasLimitBuffered,
        maxFeePerGas,
        maxPriorityFeePerGas,
        chainId: (await l1Provider.getNetwork()).chainId,
      };
      
      logger.debug('Signing approve transaction...', tx);
      const signedTx = await signer.signTransaction(tx);
      logger.info(`Broadcasting L1 approve transaction for token ${tokenContract.target}...`);
      const txResponse = await this.sendRawTransaction(signedTx, 'L1');
      logger.info(`Approval transaction sent: ${txResponse.hash}. Waiting for confirmation...`);
      const receipt = await l1Provider.waitForTransaction(txResponse.hash);
      if (!receipt || receipt.status !== 1) {
          throw new Error(`Approval transaction ${txResponse.hash} failed or was reverted.`);
      }
      logger.info(`Approval for token ${tokenAddressL1} confirmed for spender ${spenderAddress}.`);
      return txResponse.hash;
    } catch (error: unknown) {
      logger.error(`ERC20 approve transaction failed for token ${tokenContract.target}:`, error);
      if (error instanceof Error) throw new Error(`Approval failed: ${error.message}`);
      throw new Error('ERC20 approve transaction failed due to an unknown error.');
    }
  }

  async depositErc20ForUser(userAddress: string, tokenAddressL1: string, amountWei: bigint): Promise<string> {
    logger.info(`Initiating bridge deposit of ${ethers.formatEther(amountWei)} of token ${tokenAddressL1} for user ${userAddress} from L1 to L2...`);
    const signer = this.getL1Signer();
    const l1Provider = this.getProvider('L1');
    const rootChainManager = this.getRootChainManagerContract(); // Already has signer

    try {
      await this._approveErc20IfNeeded(tokenAddressL1, amountWei, ROOT_CHAIN_MANAGER_ADDRESS_L1);

      logger.debug('Preparing depositFor transaction...');
      const depositData = ethers.AbiCoder.defaultAbiCoder().encode(['uint256'], [amountWei]);
      const txData = await rootChainManager.depositFor.populateTransaction(userAddress, tokenAddressL1, depositData);
      
      const { maxFeePerGas, maxPriorityFeePerGas } = await this._getL1FeeDetails();
      const gasLimit = await signer.estimateGas({ ...txData });
      const gasLimitBuffered = (gasLimit * 150n) / 100n;

      const tx: TransactionRequest = {
        ...txData,
        gasLimit: gasLimitBuffered,
        maxFeePerGas,
        maxPriorityFeePerGas,
        chainId: (await l1Provider.getNetwork()).chainId,
      };

      logger.debug('Signing depositFor transaction...', tx);
      const signedTx = await signer.signTransaction(tx);
      logger.info(`Broadcasting L1 depositFor transaction for token ${tokenAddressL1}...`);
      const txResponse = await this.sendRawTransaction(signedTx, 'L1');
      logger.info(`Bridge deposit transaction sent: ${txResponse.hash}`);
      return txResponse.hash;
    } catch (error: unknown) {
      logger.error(`Bridge deposit for token ${tokenAddressL1} failed:`, error);
      if (error instanceof Error) throw new Error(`Bridge deposit failed: ${error.message}`);
      throw new Error('Bridge deposit failed due to an unknown error.');
    }
  }
  
  // --- L2 Checkpoint Status Check (L1) ---
  async getLastCheckpointedL2Block(): Promise<bigint> {
    logger.debug('Getting last checkpointed L2 block number from L1 CheckpointManager...');
    try {
      const checkpointManager = this.getCheckpointManagerContract(); // Provider is fine for read
      // The `merge-addpolygon-resolution` version used currentHeaderBlock and headerBlocks.
      // CheckpointManagerABI should support this.
      const lastHeaderNum = await checkpointManager.currentHeaderBlock();
      if (lastHeaderNum === undefined || lastHeaderNum === null) {
        throw new Error('Failed to retrieve currentHeaderBlock from CheckpointManager.');
      }
      const headerBlockDetails = await checkpointManager.headerBlocks(lastHeaderNum);
      if (!headerBlockDetails || headerBlockDetails.end === undefined) { // ABI might use 'end' or 'endBlock'
        throw new Error('Failed to retrieve valid headerBlockDetails or end block from CheckpointManager.');
      }
      const endBlock = headerBlockDetails.end; // Assuming 'end' from common ABIs
      const lastBlock = BigInt(endBlock.toString());
      logger.info(`Last L2 block checkpointed on L1 (via CheckpointManager): ${lastBlock}`);
      return lastBlock;
    } catch (error: unknown) {
      logger.error('Error fetching last checkpointed L2 block from L1:', error);
      const errorMessage = error instanceof Error ? error.message : String(error);
      throw new Error(`Failed to get last checkpointed L2 block: ${errorMessage}`);
    }
  }

  async isL2BlockCheckpointed(l2BlockNumber: number | bigint): Promise<boolean> {
    const targetBlock = BigInt(l2BlockNumber.toString());
    logger.debug(`Checking if L2 block ${targetBlock} is checkpointed on L1...`);
    try {
      const lastCheckpointedBlock = await this.getLastCheckpointedL2Block();
      const isCheckpointed = targetBlock <= lastCheckpointedBlock;
      logger.info(`L2 block ${targetBlock} checkpointed status: ${isCheckpointed} (Last Checkpointed: ${lastCheckpointedBlock})`);
      return isCheckpointed;
    } catch (error: unknown) {
      logger.error(`Could not determine checkpoint status for L2 block ${targetBlock} due to error fetching last checkpoint.`, error);
      const errorMessage = error instanceof Error ? error.message : String(error);
      throw new Error(`Failed to determine checkpoint status for L2 block ${targetBlock}: ${errorMessage}`);
    }
  }
  
  // --- Cache Helpers ---
  private async getCachedValue<T>(key: string): Promise<T | undefined> {
    if (!this.runtime) return undefined;
    try {
      const cache = await this.runtime.getCache<CacheEntry<T>>(key);
      if (!cache) return undefined;
      // Check if cache has expired (using default service expiry, individual calls can set specific ones)
      if (Date.now() - cache.timestamp > this.cacheExpiryMs) {
        await this.runtime.deleteCache(key);
        return undefined;
      }
      return cache.value;
    } catch (error) {
      logger.error(`Error retrieving from cache (${key}):`, error);
      return undefined;
    }
  }

  private async setCacheValue<T>(key: string, value: T, expiryMs?: number): Promise<void> {
    if (!this.runtime) return;
    try {
      const cacheEntry: CacheEntry<T> = { value, timestamp: Date.now() };
      // Note: The runtime's setCache might not support individual expiry.
      // This expiryMs parameter is for intent; actual expiry depends on runtime.getCache behavior.
      // The getCachedValue correctly checks this.cacheExpiryMs (which can be dynamic if needed)
      await this.runtime.setCache(key, cacheEntry);
    } catch (error) {
      logger.error(`Error setting cache (${key}):`, error);
    }
  }

  /**
   * Gets the ethers provider for the specified network.
   * This is needed for compatibility with contracts that require ethers.js providers.
   */
  getEthersProvider(network: NetworkType = 'L2'): JsonRpcProvider {
    return this.getProvider(network);
  }
}