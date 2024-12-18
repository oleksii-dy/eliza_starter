import { ethers } from 'ethers';
import { elizaLogger } from '@ai16z/eliza';
import { EVMClientConfig, BlockchainEvent } from './types';
import { MessageManager } from './messages';

/**
 * Configuration for reconnection attempts
 */
interface ReconnectionConfig {
    maxAttempts: number;
    initialDelay: number;
    maxDelay: number;
}

/**
 * Main client for watching and processing blockchain events.
 * Handles WebSocket connections, event decoding, and message delivery to the agent.
 */
export class EVMClient {
    private provider: ethers.WebSocketProvider;
    private messageManager: MessageManager;
    private reconnectAttempts: number = 0;
    private readonly reconnectionConfig: ReconnectionConfig = {
        maxAttempts: 5,
        initialDelay: 1000, // 1 second
        maxDelay: 30000,    // 30 seconds
    };

    constructor(
        private readonly config: EVMClientConfig,
        messageManager: MessageManager
    ) {
        this.provider = new ethers.WebSocketProvider(config.rpcUrl);
        this.messageManager = messageManager;
    }

    /**
     * Decodes a raw blockchain event into a readable format using the event's ABI and description
     */
    private decodeEvent(
        log: ethers.Log,
        contract: EVMClientConfig['contracts'][0]
    ): BlockchainEvent['decoded'] | null {
        try {
            // Find the matching event configuration
            const eventConfig = contract.events.find(e =>
                e.topic.toLowerCase() === log.topics[0].toLowerCase()
            );

            if (!eventConfig) {
                return null;
            }

            // Create interface from the event's ABI
            const iface = new ethers.Interface([eventConfig.abi]);
            const event = iface.parseLog({
                topics: log.topics,
                data: log.data
            });

            if (!event) {
                elizaLogger.error('Failed to parse log with interface');
                return null;
            }

            // Decode parameters
            const decodedParams: Record<string, any> = {};
            event.args.forEach((value: any, i: number) => {
                const input = event.fragment.inputs[i];
                decodedParams[input.name] = value.toString();
            });

            return {
                name: event.name,
                signature: event.signature,
                params: decodedParams,
                description: eventConfig.description
            };
        } catch (error) {
            elizaLogger.error('Error decoding event:', {
                error,
                contractAddress: contract.address,
                logTopics: log.topics
            });
            return null;
        }
    }

    /**
     * Creates an event filter based on the configuration
     */
    private createEventFilter() {
        const addresses = this.config.contracts.map(c => c.address);
        const topics = this.config.contracts
            .map(c => c.events.map(e => e.topic))
            .flat();

        return {
            address: addresses,
            topics: [topics]
        };
    }

    /**
     * Processes a single blockchain event
     */
    private async processEvent(log: ethers.Log): Promise<void> {
        try {
            // Get block information for timestamp
            const block = await this.provider.getBlock(log.blockNumber);
            if (!block) {
                elizaLogger.error('Block not found:', log.blockNumber);
                return;
            }

            // Find matching contract configuration
            const contract = this.config.contracts.find(c =>
                c.address.toLowerCase() === log.address.toLowerCase()
            );
            if (!contract) {
                elizaLogger.error('Contract config not found for address:', log.address);
                return;
            }

            // Decode the event
            const decoded = this.decodeEvent(log, contract);
            if (!decoded) {
                return;
            }

            // Create the event object
            const event: BlockchainEvent = {
                contractAddress: log.address,
                transactionHash: log.transactionHash,
                blockNumber: log.blockNumber,
                timestamp: new Date(block.timestamp * 1000).toISOString(),
                decoded
            };

            // Send to message manager for agent processing
            await this.messageManager.handleEvent(event);

            // Reset reconnection attempts on successful processing
            this.reconnectAttempts = 0;

        } catch (error) {
            this.handleProcessingError(error as Error, log);
        }
    }

    /**
     * Handles errors that occur during event processing
     */
    private async handleProcessingError(error: Error, log: ethers.Log) {
        elizaLogger.error('Error processing event:', {
            error,
            logAddress: log.address,
            transactionHash: log.transactionHash
        });

        const networkError = (error as { code?: string }).code === 'NETWORK_ERROR';
        const serverError = (error as { code?: string }).code === 'SERVER_ERROR';

        if (networkError || serverError) {
            elizaLogger.info('Network error detected, attempting to reconnect...');
            await this.reconnect();
        }
    }

    /**
     * Calculates delay for reconnection attempt using exponential backoff
     */
    private getReconnectionDelay(): number {
        const delay = Math.min(
            this.reconnectionConfig.initialDelay * Math.pow(2, this.reconnectAttempts),
            this.reconnectionConfig.maxDelay
        );
        return delay;
    }

    /**
     * Handles reconnection attempts with exponential backoff
     */
    private async reconnect(): Promise<void> {
        if (this.reconnectAttempts >= this.reconnectionConfig.maxAttempts) {
            elizaLogger.error('Max reconnection attempts reached. Giving up.');
            return;
        }

        this.reconnectAttempts++;
        const delay = this.getReconnectionDelay();

        try {
            elizaLogger.info(`Attempting reconnection in ${delay}ms (attempt ${this.reconnectAttempts})`);
            await new Promise(resolve => setTimeout(resolve, delay));

            await this.stop();
            this.provider = new ethers.WebSocketProvider(this.config.rpcUrl);
            await this.start();

            elizaLogger.success('Successfully reconnected to blockchain');
        } catch (error) {
            elizaLogger.error('Failed to reconnect:', error);
            await this.reconnect();
        }
    }

    /**
     * Starts the blockchain event listener
     */
    public async start(): Promise<void> {
        try {
            // Verify network connection
            await this.provider.getNetwork();
            elizaLogger.info('Connected to blockchain');

            // Set up event filter and listener
            const filter = this.createEventFilter();
            this.provider.on(filter, this.processEvent.bind(this));

            // Set up error handler
            this.provider.on('error', async (error) => {
                elizaLogger.error('Provider error:', error);
                await this.reconnect();
            });

            elizaLogger.success('Started listening for events');
        } catch (error) {
            elizaLogger.error('Error starting client:', error);
            throw error;
        }
    }

    /**
     * Stops the blockchain event listener and cleans up connections
     */
    public async stop(): Promise<void> {
        if (this.provider) {
            await this.provider.destroy();
        }
    }
}