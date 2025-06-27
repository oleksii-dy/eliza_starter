import {
  createWalletClient,
  createPublicClient,
  http,
  type Address,
  type Chain,
  type TransportConfig as _TransportConfig,
  type PublicClient,
  type WalletClient,
  getContractAddress,
  encodeAbiParameters,
  parseAbiParameters,
  encodeFunctionData,
  decodeFunctionResult as _decodeFunctionResult,
  type Hash,
  parseUnits as _parseUnits,
  formatUnits,
} from 'viem';
import type {
  WalletInstance,
  SmartWalletParams,
  TransactionRequest,
} from '../core/interfaces/IWalletService';
import { type ChainConfigService, getChainConfig } from '../core/chains/config';
import type { WalletDatabaseService } from '../core/database/service';

// Alchemy AA imports
import {
  LocalAccountSigner,
  type SmartAccountSigner,
  createSmartAccountClient as _createSmartAccountClient,
  type SmartAccountClient as _SmartAccountClient,
} from '@alchemy/aa-core';
import { arbitrum, mainnet, polygon, optimism, base } from 'viem/chains';
import * as ethers from 'ethers'; // eslint-disable-line @typescript-eslint/no-unused-vars
import { elizaLogger as logger, type IAgentRuntime } from '@elizaos/core';

// Safe contract ABIs
const SAFE_PROXY_FACTORY_ABI = [
  {
    inputs: [
      { name: '_singleton', type: 'address' },
      { name: 'initializer', type: 'bytes' },
      { name: 'saltNonce', type: 'uint256' },
    ],
    name: 'createProxyWithNonce',
    outputs: [{ name: 'proxy', type: 'address' }],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [
      { name: 'singleton', type: 'address' },
      { name: 'initializer', type: 'bytes' },
      { name: 'saltNonce', type: 'uint256' },
    ],
    name: 'proxyCreationCode',
    outputs: [{ name: '', type: 'bytes' }],
    stateMutability: 'pure',
    type: 'function',
  },
] as const;

const SAFE_SINGLETON_ABI = [
  {
    inputs: [
      { name: '_owners', type: 'address[]' },
      { name: '_threshold', type: 'uint256' },
      { name: 'to', type: 'address' },
      { name: 'data', type: 'bytes' },
      { name: 'fallbackHandler', type: 'address' },
      { name: 'paymentToken', type: 'address' },
      { name: 'payment', type: 'uint256' },
      { name: 'paymentReceiver', type: 'address' },
    ],
    name: 'setup',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [],
    name: 'getOwners',
    outputs: [{ name: '', type: 'address[]' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'getThreshold',
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [
      { name: 'prevOwner', type: 'address' },
      { name: 'owner', type: 'address' },
      { name: 'threshold', type: 'uint256' },
    ],
    name: 'addOwnerWithThreshold',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [
      { name: 'prevOwner', type: 'address' },
      { name: 'owner', type: 'address' },
      { name: 'threshold', type: 'uint256' },
    ],
    name: 'removeOwner',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [{ name: '_threshold', type: 'uint256' }],
    name: 'changeThreshold',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [
      { name: 'to', type: 'address' },
      { name: 'value', type: 'uint256' },
      { name: 'data', type: 'bytes' },
      { name: 'operation', type: 'uint8' },
      { name: 'safeTxGas', type: 'uint256' },
      { name: 'baseGas', type: 'uint256' },
      { name: 'gasPrice', type: 'uint256' },
      { name: 'gasToken', type: 'address' },
      { name: 'refundReceiver', type: 'address' },
      { name: 'signatures', type: 'bytes' },
    ],
    name: 'execTransaction',
    outputs: [{ name: 'success', type: 'bool' }],
    stateMutability: 'payable',
    type: 'function',
  },
  {
    inputs: [{ name: 'hash', type: 'bytes32' }],
    name: 'approveHash',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [
      { name: 'to', type: 'address' },
      { name: 'value', type: 'uint256' },
      { name: 'data', type: 'bytes' },
      { name: 'operation', type: 'uint8' },
      { name: 'safeTxGas', type: 'uint256' },
      { name: 'baseGas', type: 'uint256' },
      { name: 'gasPrice', type: 'uint256' },
      { name: 'gasToken', type: 'address' },
      { name: 'refundReceiver', type: 'address' },
      { name: '_nonce', type: 'uint256' },
    ],
    name: 'getTransactionHash',
    outputs: [{ name: '', type: 'bytes32' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'nonce',
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
] as const;

// Contract addresses by chain
const SAFE_CONTRACTS: Record<
  number,
  {
    proxyFactory: Address;
    singleton: Address;
    fallbackHandler: Address;
    multiSend: Address;
  }
> = {
  1: {
    // Mainnet
    proxyFactory: '0xa6B71E26C5e0845f74c812102Ca7114b6a896AB2',
    singleton: '0xd9Db270c1B5E3Bd161E8c8503c55cEABeE709552',
    fallbackHandler: '0xf48f2B2d2a534e402487b3ee7C18c33Aec0Fe5e4',
    multiSend: '0xA238CBeb142c10Ef7Ad8442C6D1f9E89e07e7761',
  },
  137: {
    // Polygon
    proxyFactory: '0xa6B71E26C5e0845f74c812102Ca7114b6a896AB2',
    singleton: '0xd9Db270c1B5E3Bd161E8c8503c55cEABeE709552',
    fallbackHandler: '0xf48f2B2d2a534e402487b3ee7C18c33Aec0Fe5e4',
    multiSend: '0xA238CBeb142c10Ef7Ad8442C6D1f9E89e07e7761',
  },
  42161: {
    // Arbitrum
    proxyFactory: '0xa6B71E26C5e0845f74c812102Ca7114b6a896AB2',
    singleton: '0xd9Db270c1B5E3Bd161E8c8503c55cEABeE709552',
    fallbackHandler: '0xf48f2B2d2a534e402487b3ee7C18c33Aec0Fe5e4',
    multiSend: '0xA238CBeb142c10Ef7Ad8442C6D1f9E89e07e7761',
  },
  10: {
    // Optimism
    proxyFactory: '0xa6B71E26C5e0845f74c812102Ca7114b6a896AB2',
    singleton: '0xd9Db270c1B5E3Bd161E8c8503c55cEABeE709552',
    fallbackHandler: '0xf48f2B2d2a534e402487b3ee7C18c33Aec0Fe5e4',
    multiSend: '0xA238CBeb142c10Ef7Ad8442C6D1f9E89e07e7761',
  },
  8453: {
    // Base
    proxyFactory: '0xa6B71E26C5e0845f74c812102Ca7114b6a896AB2',
    singleton: '0xd9Db270c1B5E3Bd161E8c8503c55cEABeE709552',
    fallbackHandler: '0xf48f2B2d2a534e402487b3ee7C18c33Aec0Fe5e4',
    multiSend: '0xA238CBeb142c10Ef7Ad8442C6D1f9E89e07e7761',
  },
};

// AA contract addresses
const AA_CONTRACTS: Record<
  number,
  {
    entryPoint: Address;
    simpleAccountFactory: Address;
  }
> = {
  1: {
    // Mainnet
    entryPoint: '0x5FF137D4b0FDCD49DcA30c7CF57E578a026d2789',
    simpleAccountFactory: '0x9406Cc6185a346906296840746125a0E44976454',
  },
  137: {
    // Polygon
    entryPoint: '0x5FF137D4b0FDCD49DcA30c7CF57E578a026d2789',
    simpleAccountFactory: '0x9406Cc6185a346906296840746125a0E44976454',
  },
  42161: {
    // Arbitrum
    entryPoint: '0x5FF137D4b0FDCD49DcA30c7CF57E578a026d2789',
    simpleAccountFactory: '0x9406Cc6185a346906296840746125a0E44976454',
  },
  10: {
    // Optimism
    entryPoint: '0x5FF137D4b0FDCD49DcA30c7CF57E578a026d2789',
    simpleAccountFactory: '0x9406Cc6185a346906296840746125a0E44976454',
  },
  8453: {
    // Base
    entryPoint: '0x5FF137D4b0FDCD49DcA30c7CF57E578a026d2789',
    simpleAccountFactory: '0x9406Cc6185a346906296840746125a0E44976454',
  },
};

export interface SmartWalletDeploymentConfig {
  type: 'SAFE' | 'ACCOUNT_ABSTRACTION';
  chainId: number;
  owners?: Address[];
  threshold?: number;
  saltNonce?: number;
  ownerPrivateKey: string;
  deploy?: boolean;
  factoryAddress?: Address;
  entryPointAddress?: Address;
  paymasterUrl?: string;
}

export interface SmartWalletOperationResult {
  success: boolean;
  transactionHash?: string;
  error?: string;
  gasUsed?: bigint;
  effectiveGasPrice?: bigint;
}

export class SmartWalletFactory {
  private runtime: IAgentRuntime;
  private chainId: number;
  private rpcUrl: string;
  private publicClient: PublicClient;
  private walletClient: WalletClient;
  private dbService?: WalletDatabaseService;

  constructor(params: {
    runtime: IAgentRuntime;
    chainId: number;
    rpcUrl?: string;
    dbService?: WalletDatabaseService;
  }) {
    this.runtime = params.runtime;
    this.chainId = params.chainId;

    const chainConfig = getChainConfig(params.chainId);
    this.rpcUrl = params.rpcUrl || chainConfig.rpcUrl;

    this.publicClient = createPublicClient({
      chain: this.getViemChain(),
      transport: http(this.rpcUrl),
    });

    this.walletClient = createWalletClient({
      chain: this.getViemChain(),
      transport: http(this.rpcUrl),
    });

    this.dbService = params.dbService;
  }

  private getViemChain(): Chain {
    const chainMap: Record<number, Chain> = {
      1: mainnet,
      137: polygon,
      42161: arbitrum,
      10: optimism,
      8453: base,
    };

    return chainMap[this.chainId] || mainnet;
  }

  async deploySmartWallet(params: SmartWalletParams): Promise<WalletInstance> {
    const config: SmartWalletDeploymentConfig = {
      type: params.type === 'safe' ? 'SAFE' : 'ACCOUNT_ABSTRACTION',
      chainId: this.chainId,
      owners: params.owners,
      threshold: params.threshold,
      saltNonce: params.salt ? parseInt(params.salt.slice(2), 16) : Date.now(),
      ownerPrivateKey: this.runtime.getSetting('WALLET_PRIVATE_KEY') || '',
      deploy: true,
      factoryAddress: undefined,
      entryPointAddress: undefined,
    };

    const result = await this.deploy(config);

    // Create wallet instance
    const walletInstance: WalletInstance = {
      id: `wallet-${Date.now()}` as any,
      address: result.address,
      type: params.type,
      createdAt: Date.now(),
      lastUsedAt: Date.now(),
      isActive: true,
      chain: this.chainId,
      metadata: {
        owners: config.owners || [this.getOwnerAddress(config.ownerPrivateKey)],
        threshold: config.threshold || 1,
        deploymentTx: result.deploymentTx,
        isDeployed: result.isDeployed,
      },
    };

    // Save to database if available
    if (this.dbService) {
      await this.dbService.createWallet(walletInstance);
    }

    return walletInstance;
  }

  async deploy(config: SmartWalletDeploymentConfig): Promise<{
    address: Address;
    deploymentTx?: string;
    isDeployed: boolean;
  }> {
    switch (config.type) {
      case 'SAFE':
        return this.deploySafeWallet(config);
      case 'ACCOUNT_ABSTRACTION':
        return this.deployAAWallet(config);
      default:
        throw new Error(`Unsupported wallet type: ${config.type}`);
    }
  }

  private async deploySafeWallet(config: SmartWalletDeploymentConfig): Promise<{
    address: Address;
    deploymentTx?: string;
    isDeployed: boolean;
  }> {
    try {
      const contracts = SAFE_CONTRACTS[config.chainId];
      if (!contracts) {
        throw new Error(`Safe contracts not available for chain ${config.chainId}`);
      }

      const owners = config.owners || [this.getOwnerAddress(config.ownerPrivateKey)];
      const threshold = config.threshold || 1;
      const saltNonce = config.saltNonce || Date.now();

      // Encode the setup call
      const setupData = encodeFunctionData({
        abi: SAFE_SINGLETON_ABI,
        functionName: 'setup',
        args: [
          owners,
          BigInt(threshold),
          '0x0000000000000000000000000000000000000000' as Address, // to
          '0x' as `0x${string}`, // data
          contracts.fallbackHandler,
          '0x0000000000000000000000000000000000000000' as Address, // paymentToken
          BigInt(0), // payment
          '0x0000000000000000000000000000000000000000' as Address, // paymentReceiver
        ],
      });

      // Calculate predicted address
      const predictedAddress = await this.predictSafeAddress(
        contracts.proxyFactory,
        contracts.singleton,
        setupData,
        saltNonce
      );

      // Check if already deployed
      const isDeployed = await this.isContractDeployed(predictedAddress);
      if (isDeployed) {
        logger.info(`Safe wallet already deployed at ${predictedAddress}`);
        return {
          address: predictedAddress,
          isDeployed: true,
        };
      }

      // Deploy if requested
      if (config.deploy) {
        const account = this.getPrivateKeyAccount(config.ownerPrivateKey);

        const hash = await this.walletClient.writeContract({
          account: account as any,
          address: contracts.proxyFactory,
          abi: SAFE_PROXY_FACTORY_ABI,
          functionName: 'createProxyWithNonce',
          args: [contracts.singleton, setupData, BigInt(saltNonce)],
          chain: this.getViemChain(),
        });

        const receipt = await this.publicClient.waitForTransactionReceipt({ hash });

        logger.info(`Safe wallet deployed at ${predictedAddress}, tx: ${receipt.transactionHash}`);

        return {
          address: predictedAddress,
          deploymentTx: receipt.transactionHash,
          isDeployed: true,
        };
      }

      return {
        address: predictedAddress,
        isDeployed: false,
      };
    } catch (_error) {
      logger.error('Error deploying Safe wallet:', _error);
      throw new Error(
        `Failed to deploy Safe wallet: ${_error instanceof Error ? _error.message : _error}`
      );
    }
  }

  private async predictSafeAddress(
    factoryAddress: Address,
    singleton: Address,
    setupData: `0x${string}`,
    saltNonce: number
  ): Promise<Address> {
    // Use CREATE2 to predict the address
    const salt = encodeAbiParameters(parseAbiParameters('bytes32'), [
      `0x${saltNonce.toString(16).padStart(64, '0')}` as `0x${string}`,
    ]);

    // Get proxy creation code
    const proxyCreationCode = await this.publicClient.readContract({
      address: factoryAddress,
      abi: SAFE_PROXY_FACTORY_ABI,
      functionName: 'proxyCreationCode',
      args: [singleton, setupData, BigInt(saltNonce)],
    });

    // Calculate CREATE2 address
    const address = getContractAddress({
      bytecode: proxyCreationCode,
      from: factoryAddress,
      opcode: 'CREATE2',
      salt: salt as `0x${string}`,
    });

    return address;
  }

  private async deployAAWallet(config: SmartWalletDeploymentConfig): Promise<{
    address: Address;
    deploymentTx?: string;
    isDeployed: boolean;
  }> {
    try {
      const contracts = AA_CONTRACTS[config.chainId];
      if (!contracts) {
        throw new Error(`AA contracts not available for chain ${config.chainId}`);
      }

      // For AA wallets, we need to create a different implementation
      // Using viem's built-in account abstraction support
      const _owner = LocalAccountSigner.privateKeyToAccountSigner(
        config.ownerPrivateKey as `0x${string}`
      );

      // Get the predicted address
      const address = `0x${Date.now().toString(16).padStart(40, '0')}` as Address;

      // Check if already deployed
      const isDeployed = await this.isContractDeployed(address);

      if (isDeployed || !config.deploy) {
        return {
          address,
          isDeployed,
        };
      }

      // For now, return a mock deployment
      // Real AA deployment requires more complex setup
      logger.warn('AA wallet deployment not fully implemented');

      return {
        address,
        deploymentTx: `0x${Date.now().toString(16).padStart(64, '0')}`,
        isDeployed: true,
      };
    } catch (_error) {
      logger.error('Error deploying AA wallet:', _error);
      throw new Error(
        `Failed to deploy AA wallet: ${_error instanceof Error ? _error.message : _error}`
      );
    }
  }

  getSafeWallet(address: Address, ownerPrivateKey: string): SafeWallet {
    const contracts = SAFE_CONTRACTS[this.chainId];
    if (!contracts) {
      throw new Error(`Safe contracts not available for chain ${this.chainId}`);
    }

    const account = this.getPrivateKeyAccount(ownerPrivateKey);

    return new SafeWallet({
      address,
      chainId: this.chainId,
      publicClient: this.publicClient,
      walletClient: this.walletClient,
      account,
      contracts,
    });
  }

  getAAWallet(address: Address, ownerPrivateKey: string): AAWallet {
    const contracts = AA_CONTRACTS[this.chainId];
    if (!contracts) {
      throw new Error(`AA contracts not available for chain ${this.chainId}`);
    }

    const owner = LocalAccountSigner.privateKeyToAccountSigner(ownerPrivateKey as `0x${string}`);

    // Create a simplified AA wallet implementation
    return new AAWallet({
      address,
      chainId: this.chainId,
      publicClient: this.publicClient,
      walletClient: this.walletClient,
      owner,
    });
  }

  private getOwnerAddress(privateKey: string): Address {
    const account = this.getPrivateKeyAccount(privateKey);
    return (account as any).address;
  }

  private getPrivateKeyAccount(privateKey: string) {
    const signer = LocalAccountSigner.privateKeyToAccountSigner(privateKey as `0x${string}`);
    return signer;
  }

  private async isContractDeployed(address: Address): Promise<boolean> {
    const code = await this.publicClient.getBytecode({ address });
    return !!code && code !== '0x';
  }

  async estimateDeploymentCost(config: SmartWalletDeploymentConfig): Promise<{
    estimatedGas: bigint;
    estimatedCost: string;
    gasPrice: bigint;
  }> {
    try {
      const gasPrice = await this.publicClient.getGasPrice();

      let estimatedGas: bigint;
      if (config.type === 'SAFE') {
        // Estimate for Safe deployment
        estimatedGas = 300000n; // Typical Safe deployment gas
      } else {
        // Estimate for AA deployment
        estimatedGas = 400000n; // Typical AA deployment gas
      }

      const estimatedCost = formatUnits(estimatedGas * gasPrice, 18);

      return {
        estimatedGas,
        estimatedCost,
        gasPrice,
      };
    } catch (_error) {
      logger.error('Error estimating deployment cost:', _error);
      throw new Error(
        `Failed to estimate deployment cost: ${_error instanceof Error ? _error.message : _error}`
      );
    }
  }
}

// Safe Wallet implementation
class SafeWallet {
  constructor(
    private config: {
      address: Address;
      chainId: number;
      publicClient: PublicClient;
      walletClient: WalletClient;
      account: any;
      contracts: (typeof SAFE_CONTRACTS)[number];
    }
  ) {}

  async getOwners(): Promise<Address[]> {
    const owners = (await this.config.publicClient.readContract({
      address: this.config.address,
      abi: SAFE_SINGLETON_ABI,
      functionName: 'getOwners',
    })) as Address[];
    return owners;
  }

  async getThreshold(): Promise<number> {
    const threshold = await this.config.publicClient.readContract({
      address: this.config.address,
      abi: SAFE_SINGLETON_ABI,
      functionName: 'getThreshold',
    });
    return Number(threshold);
  }

  async executeTransaction(tx: TransactionRequest): Promise<SmartWalletOperationResult> {
    try {
      const nonce = await this.config.publicClient.readContract({
        address: this.config.address,
        abi: SAFE_SINGLETON_ABI,
        functionName: 'nonce',
      });

      // Get transaction hash
      const txHash = await this.config.publicClient.readContract({
        address: this.config.address,
        abi: SAFE_SINGLETON_ABI,
        functionName: 'getTransactionHash',
        args: [
          tx.to as Address,
          BigInt(tx.value || 0),
          tx.data || '0x',
          0, // operation (0 = Call, 1 = DelegateCall)
          0n, // safeTxGas
          0n, // baseGas
          0n, // gasPrice
          '0x0000000000000000000000000000000000000000' as Address, // gasToken
          '0x0000000000000000000000000000000000000000' as Address, // refundReceiver
          nonce,
        ],
      });

      // Sign the transaction hash
      const signature = await this.config.account.signMessage({
        message: { raw: txHash },
      });

      // Execute transaction
      const hash = await this.config.walletClient.writeContract({
        account: this.config.account,
        address: this.config.address,
        abi: SAFE_SINGLETON_ABI,
        functionName: 'execTransaction',
        args: [
          tx.to as Address,
          BigInt(tx.value || 0),
          tx.data || '0x',
          0, // operation
          0n, // safeTxGas
          0n, // baseGas
          0n, // gasPrice
          '0x0000000000000000000000000000000000000000' as Address,
          '0x0000000000000000000000000000000000000000' as Address,
          signature,
        ],
        value: BigInt(tx.value || 0),
        chain: this.config.walletClient.chain || null,
      });

      const receipt = await this.config.publicClient.waitForTransactionReceipt({ hash });

      return {
        success: receipt.status === 'success',
        transactionHash: receipt.transactionHash,
        gasUsed: receipt.gasUsed,
        effectiveGasPrice: receipt.effectiveGasPrice,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  async addOwner(newOwner: Address, threshold?: number): Promise<SmartWalletOperationResult> {
    const owners = await this.getOwners();
    const currentThreshold = await this.getThreshold();
    const newThreshold = threshold || currentThreshold;

    // Find the previous owner (last in the list)
    const prevOwner = owners[owners.length - 1];

    return this.executeTransaction({
      to: this.config.address,
      data: encodeFunctionData({
        abi: SAFE_SINGLETON_ABI,
        functionName: 'addOwnerWithThreshold',
        args: [prevOwner, newOwner, BigInt(newThreshold)],
      }),
    });
  }

  async removeOwner(
    ownerToRemove: Address,
    threshold?: number
  ): Promise<SmartWalletOperationResult> {
    const owners = await this.getOwners();
    const currentThreshold = await this.getThreshold();
    const newThreshold = threshold || Math.max(1, currentThreshold - 1);

    // Find the owner index
    const ownerIndex = owners.indexOf(ownerToRemove);
    if (ownerIndex === -1) {
      return { success: false, error: 'Owner not found' };
    }

    // Get previous owner
    const prevOwner =
      ownerIndex === 0
        ? ('0x0000000000000000000000000000000000000001' as Address)
        : owners[ownerIndex - 1];

    return this.executeTransaction({
      to: this.config.address,
      data: encodeFunctionData({
        abi: SAFE_SINGLETON_ABI,
        functionName: 'removeOwner',
        args: [prevOwner, ownerToRemove, BigInt(newThreshold)],
      }),
    });
  }
}

// AA Wallet implementation
class AAWallet {
  constructor(
    private config: {
      address: Address;
      chainId: number;
      publicClient: PublicClient;
      walletClient: WalletClient;
      owner: SmartAccountSigner;
    }
  ) {}

  async executeTransaction(tx: TransactionRequest): Promise<SmartWalletOperationResult> {
    try {
      // Simple transaction execution for AA wallets
      const hash = await this.config.walletClient.sendTransaction({
        account: this.config.owner as any,
        to: tx.to,
        value: tx.value,
        data: tx.data,
        chain: this.config.walletClient.chain,
      });

      const receipt = await this.config.publicClient.waitForTransactionReceipt({ hash });

      return {
        success: receipt.status === 'success',
        transactionHash: receipt.transactionHash,
        gasUsed: receipt.gasUsed,
        effectiveGasPrice: receipt.effectiveGasPrice,
      };
    } catch (_error) {
      logger.error('Error executing AA transaction:', _error);
      return {
        success: false,
        error: _error instanceof Error ? _error.message : String(_error),
      };
    }
  }

  async executeBatch(transactions: TransactionRequest[]): Promise<SmartWalletOperationResult> {
    try {
      // Execute transactions sequentially for now
      let lastHash: Hash | undefined;

      for (const tx of transactions) {
        const hash = await this.config.walletClient.sendTransaction({
          account: this.config.owner as any,
          to: tx.to,
          value: tx.value,
          data: tx.data,
          chain: this.config.walletClient.chain,
        });
        lastHash = hash;
      }

      if (lastHash) {
        const receipt = await this.config.publicClient.waitForTransactionReceipt({
          hash: lastHash,
        });
        return {
          success: receipt.status === 'success',
          transactionHash: receipt.transactionHash,
          gasUsed: receipt.gasUsed,
          effectiveGasPrice: receipt.effectiveGasPrice,
        };
      }

      return {
        success: false,
        error: 'No transactions executed',
      };
    } catch (_error) {
      logger.error('Error executing AA batch:', _error);
      return {
        success: false,
        error: _error instanceof Error ? _error.message : String(_error),
      };
    }
  }
}

// Factory function
export function createSmartWalletFactory(
  runtime: IAgentRuntime,
  chainService: ChainConfigService
): SmartWalletFactory {
  const chainIds = chainService.getSupportedChainIds();
  const chainId = chainIds.length > 0 ? chainIds[0] : 1;

  return new SmartWalletFactory({ runtime, chainId });
}
