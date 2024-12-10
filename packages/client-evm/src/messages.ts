// Work in progress - Currently the agent stores EVM events in a separate memory and is unable to discuss them in the main conversation
import { composeContext } from "@ai16z/eliza";
import { generateMessageResponse } from "@ai16z/eliza";
import { Content, IAgentRuntime, Memory, ModelClass } from "@ai16z/eliza";
import { stringToUuid } from "@ai16z/eliza";
import { messageCompletionFooter } from "@ai16z/eliza";
import { elizaLogger } from "@ai16z/eliza";
import { BlockchainEvent } from './types';

// Each client must have a MessageManager. It must have access to the agent runtime to store memories, generate responses & manage database connections
export class MessageManager {
    private runtime: IAgentRuntime;

    constructor(runtime: IAgentRuntime) {
       this.runtime = runtime;
    }

    // Handle each EVM event
    async handleEvent(event: BlockchainEvent) {
        const systemId = stringToUuid("blockchain-system");
        const roomId = stringToUuid("blockchain-events-" + this.runtime.agentId);

        try {
            await this.runtime.ensureConnection(
                systemId,
                roomId,
                "Blockchain",
                "System",
                "evm"
            );

            const processedContent = this.formatEventContent(event);

            // Create content object in format agent expects
            const content: Content = {
                text: processedContent,
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

            // Memory creation
            const eventMemory: Memory = {
                id: stringToUuid(event.transactionHash + "-" + this.runtime.agentId),
                userId: systemId,
                agentId: this.runtime.agentId,
                roomId,
                content,
                createdAt: new Date(event.timestamp).getTime()
            };

            // Store memory in agent's memory system
            await this.runtime.messageManager.createMemory(eventMemory);

            const state = await this.runtime.composeState({
                content,
                roomId,
                userId: systemId,
                agentId: this.runtime.agentId
            });

            // Creating context and instructions for the agent => Modify template for better responses!
            const context = composeContext({
                state,
                template: `# Task: Generate a response about this blockchain event for {{agentName}}.

                About {{agentName}}:
                {{bio}}
                {{lore}}

                Recent conversation history:
                {{recentMessages}}

                Event details:
                ${processedContent}

                # Instructions:
                Always format the raw numbers using token decimals. USDC must be formatted by 6 decimals (1e6) and DAI by 18 decimals (1e18).
                Focus only on the amounts swapped and ignore other fields. Negative number means the token being sold, positive the token being bought, but do not output negative signs in your response, everything is in absolute values.
                Remember and reference previous events, while keeping your character persona. Respond differently each time. Respond as the character would, based on the description.
                ` + messageCompletionFooter
            });

            // Get response from agent
            const response = await generateMessageResponse({
                runtime: this.runtime,
                context,
                modelClass: ModelClass.SMALL,
            });

            // Log response
            if (response) {
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

    // Format blockchain event into a more appropriate format for the message handler
    private formatEventContent(event: BlockchainEvent): string {
        const { decoded, transactionHash, blockNumber, timestamp, contractAddress } = event;

        const params = Object.entries(decoded.params)
            .map(([key, value]) => {
                const paramDescription = decoded.description.params.find(p => p.name === key);
                return `${key}: ${value}\n   Description: ${paramDescription?.description}`;
            })
            .join('\n\n');

        return `
            ${decoded.name} Event Detected
            Contract: ${contractAddress}
            Block Number: ${blockNumber}
            Timestamp: ${timestamp}
            Transaction: ${transactionHash}
            Description: ${decoded.description.description}

            Parameters:
            ${params}
                `.trim();
    }
}