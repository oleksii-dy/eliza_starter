import { Service, IAgentRuntime, logger } from '@elizaos/core';
import { 
  Wallet, 
  JsonRpcProvider, 
  formatUnits,
  Contract,
  parseUnits,
  TransactionRequest
} from 'ethers';
import {
  Transaction,
  SignedTransaction,
  TransactionReceipt,
  TokenBalance,
  ClankerConfig,
  ErrorCode,
} from '../types';
import { ClankerError } from '../utils/errors';
import { TransactionMonitor } from '../utils/transactions';

export class WalletService extends Service {
  static serviceType = 'wallet';
  
  private wallet: Wallet | null = null;
  private provider: JsonRpcProvider | null = null;
  private config: ClankerConfig | null = null;
  private transactionMonitor: TransactionMonitor;
  private nonce: number | null = null;
  
  constructor(runtime: IAgentRuntime) {
    super(runtime);
    this.transactionMonitor = new TransactionMonitor();
  }

  async initialize(runtime: IAgentRuntime): Promise<void> {
    logger.info('Initializing Wallet service...');
    
    try {
      // Try to get config from runtime first, then fall back to global
      this.config = runtime.getSetting('clanker') as ClankerConfig || (global as any).__clankerConfig;
      if (!this.config) {
        throw new Error('Clanker configuration not found');
      }

      // Initialize provider
      this.provider = new JsonRpcProvider(this.config.BASE_RPC_URL);
      
      // Initialize wallet
      if (!this.config.WALLET_PRIVATE_KEY) {
        throw new Error('Wallet private key not configured');
      }

      this.wallet = new Wallet(this.config.WALLET_PRIVATE_KEY, this.provider);
      
      // Test connection and log wallet address
      const network = await this.provider.getNetwork();
      const address = await this.wallet.getAddress();
      const balance = await this.provider.getBalance(address);
      
      logger.info(`Wallet initialized on ${network.name} network`);
      logger.info(`Wallet address: ${address}`);
      logger.info(`ETH balance: ${formatUnits(balance, 18)} ETH`);
      
      // Initialize nonce
      this.nonce = await this.wallet.getNonce();
      
    } catch (error) {
      logger.error('Failed to initialize Wallet service:', error);
      throw new ClankerError(
        ErrorCode.SECURITY_ERROR,
        'Failed to initialize wallet',
        error
      );
    }
  }

  async connect(): Promise<void> {
    if (!this.wallet) {
      throw new ClankerError(
        ErrorCode.SECURITY_ERROR,
        'Wallet not initialized'
      );
    }
    
    // Already connected via constructor
    logger.info('Wallet connected');
  }

  async getAddress(): Promise<string> {
    if (!this.wallet) {
      throw new ClankerError(
        ErrorCode.SECURITY_ERROR,
        'Wallet not initialized'
      );
    }
    
    return this.wallet.address;
  }

  async signTransaction(tx: Transaction): Promise<SignedTransaction> {
    if (!this.wallet) {
      throw new ClankerError(
        ErrorCode.SECURITY_ERROR,
        'Wallet not initialized'
      );
    }

    try {
      // Prepare transaction
      const txRequest: TransactionRequest = {
        to: tx.to,
        from: tx.from || this.wallet.address,
        value: tx.value ? BigInt(tx.value.toString()) : undefined,
        data: tx.data,
        gasLimit: tx.gasLimit ? BigInt(tx.gasLimit.toString()) : undefined,
        gasPrice: tx.gasPrice ? BigInt(tx.gasPrice.toString()) : undefined,
        nonce: tx.nonce || this.nonce || undefined,
      };

      // Estimate gas if not provided
      if (!txRequest.gasLimit) {
        const estimated = await this.wallet.estimateGas(txRequest);
        txRequest.gasLimit = (estimated * 120n) / 100n; // Add 20% buffer
      }

      // Get gas price if not provided
      if (!txRequest.gasPrice) {
        const feeData = await this.provider!.getFeeData();
        txRequest.gasPrice = feeData.gasPrice || parseUnits('20', 'gwei');
        
        // Check max gas price
        const maxGasPrice = BigInt(this.config!.MAX_GAS_PRICE);
        if (txRequest.gasPrice > maxGasPrice) {
          throw new ClankerError(
            ErrorCode.VALIDATION_ERROR,
            `Gas price ${formatUnits(txRequest.gasPrice, 'gwei')} gwei exceeds maximum ${formatUnits(maxGasPrice, 'gwei')} gwei`
          );
        }
      }

      // Sign transaction
      const signedTx = await this.wallet.signTransaction(txRequest);
      const hash = await this.wallet.sendTransaction(txRequest);
      
      return {
        hash: hash.hash,
        raw: signedTx,
      };
    } catch (error) {
      logger.error('Failed to sign transaction:', error);
      throw new ClankerError(
        ErrorCode.SECURITY_ERROR,
        'Failed to sign transaction',
        error
      );
    }
  }

  async getBalance(token?: string): Promise<bigint> {
    if (!this.wallet || !this.provider) {
      throw new ClankerError(
        ErrorCode.SECURITY_ERROR,
        'Wallet not initialized'
      );
    }

    try {
      const address = this.wallet.address;
      
      if (!token) {
        // Get ETH balance
        return await this.provider.getBalance(address);
      }
      
      // Get token balance
      const tokenAbi = [
        'function balanceOf(address) view returns (uint256)',
      ];
      
      const tokenContract = new Contract(token, tokenAbi, this.provider);
      return await tokenContract.balanceOf(address);
    } catch (error) {
      logger.error('Failed to get balance:', error);
      throw new ClankerError(
        ErrorCode.NETWORK_ERROR,
        'Failed to get balance',
        error
      );
    }
  }

  async getTokenBalance(tokenAddress: string): Promise<TokenBalance> {
    if (!this.wallet || !this.provider) {
      throw new ClankerError(
        ErrorCode.SECURITY_ERROR,
        'Wallet not initialized'
      );
    }

    try {
      const tokenAbi = [
        'function name() view returns (string)',
        'function symbol() view returns (string)',
        'function decimals() view returns (uint8)',
        'function balanceOf(address) view returns (uint256)',
      ];
      
      const token = new Contract(tokenAddress, tokenAbi, this.provider);
      
      const [name, symbol, decimals, balance] = await Promise.all([
        token.name(),
        token.symbol(),
        token.decimals(),
        token.balanceOf(this.wallet.address),
      ]);

      return {
        token: tokenAddress,
        symbol,
        decimals,
        balance,
        formattedBalance: formatUnits(balance, decimals),
      };
    } catch (error) {
      logger.error('Failed to get token balance:', error);
      throw new ClankerError(
        ErrorCode.NETWORK_ERROR,
        'Failed to get token balance',
        error
      );
    }
  }

  async sendTransaction(tx: Transaction): Promise<TransactionReceipt> {
    if (!this.wallet || !this.provider) {
      throw new ClankerError(
        ErrorCode.SECURITY_ERROR,
        'Wallet not initialized'
      );
    }

    try {
      // Sign and send transaction
      const signed = await this.signTransaction(tx);
      
      // Add to monitor
      this.transactionMonitor.addTransaction(signed.hash);
      
      // Wait for transaction
      const receipt = await this.waitForTransaction(signed.hash);
      
      // Update nonce
      if (this.nonce !== null) {
        this.nonce++;
      }
      
      return receipt;
    } catch (error) {
      logger.error('Failed to send transaction:', error);
      throw new ClankerError(
        ErrorCode.TRANSACTION_FAILED,
        'Failed to send transaction',
        error
      );
    }
  }

  async waitForTransaction(hash: string): Promise<TransactionReceipt> {
    if (!this.provider) {
      throw new ClankerError(
        ErrorCode.SECURITY_ERROR,
        'Provider not initialized'
      );
    }

    try {
      const status = await this.transactionMonitor.waitForTransaction(
        hash,
        this.provider,
        1
      );

      if (status.status !== 'confirmed') {
        throw new ClankerError(
          ErrorCode.TRANSACTION_FAILED,
          status.error || 'Transaction failed'
        );
      }

      const receipt = await this.provider.getTransactionReceipt(hash);
      
      return {
        hash: receipt!.hash,
        blockNumber: receipt!.blockNumber,
        blockHash: receipt!.blockHash,
        gasUsed: receipt!.gasUsed,
        status: receipt!.status === 1,
        logs: receipt!.logs,
      };
    } catch (error) {
      logger.error('Failed to wait for transaction:', error);
      if (error instanceof ClankerError) throw error;
      
      throw new ClankerError(
        ErrorCode.NETWORK_ERROR,
        'Failed to wait for transaction',
        error
      );
    }
  }

  getTransactionMonitor(): TransactionMonitor {
    return this.transactionMonitor;
  }

  async stop(): Promise<void> {
    logger.info('Stopping Wallet service...');
    this.wallet = null;
    this.provider = null;
    this.config = null;
    this.nonce = null;
  }
}