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
import { db, AddressRecord, ADDRESS_TYPES } from "../evaluators/addressDataEvaluator";

export const zapperAction: Action = {
    name: "ZAPPER",
    description: "Get the top five held assets by an address",
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
        async function getZapperAssets(addresses: string[]) {
            const encodedKey = btoa(process.env.ZAPPER_API_KEY);
            
            const query = `
                query Portfolio($addresses: [Address!]!) {
                    portfolio(addresses: $addresses) {
                        tokenBalances {
                            address
                            network
                            token {
                                balance
                                balanceUSD
                                baseToken {
                                    name
                                    symbol
                                }
                            }
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
                        addresses: addresses
                    }
                })
            });

            const data = await response.json();
            
            if (data.errors) {
                elizaLogger.error({ errors: data.errors }, "Zapper API returned errors");
                throw new Error("Failed to fetch data from Zapper API");
            }
            
            if (!data.data?.portfolio?.tokenBalances) {
                elizaLogger.error({ data }, "Unexpected data structure from Zapper API");
                throw new Error("Invalid data structure received from Zapper API");
            }

            return data.data.portfolio.tokenBalances
                .sort((a, b) => b.token.balanceUSD - a.token.balanceUSD)
                .slice(0, 5)
                .map(balance => {
                    const formattedBalance = Number(balance.token.balance).toLocaleString(undefined, {
                        maximumFractionDigits: 4
                    });
                    const formattedUSD = balance.token.balanceUSD.toLocaleString(undefined, {
                        style: 'currency',
                        currency: 'USD'
                    });
                    
                    return `${balance.token.baseToken.name} (${balance.token.baseToken.symbol})
                    Balance: ${formattedBalance}
                    Value: ${formattedUSD}`;
                })
                .join("\n\n");
        }

        try {
            let addresses: string[];
            let description: string;

            if (_message.content.text.toLowerCase().includes("watchlist")) {
                // Extract name from message
                const name = await generateText({
                    runtime: _runtime,
                    context: "Extract the name from the user message. The message is:",
                    modelClass: ModelClass.SMALL,
                    stop: ["\n"],
                });
                
                const getWatchlistStmt = db.db.prepare(
                    `SELECT * FROM addresses WHERE userId = ? AND type = ? AND LOWER(name) = LOWER(?)`
                );
                const watchlistAddresses = getWatchlistStmt
                    .bind(_message.userId, ADDRESS_TYPES.WATCHLIST, name)
                    .all() as AddressRecord[];
                
                if (watchlistAddresses.length === 0) {
                    throw new Error(`Could not find addresses for ${name} in watchlist`);
                }
                
                addresses = watchlistAddresses.map(entry => entry.address);
                description = `${name}'s wallets`;
            } else {
                const getPrimaryStmt = db.db.prepare(
                    `SELECT * FROM addresses WHERE userId = ? AND type = ?`
                );
                const primaryAddresses = getPrimaryStmt
                    .bind(_message.userId, ADDRESS_TYPES.PRIMARY)
                    .all() as AddressRecord[];

                if (primaryAddresses.length === 0) {
                    throw new Error("Please add your wallet addresses first");
                }
                addresses = primaryAddresses.map(entry => entry.address);
                description = "your wallets";
            }

            const assetsInfo = await getZapperAssets(addresses);

            const responseText = 
                `The top 5 assets held across ${description} are:\n\n${assetsInfo}`;

            const newMemory: Memory = {
                userId: _message.agentId,
                roomId: _message.roomId,
                agentId: _message.agentId,
                content: {
                    text: responseText,
                    action: "ZAPPER_RESPONSE",
                    source: _message.content?.source,
                } as Content,
            };

            await _runtime.messageManager.createMemory(newMemory);

            _callback(newMemory.content);

            return true;
        } catch (error) {
            elizaLogger.error("Error in zapperAction:", error);
            throw error;
        }
    },
    examples: [
        [
            {
                user: "{{user1}}",
                content: {
                    text: "What assets does 0x3d280fde2ddb59323c891cf30995e1862510342f hold?",
                },
            },
            {
                user: "{{user2}}",
                content: { text: "", action: "ZAPPER" },
            },
        ],
        [
            {
                user: "{{user1}}",
                content: {
                    text: "Show me the top holdings for 0xd8da6bf26964af9d7eed9e03e53415d37aa96045",
                },
            },
            {
                user: "{{user2}}",
                content: { text: "", action: "ZAPPER" },
            },
        ],
        [
            {
                user: "{{user1}}",
                content: {
                    text: "What's in the wallet 0x1234567890abcdef1234567890abcdef12345678?",
                },
            },
            {
                user: "{{user2}}",
                content: { text: "", action: "ZAPPER" },
            },
        ],
    ] as ActionExample[][],
} as Action;