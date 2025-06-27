import {
  type Action,
  type ActionResult,
  type HandlerCallback,
  type IAgentRuntime,
  type Memory,
  type State,
  elizaLogger,
} from '@elizaos/core';
import { ContractGenerationService } from '../services/ContractGenerationService.ts';
import type { ContractGenerationOptions, BenchmarkScenario } from '../types/contracts.ts';

export const generateContractAction: Action = {
  name: 'GENERATE_CONTRACT',
  similes: ['CREATE_CONTRACT', 'BUILD_CONTRACT', 'DEVELOP_CONTRACT', 'CODE_CONTRACT'],
  description: 'Generates, compiles, and deploys smart contracts for EVM and SVM blockchains with interactive testing interfaces',
  
  validate: async (runtime: IAgentRuntime, message: Memory): Promise<boolean> => {
    try {
      // Check if contract generation service is available
      const contractService = runtime.getService('contract-generation') as ContractGenerationService;
      if (!contractService) {
        elizaLogger.warn('Contract generation service not available');
        return false;
      }

      // Validate message content
      if (!message.content?.text) {
        elizaLogger.warn('No text content provided for contract generation');
        return false;
      }

      // Check for minimum content requirements
      const text = message.content.text.toLowerCase();
      const hasContractKeywords = /\b(contract|token|nft|dao|defi|marketplace|staking|bridge)\b/.test(text);
      const hasGenerationKeywords = /\b(create|build|make|generate|develop|deploy)\b/.test(text);
      
      if (!hasContractKeywords && !hasGenerationKeywords) {
        elizaLogger.debug('Message does not contain contract generation keywords');
        return false;
      }

      // Additional validation checks
      const messageLength = message.content.text.length;
      if (messageLength < 10) {
        elizaLogger.warn('Message too short for meaningful contract generation', { messageLength });
        return false;
      }

      if (messageLength > 5000) {
        elizaLogger.warn('Message too long for contract generation', { messageLength });
        return false;
      }

      return true;
    } catch (error) {
      elizaLogger.error('Error during contract generation validation', error);
      return false;
    }
  },

  handler: async (
    runtime: IAgentRuntime,
    message: Memory,
    state?: State,
    _options?: any,
    callback?: HandlerCallback
  ): Promise<ActionResult> => {
    try {
      elizaLogger.info('Starting contract generation', { 
        messageId: message.id,
        roomId: message.roomId 
      });

      const contractService = runtime.getService('contract-generation') as ContractGenerationService;
      if (!contractService) {
        throw new Error('Contract generation service not available');
      }

      // Parse user requirements from message
      const requirements = extractRequirements(message.content.text || '');
      const options = parseGenerationOptions(message.content.text || '', state || { values: {}, data: {}, text: '' });

      // Generate initial response
      if (callback) {
        callback({
          text: `🚀 Starting ${options.blockchain} ${options.contractType} contract generation...\n\n` +
                `**Requirements:** ${requirements}\n` +
                `**Blockchain:** ${options.blockchain}\n` +
                `**Type:** ${options.contractType}\n` +
                `**Features:** ${options.generateTestInterface ? '✓ Test Interface' : ''} ${options.generateFrontend ? '✓ Frontend' : ''} ${options.deploy ? '✓ Deployment' : ''}\n\n` +
                `This may take a few minutes. I'll update you on progress...`,
          content: {
            action: 'GENERATE_CONTRACT',
            status: 'started',
            options,
          },
        });
      }

      // Generate the contract
      const generatedContract = await contractService.generateContract(requirements, options, state || { values: {}, data: {}, text: '' });

      // Create demo if deployment was successful
      let demoInfo = null;
      if (generatedContract.deploymentInfo && (options.generateTestInterface || options.generateFrontend)) {
        try {
          demoInfo = await contractService.deployWithDemo(generatedContract, options);
        } catch (error) {
          elizaLogger.warn('Failed to create demo environment', error);
        }
      }

      // Create success message
      let successMessage = `🎉 **Contract Generated Successfully!**\n\n`;
      successMessage += `**Contract Name:** ${generatedContract.name}\n`;
      successMessage += `**Description:** ${generatedContract.description}\n`;
      successMessage += `**Blockchain:** ${generatedContract.blockchain}\n`;

      if (generatedContract.deploymentInfo) {
        successMessage += `**Contract Address:** \`${generatedContract.deploymentInfo.address}\`\n`;
        successMessage += `**Network:** ${generatedContract.deploymentInfo.network}\n`;
        successMessage += `**Transaction:** ${generatedContract.deploymentInfo.transactionHash}\n`;
      }

      if (demoInfo?.demoUrl) {
        successMessage += `**Interactive Demo:** ${demoInfo.demoUrl}\n`;
        successMessage += `\n🎮 **Try your contract** at the demo link above!\n`;
        successMessage += `The demo includes wallet connection and all contract functions.`;
      } else if (generatedContract.testInterface) {
        successMessage += `\n🧪 **Test Interface Generated** - Ready for local testing`;
      }

      // Additional actions available
      successMessage += `\n\n**Next Steps:**\n`;
      if (!generatedContract.deploymentInfo) {
        successMessage += `• Deploy to mainnet with: "Deploy my contract to ${options.blockchain} mainnet"\n`;
      }
      if (!generatedContract.frontend) {
        successMessage += `• Generate frontend with: "Create a React frontend for my contract"\n`;
      }
      successMessage += `• Verify contract with: "Verify my contract on Etherscan"\n`;
      successMessage += `• Add more features with: "Add [feature] to my contract"`;

      if (callback) {
        callback({
          text: successMessage,
          content: {
            action: 'GENERATE_CONTRACT',
            status: 'completed',
            contract: {
              id: generatedContract.id,
              name: generatedContract.name,
              address: generatedContract.deploymentInfo?.address,
              network: generatedContract.deploymentInfo?.network,
              blockchain: generatedContract.blockchain,
              demoUrl: demoInfo?.demoUrl,
              hasTestInterface: !!generatedContract.testInterface,
              hasFrontend: !!generatedContract.frontend,
            },
          },
        });
      }

      // Store contract in memory for future reference
      await runtime.createMemory(
        {
          entityId: runtime.agentId,
          roomId: message.roomId,
          agentId: runtime.agentId,
          content: {
            text: `Generated contract: ${generatedContract.name}`,
            type: 'contract-generation',
            contract: {
              id: generatedContract.id,
              name: generatedContract.name,
              address: generatedContract.deploymentInfo?.address,
              network: generatedContract.deploymentInfo?.network,
              blockchain: generatedContract.blockchain,
              requirements,
            },
          },
        },
        'contracts'
      );

      return {
        data: {
          actionName: 'GENERATE_CONTRACT',
          success: true,
          contractId: generatedContract.id,
          contractAddress: generatedContract.deploymentInfo?.address,
          demoUrl: demoInfo?.demoUrl,
          blockchain: generatedContract.blockchain,
          network: generatedContract.deploymentInfo?.network,
        },
        values: {
          contractGenerated: true,
          contractCompiled: !!generatedContract.abi,
          contractDeployed: !!generatedContract.deploymentInfo,
          testInterfaceGenerated: !!generatedContract.testInterface,
          frontendGenerated: !!generatedContract.frontend,
          demoAccessible: !!demoInfo?.demoUrl,
        },
      };

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      elizaLogger.error('Contract generation failed', error);

      if (callback) {
        callback({
          text: `❌ **Contract Generation Failed**\n\n` +
                `**Error:** ${errorMessage}\n\n` +
                `Please try again with more specific requirements or check your configuration.`,
          content: {
            action: 'GENERATE_CONTRACT',
            status: 'failed',
            error: errorMessage,
          },
        });
      }

      return {
        data: {
          actionName: 'GENERATE_CONTRACT',
          success: false,
          error: errorMessage,
        },
        values: {
          contractGenerated: false,
          error: errorMessage,
        },
      };
    }
  },

  examples: [
    [
      {
        name: '{{user}}',
        content: {
          text: 'Create a simple ERC20 token contract on Base with 1 million supply',
        },
      },
      {
        name: '{{agent}}',
        content: {
          text: 'I\'ll create an ERC20 token contract on Base for you with 1 million token supply. This will include compilation, deployment, and a test interface.',
          thought: 'User wants a basic ERC20 token on Base network. I should generate a standard token contract with the specified supply, compile it, deploy to Base testnet, and create an interactive test interface.',
          actions: ['GENERATE_CONTRACT'],
        },
      },
    ],
    [
      {
        name: '{{user}}',
        content: {
          text: 'Build a full-stack NFT marketplace dApp on Ethereum with React frontend',
        },
      },
      {
        name: '{{agent}}',
        content: {
          text: 'I\'ll build a complete NFT marketplace dApp for you! This includes an NFT contract, marketplace contract, React frontend, and deployment to Ethereum testnet with a live demo.',
          thought: 'Complex full-stack dApp request. Need to generate NFT contract, marketplace contract, React frontend with wallet integration, and set up complete testing environment.',
          actions: ['GENERATE_CONTRACT'],
        },
      },
    ],
    [
      {
        name: '{{user}}',
        content: {
          text: 'Create a Solana SPL token program with staking functionality',
        },
      },
      {
        name: '{{agent}}',
        content: {
          text: 'I\'ll create a Solana SPL token program with staking capabilities using Anchor framework. This will include the token program, staking logic, compilation, and deployment to Solana devnet.',
          thought: 'Solana-specific request requiring Anchor framework. Need to generate SPL token program with staking mechanism, compile with Anchor, and deploy to devnet.',
          actions: ['GENERATE_CONTRACT'],
        },
      },
    ],
    [
      {
        name: '{{user}}',
        content: {
          text: 'I need a DeFi yield farming contract with liquidity pools on Arbitrum',
        },
      },
      {
        name: '{{agent}}',
        content: {
          text: 'I\'ll create a comprehensive DeFi yield farming system on Arbitrum! This includes liquidity pool contracts, yield farming logic, reward distribution, and a frontend interface for users to interact with the pools.',
          thought: 'Advanced DeFi contract requiring multiple components: liquidity pools, yield farming mechanics, reward calculations. Need to ensure proper security measures and create user-friendly interface.',
          actions: ['GENERATE_CONTRACT'],
        },
      },
    ],
    [
      {
        name: '{{user}}',
        content: {
          text: 'Build a simple voting DAO contract that I can test immediately',
        },
      },
      {
        name: '{{agent}}',
        content: {
          text: 'I\'ll create a voting DAO contract with proposal creation, voting mechanisms, and execution logic. You\'ll get a deployed contract with an interactive test interface where you can create proposals and vote immediately.',
          thought: 'DAO contract with governance features. User wants immediate testing capability, so I should prioritize generating a working test interface alongside the contract deployment.',
          actions: ['GENERATE_CONTRACT'],
        },
      },
    ],
  ],
};

function extractRequirements(text: string): string {
  // Extract the main requirements from the user's message
  // Remove common prefixes and focus on the core request
  const cleaned = text
    .replace(/^(create|build|make|generate|develop)\s+/i, '')
    .replace(/\s+(contract|smart contract|dapp|application)\s*/i, ' ')
    .trim();
  
  return cleaned || text;
}

function parseGenerationOptions(text: string, state: State): ContractGenerationOptions {
  const options: ContractGenerationOptions = {
    blockchain: 'base', // Default to Base
    contractType: 'custom',
    compile: true,
    deploy: true,
    generateTestInterface: true,
    generateFrontend: false,
  };

  // Parse blockchain
  if (/\b(ethereum|eth)\b/i.test(text)) {
    options.blockchain = 'ethereum';
  } else if (/\bbase\b/i.test(text)) {
    options.blockchain = 'base';
  } else if (/\b(arbitrum|arb)\b/i.test(text)) {
    options.blockchain = 'arbitrum';
  } else if (/\b(polygon|matic)\b/i.test(text)) {
    options.blockchain = 'polygon';
  } else if (/\b(solana|sol)\b/i.test(text)) {
    options.blockchain = 'solana';
  }

  // Parse contract type
  if (/\b(erc20|token)\b/i.test(text)) {
    options.contractType = 'token';
  } else if (/\b(erc721|erc1155|nft)\b/i.test(text)) {
    options.contractType = 'nft';
  } else if (/\b(defi|yield|farming|liquidity|pool|swap)\b/i.test(text)) {
    options.contractType = 'defi';
  } else if (/\b(dao|governance|voting)\b/i.test(text)) {
    options.contractType = 'dao';
  }

  // Parse additional features
  if (/\b(frontend|react|vue|ui|interface|dapp|full.?stack)\b/i.test(text)) {
    options.generateFrontend = true;
  }

  // Parse network preference
  if (/\bmainnet\b/i.test(text)) {
    options.network = options.blockchain === 'solana' ? 'mainnet-beta' : 'mainnet';
  } else {
    // Default to testnets
    options.network = options.blockchain === 'solana' ? 'devnet' : 
                     options.blockchain === 'base' ? 'base-sepolia' : 'sepolia';
  }

  return options;
}

/**
 * Benchmark scenarios for testing contract generation
 */
export const contractBenchmarkScenarios: BenchmarkScenario[] = [
  {
    id: 'simple-erc20-base',
    name: 'Simple ERC20 on Base',
    description: 'Generate and deploy a basic ERC20 token contract on Base',
    userPrompt: 'Create a simple ERC20 token called TestCoin with 1000000 total supply on Base',
    expectedOutputs: {
      contractGenerated: true,
      contractCompiled: true,
      contractDeployed: true,
      testInterfaceGenerated: true,
      frontendGenerated: false,
      demoAccessible: true,
    },
    blockchain: 'base',
    complexity: 'simple',
    estimatedTime: 120000, // 2 minutes
    successCriteria: [
      'Contract code generated',
      'Contract compiles without errors',
      'Contract deployed to Base testnet',
      'Test interface accessible',
      'Can mint and transfer tokens',
    ],
  },
  {
    id: 'nft-marketplace-ethereum',
    name: 'NFT Marketplace on Ethereum',
    description: 'Generate a full NFT marketplace with React frontend',
    userPrompt: 'Build an NFT marketplace on Ethereum with minting, buying, and selling features plus React frontend',
    expectedOutputs: {
      contractGenerated: true,
      contractCompiled: true,
      contractDeployed: true,
      testInterfaceGenerated: true,
      frontendGenerated: true,
      demoAccessible: true,
    },
    blockchain: 'ethereum',
    complexity: 'complex',
    estimatedTime: 300000, // 5 minutes
    successCriteria: [
      'NFT contract generated',
      'Marketplace contract generated',
      'Both contracts deployed',
      'React frontend generated',
      'Demo app accessible',
      'Can mint and list NFTs',
    ],
  },
  {
    id: 'solana-spl-token',
    name: 'Solana SPL Token',
    description: 'Generate and deploy SPL token on Solana',
    userPrompt: 'Create a Solana SPL token program with custom mint authority',
    expectedOutputs: {
      contractGenerated: true,
      contractCompiled: true,
      contractDeployed: true,
      testInterfaceGenerated: true,
      frontendGenerated: false,
      demoAccessible: true,
    },
    blockchain: 'solana',
    complexity: 'medium',
    estimatedTime: 180000, // 3 minutes
    successCriteria: [
      'Anchor program generated',
      'Program compiles successfully',
      'Program deployed to devnet',
      'Test interface works',
      'Can mint and transfer tokens',
    ],
  },
  {
    id: 'defi-yield-farm-arbitrum',
    name: 'DeFi Yield Farm on Arbitrum',
    description: 'Generate yield farming contract with liquidity pools',
    userPrompt: 'Build a DeFi yield farming contract with liquidity pools and reward distribution on Arbitrum',
    expectedOutputs: {
      contractGenerated: true,
      contractCompiled: true,
      contractDeployed: true,
      testInterfaceGenerated: true,
      frontendGenerated: true,
      demoAccessible: true,
    },
    blockchain: 'arbitrum',
    complexity: 'complex',
    estimatedTime: 360000, // 6 minutes
    successCriteria: [
      'Yield farming contract generated',
      'Liquidity pool logic implemented',
      'Reward distribution working',
      'Frontend interface created',
      'Can stake and earn rewards',
    ],
  },
  {
    id: 'dao-governance-polygon',
    name: 'DAO Governance on Polygon',
    description: 'Generate DAO contract with proposal and voting system',
    userPrompt: 'Create a DAO governance contract with proposal creation and voting on Polygon',
    expectedOutputs: {
      contractGenerated: true,
      contractCompiled: true,
      contractDeployed: true,
      testInterfaceGenerated: true,
      frontendGenerated: false,
      demoAccessible: true,
    },
    blockchain: 'polygon',
    complexity: 'medium',
    estimatedTime: 240000, // 4 minutes
    successCriteria: [
      'DAO contract generated',
      'Proposal mechanism working',
      'Voting system functional',
      'Test interface available',
      'Can create and vote on proposals',
    ],
  },
];