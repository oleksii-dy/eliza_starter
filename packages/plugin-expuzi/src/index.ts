import { Plugin, Action, IAgentRuntime } from '@elizaos/core';
import { initializeAuditor, auditToken } from './services/auditService';
import { generateMeme } from './services/meme';
import { mintNFT } from './services/nft';

export class DefiDetectorPlugin implements Plugin {
  name = 'defi-detector';
  description = 'Token auditing and meme generation for DeFi';

  constructor(private runtime: IAgentRuntime) {
    initializeAuditor(runtime);
  }

  actions: Action[] = [
    {
      name: 'audit',
      description: 'Audit a token',
      similes: ['analyze token', 'check token', 'evaluate token'],
      examples: [[]], // Add relevant examples
      handler: async (runtime, message) => {
        const tokenSymbol = message.content.text;
        return await auditToken(tokenSymbol);
      },
      validate: async () => true, // Add proper validation
      suppressInitialMessage: false
    },
    {
      name: 'mint-nft',
      description: 'Mint an NFT badge',
      similes: ['create badge', 'generate nft'],
      examples: [[]],
      handler: async (runtime, message) => {
        const address = message.content.text;
        return await mintNFT(address, 1); // Default to level 1
      },
      validate: async () => true,
      suppressInitialMessage: false
    }
  ];
}

export default DefiDetectorPlugin;
