// TODO: Implement portfolio action
// 1. call the zapper api with address input taken from user
// 2. format data from the api:
// 3. Token names, balances, USD values
// 4. NFT balances in USD
// 5. portfolio totals organised by network


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

export const portfolioAction: Action = {
    name: "ZAPPER_PORTFOLIO",
    description: "Get the portfolio from given address or addresses",
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
                        nftBalances {
                            network
                            balanceUSD
                        }
                        totals {
                            total
                            totalWithNFT
                            totalByNetwork {
                                network
                                total
                            }
                            holdings {
                                label
                                balanceUSD
                                pct
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

            const portfolio = data.data.portfolio;

            // Format token balances
            const tokenSection = portfolio.tokenBalances
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

                    return `
${balance.token.baseToken.name} (${balance.token.baseToken.symbol})
                    Network: ${balance.network}
                    Balance: ${formattedBalance}
                    Value: ${formattedUSD}`;
                })
                .join("\n");

            // Format NFT balances
            const nftSection = portfolio.nftBalances
                .map(nft => {
                    const formattedUSD = nft.balanceUSD.toLocaleString(undefined, {
                        style: 'currency',
                        currency: 'USD'
                    });
                    return `
${nft.network}
                    NFT Value: ${formattedUSD}`;
                })
                .join("\n");

            // Format portfolio totals
            const totalUSD = portfolio.totals.total.toLocaleString(undefined, {
                style: 'currency',
                currency: 'USD'
            });
            const totalWithNFTUSD = portfolio.totals.totalWithNFT.toLocaleString(undefined, {
                style: 'currency',
                currency: 'USD'
            });

            const networkTotals = portfolio.totals.totalByNetwork
                .filter(net => net.total > 0)
                .sort((a, b) => b.total - a.total)
                .map(net => {
                    const formattedUSD = net.total.toLocaleString(undefined, {
                        style: 'currency',
                        currency: 'USD'
                    });
                    return `
                    ${net.network}: ${formattedUSD}`;
                });

            return `💰 Portfolio Summary:\n
                    Total Value (excluding NFTs): ${totalUSD}
                    Total Value (including NFTs): ${totalWithNFTUSD}
            
🌐 Network Breakdown:
                    ${networkTotals}
            
🪙 Top Token Holdings:
${tokenSection}
            
🎨 NFT Holdings:
${nftSection}`;
        }

        try {
            const context = `Extract only the blockchain wallet addresses from this text, returning them as a comma-separated list with no other text or explanations. The message is:
            ${_message.content.text}`;

            const extractedAddressesText = await generateText({
                runtime: _runtime,
                context,
                modelClass: ModelClass.SMALL,
                stop: ["\n"]
            });

            const addresses = extractedAddressesText
                .split(',')
                .map(addr => addr.trim())
                .filter(addr => addr.length > 0);

            elizaLogger.info({ addresses }, "Extracted addresses");

            if (addresses.length === 0) {
                throw new Error("No wallet addresses found in the message");
            }

            const assetsInfo = await getZapperAssets(addresses);

            const responseText = `⚡ Here is the portfolio for the provided addresses:
\n${assetsInfo}`;

            const newMemory: Memory = {
                userId: _message.userId,
                agentId: _message.agentId,
                roomId: _message.roomId,
                content: {
                    text: responseText,
                    action: "ZAPPER_PORTFOLIO_RESPONSE",
                    source: _message.content?.source,
                } as Content,
            };

            await _runtime.messageManager.createMemory(newMemory);
            _callback(newMemory.content);

            return true;
        } catch (error) {
            elizaLogger.error("Error in portfolioAction:", error);
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
                content: { text: "", action: "ZAPPER_PORTFOLIO" },
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
                content: { text: "", action: "ZAPPER_PORTFOLIO" },
            },
        ],
    ] as ActionExample[][],
} as Action;
