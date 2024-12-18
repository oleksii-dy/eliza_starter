import { composeContext, generateMessageResponse } from "@ai16z/eliza";
import { Content, IAgentRuntime, Memory, ModelClass, UUID } from "@ai16z/eliza";
import { stringToUuid } from "@ai16z/eliza";
import { elizaLogger } from "@ai16z/eliza";
import { BlockchainEvent } from './types';
import config from '../config.json';

// Import USDC/DAI specific implementations
import { usdcDaiSwapFormatter } from './implementations/formatters';
import { usdcDaiTemplate } from './implementations/templates';

/**
 * Interface for implementing event-specific formatters.
 * Implement this interface to create custom event formatters.
 */
export interface EventFormatter {
    formatEvent: (decoded: BlockchainEvent['decoded']) => string;
}

/**
 * Event formatters for specific event types.
 */
const eventFormatters: Record<string, EventFormatter> = {
    Swap: usdcDaiSwapFormatter
};

/**
 * Core message manager for handling blockchain events.
 * Current implementation supports Discord channel integration.
 * For other platforms (Twitter, Telegram etc), modify the handleEvent method
 * to use appropriate client interfaces.
 */
export class MessageManager {
    constructor(private runtime: IAgentRuntime) {}

    /**
     * Processes blockchain events and broadcasts them through Discord.
     * @param event The blockchain event to process
     */
    async handleEvent(event: BlockchainEvent): Promise<void> {
        const systemId = stringToUuid("blockchain-system");
        const channelId = config.discordChannelId;
        const roomId = stringToUuid(`${channelId}-${this.runtime.agentId}`);

        try {
            await this.runtime.ensureConnection(
                systemId,
                roomId,
                "Blockchain",
                "System",
                "evm"
            );

            const eventContent = this.createEventContent(event);
            const eventMemory = await this.createEventMemory(event, eventContent, systemId, roomId);

            await this.runtime.messageManager.createMemory(eventMemory);

            const state = await this.runtime.composeState({
                content: eventContent,
                roomId,
                userId: systemId,
                agentId: this.runtime.agentId
            });

            const response = await this.generateResponse(state);

            if (response) {
                await this.storeResponse(response, event, roomId);
                await (this.runtime as any).discordClient.sendToChannel(channelId, response.text);
            }

        } catch (error) {
            elizaLogger.error("Error handling blockchain event:", {
                error,
                details: {
                    contractAddress: event.contractAddress,
                    transactionHash: event.transactionHash,
                    roomId,
                    userId: systemId,
                    agentId: this.runtime.agentId
                }
            });
        }
    }

    /**
     * Creates structured content from blockchain event.
     * Uses event formatters if available, otherwise provides basic formatting.
     */
    private createEventContent(event: BlockchainEvent): Content {
        const formatter = eventFormatters[event.decoded.name];
        const eventName = event.decoded.name;
        const formattedDetails = formatter
            ? formatter.formatEvent(event.decoded)
            : `${eventName} event detected on ${event.contractAddress}`;

        const formattedText = `An event of type "${eventName}" occurred on ${event.contractAddress}:\n${formattedDetails}\n\nTransaction: ${event.transactionHash}`;

        return {
            text: formattedText,
            source: "evm",
            metadata: {
                type: "blockchain_event",
                eventName: event.decoded.name,
                transactionHash: event.transactionHash
            }
        };
    }

    /**
     * Creates memory object for event storage.
     */
    private async createEventMemory(
        event: BlockchainEvent,
        content: Content,
        userId: UUID,
        roomId: UUID
    ): Promise<Memory> {
        const memory = {
            id: stringToUuid(event.transactionHash + "-" + this.runtime.agentId),
            userId,
            agentId: this.runtime.agentId,
            roomId,
            content,
            createdAt: new Date(event.timestamp).getTime()
        };

        return await this.runtime.messageManager.addEmbeddingToMemory(memory);
    }

    /**
     * Generates agent response using a template.
     */
    private async generateResponse(state: any) {
        const context = composeContext({
            state,
            template: usdcDaiTemplate
        });

        return await generateMessageResponse({
            runtime: this.runtime,
            context,
            modelClass: ModelClass.SMALL,
        });
    }

    /**
     * Stores agent's response in memory.
     */
    private async storeResponse(
        response: Content,
        event: BlockchainEvent,
        roomId: UUID
    ): Promise<void> {
        const responseMemory: Memory = {
            id: stringToUuid(event.transactionHash + "-response-" + this.runtime.agentId),
            userId: this.runtime.agentId,
            agentId: this.runtime.agentId,
            roomId,
            content: {
                text: response.text.replace(/[\u0000-\u001F\u007F-\u009F]/g, ""),
                source: "evm-response",
                metadata: {
                    type: "blockchain_response",
                    originalEventHash: event.transactionHash
                }
            },
            createdAt: Date.now()
        };

        const memoryWithEmbedding = await this.runtime.messageManager.addEmbeddingToMemory(responseMemory);
        await this.runtime.messageManager.createMemory(memoryWithEmbedding);
        elizaLogger.log(response.text);
    }
}