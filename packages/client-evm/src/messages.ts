import { composeContext, generateMessageResponse } from "@ai16z/eliza";
import { Content, IAgentRuntime, Memory, ModelClass, UUID } from "@ai16z/eliza";
import { stringToUuid } from "@ai16z/eliza";
import { messageCompletionFooter } from "@ai16z/eliza";
import { elizaLogger } from "@ai16z/eliza";
import { BlockchainEvent } from './types';

/**
 * Template for EVM event responses. Provides character context and event details
 * while maintaining the agent's personality.
 */
const evmMessageTemplate = `# Task: Generate a conversational response about this blockchain event for {{agentName}}.

About {{agentName}}:
{{bio}}
{{lore}}
{{topics}}
{{knowledge}}
{{messageDirections}}

Recent conversation history:
{{recentMessages}}

Event details:
Event Type: {{content.metadata.eventName}}
Contract: {{content.metadata.contractAddress}}
Description: {{content.text}}

Technical Details:
{{content.metadata.params}}

# Instructions:
- Respond conversationally about the event that just occurred
- Maintain character personality and style throughout
- Focus on key event details (amounts, addresses, etc.)
- Reference relevant context if it exists in recent memory
- Be engaging and invite further discussion
- Keep technical accuracy while staying in character
` + messageCompletionFooter;

/**
 * Interface for event-specific formatters
 */
interface EventFormatter {
    formatEvent: (decoded: BlockchainEvent['decoded']) => string;
}

/**
 * Event-specific formatting implementations
 */
const eventFormatters: Record<string, EventFormatter> = {
    Swap: {
        formatEvent: (decoded) => {
            const formatTokenAmount = (amount: string, decimals: number) => {
                const value = BigInt(amount);
                return Number(value) / Math.pow(10, decimals);
            };

            const amount0 = formatTokenAmount(decoded.params.amount0, 6); // USDC
            const amount1 = formatTokenAmount(decoded.params.amount1, 18); // DAI

            return amount0 > 0
                ? `${amount0} USDC swapped for ${Math.abs(amount1)} DAI`
                : `${Math.abs(amount1)} DAI swapped for ${Math.abs(amount0)} USDC`;
        }
    }
    // Additional event formatters can be added here following the same pattern
};

/**
 * Manages blockchain event processing and agent responses.
 * Currently configured for Direct client usage.
 */
export class MessageManager {
    constructor(private runtime: IAgentRuntime) {}

    /**
     * Processes blockchain events and generates agent responses.
     * @param event - The blockchain event to process
     */
    async handleEvent(event: BlockchainEvent): Promise<void> {
        // Create system ID for blockchain events
        const systemId = stringToUuid("blockchain-system");

        // Note: Currently using Direct client room format
        // This will need to be modified for other client implementations
        const roomId = stringToUuid(`default-room-${this.runtime.character.name}`);

        try {
            await this.runtime.ensureConnection(
                systemId,
                roomId,
                "Blockchain",
                "System",
                "evm"
            );

            const eventContent = this.createEventContent(event);
            const eventMemory = this.createEventMemory(event, eventContent, systemId, roomId);

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
     * Creates content object for the event with both human-readable and technical details
     */
    private createEventContent(event: BlockchainEvent): Content {
        const formatter = eventFormatters[event.decoded.name];
        const formattedText = formatter
            ? `A ${event.decoded.name.toLowerCase()} event occurred on ${event.contractAddress}:\n${formatter.formatEvent(event.decoded)}`
            : `${event.decoded.name} event detected on ${event.contractAddress}`;

        return {
            text: formattedText,
            source: "evm",
            metadata: {
                type: "blockchain_event",
                eventName: event.decoded.name,
                contractAddress: event.contractAddress,
                transactionHash: event.transactionHash,
                blockNumber: event.blockNumber,
                params: event.decoded.params,
                description: event.decoded.description
            }
        };
    }

    /**
     * Creates memory object for the event
     */
    private createEventMemory(
        event: BlockchainEvent,
        content: Content,
        userId: UUID,
        roomId: UUID
    ): Memory {
        return {
            id: stringToUuid(event.transactionHash + "-" + this.runtime.agentId),
            userId,
            agentId: this.runtime.agentId,
            roomId,
            content,
            createdAt: new Date(event.timestamp).getTime()
        };
    }

    /**
     * Generates agent response to the event
     */
    private async generateResponse(state: any) {
        const context = composeContext({
            state,
            template: evmMessageTemplate
        });

        return await generateMessageResponse({
            runtime: this.runtime,
            context,
            modelClass: ModelClass.SMALL,
        });
    }

    /**
     * Stores agent's response in memory
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

        await this.runtime.messageManager.createMemory(responseMemory);
        elizaLogger.log(response.text);
    }
}