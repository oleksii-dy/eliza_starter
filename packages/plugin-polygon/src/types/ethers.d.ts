declare module 'ethers' {
  export class Contract {
    constructor(address: string, abi: any, providerOrSigner: any);
    address: string;
    
    // Common ERC20 methods
    name(): Promise<string>;
    symbol(): Promise<string>;
    decimals(): Promise<number>;
    totalSupply(): Promise<bigint>;
    balanceOf(address: string): Promise<bigint>;
    
    // Governance token methods
    getVotes(address: string): Promise<bigint>;
    getPastVotes(address: string, blockNumber: bigint): Promise<bigint>;
    
    // Governor methods
    votingDelay(): Promise<bigint>;
    votingPeriod(): Promise<bigint>;
    proposalThreshold(): Promise<bigint>;
    quorum(blockNumber: bigint): Promise<bigint>;
    state(proposalId: bigint): Promise<number>;
    proposalVotes(proposalId: bigint): Promise<[bigint, bigint, bigint]>;
    token(): Promise<string>;
    timelock(): Promise<string>;
    
    // Timelock methods
    getMinDelay(): Promise<bigint>;
  }
  
  export class JsonRpcProvider {
    constructor(url: string);
    getNetwork(): Promise<{ chainId: number }>;
    getBlockNumber(): Promise<number>;
  }
  
  export class Wallet {
    constructor(privateKey: string, provider?: any);
    connect(provider: any): Wallet;
    address: string;
  }
} 