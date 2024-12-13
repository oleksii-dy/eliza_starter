import { composeContext, generateMessageResponse } from "@ai16z/eliza";
import { Content, IAgentRuntime, Memory, ModelClass, UUID } from "@ai16z/eliza";
import { stringToUuid } from "@ai16z/eliza";
import { messageCompletionFooter } from "@ai16z/eliza";
import { elizaLogger } from "@ai16z/eliza";
import { BlockchainEvent } from './types';

/**
* Core template for EVM event responses.
* Customize this template based on your specific event monitoring needs.
*/
const evmMessageTemplate = `# Task: Generate a conversational response about this blockchain event for {{agentName}}.

About {{agentName}}:
{{bio}}
{{lore}}
{{topics}}
{{knowledge}}
{{messageExamples}}

Recent conversation history:
{{recentMessages}}

Event Information:
{{content.text}}

# Instructions:
- Respond conversationally about the event that just occurred
- Maintain character personality and style throughout
- Focus on key event details that are relevant based on current conversation context
- Reference previous events if relevant
- Be engaging and invite further discussion
- Keep technical accuracy while staying in character
` + messageCompletionFooter;

/**
* Interface for implementing event-specific formatters.
* Use this to add custom formatting for different event types.
*/
interface EventFormatter {
    formatEvent: (decoded: BlockchainEvent['decoded']) => string;
}

/**
* Example event formatter implementation.
* You can skip formatting if not needed by removing or not using these.
*/
const eventFormatters: Record<string, EventFormatter> = {
    Swap: {
        formatEvent: (decoded) => {
            const formatTokenAmount = (amount: string, decimals: number) => {
                const value = BigInt(amount);
                return Number(value) / Math.pow(10, decimals);
            };

            const amount0 = formatTokenAmount(decoded.params.amount0, 6); // USDC decimals
            const amount1 = formatTokenAmount(decoded.params.amount1, 18); // DAI decimals

            return amount0 > 0
                ? `${amount0} USDC swapped for ${Math.abs(amount1)} DAI`
                : `${Math.abs(amount1)} DAI swapped for ${Math.abs(amount0)} USDC`;
        }
    },
    Mint: {
        formatEvent: (decoded) => {
            const formatTokenAmount = (amount: string, decimals: number) => {
                const value = BigInt(amount);
                const formattedValue = Number(value) / Math.pow(10, decimals);
                return formattedValue.toFixed(decimals);
            };

            // amount0 = WBTC (8 decimals), amount1 = WETH (18 decimals)
            const wbtc = formatTokenAmount(decoded.params.amount0, 8);
            const weth = formatTokenAmount(decoded.params.amount1, 18);

            return `Liquidity minted: ${wbtc} WBTC and ${weth} WETH were deposited into the position.`;
        }
    },
    Collect: {
        formatEvent: (decoded) => {
            const formatTokenAmount = (amount: string, decimals: number) => {
                const value = BigInt(amount);
                const formattedValue = Number(value) / Math.pow(10, decimals);
                return formattedValue.toFixed(decimals);
            };

            // amount0 = WBTC (8 decimals), amount1 = WETH (18 decimals)
            const wbtc = formatTokenAmount(decoded.params.amount0, 8);
            const weth = formatTokenAmount(decoded.params.amount1, 18);

            return `Fees collected: ${wbtc} WBTC and ${weth} WETH were collected from the position.`;
        }
    }
};

/**
* Core message manager for handling blockchain events.
* Handles event processing, memory storage, and agent responses.
*/
export class MessageManager {
    constructor(private runtime: IAgentRuntime) {}

    /**
     * Main event handler that processes incoming blockchain events.
     * @param event The blockchain event to process
     */
    async handleEvent(event: BlockchainEvent): Promise<void> {
        const systemId = stringToUuid("blockchain-system");

        // For simplicity, hardcode the Discord channel ID:
        const channelId = "838504036557651969"; // Replace with your Discord channel ID

        // Use a unique room for these events, if desired. Here we just default to one room:
        const roomId = stringToUuid(`evm-event-room-${this.runtime.character.name}`);

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
     * Event data is placed in text field for agent accessibility.
     * Format text using your own custom formatters if desired.
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
     * Generates agent response using the event template.
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

        await this.runtime.messageManager.createMemory(responseMemory);
        elizaLogger.log(response.text);
    }
}
