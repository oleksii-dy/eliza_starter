import type { UUID } from '@elizaos/core';

// Core Midnight Network types
export interface MidnightAddress {
  address: string;
  publicKey: string;
}

export interface MidnightWallet {
  address: MidnightAddress;
  mnemonic?: string;
  privateKey: string;
  balance: bigint;
}

// Message types for secure communication
export interface SecureMessage {
  id: UUID;
  fromAgent: UUID;
  toAgent: UUID;
  content: string;
  timestamp: Date;
  proof: ZKProof;
  encrypted: boolean;
}

export interface ChatRoom {
  id: UUID;
  name: string;
  participants: UUID[];
  isPrivate: boolean;
  contractAddress: string;
  createdAt: Date;
  lastActivity: Date;
}

export interface ChatMessage {
  id: UUID;
  roomId: UUID;
  fromAgent: UUID;
  content: string;
  timestamp: Date;
  proof?: ZKProof;
  messageType: 'text' | 'payment_request' | 'payment_confirmation' | 'system';
}

// Payment types
export interface PaymentRequest {
  id: UUID;
  fromAgent: UUID;
  toAgent: UUID;
  amount: bigint;
  currency: string;
  description?: string;
  deadline?: Date;
  status: 'pending' | 'accepted' | 'rejected' | 'expired' | 'completed';
  contractAddress?: string;
  createdAt: Date;
}

export interface PaymentTransaction {
  id: UUID;
  paymentRequestId?: UUID;
  fromAgent: UUID;
  toAgent: UUID;
  amount: bigint;
  currency: string;
  transactionHash: string;
  status: 'pending' | 'confirmed' | 'failed';
  timestamp: Date;
  gasUsed?: bigint;
  proof: ZKProof;
}

// Zero-knowledge proof types
export interface ZKProof {
  circuitId: string;
  proof: string;
  publicSignals: any[];
  witnesses: CircuitWitness;
  timestamp: Date;
  verificationKey?: any;
}

export interface CircuitWitness {
  [key: string]: any;
}

// Agent discovery types
export interface AgentProfile {
  id: UUID;
  name: string;
  publicKey: string;
  contractAddress: string;
  capabilities: string[];
  reputation: number;
  isOnline: boolean;
  lastSeen: Date;
  services: AgentService[];
}

export interface AgentService {
  id: string;
  name: string;
  description: string;
  pricePerRequest?: bigint;
  currency?: string;
  responseTimeMs?: number;
  successRate?: number;
}

// Network state types
export interface NetworkState {
  blockHeight: number;
  networkId: string;
  connectedPeers: number;
  totalAgents: number;
  activeContracts: number;
  lastBlockTime: Date;
}

export interface ContractState {
  address: string;
  type: 'messaging' | 'payment' | 'discovery' | 'reputation';
  isActive: boolean;
  participants: string[];
  lastUpdate: Date;
  metadata: Record<string, any>;
}

// Contract deployment types
export interface ContractDeployment {
  contractId: string;
  address: string;
  deployerAgent: UUID;
  contractType: string;
  initArgs: any[];
  deploymentTx: string;
  deployedAt: Date;
  status: 'deploying' | 'active' | 'inactive' | 'failed';
}

// Service interfaces
export interface MidnightNetworkConnection {
  networkUrl: string;
  indexerUrl: string;
  proofServerUrl: string;
  networkId: string;
  isConnected: boolean;
  lastPing: Date;
}

export interface PrivateStateStore {
  set(key: string, value: any): Promise<void>;
  get(key: string): Promise<any>;
  delete(key: string): Promise<void>;
  exists(key: string): Promise<boolean>;
  list(): Promise<string[]>;
}

// Error types
export class MidnightNetworkError extends Error {
  constructor(
    message: string,
    public code: string,
    public details?: any
  ) {
    super(message);
    this.name = 'MidnightNetworkError';
  }
}

export class ProofGenerationError extends MidnightNetworkError {
  constructor(message: string, details?: any) {
    super(message, 'PROOF_GENERATION_ERROR', details);
    this.name = 'ProofGenerationError';
  }
}

export class ContractExecutionError extends MidnightNetworkError {
  constructor(message: string, details?: any) {
    super(message, 'CONTRACT_EXECUTION_ERROR', details);
    this.name = 'ContractExecutionError';
  }
}

// Event types
export interface MidnightNetworkEvent {
  type: string;
  data: any;
  timestamp: Date;
  blockHeight?: number;
  transactionHash?: string;
}

export interface MessageReceivedEvent extends MidnightNetworkEvent {
  type: 'message_received';
  data: {
    message: SecureMessage;
    roomId?: UUID;
  };
}

export interface PaymentReceivedEvent extends MidnightNetworkEvent {
  type: 'payment_received';
  data: {
    payment: PaymentTransaction;
  };
}

export interface AgentJoinedEvent extends MidnightNetworkEvent {
  type: 'agent_joined';
  data: {
    agent: AgentProfile;
    roomId?: UUID;
  };
}

export interface ContractStateChangedEvent extends MidnightNetworkEvent {
  type: 'contract_state_changed';
  data: {
    contractAddress: string;
    oldState: any;
    newState: any;
  };
}

// Configuration types
export interface MidnightPluginConfig {
  networkUrl: string;
  indexerUrl: string;
  walletMnemonic: string;
  proofServerUrl: string;
  networkId: string;
  zkConfigUrl: string;
  enablePrivateMessaging: boolean;
  enablePayments: boolean;
  enableAgentDiscovery: boolean;
  maxMessageSize: number;
  paymentTimeoutMs: number;
  proofTimeoutMs: number;
}

// Action result types
export interface MidnightActionResult {
  success: boolean;
  data?: {
    transactionHash?: string;
    contractAddress?: string;
    messageId?: UUID;
    paymentId?: UUID;
    proof?: ZKProof;
    error?: string;
    agents?: AgentProfile[];
  };
  message: string;
}

// Provider result types
export interface MidnightProviderResult {
  wallet?: MidnightWallet;
  networkState?: NetworkState;
  chatRooms?: ChatRoom[];
  agentProfiles?: AgentProfile[];
  pendingPayments?: PaymentRequest[];
  recentMessages?: ChatMessage[];
}
