import {
  type Action,
  type IAgentRuntime,
  type Memory,
  type State,
  type HandlerCallback,
  logger,
  ModelType,
} from '@elizaos/core';
import { CrossMintService } from '../services/CrossMintService';
import { CrossMintError } from '../types/crossmint';

/**
 * Mint NFT Action for CrossMint
 * Enables agents to mint NFTs using CrossMint's NFT infrastructure
 */
export const mintNFTAction: Action = {
  name: 'MINT_NFT',
  similes: ['CREATE_NFT', 'MINT_TOKEN', 'GENERATE_NFT'],
  description: 'Mint an NFT using CrossMint infrastructure',

  validate: async (runtime: IAgentRuntime, message: Memory) => {
    const crossmintService = runtime.getService<CrossMintService>('crossmint');
    return !!crossmintService;
  },

  handler: async (
    runtime: IAgentRuntime,
    message: Memory,
    state?: State,
    options?: any,
    callback?: HandlerCallback
  ) => {
    try {
      const crossmintService = runtime.getService<CrossMintService>('crossmint');
      if (!crossmintService) {
        throw new CrossMintError('CrossMint service not available');
      }

      // Extract NFT minting details from message using LLM
      const nftDetailsPrompt = `
        Extract NFT minting details from this message: "${message.content.text}"
        
        Return JSON with these fields:
        {
          "name": "NFT name",
          "description": "NFT description",
          "recipient": "recipient address",
          "contractAddress": "NFT contract address",
          "network": "blockchain network (ethereum, polygon, etc.)",
          "image": "image URL if provided",
          "attributes": [{"trait_type": "attribute name", "value": "attribute value"}]
        }
        
        If any field is missing, indicate with null or empty array for attributes.
      `;

      const response = await runtime.useModel(ModelType.TEXT_SMALL, {
        prompt: nftDetailsPrompt,
        maxTokens: 300,
      });

      let nftDetails;
      try {
        nftDetails = JSON.parse(response);
      } catch {
        throw new CrossMintError('Could not parse NFT details from message');
      }

      // Validate required fields
      if (!nftDetails.name || !nftDetails.recipient || !nftDetails.contractAddress) {
        throw new CrossMintError('Missing required NFT details (name, recipient, contract address)');
      }

      // Set defaults
      nftDetails.network = nftDetails.network || 'ethereum';
      nftDetails.description = nftDetails.description || '';
      nftDetails.attributes = nftDetails.attributes || [];

      // Validate network support
      if (!crossmintService.isNetworkSupported(nftDetails.network)) {
        throw new CrossMintError(`Network ${nftDetails.network} is not supported by CrossMint`);
      }

      // Mint NFT
      const nft = await crossmintService.mintNFT({
        contractAddress: nftDetails.contractAddress,
        network: nftDetails.network,
        recipient: nftDetails.recipient,
        metadata: {
          name: nftDetails.name,
          description: nftDetails.description,
          image: nftDetails.image,
          attributes: nftDetails.attributes,
        },
      });

      const responseText = `✅ NFT Minted Successfully

**NFT ID:** ${nft.id}
**Token ID:** ${nft.tokenId}
**Name:** ${nft.name}
**Network:** ${nft.network}
**Contract:** ${nft.contractAddress}
**Owner:** ${nft.owner}
${nft.description ? `**Description:** ${nft.description}` : ''}
${nft.image ? `**Image:** ${nft.image}` : ''}

The NFT has been minted and assigned to the specified recipient.`;

      await callback?.({
        text: responseText,
        thought: `Minted NFT "${nft.name}" for ${nft.owner}`,
        actions: ['MINT_NFT'],
      });

      return {
        text: responseText,
        data: {
          nft,
          nftDetails,
        },
      };
    } catch (error) {
      logger.error('Error minting NFT:', error);
      
      const errorMessage = `❌ Failed to mint NFT: ${error instanceof Error ? error.message : 'Unknown error'}`;
      
      await callback?.({
        text: errorMessage,
        thought: 'Failed to mint NFT',
        actions: ['MINT_NFT'],
      });

      return {
        text: errorMessage,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  },

  examples: [
    [
      {
        name: 'User',
        content: {
          text: 'Mint an NFT called "Digital Artwork #1" to 0x742d35Cc6639C0532fBa4c81D63eD2c0c57C1234 using contract 0xabcd1234...',
        },
      },
      {
        name: 'Agent',
        content: {
          text: '✅ NFT Minted Successfully\n\n**NFT ID:** nft-123...\n**Token ID:** 1\n**Name:** Digital Artwork #1\n**Network:** ethereum\n**Contract:** 0xabcd1234...\n**Owner:** 0x742d35Cc6639C0532fBa4c81D63eD2c0c57C1234\n\nThe NFT has been minted and assigned to the specified recipient.',
          thought: 'Minted NFT "Digital Artwork #1" for 0x742d35Cc6639C0532fBa4c81D63eD2c0c57C1234',
          actions: ['MINT_NFT'],
        },
      },
    ],
    [
      {
        name: 'User',
        content: {
          text: 'Create NFT "Special Edition Card" with description "Limited edition collectible" on Polygon for address 0x567890...',
        },
      },
      {
        name: 'Agent',
        content: {
          text: '✅ NFT Minted Successfully\n\n**NFT ID:** nft-456...\n**Token ID:** 42\n**Name:** Special Edition Card\n**Network:** polygon\n**Contract:** 0xdef456...\n**Owner:** 0x567890...\n**Description:** Limited edition collectible\n\nThe NFT has been minted and assigned to the specified recipient.',
          thought: 'Minted NFT "Special Edition Card" for 0x567890...',
          actions: ['MINT_NFT'],
        },
      },
    ],
  ],
};