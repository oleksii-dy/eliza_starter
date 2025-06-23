import {
    Action,
    ActionExample,
    Handler,
    HandlerCallback,
    IAgentRuntime,
    Memory,
    State,
    type ActionResult,
} from '@elizaos/core';
import { PublicKey } from '@solana/web3.js';
import { NftService } from '../services/NftService';

export const mintNftAction: Action = {
    name: 'MINT_NFT',
    similes: ['CREATE_NFT', 'GENERATE_NFT', 'MAKE_NFT'],
    description: 'Mint a new NFT on Solana',
    examples: [[
        {
            name: '{{user1}}',
            content: {
                text: 'Mint an NFT called "Cool Art" with symbol CA',
            },
        },
        {
            name: '{{agentName}}',
            content: {
                text: "I'll mint a new NFT for you.",
                actions: ['MINT_NFT'],
            },
        },
    ]] as ActionExample[][]

    validate: async (runtime: IAgentRuntime, message: Memory, state?: State): Promise<boolean> => {
        const service = runtime.getService('nft') as unknown as NftService;
        return service !== null && message.content.text?.toLowerCase().includes('mint') || false;
    },

    handler: async (
        runtime: IAgentRuntime,
        message: Memory,
        state?: State,
        options?: { [key: string]: unknown },
        callback?: HandlerCallback
    ): Promise<ActionResult> => {
        const service = runtime.getService('nft') as unknown as NftService;
        if (!service) {
            throw new Error('NFT service not available');
        }

        try {
            // Extract NFT details from message
            const text = message.content.text || '';
            const nameMatch = text.match(/(?:called?|named?)\s+"([^"]+)"/i);
            const symbolMatch = text.match(/symbol\s+(\w+)/i);
            
            const name = nameMatch?.[1] || 'ElizaNFT';
            const symbol = symbolMatch?.[1] || 'ELIZA';
            
            // Parse recipient if specified
            let recipient: PublicKey | undefined;
            const recipientMatch = text.match(/(?:to|for)\s+([\w]{32,44})/);
            if (recipientMatch) {
                try {
                    recipient = new PublicKey(recipientMatch[1]);
                } catch (e) {
                    // Invalid recipient address
                }
            }

            const result = await service.createBasicNft(name, symbol, recipient);

            const responseText = `✅ NFT minted successfully!
• Mint: ${result.mint.toString()}
• Token Account: ${result.tokenAccount.toString()}

Note: This is a basic NFT without metadata. For full NFT functionality, Metaplex integration would be needed.`;

            if (callback) {
                await callback({
                    text: responseText,
                    actions: ['MINT_NFT'],
                });
            }

            return {
                text: responseText,
                data: {
                    mint: result.mint.toString(),
                    tokenAccount: result.tokenAccount.toString(),
                    name,
                    symbol,
                },
            };
        } catch (error: any) {
            const errorText = `❌ Failed to mint NFT: ${error.message}`;
            if (callback) {
                await callback({
                    text: errorText,
                    actions: ['MINT_NFT'],
                });
            }
            throw error;
        }
    },
};

export const transferNftAction: Action = {
    name: 'TRANSFER_NFT',
    similes: ['SEND_NFT', 'MOVE_NFT', 'GIVE_NFT'],
    description: 'Transfer an NFT to another wallet',
    examples: [[
        {
            name: '{{user1}}',
            content: {
                text: 'Transfer NFT TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA to 7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZeHULPBmVD',
            },
        },
        {
            name: '{{agentName}}',
            content: {
                text: "I'll transfer the NFT for you.",
                actions: ['TRANSFER_NFT'],
            },
        },
    ]] as ActionExample[][]

    validate: async (runtime: IAgentRuntime, message: Memory, state?: State): Promise<boolean> => {
        const service = runtime.getService('nft') as unknown as NftService;
        return service !== null && message.content.text?.toLowerCase().includes('transfer') || false;
    },

    handler: async (
        runtime: IAgentRuntime,
        message: Memory,
        state?: State,
        options?: { [key: string]: unknown },
        callback?: HandlerCallback
    ): Promise<ActionResult> => {
        const service = runtime.getService('nft') as unknown as NftService;
        if (!service) {
            throw new Error('NFT service not available');
        }

        try {
            const text = message.content.text || '';
            const addresses = text.match(/[\w]{32,44}/g);
            
            if (!addresses || addresses.length < 2) {
                throw new Error('Please provide both the NFT mint address and recipient address');
            }

            const nftMint = new PublicKey(addresses[0]);
            const recipient = new PublicKey(addresses[1]);

            const signature = await service.transferNft(nftMint, recipient);

            const responseText = `✅ NFT transferred successfully!
• NFT: ${nftMint.toString()}
• Recipient: ${recipient.toString()}
• Transaction: ${signature}`;

            if (callback) {
                await callback({
                    text: responseText,
                    actions: ['TRANSFER_NFT'],
                });
            }

            return {
                text: responseText,
                data: {
                    nftMint: nftMint.toString(),
                    recipient: recipient.toString(),
                    signature,
                },
            };
        } catch (error: any) {
            const errorText = `❌ Failed to transfer NFT: ${error.message}`;
            if (callback) {
                await callback({
                    text: errorText,
                    actions: ['TRANSFER_NFT'],
                });
            }
            throw error;
        }
    },
};

export const listNftAction: Action = {
    name: 'LIST_NFT',
    similes: ['SELL_NFT', 'LIST_NFT_MARKETPLACE'],
    description: 'List an NFT on a marketplace',
    examples: [[
        {
            name: '{{user1}}',
            content: {
                text: 'List NFT TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA for 5 SOL on MagicEden',
            },
        },
        {
            name: '{{agentName}}',
            content: {
                text: "I'll list your NFT on the marketplace.",
                actions: ['LIST_NFT'],
            },
        },
    ]] as ActionExample[][]

    validate: async (runtime: IAgentRuntime, message: Memory, state?: State): Promise<boolean> => {
        const service = runtime.getService('nft') as unknown as NftService;
        return service !== null && message.content.text?.toLowerCase().includes('list') || false;
    },

    handler: async (
        runtime: IAgentRuntime,
        message: Memory,
        state?: State,
        options?: { [key: string]: unknown },
        callback?: HandlerCallback
    ): Promise<ActionResult> => {
        const service = runtime.getService('nft') as unknown as NftService;
        if (!service) {
            throw new Error('NFT service not available');
        }

        try {
            const text = message.content.text || '';
            const addressMatch = text.match(/([\w]{32,44})/);
            const priceMatch = text.match(/(\d+(?:\.\d+)?)\s*(?:SOL|sol)/i);
            const marketplaceMatch = text.match(/(?:on\s+)?(magiceden|tensor)/i);
            
            if (!addressMatch) {
                throw new Error('Please provide the NFT mint address');
            }
            if (!priceMatch) {
                throw new Error('Please specify the price in SOL');
            }

            const nftMint = new PublicKey(addressMatch[1]);
            const price = parseFloat(priceMatch[1]) * 1e9; // Convert to lamports
            const marketplace = (marketplaceMatch?.[1]?.toLowerCase() || 'magiceden') as 'magiceden' | 'tensor';

            const listingId = await service.listNftOnMarketplace(nftMint, price, marketplace);

            const responseText = `✅ NFT listed successfully!
• NFT: ${nftMint.toString()}
• Price: ${priceMatch[1]} SOL
• Marketplace: ${marketplace}
• Listing ID: ${listingId}

Note: This is a placeholder. Full marketplace integration requires specific SDK setup.`;

            if (callback) {
                await callback({
                    text: responseText,
                    actions: ['LIST_NFT'],
                });
            }

            return {
                text: responseText,
                data: {
                    nftMint: nftMint.toString(),
                    price,
                    marketplace,
                    listingId,
                },
            };
        } catch (error: any) {
            const errorText = `❌ Failed to list NFT: ${error.message}`;
            if (callback) {
                await callback({
                    text: errorText,
                    actions: ['LIST_NFT'],
                });
            }
            throw error;
        }
    },
};

export const viewNftsAction: Action = {
    name: 'VIEW_NFTS',
    similes: ['SHOW_NFTS', 'LIST_MY_NFTS', 'GET_NFTS'],
    description: 'View NFTs in a wallet',
    examples: [[
        {
            name: '{{user1}}',
            content: {
                text: 'Show my NFTs',
            },
        },
        {
            name: '{{agentName}}',
            content: {
                text: 'Let me show you the NFTs in your wallet.',
                actions: ['VIEW_NFTS'],
            },
        },
    ]] as ActionExample[][]

    validate: async (runtime: IAgentRuntime, message: Memory, state?: State): Promise<boolean> => {
        const service = runtime.getService('nft') as unknown as NftService;
        const text = message.content.text?.toLowerCase() || '';
        return service !== null && (
            text.includes('show') || 
            text.includes('view') || 
            text.includes('list')
        ) && text.includes('nft') || false;
    },

    handler: async (
        runtime: IAgentRuntime,
        message: Memory,
        state?: State,
        options?: { [key: string]: unknown },
        callback?: HandlerCallback
    ): Promise<ActionResult> => {
        const service = runtime.getService('nft') as unknown as NftService;
        if (!service) {
            throw new Error('NFT service not available');
        }

        try {
            const text = message.content.text || '';
            const addressMatch = text.match(/([\w]{32,44})/);
            
            // Use specified address or agent's wallet
            const keyManager = runtime.getService('secure-key-manager') as any;
            const walletKeypair = await keyManager.getAgentKeypair();
            const owner = addressMatch ? new PublicKey(addressMatch[1]) : walletKeypair.publicKey;

            const nfts = await service.getUserNfts(owner);

            let responseText: string;
            if (nfts.length === 0) {
                responseText = `No NFTs found in wallet ${owner.toString()}`;
            } else {
                responseText = `Found ${nfts.length} NFT${nfts.length > 1 ? 's' : ''} in wallet:\n\n`;
                nfts.forEach((nft, index) => {
                    responseText += `${index + 1}. Mint: ${nft.mint.toString()}\n`;
                    responseText += `   Account: ${nft.account.toString()}\n\n`;
                });
            }

            if (callback) {
                await callback({
                    text: responseText,
                    actions: ['VIEW_NFTS'],
                });
            }

            return {
                text: responseText,
                data: {
                    owner: owner.toString(),
                    nfts: nfts.map(nft => ({
                        mint: nft.mint.toString(),
                        account: nft.account.toString(),
                    })),
                },
            };
        } catch (error: any) {
            const errorText = `❌ Failed to view NFTs: ${error.message}`;
            if (callback) {
                await callback({
                    text: errorText,
                    actions: ['VIEW_NFTS'],
                });
            }
            throw error;
        }
    },
}; 