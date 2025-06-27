import {
  type Action,
  type ActionResult,
  type HandlerCallback,
  type IAgentRuntime,
  type Memory,
  type State,
  elizaLogger,
  ModelType,
  composePromptFromState,
  parseKeyValueXml,
} from '@elizaos/core';
// Local type for ImprovedE2BService since external import is not available
interface ImprovedE2BService {
  createSandbox(options: any): Promise<string>;
  runCommandInSandbox(sandboxId: string, command: string): Promise<any>;
  writeFileToSandbox(sandboxId: string, path: string, content: string): Promise<void>;
  readFileFromSandbox(sandboxId: string, path: string): Promise<string>;
  closeSandbox(sandboxId: string): Promise<void>;
  executeCode(code: string, language?: string): Promise<any>;
  killSandbox(sandboxId: string): Promise<void>;
}
import { ContractGenerationService } from '../services/ContractGenerationService.ts';
import type { DAppGenerationOptions, GeneratedDApp, DAppFeature } from '../types/contracts.ts';

export const generateDAppAction: Action = {
  name: 'GENERATE_DAPP',
  similes: ['CREATE_DAPP', 'BUILD_DAPP', 'DEVELOP_DAPP', 'MAKE_APP', 'CREATE_APP'],
  description:
    'Generates full-stack decentralized applications with smart contracts, frontends, and backends',

  validate: async (runtime: IAgentRuntime): Promise<boolean> => {
    const contractService = runtime.getService(
      'contract-generation'
    ) as unknown as ContractGenerationService;
    const e2bService = runtime.getService('e2b') as unknown as ImprovedE2BService;
    return !!(contractService && e2bService);
  },

  handler: async (
    runtime: IAgentRuntime,
    message: Memory,
    state?: State,
    _options?: any,
    callback?: HandlerCallback
  ): Promise<ActionResult> => {
    try {
      elizaLogger.info('Starting dApp generation', {
        messageId: message.id,
        roomId: message.roomId,
      });

      const contractService = runtime.getService(
        'contract-generation'
      ) as unknown as ContractGenerationService;
      const e2bService = runtime.getService('e2b') as unknown as ImprovedE2BService;

      if (!contractService || !e2bService) {
        throw new Error('Required services not available');
      }

      // Parse dApp requirements
      const requirements = message.content.text || '';
      const options = await parseDAppOptions(
        requirements,
        state || { values: {}, data: {}, text: '' },
        runtime
      );

      // Generate initial response
      if (callback) {
        callback({
          text:
            `🚀 **Starting Full-Stack dApp Development**\n\n` +
            `**Project:** ${extractProjectName(requirements)}\n` +
            `**Type:** ${options.type}\n` +
            `**Frontend:** ${options.frontend}\n` +
            `**Backend:** ${options.backend || 'None'}\n` +
            `**Blockchain:** ${options.blockchain}\n` +
            `**Features:** ${options.features.map((f) => f.name).join(', ')}\n\n` +
            `This will take several minutes. Building your complete dApp stack...`,
          content: {
            action: 'GENERATE_DAPP',
            status: 'started',
            options,
          },
        });
      }

      // Generate the dApp
      const generatedDApp = await generateFullStackDApp(
        requirements,
        options,
        state || { values: {}, data: {}, text: '' },
        runtime,
        contractService,
        e2bService
      );

      // Deploy and create demo
      const deploymentResult = await deployDAppStack(generatedDApp, options, e2bService, runtime);

      // Create success message
      let successMessage = `🎉 **Full-Stack dApp Generated Successfully!**\n\n`;
      successMessage += `**Project:** ${generatedDApp.name}\n`;
      successMessage += `**Type:** ${generatedDApp.type}\n`;
      successMessage += `**Blockchain:** ${generatedDApp.blockchain}\n\n`;

      if (generatedDApp.contract?.deploymentInfo) {
        successMessage += `**Smart Contract:**\n`;
        successMessage += `• Address: \`${generatedDApp.contract.deploymentInfo.address}\`\n`;
        successMessage += `• Network: ${generatedDApp.contract.deploymentInfo.network}\n\n`;
      }

      if (deploymentResult.frontendUrl) {
        successMessage += `**Live Application:** ${deploymentResult.frontendUrl}\n`;
      }

      if (deploymentResult.backendUrl) {
        successMessage += `**API Backend:** ${deploymentResult.backendUrl}\n`;
      }

      if (deploymentResult.demoUrl) {
        successMessage += `**Interactive Demo:** ${deploymentResult.demoUrl}\n`;
      }

      successMessage += `\n🚀 **Your dApp is live and ready to use!**\n`;
      successMessage += `The frontend includes wallet connection, all contract interactions, `;
      successMessage += `and a modern responsive UI.\n\n`;

      successMessage += `**Features Included:**\n`;
      options.features.forEach((feature) => {
        successMessage += `• ${feature.name}: ${feature.description}\n`;
      });

      if (callback) {
        callback({
          text: successMessage,
          content: {
            action: 'GENERATE_DAPP',
            status: 'completed',
            dapp: {
              id: generatedDApp.id,
              name: generatedDApp.name,
              type: generatedDApp.type,
              blockchain: generatedDApp.blockchain,
              contractAddress: generatedDApp.contract?.deploymentInfo?.address,
              frontendUrl: deploymentResult.frontendUrl,
              backendUrl: deploymentResult.backendUrl,
              demoUrl: deploymentResult.demoUrl,
            },
          },
        });
      }

      // Store dApp in memory
      await runtime.createMemory(
        {
          entityId: runtime.agentId,
          roomId: message.roomId,
          agentId: runtime.agentId,
          content: {
            text: `Generated dApp: ${generatedDApp.name}`,
            type: 'dapp-generation',
            dapp: {
              id: generatedDApp.id,
              name: generatedDApp.name,
              type: generatedDApp.type,
              blockchain: generatedDApp.blockchain,
              contractAddress: generatedDApp.contract?.deploymentInfo?.address,
              urls: deploymentResult,
            },
          },
        },
        'dapps'
      );

      return {
        data: {
          actionName: 'GENERATE_DAPP',
          success: true,
          dappId: generatedDApp.id,
          contractAddress: generatedDApp.contract?.deploymentInfo?.address,
          frontendUrl: deploymentResult.frontendUrl,
          backendUrl: deploymentResult.backendUrl,
          demoUrl: deploymentResult.demoUrl,
          type: generatedDApp.type,
          blockchain: generatedDApp.blockchain,
        },
        values: {
          dappGenerated: true,
          contractDeployed: !!generatedDApp.contract?.deploymentInfo,
          frontendDeployed: !!deploymentResult.frontendUrl,
          backendDeployed: !!deploymentResult.backendUrl,
          demoAccessible: !!deploymentResult.demoUrl,
        },
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      elizaLogger.error('dApp generation failed', error);

      if (callback) {
        callback({
          text:
            `❌ **dApp Generation Failed**\n\n` +
            `**Error:** ${errorMessage}\n\n` +
            `Please try again with more specific requirements.`,
          content: {
            action: 'GENERATE_DAPP',
            status: 'failed',
            error: errorMessage,
          },
        });
      }

      return {
        data: {
          actionName: 'GENERATE_DAPP',
          success: false,
          error: errorMessage,
        },
        values: {
          dappGenerated: false,
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
          text: 'Build a full-stack NFT marketplace dApp with React frontend and Express backend',
        },
      },
      {
        name: '{{agent}}',
        content: {
          text: "I'll build a complete NFT marketplace dApp for you! This includes NFT and marketplace smart contracts, a React frontend with wallet integration, Express.js backend API, and deployment to live URLs you can share.",
          thought:
            'Full-stack dApp request requiring multiple components: NFT contract, marketplace contract, React frontend, Express backend, database integration, and complete deployment pipeline.',
          actions: ['GENERATE_DAPP'],
        },
      },
    ],
    [
      {
        name: '{{user}}',
        content: {
          text: 'Create a DeFi trading app on Base with portfolio tracking',
        },
      },
      {
        name: '{{agent}}',
        content: {
          text: "I'll create a comprehensive DeFi trading application on Base! This will include trading contracts, portfolio tracking, React frontend with real-time data, and API backend for analytics.",
          thought:
            'DeFi trading app needs: trading contracts, price feeds, portfolio logic, real-time frontend, backend API for data aggregation, and Base network integration.',
          actions: ['GENERATE_DAPP'],
        },
      },
    ],
    [
      {
        name: '{{user}}',
        content: {
          text: 'Build a Solana-based social media dApp with posting and tipping',
        },
      },
      {
        name: '{{agent}}',
        content: {
          text: "I'll build a decentralized social media platform on Solana! This includes posting contracts, tipping mechanisms, React frontend for social interactions, and backend for content management.",
          thought:
            'Solana social dApp requiring: posting program, tipping program, social graph logic, React frontend, backend for content indexing, and wallet integration.',
          actions: ['GENERATE_DAPP'],
        },
      },
    ],
  ],
};

async function parseDAppOptions(
  requirements: string,
  state: State,
  runtime: IAgentRuntime
): Promise<DAppGenerationOptions> {
  const analysisPrompt = `
Analyze the following dApp requirements and extract configuration:

Requirements: ${requirements}

Please provide the analysis in XML format:
<dapp_analysis>
<type>full-stack|frontend-only|contract-only</type>
<frontend>react|vue|svelte|vanilla</frontend>
<backend>express|fastify|bun|none</backend>
<blockchain>ethereum|base|arbitrum|polygon|solana</blockchain>
<styling>tailwind|mui|chakra|styled-components</styling>
<features>
  <feature>
    <name>Feature name</name>
    <description>Feature description</description>
  </feature>
</features>
<deployment>
  <frontend>vercel|netlify|subdomain</frontend>
  <backend>railway|render|subdomain</backend>
  <database>postgres|mongodb|supabase|none</database>
</deployment>
</dapp_analysis>
`;

  const response = await runtime.useModel(ModelType.TEXT_LARGE, {
    prompt: analysisPrompt,
  });

  const parsed = parseKeyValueXml(response);
  if (!parsed) {
    // Fallback to basic parsing
    return {
      type: 'full-stack',
      frontend: 'react',
      backend: 'express',
      blockchain: 'base',
      styling: 'tailwind',
      features: extractBasicFeatures(requirements),
      deployment: {
        frontend: 'subdomain',
        backend: 'subdomain',
        database: 'postgres',
      },
    };
  }

  return {
    type: parsed.type || 'full-stack',
    frontend: parsed.frontend || 'react',
    backend: parsed.backend === 'none' ? undefined : parsed.backend || 'express',
    blockchain: parsed.blockchain || 'base',
    styling: parsed.styling || 'tailwind',
    features: parseFeatures(parsed.features) || extractBasicFeatures(requirements),
    deployment: {
      frontend: parsed.deployment?.frontend || 'subdomain',
      backend: parsed.deployment?.backend || 'subdomain',
      database:
        parsed.deployment?.database === 'none'
          ? undefined
          : parsed.deployment?.database || 'postgres',
    },
  };
}

function parseFeatures(featuresXml: any): DAppFeature[] {
  if (!featuresXml || !Array.isArray(featuresXml.feature)) {
    return [];
  }

  return featuresXml.feature.map((f: any) => ({
    name: f.name || 'Unknown Feature',
    description: f.description || 'No description',
  }));
}

function extractBasicFeatures(requirements: string): DAppFeature[] {
  const features: DAppFeature[] = [];

  if (/nft|erc721|non.fungible/i.test(requirements)) {
    features.push({
      name: 'NFT Support',
      description: 'Mint, buy, sell, and transfer NFTs',
    });
  }

  if (/marketplace|trading|exchange/i.test(requirements)) {
    features.push({
      name: 'Marketplace',
      description: 'Trading and marketplace functionality',
    });
  }

  if (/staking|yield|farming/i.test(requirements)) {
    features.push({
      name: 'Staking/Yield',
      description: 'Staking and yield farming features',
    });
  }

  if (/governance|dao|voting/i.test(requirements)) {
    features.push({
      name: 'Governance',
      description: 'DAO governance and voting system',
    });
  }

  if (/social|post|tip|follow/i.test(requirements)) {
    features.push({
      name: 'Social Features',
      description: 'Social interactions and content sharing',
    });
  }

  if (/portfolio|dashboard|analytics/i.test(requirements)) {
    features.push({
      name: 'Portfolio Tracking',
      description: 'Portfolio and analytics dashboard',
    });
  }

  // Default feature if none detected
  if (features.length === 0) {
    features.push({
      name: 'Basic dApp',
      description: 'Core dApp functionality',
    });
  }

  return features;
}

function extractProjectName(requirements: string): string {
  // Try to extract project name from requirements
  const nameMatch = requirements.match(
    /(?:build|create|make)\s+(?:a\s+)?([^.]+?)(?:\s+(?:dapp|app|application|platform))/i
  );
  if (nameMatch) {
    return nameMatch[1].trim();
  }

  // Extract from feature keywords
  if (/nft.*marketplace/i.test(requirements)) return 'NFT Marketplace';
  if (/defi.*trading/i.test(requirements)) return 'DeFi Trading Platform';
  if (/social.*media/i.test(requirements)) return 'Social dApp';
  if (/yield.*farm/i.test(requirements)) return 'Yield Farm';
  if (/dao|governance/i.test(requirements)) return 'DAO Platform';

  return 'Custom dApp';
}

async function generateFullStackDApp(
  requirements: string,
  options: DAppGenerationOptions,
  state: State,
  runtime: IAgentRuntime,
  contractService: ContractGenerationService,
  e2bService: ImprovedE2BService
): Promise<GeneratedDApp> {
  const dappId = `dapp-${Date.now()}`;
  const projectName = extractProjectName(requirements);

  const dapp: GeneratedDApp = {
    id: dappId,
    name: projectName,
    description: requirements,
    type: options.type,
    blockchain: options.blockchain,
    metadata: {
      generatedAt: new Date(),
      requirements,
      features: options.features.map((f) => f.name),
    },
  };

  // Generate smart contract if needed
  if (options.type === 'full-stack' || options.type === 'contract-only') {
    const contractOptions = {
      blockchain: options.blockchain,
      contractType: 'custom' as const,
      compile: true,
      deploy: true,
      generateTestInterface: true,
      generateFrontend: false,
    };

    dapp.contract = await contractService.generateContract(requirements, contractOptions, state);
  }

  // Generate frontend if needed
  if (options.type === 'full-stack' || options.type === 'frontend-only') {
    dapp.frontend = await generateFrontend(dapp, options, e2bService, runtime);
  }

  // Generate backend if needed
  if (options.backend && options.backend !== 'none') {
    dapp.backend = await generateBackend(dapp, options, e2bService, runtime);
  }

  return dapp;
}

async function generateFrontend(
  dapp: GeneratedDApp,
  options: DAppGenerationOptions,
  e2bService: ImprovedE2BService,
  runtime: IAgentRuntime
): Promise<any> {
  const sandboxId = await e2bService.createSandbox({
    template: `${options.frontend}-frontend`,
    timeoutMs: 600000,
    envs: {
      FRAMEWORK: options.frontend,
      STYLING: options.styling,
      BLOCKCHAIN: options.blockchain,
    },
    metadata: {
      purpose: 'frontend-generation',
      framework: options.frontend,
    },
  });

  // Generate frontend code
  const frontendPrompt = `
Generate a complete ${options.frontend} frontend application for:

Project: ${dapp.name}
Description: ${dapp.description}
Blockchain: ${dapp.blockchain}
Styling: ${options.styling}
Features: ${options.features.map((f) => f.name).join(', ')}

${
  dapp.contract
    ? `Contract Address: ${dapp.contract.deploymentInfo?.address}
Contract ABI: ${JSON.stringify(dapp.contract.abi)}`
    : ''
}

Requirements:
- Modern, responsive design with ${options.styling}
- Wallet connection (MetaMask/Phantom)
- Complete contract interaction
- Error handling and loading states
- Dark/light mode toggle
- Mobile-first approach
- TypeScript support

Generate the complete project structure including:
- package.json with all dependencies
- vite.config.ts for build configuration
- All component files
- Styling files
- Utility functions
- Hooks for blockchain interaction

Make it production-ready and user-friendly.
`;

  const frontendCode = await runtime.useModel(ModelType.TEXT_LARGE, {
    prompt: frontendPrompt,
  });

  // Parse and write frontend files
  await setupFrontendProject(sandboxId, frontendCode, options, e2bService);

  return {
    framework: options.frontend,
    sourceCode: frontendCode,
    sandboxId,
    buildConfig: {
      bundler: 'vite',
      typescript: true,
      styling: options.styling,
    },
  };
}

async function generateBackend(
  dapp: GeneratedDApp,
  options: DAppGenerationOptions,
  e2bService: ImprovedE2BService,
  runtime: IAgentRuntime
): Promise<any> {
  const sandboxId = await e2bService.createSandbox({
    template: `${options.backend}-backend`,
    timeoutMs: 600000,
    envs: {
      FRAMEWORK: options.backend || 'express',
      DATABASE: options.deployment.database || 'postgres',
      BLOCKCHAIN: options.blockchain,
    },
    metadata: {
      purpose: 'backend-generation',
      framework: options.backend,
    },
  });

  const backendPrompt = `
Generate a complete ${options.backend} backend API for:

Project: ${dapp.name}
Description: ${dapp.description}
Database: ${options.deployment.database}
Features: ${options.features.map((f) => f.name).join(', ')}

Requirements:
- RESTful API design
- Database integration with ${options.deployment.database}
- Authentication and authorization
- Rate limiting and security
- CORS configuration
- Environment configuration
- Error handling middleware
- Logging and monitoring
- API documentation
- Docker configuration

Generate the complete backend with:
- package.json with dependencies
- Main server file
- Route handlers
- Database models/schemas
- Middleware functions
- Utility functions
- Configuration files
- Docker and deployment files

Make it production-ready and scalable.
`;

  const backendCode = await runtime.useModel(ModelType.TEXT_LARGE, {
    prompt: backendPrompt,
  });

  await setupBackendProject(sandboxId, backendCode, options, e2bService);

  return {
    framework: options.backend,
    sourceCode: backendCode,
    sandboxId,
    database: options.deployment.database
      ? {
          type: options.deployment.database,
        }
      : undefined,
  };
}

async function setupFrontendProject(
  sandboxId: string,
  code: string,
  options: DAppGenerationOptions,
  e2bService: ImprovedE2BService
): Promise<void> {
  // Setup script to create the frontend project
  const setupScript = `
import subprocess
import os
import json

def setup_frontend():
    try:
        # Create Vite project
        subprocess.run(['npm', 'create', 'vite@latest', 'frontend', '--template', '${options.frontend}-ts'], check=True)
        os.chdir('frontend')
        
        # Install additional dependencies
        deps = [
            'wagmi', 'viem', '@rainbow-me/rainbowkit',
            '@tailwindcss/forms', '@heroicons/react',
            'react-router-dom', '@types/react-router-dom',
            'zustand', 'react-query'
        ]
        
        subprocess.run(['npm', 'install'] + deps, check=True)
        
        # Configure Tailwind if needed
        if '${options.styling}' == 'tailwind':
            subprocess.run(['npm', 'install', '-D', 'tailwindcss', 'postcss', 'autoprefixer'], check=True)
            subprocess.run(['npx', 'tailwindcss', 'init', '-p'], check=True)
        
        print("Frontend project setup complete")
        
    except Exception as e:
        print(f"Setup error: {e}")

setup_frontend()
`;

  await e2bService.executeCode(setupScript, 'python');
}

async function setupBackendProject(
  sandboxId: string,
  code: string,
  options: DAppGenerationOptions,
  e2bService: ImprovedE2BService
): Promise<void> {
  const setupScript = `
import subprocess
import os

def setup_backend():
    try:
        # Create backend directory
        os.makedirs('backend', exist_ok=True)
        os.chdir('backend')
        
        # Initialize package.json
        subprocess.run(['npm', 'init', '-y'], check=True)
        
        # Install dependencies based on framework
        deps = ['cors', 'helmet', 'morgan', 'dotenv', 'joi']
        
        if '${options.backend}' == 'express':
            deps.extend(['express', '@types/express'])
        elif '${options.backend}' == 'fastify':
            deps.extend(['fastify', '@fastify/cors'])
        
        if '${options.deployment.database}' == 'postgres':
            deps.extend(['pg', '@types/pg', 'drizzle-orm'])
        elif '${options.deployment.database}' == 'mongodb':
            deps.extend(['mongoose'])
        
        subprocess.run(['npm', 'install'] + deps, check=True)
        subprocess.run(['npm', 'install', '-D', 'typescript', 'ts-node', '@types/node', 'nodemon'], check=True)
        
        print("Backend project setup complete")
        
    except Exception as e:
        print(f"Setup error: {e}")

setup_backend()
`;

  await e2bService.executeCode(setupScript, 'python');
}

async function deployDAppStack(
  dapp: GeneratedDApp,
  options: DAppGenerationOptions,
  e2bService: ImprovedE2BService,
  runtime: IAgentRuntime
): Promise<{
  frontendUrl?: string;
  backendUrl?: string;
  demoUrl?: string;
}> {
  const deploymentUrls: any = {};

  // For demo purposes, we'll use the sandbox URLs
  // In production, this would deploy to actual hosting services

  if (dapp.frontend) {
    // Build and serve frontend
    const frontendBuildScript = `
cd frontend
npm run build
python -m http.server 3000 --directory dist &
echo "Frontend served on port 3000"
`;

    await e2bService.executeCode(frontendBuildScript, 'bash');
    deploymentUrls.frontendUrl = `https://demo-${dapp.name.toLowerCase().replace(/\s+/g, '-')}-frontend.e2b.dev`;
    deploymentUrls.demoUrl = deploymentUrls.frontendUrl;
  }

  if (dapp.backend) {
    // Start backend server
    const backendStartScript = `
cd backend
npm run build
npm start &
echo "Backend started on port 3001"
`;

    await e2bService.executeCode(backendStartScript, 'bash');
    deploymentUrls.backendUrl = `https://demo-${dapp.name.toLowerCase().replace(/\s+/g, '-')}-backend.e2b.dev`;
  }

  return deploymentUrls;
}
