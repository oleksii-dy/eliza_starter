import {
    Content,
    elizaLogger,
    generateText,
    ModelClass,
    type Action,
    type HandlerCallback,
    type IAgentRuntime,
    type Memory,
    type State,
} from "@elizaos/core";
import examples from "./examples";
import { formatFarcasterData } from "../../utils";

export const farcasterPortfolioAction: Action = {
    name: "FARCASTER_PORTFOLIO",
    description: "Get the portfolio for one or more Farcaster usernames",
    similes: ["GET_FARCASTER_PORTFOLIO"],
    examples: examples,
    validate: async (runtime: IAgentRuntime, message: Memory) => {
        return true;
    },
    handler: async (
        _runtime: IAgentRuntime,
        _message: Memory,
        _state: State,
        _options: { [key: string]: unknown },
        _callback: HandlerCallback
    ): Promise<boolean> => {
        async function getFarcasterAddresses(usernames: string[]): Promise<{
            addresses: string[],
        }> {
            if (!process.env.ZAPPER_API_KEY) {
                throw new Error("ZAPPER API key not found in environment variables. Make sure to set the ZAPPER_API_KEY environment variable.");
            }
            const encodedKey = btoa(process.env.ZAPPER_API_KEY);
            const query = `
                query GetFarcasterAddresses($farcasterUsernames: [String!]) {
                    accounts(farcasterUsernames: $farcasterUsernames) {
                        farcasterProfile {
                            username
                            fid
                            metadata {
                                displayName
                                description
                                imageUrl
                                warpcast
                            }
                            connectedAddresses
                            custodyAddress
                        }
                    }
                }
            `;

            const response = await fetch('https://public.zapper.xyz/graphql', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Basic ${encodedKey}`
                },
                body: JSON.stringify({
                    query,
                    variables: {
                        farcasterUsernames: usernames
                    }
                })
            });

            const data = await response.json();
            
            if (data.errors) {
                elizaLogger.error({ errors: data.errors }, "Zapper API returned errors");
                throw new Error("Failed to fetch Farcaster addresses");
            }

            try {
                const formattedResponse = formatFarcasterData(data);
                return formattedResponse;
            } catch (error) {
                elizaLogger.error({ error }, "Error formatting portfolio data");
                throw error;
            }
        }

        try {
            const context = `Extract Farcaster usernames from this text, returning them as a comma-separated list with no @ symbols or other text. The message is:
            ${_message.content.text}`;

            const usernamesText = await generateText({
                runtime: _runtime,
                context,
                modelClass: ModelClass.SMALL,
                stop: ["\n"]
            });

            const usernames = usernamesText
                .split(',')
                .map(username => username.trim())
                .filter(username => username.length > 0);

            elizaLogger.info({ usernames }, "Extracted Farcaster usernames");

            if (usernames.length === 0) {
                throw new Error("No Farcaster usernames found in the message");
            }

            const { addresses } = await getFarcasterAddresses(usernames);
            
            if (addresses.length === 0) {
                throw new Error("No addresses found for these Farcaster accounts");
            }

            const newMemory: Memory = {
                userId: _message.userId,
                agentId: _message.agentId,
                roomId: _message.roomId,
                content: {
                    text: `Fetching portfolio for addresses: ${addresses.join(', ')}`,
                    action: "ZAPPER_PORTFOLIO",
                    source: _message.content?.source,
                    addresses: addresses,
                } as Content,
            };
            
            await _runtime.messageManager.createMemory(newMemory);
            _callback(newMemory.content);
            // Run the portfolio action with addresses found in Farcaster profiles
            await _runtime.processActions(newMemory, [newMemory], _state, _callback);

            return true;
        } catch (error) {
            elizaLogger.error("Error in farcasterPortfolio:", error);
            throw error;
        }
    },
};