import { Service, IAgentRuntime, logger } from '@elizaos/core';
import { Contract, Wallet, JsonRpcProvider } from 'ethers';
import { PolygonRpcService } from './PolygonRpcService';
import { getGasPriceEstimates } from './GasService';
import { CONTRACT_ADDRESSES } from '../config';

// Import ABIs
import ERC20ABI from '../contracts/ERC20ABI.json';
import RootChainManagerABI from '../contracts/RootChainManagerABI.json';

/**
 * Interface for ERC20 contract interaction
 */
interface ERC20Contract extends Contract {
  allowance(owner: string, spender: string): Promise<bigint>;
  approve(spender: string, amount: bigint, options?: any): Promise<any>;
  balanceOf(owner: string): Promise<bigint>;
}

/**
 * Interface for RootChainManager contract interaction
 */
interface RootChainManagerContract extends Contract {
  depositFor(user: string, rootToken: string, depositData: string): Promise<any>;
  depositEtherFor(user: string): Promise<any>;
}

/**
 * Result of a bridge deposit operation
 */
export interface BridgeDepositResult {
  approvalTxHash?: string;
  depositTxHash: string;
  tokenAddress: string;
  amount: bigint;
  recipientAddress: string;
}

/**
 * Service for Polygon bridge operations (L1 <-> L2)
 */
export class PolygonBridgeService extends Service {
  static serviceType = 'polygonBridge';
  capabilityDescription = 'Provides bridging functionality between Ethereum (L1) and Polygon (L2)';

  private l1Provider: JsonRpcProvider | null = null;
  private l1Signer: Wallet | null = null;
  private rootChainManagerContract: RootChainManagerContract | null = null;
  private rpcService: PolygonRpcService | null = null;

  constructor(runtime?: IAgentRuntime) {
    super(runtime);
  }

  /**
   * Initializes the bridge service with required providers and contracts
   */
  private async initializeService(): Promise<void> {
    if (!this.runtime) {
      throw new Error('Runtime required for service initialization');
    }

    try {
      // Get RPC service first
      this.rpcService = this.runtime.getService<PolygonRpcService>(PolygonRpcService.serviceType);
      if (!this.rpcService) {
        throw new Error('PolygonRpcService not available');
      }

      // Get L1 provider and create a signer
      const privateKey = this.runtime.getSetting('PRIVATE_KEY');
      if (!privateKey) {
        throw new Error('Private key not available');
      }

      this.l1Provider = this.rpcService.getEthersProvider('L1');
      this.l1Signer = new Wallet(privateKey, this.l1Provider);

      // Initialize the RootChainManager contract
      this.rootChainManagerContract = new Contract(
        CONTRACT_ADDRESSES.ROOT_CHAIN_MANAGER_ADDRESS_L1,
        RootChainManagerABI,
        this.l1Signer
      ) as RootChainManagerContract;

      logger.info('PolygonBridgeService initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize PolygonBridgeService:', error);
      throw error;
    }
  }

  /**
   * Formats an amount in wei to a human-readable format
   */
  private formatWei(wei: bigint): string {
    // Simple conversion to ether with 18 decimals
    return (Number(wei) / 1e18).toString();
  }

  /**
   * Initializes an ERC20 contract instance with signer
   */
  private getERC20Contract(tokenAddress: string): ERC20Contract {
    if (!this.l1Signer) {
      throw new Error('L1 signer not initialized');
    }
    
    return new Contract(
      tokenAddress,
      ERC20ABI,
      this.l1Signer
    ) as ERC20Contract;
  }

  /**
   * Approves the RootChainManager contract to spend tokens
   */
  private async approveERC20(
    tokenAddress: string, 
    amount: bigint,
    gasPrice?: bigint
  ): Promise<string> {
    if (!this.l1Signer || !this.rootChainManagerContract) {
      throw new Error('Bridge service not properly initialized');
    }

    const tokenContract = this.getERC20Contract(tokenAddress);
    const signerAddress = await this.l1Signer.address;
    
    // Check current allowance
    const currentAllowance = await tokenContract.allowance(
      signerAddress, 
      CONTRACT_ADDRESSES.ROOT_CHAIN_MANAGER_ADDRESS_L1
    );
    
    // Skip approval if already approved for sufficient amount
    if (currentAllowance >= amount) {
      logger.info(`Approval already exists for ${this.formatWei(amount)} tokens`);
      return "0x0000000000000000000000000000000000000000000000000000000000000000";
    }
    
    // Prepare transaction options with gas price if provided
    const options: any = {};
    if (gasPrice) {
      options.gasPrice = gasPrice;
    }
    
    // Execute the approve transaction
    logger.info(`Approving ${this.formatWei(amount)} tokens for RootChainManager contract...`);
    const tx = await tokenContract.approve(
      CONTRACT_ADDRESSES.ROOT_CHAIN_MANAGER_ADDRESS_L1,
      amount,
      options
    );
    
    // Add defensive check for tx object
    if (!tx || typeof tx !== 'object') {
      throw new Error('Invalid transaction response from approve method');
    }
    
    // Add defensive check for tx.hash
    if (!tx.hash) {
      throw new Error('Transaction hash missing from approve response');
    }
    
    logger.info(`Approval transaction submitted: ${tx.hash}`);
    
    // Wait for the transaction to be confirmed
    const receipt = await tx.wait();
    
    if (!receipt || receipt.status !== 1) {
      throw new Error(`Approval transaction failed: ${tx.hash}`);
    }
    
    logger.info(`Approval transaction confirmed: ${tx.hash}`);
    return tx.hash;
  }
  
  /**
   * Bridge ERC20 tokens from L1 (Ethereum) to L2 (Polygon)
   * 
   * @param tokenAddressL1 The address of the token on L1
   * @param amountWei The amount to bridge in wei
   * @param recipientAddressL2 Optional recipient address on L2 (defaults to sender's address)
   * @param options Optional configuration like timeout and gas price multiplier
   * @returns Result of the bridge deposit operation
   */
  async bridgeDeposit(
    tokenAddressL1: string,
    amountWei: bigint,
    recipientAddressL2?: string,
    options?: {
      /** Maximum time to wait for approval in milliseconds */
      approvalTimeoutMs?: number;
      /** Gas price multiplier for faster transactions (e.g., 1.2 = 20% higher) */
      gasPriceMultiplier?: number;
      /** Skip waiting for transaction confirmations (risky) */
      skipConfirmation?: boolean;
    }
  ): Promise<BridgeDepositResult> {
    // Default options
    const defaultOptions = {
      approvalTimeoutMs: 300000, // 5 minutes
      gasPriceMultiplier: 1.0,
      skipConfirmation: false
    };
    
    const opts = { ...defaultOptions, ...options };
    
    // Validate input parameters
    if (!tokenAddressL1 || !tokenAddressL1.startsWith('0x')) {
      throw new Error('Invalid token address: must be a valid Ethereum address starting with 0x');
    }
    
    if (amountWei <= 0n) {
      throw new Error('Invalid amount: must be greater than 0');
    }
    
    if (recipientAddressL2 && !recipientAddressL2.startsWith('0x')) {
      throw new Error('Invalid recipient address: must be a valid Ethereum address starting with 0x');
    }
    
    // Initialize services if not already done
    if (!this.rootChainManagerContract || !this.l1Signer) {
      try {
        await this.initializeService();
      } catch (error) {
        throw new Error(`Failed to initialize bridge service: ${error instanceof Error ? error.message : String(error)}`);
      }
    }
    
    if (!this.rootChainManagerContract || !this.l1Signer) {
      throw new Error('Bridge service initialization failed');
    }
    
    const signerAddress = this.l1Signer.address;
    const recipient = recipientAddressL2 || signerAddress;
    
    logger.info(`Starting L1->L2 bridge deposit of ${this.formatWei(amountWei)} tokens from ${tokenAddressL1} to ${recipient}`);
    
    // Get gas price estimates for L1
    let gasPrice: bigint | undefined;
    
    try {
      const gasEstimates = await getGasPriceEstimates(this.runtime!);
      
      // Use fast gas price if available, otherwise use fallback
      if (gasEstimates.fast?.maxPriorityFeePerGas) {
        // Add estimated base fee to priority fee for total gas price
        const baseFee = gasEstimates.estimatedBaseFee || 0n;
        gasPrice = gasEstimates.fast.maxPriorityFeePerGas + baseFee;
      } else if (gasEstimates.fallbackGasPrice) {
        gasPrice = gasEstimates.fallbackGasPrice;
      }
      
      // Apply gas price multiplier if specified
      if (gasPrice && opts.gasPriceMultiplier !== 1.0) {
        gasPrice = BigInt(Math.floor(Number(gasPrice) * opts.gasPriceMultiplier));
      }
      
      logger.info(`Using gas price: ${gasPrice ? gasPrice.toString() : 'default'} wei`);
    } catch (error) {
      logger.warn(`Failed to get gas price estimates: ${error instanceof Error ? error.message : String(error)}`);
      logger.info('Proceeding with default gas price');
      // Continue without specific gas price, will use network default
    }
    
    // Step 1: Approve tokens if needed
    let approvalTxHash: string;
    try {
      logger.info(`Initiating approval for ${this.formatWei(amountWei)} tokens from ${tokenAddressL1}`);
      
      // Create a promise with timeout for the approval
      const approvalPromise = this.approveERC20(tokenAddressL1, amountWei, gasPrice);
      
      if (opts.approvalTimeoutMs > 0) {
        // Create a timeout promise
        const timeoutPromise = new Promise<never>((_, reject) => {
          setTimeout(() => reject(new Error(`Approval transaction timed out after ${opts.approvalTimeoutMs}ms`)), 
            opts.approvalTimeoutMs);
        });
        
        // Race the approval against the timeout
        approvalTxHash = await Promise.race([approvalPromise, timeoutPromise]);
      } else {
        approvalTxHash = await approvalPromise;
      }
      
      if (approvalTxHash !== "0x0000000000000000000000000000000000000000000000000000000000000000") {
        logger.info(`Approval transaction confirmed: ${approvalTxHash}`);
      } else {
        logger.info('Approval was not needed (sufficient allowance already exists)');
      }
    } catch (error) {
      if (error instanceof Error && error.message.includes('timed out')) {
        throw error; // Re-throw timeout errors
      }
      throw new Error(`Token approval failed: ${error instanceof Error ? error.message : String(error)}`);
    }
    
    // Step 2: Prepare deposit data (ABI-encoded token amount)
    const depositData = '0x' + amountWei.toString(16).padStart(64, '0');
    
    // Step 3: Execute deposit transaction
    let depositTx;
    try {
      logger.info(`Depositing ${this.formatWei(amountWei)} tokens to Polygon...`);
      
      // Get gas price info for logging only
      if (gasPrice) {
        logger.info(`Gas price estimate for deposit: ${gasPrice} wei`);
      }
      
      // Call depositFor with standard arguments
      depositTx = await this.rootChainManagerContract.depositFor(
        recipient,
        tokenAddressL1,
        depositData
      );
      
      // Add defensive check for depositTx
      if (!depositTx || typeof depositTx !== 'object') {
        throw new Error('Invalid transaction response from depositFor method');
      }
      
      // Add defensive check for depositTx.hash
      if (!depositTx.hash) {
        throw new Error('Transaction hash missing from depositFor response');
      }
      
      logger.info(`Deposit transaction submitted: ${depositTx.hash}`);
    } catch (error) {
      throw new Error(`Failed to submit deposit transaction: ${error instanceof Error ? error.message : String(error)}`);
    }
    
    // Wait for confirmation if not skipped
    if (!opts.skipConfirmation) {
      try {
        // Add defensive check for depositTx.wait
        if (!depositTx.wait || typeof depositTx.wait !== 'function') {
          throw new Error('Transaction wait method not available');
        }
        
        const depositReceipt = await depositTx.wait();
        
        if (!depositReceipt || depositReceipt.status !== 1) {
          throw new Error(`Deposit transaction failed: ${depositTx.hash}`);
        }
        
        logger.info(`Deposit transaction confirmed: ${depositTx.hash}`);
      } catch (error) {
        throw new Error(`Deposit transaction failed or confirmation error: ${error instanceof Error ? error.message : String(error)}`);
      }
    }
    
    logger.info(`Tokens bridged to Polygon. Please allow 20-30 minutes for tokens to appear on L2.`);
    
    return {
      approvalTxHash: approvalTxHash !== "0x0000000000000000000000000000000000000000000000000000000000000000" 
        ? approvalTxHash 
        : undefined,
      depositTxHash: depositTx.hash,
      tokenAddress: tokenAddressL1,
      amount: amountWei,
      recipientAddress: recipient
    };
  }

  static async start(runtime: IAgentRuntime): Promise<PolygonBridgeService> {
    logger.info(`Starting PolygonBridgeService...`);
    const service = new PolygonBridgeService(runtime);
    await service.initializeService();
    return service;
  }

  static async stop(runtime: IAgentRuntime): Promise<void> {
    logger.info(`Stopping PolygonBridgeService...`);
  }

  async stop(): Promise<void> {
    this.l1Provider = null;
    this.l1Signer = null;
    this.rootChainManagerContract = null;
    this.rpcService = null;
  }
} 