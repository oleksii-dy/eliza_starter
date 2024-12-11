import { composeContext } from "@ai16z/eliza";
import { generateMessageResponse } from "@ai16z/eliza";
import { Content, IAgentRuntime, Memory, ModelClass, UUID } from "@ai16z/eliza";
import { stringToUuid } from "@ai16z/eliza";
import { messageCompletionFooter } from "@ai16z/eliza";
import { elizaLogger } from "@ai16z/eliza";
import { BlockchainEvent } from './types';

// Custom template for EVM events to maintain agent's personality
const evmMessageTemplate = `# Task: Generate a conversational response about this blockchain event for {{agentName}}.

About {{agentName}}:
{{bio}}
{{lore}}

Recent conversation history:
{{recentMessages}}

Event details:
{{content.text}}

# Instructions:
- Respond conversationally about the event that just occurred
- Maintain character personality and style
- Focus on the key details (amounts, tokens, etc.)
- Be engaging and invite further discussion
- Vary your responses to avoid repetition
` + messageCompletionFooter;

export class MessageManager {
    private runtime: IAgentRuntime;

    constructor(runtime: IAgentRuntime) {
        this.runtime = runtime;
    }

    private async findConversationRoom(): Promise<UUID> {
        const rooms = await this.runtime.databaseAdapter.getRoomsForParticipant(this.runtime.agentId);
        //console.log("This.runtime.agentId:", this.runtime.agentId);
        //console.log("Found rooms:", rooms);
        //const test = stringToUuid("default-room-" + this.runtime.agentId)
        //console.log("Test:", "default-room-" + this.runtime.agentId, test);

        for (const roomId of rooms) {
            const messages = await this.runtime.messageManager.getMemories({
                roomId,
                count: 1
            });
            console.log(`Room ${roomId} messages:`, messages);

            // Check for either 'source: direct' or presence of 'user' field
            if (messages.length > 0 &&
                (messages[0].content.source === 'direct' || 'user' in messages[0].content)) {
                return roomId;
            }
        }

        throw new Error("No conversation room found");
    }

    async handleEvent(event: BlockchainEvent) {
        const systemId = stringToUuid("blockchain-system");

        // Use same room as main conversation
        //const roomId = stringToUuid("default-room-" + this.runtime.agentId);
        //console.log("Creating room ID from:", "default-room-" + this.runtime.agentId);
        //const roomId = await this.findConversationRoom();
        const roomId = stringToUuid("default-room-" + this.runtime.character.name);
        console.log("Room ID:", roomId);

        try {
            // Get the room ID where the conversation is happening

            await this.runtime.ensureConnection(
                systemId,
                roomId,
                "Blockchain",
                "System",
                "evm"
            );

            // Create event memory with both human-readable format and technical details
            const eventContent: Content = {
                text: this.formatEventContent(event),
                source: "evm",
                metadata: {
                    type: "blockchain_event",
                    transactionHash: event.transactionHash,
                    eventName: event.decoded.name,
                    contractAddress: event.contractAddress,
                    blockNumber: event.blockNumber,
                    params: event.decoded.params
                }
            };

            const eventMemory: Memory = {
                id: stringToUuid(event.transactionHash + "-" + this.runtime.agentId),
                userId: systemId,
                agentId: this.runtime.agentId,
                roomId,
                content: eventContent,
                createdAt: new Date(event.timestamp).getTime()
            };

            // Store the event in memory
            await this.runtime.messageManager.createMemory(eventMemory);

            // Compose state with context from both conversation and event
            const state = await this.runtime.composeState({
                content: eventContent,
                roomId,
                userId: systemId,
                agentId: this.runtime.agentId
            });

            // Generate context using our EVM-specific template
            const context = composeContext({
                state,
                template: evmMessageTemplate
            });

            // Get agent's response
            const response = await generateMessageResponse({
                runtime: this.runtime,
                context,
                modelClass: ModelClass.SMALL,
            });

            if (response) {
                // Store agent's response in same conversation
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

    private formatEventContent(event: BlockchainEvent): string {
        const { decoded, transactionHash, blockNumber, timestamp, contractAddress } = event;

        // Format amounts based on token decimals (e.g., USDC has 6, DAI has 18)
        const formatTokenAmount = (amount: string, decimals: number) => {
            const value = BigInt(amount);
            return Number(value) / Math.pow(10, decimals);
        };

        let formattedText = "";

        // Handle different event types with appropriate formatting
        switch (decoded.name) {
            case "Swap":
                const amount0 = formatTokenAmount(decoded.params.amount0, 6); // USDC
                const amount1 = formatTokenAmount(decoded.params.amount1, 18); // DAI
                formattedText = `A swap just occurred on ${contractAddress}:\n`;
                formattedText += amount0 > 0 ?
                    `${amount0} USDC swapped for ${Math.abs(amount1)} DAI` :
                    `${Math.abs(amount1)} DAI swapped for ${Math.abs(amount0)} USDC`;
                break;
            // Add other event types as needed
            default:
                formattedText = `${decoded.name} event detected on ${contractAddress}`;
                break;
        }

        return formattedText;
    }
}