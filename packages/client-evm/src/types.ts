/**
 * Describes a single parameter of a blockchain event
 */
export interface EventParamDescription {
    name: string;
    description: string;
}

/**
 * Describes the structure and meaning of a blockchain event
 */
export interface EventDescription {
    name: string;
    description: string;
    params: EventParamDescription[];
}

/**
 * Describes a single event configuration including its ABI, topic, and description
 */
export interface EventConfig {
    topic: string;
    abi: {
        anonymous: boolean;
        inputs: {
            indexed: boolean;
            internalType: string;
            name: string;
            type: string;
        }[];
        name: string;
        type: 'event';
    };
    description: EventDescription;
}

/**
 * Main configuration interface for the EVM client
 */
export interface EVMClientConfig {
    rpcUrl: string;
    contracts: {
        address: string;
        events: EventConfig[];
    }[];
}

/**
 * Represents a decoded blockchain event ready for agent processing
 */
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
    };
}