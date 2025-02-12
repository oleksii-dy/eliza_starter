import {
    Content,
    elizaLogger,
    generateText,
    ModelClass,
    type Action,
    type ActionExample,
    type HandlerCallback,
    type IAgentRuntime,
    type Memory,
    type State,
} from "@elizaos/core";

interface FarcasterProfile {
    username: string;
    fid: number;
    metadata: {
        displayName: string;
        description: string;
        imageUrl: string;
        warpcast: string;
    };
    connectedAddresses: string[];
    custodyAddress: string;
}

export const farcasterPortfolioAction: Action = {
    name: "FARCASTER_PORTFOLIO",
    description: "Get the portfolio for one or more Farcaster usernames",
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
            profiles: FarcasterProfile[]
        }> {
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
                    'Authorization': `Basic ${btoa(process.env.ZAPPER_API_KEY)}`
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
                elizaLogger.error({ errors: data.errors }, "Farcaster API returned errors");
                throw new Error("Failed to fetch Farcaster addresses");
            }

            const accounts = data.data.accounts || [];
            const profiles = accounts
                .map(account => account.farcasterProfile)
                .filter(Boolean);

            if (profiles.length === 0) {
                throw new Error("No Farcaster accounts found for the provided usernames");
            }

            const allAddresses = profiles.flatMap(profile => [
                ...(profile.connectedAddresses || []),
                profile.custodyAddress
            ]).filter(Boolean);

            return { addresses: allAddresses, profiles };
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

            const { addresses, profiles } = await getFarcasterAddresses(usernames);
            
            if (addresses.length === 0) {
                throw new Error("No addresses found for these Farcaster accounts");
            }

            const profilesSummary = profiles
                .map(profile => `${profile.metadata.displayName} (@${profile.username})
FID: ${profile.fid}
${profile.metadata.description}`)
                .join('\n\n');

            const newMemory: Memory = {
                userId: _message.userId,
                agentId: _message.agentId,
                roomId: _message.roomId,
                content: {
                    text: `Fetching portfolio for addresses: ${addresses.join(', ')}\n\nProfiles:\n${profilesSummary}`,
                    action: "ZAPPER_PORTFOLIO",
                    source: _message.content?.source,
                    addresses: addresses,
                } as Content,
            };
            
            await _runtime.messageManager.createMemory(newMemory);
            _callback(newMemory.content);

            await _runtime.processActions(newMemory, [newMemory], _state, _callback);

            return true;
        } catch (error) {
            elizaLogger.error("Error in farcasterPortfolioAction:", error);
            throw error;
        }
    },
    examples: [
        [
            {
                user: "{{user1}}",
                content: {
                    text: "Show me the holdings for Farcaster users @vitalik and @jessepollak",
                },
            },
            {
                user: "{{user2}}",
                content: { text: "", action: "FARCASTER_PORTFOLIO" },
            },
        ],
        [
            {
                user: "{{user1}}",
                content: {
                    text: "What's the portfolio for @dwr?",
                },
            },
            {
                user: "{{user2}}",
                content: { text: "", action: "FARCASTER_PORTFOLIO" },
            },
        ],
    ] as ActionExample[][],
} as Action;