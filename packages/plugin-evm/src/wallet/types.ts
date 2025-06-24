import type { Address, Hash, Hex } from 'viem';

// ERC-4337 UserOperation type
export interface UserOperation {
  sender: Address;
  nonce: bigint;
  initCode: Hex;
  callData: Hex;
  callGasLimit: bigint;
  verificationGasLimit: bigint;
  preVerificationGas: bigint;
  maxFeePerGas: bigint;
  maxPriorityFeePerGas: bigint;
  paymasterAndData: Hex;
  signature: Hex;
}

// UserOperation with optional fields for building
export interface PartialUserOperation {
  sender?: Address;
  nonce?: bigint;
  initCode?: Hex;
  callData?: Hex;
  callGasLimit?: bigint;
  verificationGasLimit?: bigint;
  preVerificationGas?: bigint;
  maxFeePerGas?: bigint;
  maxPriorityFeePerGas?: bigint;
  paymasterAndData?: Hex;
  signature?: Hex;
}

// UserOperation receipt
export interface UserOperationReceipt {
  userOpHash: Hash;
  sender: Address;
  nonce: bigint;
  paymaster?: Address;
  actualGasCost: bigint;
  actualGasUsed: bigint;
  success: boolean;
  reason?: string;
  receipt: {
    transactionHash: Hash;
    transactionIndex: number;
    blockHash: Hash;
    blockNumber: number;
    from: Address;
    to?: Address;
    cumulativeGasUsed: bigint;
    gasUsed: bigint;
    logs: any[];
    logsBloom: Hex;
    type: string;
    effectiveGasPrice: bigint;
  };
}

// Bundler response types
export interface BundlerJsonRpcRequest {
  jsonrpc: '2.0';
  id: number | string;
  method: string;
  params: any[];
}

export interface BundlerJsonRpcResponse<T = any> {
  jsonrpc: '2.0';
  id: number | string;
  result?: T;
  error?: {
    code: number;
    message: string;
    data?: any;
  };
}

// Safe wallet types
export interface SafeTransactionData {
  to: Address;
  value: bigint;
  data: Hex;
  operation: number; // 0 = Call, 1 = DelegateCall
  safeTxGas: bigint;
  baseGas: bigint;
  gasPrice: bigint;
  gasToken: Address;
  refundReceiver: Address;
  nonce: bigint;
}

export interface SafeSignature {
  signer: Address;
  data: Hex;
}

export interface SafeTransaction extends SafeTransactionData {
  signatures: Map<Address, SafeSignature>;
}

// Multi-signature types
export interface MultisigTransactionProposal {
  id: string;
  safe: Address;
  transaction: SafeTransactionData;
  confirmations: Address[];
  rejections: Address[];
  executed: boolean;
  executedAt?: number;
  createdAt: number;
  threshold: number;
}

// Session types
export interface SessionTransaction {
  to: Address;
  value: bigint;
  data: Hex;
  chainId: number;
  sessionId: string;
  timestamp: number;
}

// Smart wallet deployment types
export interface SmartWalletDeployment {
  address: Address;
  implementation: Address;
  factory: Address;
  salt: Hex;
  initCode: Hex;
  deploymentTransaction?: Hash;
  deployedAt?: number;
}

// Wallet module types
export interface WalletModule {
  address: Address;
  type: 'guard' | 'plugin' | 'fallback';
  name: string;
  version: string;
  enabled: boolean;
}

// Gas abstraction types
export interface GaslessTransaction {
  transaction: UserOperation;
  sponsorSignature: Hex;
  sponsorAddress: Address;
  sponsoredAt: number;
  limits: {
    maxGasPrice: bigint;
    maxGasLimit: bigint;
    validUntil: number;
  };
}
