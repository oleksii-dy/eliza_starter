// Import necessary libraries and our own types
import { ethers } from 'ethers';
import { EVMClientConfig, BlockchainEvent } from './types';
import { MessageManager } from './messages';

// Main client that watches blockchain events
export class EVMClient {
    private provider: ethers.WebSocketProvider;
    private messageManager: MessageManager;

    // Initialize with config (what to watch) and message manager (how to report)
    constructor(private readonly config: EVMClientConfig, messageManager: MessageManager) {
        this.provider = new ethers.WebSocketProvider(config.rpcUrl);
        this.messageManager = messageManager;
    }

    // Translate raw blockchain events into readable format using ABI and descriptions
    private decodeEvent(log: ethers.Log, contract: EVMClientConfig['contracts'][0]): BlockchainEvent['decoded'] | null {
        try {
            const iface = new ethers.Interface(contract.abi);
            const event = iface.parseLog({
                topics: log.topics,
                data: log.data
            });

            if (!event) return null;

            const decodedParams: Record<string, any> = {};
            event.args.forEach((value: any, i: number) => {
                const input = event.fragment.inputs[i];
                decodedParams[input.name] = value.toString();
            });

            return {
                name: event.name,
                signature: event.signature,
                params: decodedParams,
                description: contract.eventDescription
            };
        } catch (error) {
            console.error('Error decoding event:', {
                error,
                log,
                contract: contract.address
            });
            return null;
        }
    }

    // Main function that starts watching for events
    public async start(): Promise<void> {
        try {
            await this.provider.getNetwork();
            console.log('Connected to blockchain');

            // Create filter from our config - what contracts and events to watch
            const filter = {
                address: this.config.contracts.map(c => c.address),
                topics: [this.config.contracts.map(c => c.topics).flat()]
            };

            // Set up event listener
            this.provider.on(filter, async (log) => {
                try {
                    // Get block info for timestamp
                    const block = await this.provider.getBlock(log.blockNumber);
                    if (!block) {
                        console.error('Block not found:', log.blockNumber);
                        return;
                    }

                    // Find which contract this event is from
                    const contract = this.config.contracts.find(c =>
                        c.address.toLowerCase() === log.address.toLowerCase()
                    );
                    if (!contract) {
                        console.error('Contract config not found for address:', log.address);
                        return;
                    }

                    // Decode the event
                    const decoded = this.decodeEvent(log, contract);
                    if (!decoded) {
                        console.error('Failed to decode event:', {
                            address: log.address,
                            transactionHash: log.transactionHash
                        });
                        return;
                    }

                    // Create final event object
                    const event: BlockchainEvent = {
                        contractAddress: log.address,
                        transactionHash: log.transactionHash,
                        blockNumber: log.blockNumber,
                        timestamp: new Date(block.timestamp * 1000).toISOString(),
                        decoded
                    };

                    // Send to message manager for agent processing
                    await this.messageManager.handleEvent(event);
                } catch (error) {
                    console.error('Error processing event:', {
                        error,
                        logAddress: log.address,
                        transactionHash: log.transactionHash
                    });

                    if ((error as { code?: string })?.code === 'NETWORK_ERROR' || (error as { code?: string })?.code === 'SERVER_ERROR') {
                        console.log('Network error detected, attempting to reconnect...');
                        await this.reconnect();
                    }
                }
            });

            // Handle connection errors
            this.provider.on('error', async (error) => {
                console.error('Provider error:', error);
                await this.reconnect();
            });

            console.log('Started listening for events');
        } catch (error) {
            console.error('Error starting client:', error);
            throw error;
        }
    }

    // Handles reconnection if connection is lost
    private async reconnect() {
        try {
            await this.stop();
            this.provider = new ethers.WebSocketProvider(this.config.rpcUrl);
            await this.start();
            console.log('Successfully reconnected to blockchain');
        } catch (error) {
            console.error('Failed to reconnect:', error);
        }
    }

    // Clean shutdown of connections
    public async stop(): Promise<void> {
        if (this.provider) {
            await this.provider.destroy();
        }
    }
}