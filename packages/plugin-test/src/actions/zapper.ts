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
import { db, AddressRecord } from "../evaluators/addressDataEvaluator";
import { isValidAddress } from "../evaluators/addressDataEvaluator";

export const zapperAction: Action = {
    name: "ZAPPER",
    description: "Get the top five held assets by an address or addresses",
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

            const extractionTemplate = `Extract only the wallet addresses from this text, nothing else. Return them in a simple JSON array:
            ${_message.content.text}`;

            const extractedAddresses = await generateText({
                runtime: _runtime,
                context: extractionTemplate,
                modelClass: ModelClass.SMALL,
                stop: ["\n"]
            });

            // Clean and parse the response - remove markdown formatting
            const cleanedResponse = extractedAddresses
                .replace(/```json\n?/g, '')  // Remove opening ```json
                .replace(/```\n?/g, '')      // Remove closing ```
                .trim();

            elizaLogger.info({ cleanedResponse }, "Cleaned response");
            const providedAddresses = JSON.parse(cleanedResponse) as string[];

            if (providedAddresses.length > 0) {
                addresses = providedAddresses;
            }

            // Validate all addresses
            const invalidAddresses = addresses.filter(addr => !isValidAddress(addr));
            if (invalidAddresses.length > 0) {
                throw new Error(`Invalid address format for: ${invalidAddresses.join(', ')}`);
            }

            const assetsInfo = await getZapperAssets(addresses);

            const responseText = 
                `The top 5 assets held across the provided wallets are:\n\n${assetsInfo}`;

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
                    text: "Show me the holdings for 0xd8da6bf26964af9d7eed9e03e53415d37aa96045",
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
                    text: "Check these wallets: 0xd8da6bf26964af9d7eed9e03e53415d37aa96045, 0xd8da6bf26964af9d7eed9e03e53415d37aa96048",
                },
            },
            {
                user: "{{user2}}",
                content: { text: "", action: "ZAPPER" },
            },
        ],
    ] as ActionExample[][],
} as Action;