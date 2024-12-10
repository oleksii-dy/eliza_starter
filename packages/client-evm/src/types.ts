// Defines types for event parameters and their descriptions
export interface EventParamDescription {
    name: string;
    description: string;
}

// Defines the structure for complete event descriptions
export interface EventDescription {
    name: string;
    description: string;
    params: EventParamDescription[];
}

// Main configuration interface for the EVM client
export interface EVMClientConfig {
    rpcUrl: string;
    contracts: {
        address: string;
        topics: string[];
        abi: any[];
        eventDescription: EventDescription;
    }[];
}

// Structure of processed blockchain events
export interface BlockchainEvent {
    contractAddress: string;
    transactionHash: string;
    blockNumber: number;
    timestamp: string;
    decoded: {
        name: string;
        signature: string;
        params: Record<string, any>;
        description: EventDescription;
    }
}