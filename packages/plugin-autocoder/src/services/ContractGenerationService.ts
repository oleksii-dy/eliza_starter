import {
  type IAgentRuntime,
  type Memory,
  type State,
  Service,
  elizaLogger,
  ModelType,
  composePromptFromState,
  parseKeyValueXml,
} from '@elizaos/core';
// Local type definition for ImprovedE2BService
interface ImprovedE2BService {
  createSandbox(options: any): Promise<string>;
  runCommandInSandbox(sandboxId: string, command: string): Promise<any>;
  writeFileToSandbox(sandboxId: string, path: string, content: string): Promise<void>;
  readFileFromSandbox(sandboxId: string, path: string): Promise<string>;
  closeSandbox(sandboxId: string): Promise<void>;
}
import { ContractCompiler } from '../utils/ContractCompiler.ts';
import { ContractDeployer } from '../utils/ContractDeployer.ts';
import { type ContractGenerationOptions, type GeneratedContract } from '../types/contracts.ts';

/**
 * Smart Contract Generation Service
 * Handles EVM and SVM contract generation, compilation, and deployment
 */
export class ContractGenerationService extends Service {
  static serviceName = 'contract-generation';
  static serviceType = 'contract-generation';

  private e2bService: ImprovedE2BService | null = null;
  private compiler: ContractCompiler;
  private deployer: ContractDeployer;

  get capabilityDescription(): string {
    return 'Generates, compiles, and deploys smart contracts for EVM and SVM blockchains';
  }

  constructor(runtime: IAgentRuntime) {
    super(runtime);
    this.compiler = new ContractCompiler(runtime);
    this.deployer = new ContractDeployer(runtime);
  }

  static async start(runtime: IAgentRuntime): Promise<ContractGenerationService> {
    const service = new ContractGenerationService(runtime);
    await service.initialize();
    return service;
  }

  async initialize(): Promise<void> {
    try {
      elizaLogger.info('Initializing Contract Generation Service');
      
      // Get E2B service
      this.e2bService = this.runtime.getService('e2b') as ImprovedE2BService;
      if (!this.e2bService) {
        elizaLogger.warn('E2B service not found - contract execution will be limited');
      }

      await this.compiler.initialize();
      await this.deployer.initialize();

      elizaLogger.info('Contract Generation Service initialized successfully');
    } catch (error) {
      elizaLogger.error('Failed to initialize Contract Generation Service', error);
      throw error;
    }
  }

  async stop(): Promise<void> {
    elizaLogger.info('Stopping Contract Generation Service');
    await this.compiler.stop();
    await this.deployer.stop();
  }

  /**
   * Generate a smart contract based on user requirements
   */
  async generateContract(
    requirements: string,
    options: ContractGenerationOptions,
    state: State
  ): Promise<GeneratedContract> {
    try {
      elizaLogger.info('Generating contract', { 
        blockchain: options.blockchain,
        contractType: options.contractType 
      });

      // Analyze requirements and determine contract type
      const contractSpec = await this.analyzeRequirements(requirements, options, state);

      // Generate contract code based on blockchain type
      const contractCode = await this.generateContractCode(contractSpec, options);

      // Create test interface if requested
      const testInterface = options.generateTestInterface 
        ? await this.generateTestInterface(contractSpec, contractCode)
        : null;

      // Create frontend if requested
      const frontend = options.generateFrontend
        ? await this.generateFrontend(contractSpec, contractCode)
        : null;

      const result: GeneratedContract = {
        id: `contract-${Date.now()}`,
        name: contractSpec.name,
        description: contractSpec.description,
        blockchain: options.blockchain,
        contractType: options.contractType,
        sourceCode: contractCode,
        abi: null, // Will be populated after compilation
        bytecode: null, // Will be populated after compilation
        testInterface,
        frontend,
        metadata: {
          requirements,
          generatedAt: new Date(),
          compiler: options.blockchain === 'solana' ? 'anchor' : 'solc',
        },
      };

      // Compile the contract
      if (options.compile) {
        const compiled = await this.compiler.compile(result);
        result.abi = compiled.abi;
        result.bytecode = compiled.bytecode;
        result.compilationArtifacts = compiled.artifacts;
      }

      // Deploy if requested
      if (options.deploy && result.bytecode) {
        const deployment = await this.deployer.deploy(result, options.deploymentConfig);
        result.deploymentInfo = deployment;
      }

      elizaLogger.info('Contract generated successfully', { 
        contractId: result.id,
        hasTestInterface: !!testInterface,
        hasFrontend: !!frontend,
        compiled: !!result.abi,
        deployed: !!result.deploymentInfo
      });

      return result;
    } catch (error) {
      elizaLogger.error('Failed to generate contract', error);
      throw error;
    }
  }

  /**
   * Create an E2B sandbox with contract development environment
   */
  async createContractSandbox(options: ContractGenerationOptions): Promise<string> {
    if (!this.e2bService) {
      throw new Error('E2B service not available');
    }

    const template = options.blockchain === 'solana' 
      ? 'solana-contract-dev'
      : 'evm-contract-dev';

    const sandboxId = await this.e2bService.createSandbox({
      template,
      timeoutMs: 600000, // 10 minutes
      envs: {
        BLOCKCHAIN: options.blockchain,
        NETWORK: options.network || 'testnet',
      },
      metadata: {
        purpose: 'contract-development',
        blockchain: options.blockchain,
        contractType: options.contractType,
      },
    });

    elizaLogger.info('Contract development sandbox created', { 
      sandboxId, 
      template,
      blockchain: options.blockchain 
    });

    return sandboxId;
  }

  /**
   * Deploy contract and create interactive demo
   */
  async deployWithDemo(
    contract: GeneratedContract,
    options: ContractGenerationOptions
  ): Promise<{ deploymentInfo: any; demoUrl: string }> {
    try {
      // Deploy the contract
      const deploymentInfo = await this.deployer.deploy(contract, options.deploymentConfig);
      
      // Create E2B sandbox for demo
      const sandboxId = await this.createContractSandbox(options);
      
      // Set up demo environment
      await this.setupDemoEnvironment(sandboxId, contract, deploymentInfo);
      
      // Generate demo URL (assuming subdomain deployment)
      const demoUrl = `https://${sandboxId}-demo.e2b.dev`;
      
      elizaLogger.info('Contract deployed with demo', { 
        contractAddress: deploymentInfo.address,
        demoUrl,
        sandboxId 
      });

      return { deploymentInfo, demoUrl };
    } catch (error) {
      elizaLogger.error('Failed to deploy contract with demo', error);
      throw error;
    }
  }

  private async analyzeRequirements(
    requirements: string,
    options: ContractGenerationOptions,
    state: State
  ): Promise<any> {
    try {
      elizaLogger.info('Starting AI-powered requirements analysis', {
        contractType: options.contractType,
        blockchain: options.blockchain,
        requirementsLength: requirements.length
      });

      const analysisPrompt = `
You are a senior blockchain architect tasked with analyzing smart contract requirements. Provide a comprehensive technical analysis.

REQUIREMENTS TO ANALYZE:
${requirements}

PROJECT CONTEXT:
- Blockchain: ${options.blockchain}
- Contract Type: ${options.contractType}
- Network: ${options.network || 'mainnet'}

ANALYSIS OBJECTIVES:
1. Extract technical specifications and business logic requirements
2. Identify security considerations and potential vulnerabilities
3. Determine complexity level and development effort
4. Suggest optimal architecture patterns and design decisions
5. Identify required integrations and dependencies

Please provide a detailed analysis in XML format:
<contract_analysis>
<name>Suggested contract name (PascalCase, descriptive)</name>
<description>Comprehensive technical description of the contract's purpose and functionality</description>
<functions>
  <function name="functionName" type="view|pure|payable|nonpayable" access="public|private|internal|external">
    Description of function purpose and logic
    Parameters: param1 (type), param2 (type)
    Returns: returnType
    Security considerations: any specific security requirements
  </function>
  <!-- Repeat for all required functions -->
</functions>
<storage>
  <variable name="variableName" type="dataType" visibility="public|private|internal">
    Purpose and usage description
    Initial value or calculation logic
  </variable>
  <!-- Repeat for all state variables -->
</storage>
<events>
  <event name="EventName">
    Description and when it should be emitted
    Parameters: param1 (indexed type), param2 (type)
  </event>
  <!-- Repeat for all events -->
</events>
<security_considerations>
  <consideration type="reentrancy|access_control|overflow|etc">
    Specific security requirement and how to address it
  </consideration>
  <!-- Repeat for all security considerations -->
</security_considerations>
<complexity>simple|medium|complex</complexity>
<architecture_patterns>
  List of recommended design patterns (proxy, factory, registry, etc.)
</architecture_patterns>
<dependencies>
  List of required external libraries or contracts (OpenZeppelin, Chainlink, etc.)
</dependencies>
<gas_optimization>
  Specific areas where gas optimization is critical
</gas_optimization>
<testing_strategy>
  Key areas that require comprehensive testing
</testing_strategy>
</contract_analysis>

IMPORTANT: Ensure all technical details are accurate and follow current best practices for ${options.blockchain} development.
`;

      const response = await this.runtime.useModel(ModelType.TEXT_LARGE, {
        prompt: analysisPrompt,
        temperature: 0.2, // Lower temperature for more structured analysis
        maxTokens: 3000,
      });

      elizaLogger.debug('AI analysis response received', { 
        responseLength: response.length 
      });

      const parsed = parseKeyValueXml(response);
      if (!parsed) {
        elizaLogger.warn('Failed to parse XML analysis, attempting fallback parsing');
        
        // Fallback: try to extract basic information using regex
        const fallbackAnalysis = this.parseAnalysisFallback(response, requirements, options);
        return fallbackAnalysis;
      }

      // Enhance parsed analysis with additional computed fields
      const enhancedAnalysis = {
        ...parsed,
        estimatedComplexity: this.calculateComplexity(parsed, requirements),
        recommendedToolchain: this.getRecommendedToolchain(options.blockchain, parsed),
        estimatedDevelopmentTime: this.estimateDevelopmentTime(parsed),
        criticalSecurityAreas: this.identifyCriticalSecurityAreas(parsed, options.contractType),
      };

      elizaLogger.info('Requirements analysis completed successfully', {
        contractName: enhancedAnalysis.name,
        complexity: enhancedAnalysis.complexity,
        functionsCount: enhancedAnalysis.functions ? Object.keys(enhancedAnalysis.functions).length : 0,
        securityConsiderations: enhancedAnalysis.security_considerations ? Object.keys(enhancedAnalysis.security_considerations).length : 0
      });

      return enhancedAnalysis;
    } catch (error) {
      elizaLogger.error('Requirements analysis failed', error);
      
      // Provide a basic fallback analysis
      return this.createFallbackAnalysis(requirements, options);
    }
  }

  private parseAnalysisFallback(response: string, requirements: string, options: ContractGenerationOptions): any {
    // Extract basic information using regex patterns
    const nameMatch = response.match(/name[>:]\s*([^<\n]+)/i);
    const descriptionMatch = response.match(/description[>:]\s*([^<\n]+)/i);
    const complexityMatch = response.match(/complexity[>:]\s*(simple|medium|complex)/i);

    return {
      name: nameMatch?.[1]?.trim() || this.generateDefaultContractName(options.contractType),
      description: descriptionMatch?.[1]?.trim() || `A ${options.contractType} contract for ${options.blockchain}`,
      complexity: complexityMatch?.[1]?.toLowerCase() || 'medium',
      functions: `Core ${options.contractType} functions`,
      storage: `State variables for ${options.contractType} functionality`,
      events: `Events for ${options.contractType} operations`,
      security_considerations: `Standard ${options.contractType} security requirements`,
    };
  }

  private createFallbackAnalysis(requirements: string, options: ContractGenerationOptions): any {
    return {
      name: this.generateDefaultContractName(options.contractType),
      description: `Auto-generated ${options.contractType} contract based on requirements`,
      complexity: requirements.length > 500 ? 'complex' : requirements.length > 200 ? 'medium' : 'simple',
      functions: `Standard ${options.contractType} functions`,
      storage: `Required state variables`,
      events: `Standard events`,
      security_considerations: `Security best practices`,
      estimatedComplexity: 'medium',
      recommendedToolchain: options.blockchain === 'solana' ? 'anchor' : 'hardhat',
      estimatedDevelopmentTime: '1-2 weeks',
      criticalSecurityAreas: ['access control', 'input validation'],
    };
  }

  private generateDefaultContractName(contractType: string): string {
    const typeMap: Record<string, string> = {
      'erc20': 'CustomToken',
      'token': 'CustomToken',
      'erc721': 'CustomNFT',
      'nft': 'CustomNFT',
      'erc1155': 'MultiToken',
      'dao': 'DAOGovernance',
      'governance': 'GovernanceContract',
      'defi': 'DeFiProtocol',
      'marketplace': 'NFTMarketplace',
      'staking': 'StakingPool',
      'bridge': 'CrossChainBridge',
    };

    return typeMap[contractType.toLowerCase()] || 'CustomContract';
  }

  private calculateComplexity(analysis: any, requirements: string): string {
    let score = 0;

    // Base complexity from requirements length
    if (requirements.length > 1000) score += 3;
    else if (requirements.length > 500) score += 2;
    else score += 1;

    // Function complexity
    if (analysis.functions && typeof analysis.functions === 'object') {
      score += Object.keys(analysis.functions).length;
    }

    // Security considerations complexity
    if (analysis.security_considerations && typeof analysis.security_considerations === 'object') {
      score += Object.keys(analysis.security_considerations).length;
    }

    if (score > 8) return 'complex';
    if (score > 4) return 'medium';
    return 'simple';
  }

  private getRecommendedToolchain(blockchain: string, analysis: any): string {
    if (blockchain === 'solana') {
      return 'anchor';
    }

    // For EVM chains, recommend based on complexity
    const complexity = analysis.complexity || 'medium';
    if (complexity === 'complex') {
      return 'hardhat'; // Better for complex projects
    }
    return 'foundry'; // Faster for simpler projects
  }

  private estimateDevelopmentTime(analysis: any): string {
    const complexity = analysis.complexity || 'medium';
    const functionCount = analysis.functions ? Object.keys(analysis.functions).length : 5;

    if (complexity === 'complex' || functionCount > 10) {
      return '2-4 weeks';
    } else if (complexity === 'medium' || functionCount > 5) {
      return '1-2 weeks';
    }
    return '3-7 days';
  }

  private identifyCriticalSecurityAreas(analysis: any, contractType: string): string[] {
    const baseAreas = ['access control', 'input validation', 'reentrancy protection'];
    
    const typeSpecificAreas: Record<string, string[]> = {
      'erc20': ['transfer restrictions', 'approval race conditions'],
      'erc721': ['metadata validation', 'minting authorization'],
      'defi': ['oracle manipulation', 'flash loan attacks', 'slippage protection'],
      'dao': ['proposal validation', 'vote manipulation', 'timelock bypass'],
      'marketplace': ['escrow security', 'fee calculation', 'dispute resolution'],
      'bridge': ['message verification', 'validator consensus', 'fund security'],
    };

    return [...baseAreas, ...(typeSpecificAreas[contractType.toLowerCase()] || [])];
  }

  private formatAnalysisSection(data: any, sectionName: string): string {
    if (!data) {
      return `${sectionName}: Not specified`;
    }

    if (typeof data === 'string') {
      return `${sectionName}: ${data}`;
    }

    if (typeof data === 'object') {
      if (Array.isArray(data)) {
        return `${sectionName}:\n${data.map(item => `- ${item}`).join('\n')}`;
      } else {
        // Handle object format from XML parsing
        const entries = Object.entries(data);
        if (entries.length === 0) {
          return `${sectionName}: Not specified`;
        }
        
        return `${sectionName}:\n${entries.map(([key, value]) => {
          if (typeof value === 'object' && value !== null) {
            // Handle nested objects (like function definitions)
            const nestedEntries = Object.entries(value);
            return `- ${key}:\n${nestedEntries.map(([k, v]) => `  ${k}: ${v}`).join('\n')}`;
          }
          return `- ${key}: ${value}`;
        }).join('\n')}`;
      }
    }

    return `${sectionName}: ${String(data)}`;
  }

  private async generateContractCode(
    contractSpec: any,
    options: ContractGenerationOptions
  ): Promise<string> {
    elizaLogger.info('Generating contract code with AI', { 
      blockchain: options.blockchain,
      contractType: options.contractType,
      complexity: contractSpec.complexity 
    });

    if (options.blockchain === 'solana') {
      return this.generateSolanaContract(contractSpec, options);
    } else {
      return this.generateEVMContract(contractSpec, options);
    }
  }

  private async generateEVMContract(
    contractSpec: any,
    options: ContractGenerationOptions
  ): Promise<string> {
    try {
      elizaLogger.info('Starting EVM contract generation with enhanced AI prompt');

      const contractPrompt = `
You are a senior Solidity architect tasked with creating a production-ready smart contract. Generate a complete, secure, and gas-optimized smart contract using the following comprehensive analysis:

CONTRACT SPECIFICATIONS:
- Name: ${contractSpec.name}
- Description: ${contractSpec.description}
- Type: ${options.contractType}
- Network: ${options.network || 'base'}
- Complexity: ${contractSpec.complexity || contractSpec.estimatedComplexity || 'medium'}
- Recommended Toolchain: ${contractSpec.recommendedToolchain || 'hardhat'}
- Estimated Development Time: ${contractSpec.estimatedDevelopmentTime || '1-2 weeks'}

DETAILED FUNCTIONAL REQUIREMENTS:
${this.formatAnalysisSection(contractSpec.functions, 'Functions')}
${this.formatAnalysisSection(contractSpec.storage, 'State Variables')}
${this.formatAnalysisSection(contractSpec.events, 'Events')}

ARCHITECTURE & DESIGN PATTERNS:
${contractSpec.architecture_patterns ? `Recommended patterns: ${contractSpec.architecture_patterns}` : 'Use standard contract patterns'}

DEPENDENCIES & INTEGRATIONS:
${contractSpec.dependencies ? `Required dependencies: ${contractSpec.dependencies}` : 'Use OpenZeppelin for standard implementations'}

SECURITY REQUIREMENTS (CRITICAL):
${this.formatAnalysisSection(contractSpec.security_considerations, 'Security Considerations')}
Critical Security Areas: ${contractSpec.criticalSecurityAreas ? contractSpec.criticalSecurityAreas.join(', ') : 'Standard security practices'}

GAS OPTIMIZATION REQUIREMENTS:
${contractSpec.gas_optimization ? `Gas optimization focus: ${contractSpec.gas_optimization}` : 'Optimize for common operations'}

TESTING STRATEGY:
${contractSpec.testing_strategy ? `Testing focus areas: ${contractSpec.testing_strategy}` : 'Comprehensive unit and integration testing'}

TECHNICAL REQUIREMENTS:
- Use Solidity ^0.8.19 or later with latest security features
- Include comprehensive error handling with custom errors for gas efficiency
- Implement proper access controls using OpenZeppelin AccessControl or Ownable2Step
- Add complete NatSpec documentation (@title, @notice, @dev, @param, @return)
- Follow CEI (Checks-Effects-Interactions) pattern religiously
- Implement reentrancy guards using OpenZeppelin ReentrancyGuard
- Use built-in SafeMath operations (Solidity 0.8+)
- Optimize for gas efficiency with struct packing and storage layout
- Include proper event emissions for all state changes
- Add comprehensive input validation for all public/external functions
- Implement proper upgrade mechanisms if specified (proxy patterns)
- Use assembly for gas optimization where appropriate and safe

CONTRACT TYPE SPECIFIC REQUIREMENTS:
${this.getContractTypeRequirements(options.contractType)}

CODE GENERATION REQUIREMENTS:
- Include all necessary imports (prefer OpenZeppelin implementations)
- Implement ALL required functions with complete, production-ready logic
- Add proper constructor with comprehensive initialization
- Include ALL events and custom error definitions
- Add comprehensive NatSpec documentation
- Make it production-ready (NO TODO comments, placeholders, or unimplemented functions)
- Follow latest Solidity style guide and best practices
- Include proper SPDX license identifier
- Use meaningful variable and function names
- Implement proper state transitions and validation

SECURITY CHECKLIST (MUST IMPLEMENT ALL):
✓ Access control with role-based permissions
✓ Reentrancy protection on all state-changing functions
✓ Input validation with proper bounds checking
✓ Integer overflow/underflow protection
✓ Front-running protection where applicable
✓ Flash loan attack protection for DeFi contracts
✓ Oracle manipulation protection if using price feeds
✓ Pause functionality for emergency stops
✓ Time-based attack protection (no block.timestamp dependencies for critical logic)
✓ Proper event emission for transparency

Return ONLY the complete Solidity contract code without any explanations, markdown formatting, or comments outside the code.
`;

      const response = await this.runtime.useModel(ModelType.TEXT_LARGE, {
        prompt: contractPrompt,
        temperature: 0.3, // More deterministic for code generation
        maxTokens: 4000,
      });

      const cleanedCode = this.cleanupContractCode(response, 'solidity');
      
      elizaLogger.info('EVM contract code generated successfully', {
        codeLength: cleanedCode.length,
        linesOfCode: cleanedCode.split('\n').length
      });

      return cleanedCode;
    } catch (error) {
      elizaLogger.error('Failed to generate EVM contract', error);
      throw new Error(`EVM contract generation failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  private async generateSolanaContract(
    contractSpec: any,
    options: ContractGenerationOptions
  ): Promise<string> {
    try {
      elizaLogger.info('Starting Solana contract generation with enhanced AI prompt');

      const contractPrompt = `
You are a senior Solana/Anchor architect tasked with creating a production-ready Solana program. Generate a complete, secure, and compute-optimized Anchor program using the following comprehensive analysis:

PROGRAM SPECIFICATIONS:
- Name: ${contractSpec.name}
- Description: ${contractSpec.description}
- Type: ${options.contractType}
- Complexity: ${contractSpec.complexity || contractSpec.estimatedComplexity || 'medium'}
- Recommended Toolchain: ${contractSpec.recommendedToolchain || 'anchor'}
- Estimated Development Time: ${contractSpec.estimatedDevelopmentTime || '1-2 weeks'}

DETAILED FUNCTIONAL REQUIREMENTS:
${this.formatAnalysisSection(contractSpec.functions, 'Instructions/Functions')}
${this.formatAnalysisSection(contractSpec.storage, 'Account Structures')}
${this.formatAnalysisSection(contractSpec.events, 'Events/Logs')}

ARCHITECTURE & DESIGN PATTERNS:
${contractSpec.architecture_patterns ? `Recommended patterns: ${contractSpec.architecture_patterns}` : 'Use standard Solana program patterns'}

DEPENDENCIES & INTEGRATIONS:
${contractSpec.dependencies ? `Required dependencies: ${contractSpec.dependencies}` : 'Use anchor-lang and anchor-spl for standard implementations'}

SECURITY REQUIREMENTS (CRITICAL):
${this.formatAnalysisSection(contractSpec.security_considerations, 'Security Considerations')}
Critical Security Areas: ${contractSpec.criticalSecurityAreas ? contractSpec.criticalSecurityAreas.join(', ') : 'Standard Solana security practices'}

COMPUTE UNIT OPTIMIZATION REQUIREMENTS:
${contractSpec.gas_optimization ? `CU optimization focus: ${contractSpec.gas_optimization}` : 'Optimize for common instruction costs'}

TESTING STRATEGY:
${contractSpec.testing_strategy ? `Testing focus areas: ${contractSpec.testing_strategy}` : 'Comprehensive instruction and integration testing'}

TECHNICAL REQUIREMENTS:
- Use Anchor framework ^0.29.0 with latest security features
- Include comprehensive error handling with custom error codes and messages
- Implement proper account validation using Anchor constraints
- Add complete documentation for all instructions, accounts, and data structures
- Follow Solana best practices for account management and PDA usage
- Optimize for compute unit (CU) consumption with efficient algorithms
- Use proper PDA (Program Derived Address) patterns with deterministic seeds
- Include proper signer verification and authority checks
- Add comprehensive input validation for all instruction parameters
- Implement proper account size calculations with rent exemption
- Use proper Anchor attributes and macros for security and efficiency
- Implement proper state transitions and account lifecycle management

PROGRAM TYPE SPECIFIC REQUIREMENTS:
${this.getSolanaContractTypeRequirements(options.contractType)}

ANCHOR PROGRAM STRUCTURE REQUIREMENTS:
- Include proper use statements (anchor_lang::prelude::*, anchor_spl, etc.)
- Define all necessary account structures with proper Anchor constraints
- Implement instruction handlers with comprehensive error handling
- Add proper account validation macros (#[account(init, mut, close, etc.)])
- Include proper borsh serialization with #[derive(AnchorSerialize, AnchorDeserialize)]
- Add proper space calculations for all account types
- Use appropriate Anchor attributes (#[program], #[derive], #[account], etc.)
- Implement proper PDA derivation with seeds and bump parameters
- Include proper rent exemption handling

CODE GENERATION REQUIREMENTS:
- Include ALL necessary use statements and imports
- Define ALL account structures with complete Anchor constraints
- Implement ALL instruction handlers with complete, production-ready logic
- Add ALL custom error definitions with descriptive messages
- Include comprehensive documentation with /// comments
- Add proper space calculations and rent exemption for all accounts
- Make it production-ready (NO TODO comments, placeholders, or unimplemented functions)
- Follow latest Anchor style guide and best practices
- Use meaningful account and instruction names
- Implement proper state validation and transitions

SECURITY CHECKLIST (MUST IMPLEMENT ALL):
✓ Account ownership validation using Anchor constraints
✓ Signer verification for all critical operations
✓ Input validation with proper bounds checking
✓ PDA derivation security with proper seeds
✓ Account size validation and rent exemption
✓ Authority checks for privileged operations
✓ Proper account closure and fund recovery
✓ Integer overflow/underflow protection
✓ Compute budget optimization to prevent timeouts
✓ Proper event emission for transparency and monitoring

Return ONLY the complete Rust/Anchor program code for lib.rs without any explanations, markdown formatting, or comments outside the code.
`;

      const response = await this.runtime.useModel(ModelType.TEXT_LARGE, {
        prompt: contractPrompt,
        temperature: 0.3, // More deterministic for code generation
        maxTokens: 4000,
      });

      const cleanedCode = this.cleanupContractCode(response, 'rust');
      
      elizaLogger.info('Solana contract code generated successfully', {
        codeLength: cleanedCode.length,
        linesOfCode: cleanedCode.split('\n').length
      });

      return cleanedCode;
    } catch (error) {
      elizaLogger.error('Failed to generate Solana contract', error);
      throw new Error(`Solana contract generation failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  private async generateTestInterface(
    contractSpec: any,
    contractCode: string
  ): Promise<string> {
    const testPrompt = `
Generate a comprehensive test interface for the following smart contract:

Contract Code:
${contractCode}

Create an HTML/JavaScript interface that allows users to:
- Connect their wallet
- Call all public functions
- View contract state
- See transaction results
- Handle errors gracefully

The interface should be modern, responsive, and user-friendly.
Include proper wallet connection (MetaMask/Phantom).
Generate complete HTML with embedded CSS and JavaScript.
`;

    const response = await this.runtime.useModel(ModelType.TEXT_LARGE, {
      prompt: testPrompt,
    });

    return response;
  }

  private async generateFrontend(
    contractSpec: any,
    contractCode: string
  ): Promise<string> {
    const frontendPrompt = `
Generate a complete React frontend application for the following smart contract:

Contract: ${contractSpec.name}
Description: ${contractSpec.description}
Code:
${contractCode}

Create a modern React application with:
- Vite build setup
- TypeScript support
- Wallet connection
- Contract interaction hooks
- Responsive UI with Tailwind CSS
- Error handling and loading states
- Transaction history
- Dark/light mode toggle

Generate the complete project structure with all necessary files.
`;

    const response = await this.runtime.useModel(ModelType.TEXT_LARGE, {
      prompt: frontendPrompt,
    });

    return response;
  }

  private cleanupContractCode(code: string, language: string): string {
    // Remove markdown code blocks if present
    let cleaned = code.replace(/```[\w]*\n?/g, '').trim();
    
    // Remove any explanation text before/after code
    if (language === 'solidity') {
      const match = cleaned.match(/pragma solidity[\s\S]*?(?=\n\n[A-Z]|$)/);
      if (match) {
        cleaned = match[0];
      }
    } else if (language === 'rust') {
      const match = cleaned.match(/use[\s\S]*?(?=\n\n[A-Z]|$)/);
      if (match) {
        cleaned = match[0];
      }
    }

    return cleaned;
  }

  private getContractTypeRequirements(contractType: string): string {
    switch (contractType.toLowerCase()) {
      case 'erc20':
      case 'token':
        return `
ERC20 TOKEN REQUIREMENTS:
- Implement OpenZeppelin ERC20 standard with latest security patterns
- Include proper mint/burn functionality with role-based access control
- Add pause/unpause functionality for emergency stops using Pausable
- Implement proper access controls using AccessControl or Ownable2Step
- Include transfer restrictions with whitelisting/blacklisting if specified
- Add proper decimals handling (default 18, configurable in constructor)
- Implement proper allowance mechanisms with race condition protection
- Include comprehensive event emissions for all state changes
- Add protection against common ERC20 vulnerabilities (reentrancy, overflow)
- Implement supply caps and rate limiting for minting if applicable
- Add metadata functions (name, symbol, decimals) as immutable where possible
- Include proper permit functionality (EIP-2612) for gasless approvals`;

      case 'erc721':
      case 'nft':
        return `
ERC721 NFT REQUIREMENTS:
- Implement OpenZeppelin ERC721 standard with extensions (Enumerable, URIStorage)
- Include metadata URI functionality with IPFS integration patterns
- Add enumerable extension for efficient token discovery
- Implement proper minting with configurable supply limits and phases
- Add royalty functionality (EIP-2981) with configurable rates and recipients
- Include proper access controls using AccessControl for different minting roles
- Add reveal/unrevealed functionality with provenance and randomness
- Implement proper batch operations for gas efficiency (ERC721A patterns)
- Include marketplace compatibility (opensea-compatible metadata)
- Add transfer restrictions and operator filtering if required
- Implement proper burning mechanisms with supply tracking
- Include whitelist/presale functionality with merkle proofs`;

      case 'erc1155':
      case 'multi-token':
        return `
ERC1155 MULTI-TOKEN REQUIREMENTS:
- Implement OpenZeppelin ERC1155 standard with proper batch operations
- Include URI management with token-specific and global URI patterns
- Add supply tracking and caps for each token type
- Implement proper minting with role-based access for different token types
- Add burning functionality with supply adjustment
- Include royalty support (EIP-2981) with per-token configuration
- Implement proper access controls for different operations
- Add metadata management with IPFS integration
- Include marketplace compatibility and operator filtering
- Implement proper batch transfer optimizations`;

      case 'dao':
      case 'governance':
        return `
DAO/GOVERNANCE REQUIREMENTS:
- Implement OpenZeppelin Governor standard (GovernorCountingSimple, GovernorVotes)
- Include proposal creation with proper threshold and delay mechanisms
- Add timelock functionality (TimelockController) for execution delays
- Implement configurable quorum requirements with participation incentives
- Add delegation functionality with vote weight calculations
- Include execution mechanisms for passed proposals with batch execution
- Add proper access controls for proposers, voters, and executors
- Implement vote counting with support for For/Against/Abstain
- Include emergency functions with multisig requirements for critical situations
- Add proposal lifecycle management (pending, active, succeeded, executed, etc.)
- Implement proper vote token integration with snapshot mechanisms
- Include treasury management with multi-signature requirements`;

      case 'defi':
      case 'lending':
      case 'yield':
        return `
DEFI REQUIREMENTS:
- Implement proper oracle integration with Chainlink price feeds and fallbacks
- Add slippage protection with configurable tolerance and MEV protection
- Include proper liquidity calculations with bonding curves where applicable
- Add flash loan protection and reentrancy guards throughout
- Implement proper reward distribution with vesting and claiming mechanisms
- Include emergency pause functionality with role-based access
- Add proper interest rate calculations with compounding and time-based accrual
- Implement proper collateralization ratios with liquidation thresholds
- Include liquidation mechanisms with incentives and partial liquidations
- Add yield farming with reward token distribution and staking
- Implement proper fee collection and distribution to stakeholders
- Include position management with health factor calculations`;

      case 'marketplace':
      case 'exchange':
        return `
MARKETPLACE REQUIREMENTS:
- Implement secure escrow mechanisms with dispute resolution
- Add proper fee calculation and distribution to multiple parties
- Include dispute resolution functionality with arbitration
- Add proper listing and delisting mechanisms with metadata validation
- Implement batch operations for efficient bulk operations
- Include proper access controls for buyers, sellers, and administrators
- Add reputation/rating systems with weighted scoring
- Implement proper order matching with price improvement algorithms
- Include proper settlement and withdrawal functions with delayed execution
- Add support for multiple payment tokens and fee structures
- Implement auction mechanisms (Dutch, English) with proper bidding
- Include trade history and analytics for transparency`;

      case 'bridge':
      case 'cross-chain':
        return `
BRIDGE/CROSS-CHAIN REQUIREMENTS:
- Implement secure cross-chain messaging with proper validation
- Add multi-signature verification for bridge operations
- Include proper token locking/minting mechanisms on both sides
- Add fraud proof mechanisms and dispute resolution
- Implement proper fee structures for bridge operations
- Include rate limiting and daily/weekly caps for security
- Add emergency pause functionality with cross-chain coordination
- Implement proper validator management and reward distribution
- Include slashing mechanisms for malicious validators
- Add proper event emission for cross-chain monitoring`;

      case 'staking':
      case 'validator':
        return `
STAKING REQUIREMENTS:
- Implement staking pools with proper reward distribution
- Add delegation mechanisms with commission structures
- Include slashing conditions for malicious behavior
- Add unstaking periods with proper withdrawal queues
- Implement reward calculation with accurate time-weighted returns
- Include validator registration and management
- Add penalty mechanisms for downtime or misbehavior
- Implement proper governance integration for parameter changes
- Include emergency unstaking with penalty mechanisms
- Add compound staking with auto-reinvestment options`;

      default:
        return `
GENERAL CONTRACT REQUIREMENTS:
- Follow latest Solidity best practices and security patterns
- Implement comprehensive access controls with role-based permissions
- Add extensive error handling with custom errors for gas efficiency
- Include detailed event emissions for all state changes and operations
- Add thorough security checks and input validations
- Implement gas-efficient patterns and optimization techniques
- Include proper state management with minimal storage operations
- Add upgrade mechanisms (proxy patterns) if future upgrades needed
- Implement proper documentation with NatSpec for all functions
- Include circuit breakers and emergency stops for critical functions
- Add comprehensive testing coverage with edge case handling
- Implement proper integration with common DeFi protocols and standards`;
    }
  }

  private getSolanaContractTypeRequirements(contractType: string): string {
    switch (contractType.toLowerCase()) {
      case 'token':
      case 'spl-token':
        return `
SPL TOKEN REQUIREMENTS:
- Implement SPL Token standard using anchor-spl
- Include proper mint authority and freeze authority management
- Add multisig support for token authorities using anchor-spl multisig
- Implement proper token metadata using Metaplex Token Metadata
- Include supply management with capped/uncapped minting
- Add proper token account initialization and management
- Implement transfer restrictions with whitelist/blacklist
- Include proper authority delegation mechanisms
- Add comprehensive error handling for token operations
- Implement proper rent exemption calculations`;

      case 'nft':
      case 'metaplex':
        return `
SOLANA NFT REQUIREMENTS:
- Implement using Metaplex NFT standard and Candy Machine v3
- Include proper metadata account creation and management
- Add collection verification and certified collections
- Implement proper royalty enforcement with creator verification
- Include proper mint authority and update authority management
- Add edition support (master editions and limited editions)
- Implement proper uses/utilities tracking if applicable
- Include proper token standard compliance (Non-Fungible edition)
- Add comprehensive metadata validation and IPFS integration
- Implement proper freeze/thaw authority if needed`;

      case 'dao':
      case 'governance':
        return `
SOLANA DAO/GOVERNANCE REQUIREMENTS:
- Implement using SPL Governance or Realms framework
- Include proposal creation with proper voting mechanics
- Add time-lock execution with configurable delays
- Implement token-weighted voting with delegation support
- Include multiple voting strategies (council + community)
- Add proper treasury management with multi-signature approvals
- Implement execution gating with different approval thresholds
- Include member management with role-based permissions
- Add proposal lifecycle management with proper state transitions
- Implement proper vote escrow and staking mechanisms`;

      case 'defi':
      case 'amm':
      case 'dex':
        return `
SOLANA DEFI REQUIREMENTS:
- Implement AMM using anchor framework with proper math libraries
- Include oracle integration with Pyth or Switchboard
- Add slippage protection and MEV protection mechanisms
- Implement proper liquidity pool management with concentrated liquidity
- Include flash loan functionality with proper fee calculations
- Add yield farming with reward token distribution
- Implement proper swap calculations with minimal slippage
- Include position management for concentrated liquidity positions
- Add comprehensive price impact calculations
- Implement proper fee collection and distribution mechanisms`;

      case 'staking':
      case 'validator':
        return `
SOLANA STAKING REQUIREMENTS:
- Implement stake pool using SPL Stake Pool standard
- Include validator management with performance tracking
- Add delegation strategies with automatic rebalancing
- Implement proper reward calculation and distribution
- Include unstaking queues with epoch-based withdrawal
- Add commission management for stake pool operators
- Implement proper validator selection algorithms
- Include emergency unstaking with penalty calculations
- Add governance integration for parameter changes
- Implement proper MEV protection and sandwich attack prevention`;

      case 'marketplace':
      case 'auction':
        return `
SOLANA MARKETPLACE REQUIREMENTS:
- Implement using Metaplex Auction House or custom marketplace
- Include proper escrow mechanisms with program-owned accounts
- Add auction mechanics (English, Dutch, sealed bid)
- Implement proper royalty enforcement and creator fee distribution
- Include collection-based trading with verified collections
- Add proper listing and delisting mechanisms
- Implement batch operations for efficient bulk trading
- Include dispute resolution with arbitration mechanisms
- Add proper fee structures for platform and creators
- Implement proper settlement with automatic execution`;

      case 'bridge':
      case 'cross-chain':
        return `
SOLANA BRIDGE REQUIREMENTS:
- Implement cross-chain messaging with Wormhole or similar
- Include proper validator set management and consensus
- Add message verification with cryptographic proofs
- Implement proper token wrapping/unwrapping mechanisms
- Include rate limiting and daily caps for security
- Add guardian system for emergency actions
- Implement proper fee structures for bridge operations
- Include fraud proof systems with slashing
- Add proper event emission for cross-chain monitoring
- Implement proper upgrade mechanisms with governance`;

      case 'gaming':
      case 'metaverse':
        return `
SOLANA GAMING REQUIREMENTS:
- Implement in-game assets using compressed NFTs for scalability
- Include proper game state management with deterministic outcomes
- Add player progression tracking with verifiable achievements
- Implement proper asset trading with marketplace integration
- Include tournament and competition mechanics with prize distribution
- Add proper random number generation using verifiable randomness
- Implement leaderboards and ranking systems
- Include guild/clan management with shared resources
- Add proper anti-cheat mechanisms and state verification
- Implement proper reward distribution for play-to-earn mechanics`;

      default:
        return `
GENERAL SOLANA PROGRAM REQUIREMENTS:
- Follow Anchor framework best practices and security patterns
- Implement comprehensive account validation and ownership checks
- Add extensive error handling with custom error codes
- Include detailed logging and event emission for monitoring
- Add thorough input validation and sanitization
- Implement compute unit optimization and efficient account access
- Include proper PDA (Program Derived Address) usage patterns
- Add upgrade mechanisms with proper authority management
- Implement proper documentation with comprehensive comments
- Include circuit breakers and emergency stops for critical functions
- Add comprehensive testing with realistic scenarios
- Implement proper integration with Solana ecosystem tools and standards`;
    }
  }

  private async setupDemoEnvironment(
    sandboxId: string,
    contract: GeneratedContract,
    deploymentInfo: any
  ): Promise<void> {
    if (!this.e2bService) {
      throw new Error('E2B service not available');
    }

    // Write contract files to sandbox
    await this.e2bService.writeFileToSandbox(
      sandboxId,
      'contract.sol',
      contract.sourceCode
    );

    if (contract.testInterface) {
      await this.e2bService.writeFileToSandbox(
        sandboxId,
        'index.html',
        contract.testInterface
      );
    }

    if (contract.frontend) {
      await this.e2bService.writeFileToSandbox(
        sandboxId,
        'frontend.tsx',
        contract.frontend
      );
    }

    // Write deployment configuration
    const deployConfig = {
      contractAddress: deploymentInfo.address,
      network: deploymentInfo.network,
      abi: contract.abi,
      blockchain: contract.blockchain,
    };

    await this.e2bService.writeFileToSandbox(
      sandboxId,
      'deploy-config.json',
      JSON.stringify(deployConfig, null, 2)
    );

    // Set up the demo environment
    const setupCode = `
import subprocess
import json
import os

# Set up the demo environment
def setup_demo():
    try:
        # Install dependencies if needed
        if os.path.exists('package.json'):
            subprocess.run(['npm', 'install'], check=True)
        
        # Start the demo server
        if os.path.exists('index.html'):
            subprocess.run(['python', '-m', 'http.server', '3000'], check=True)
        
        print("Demo environment ready!")
        print("Contract deployed at: ${deploymentInfo.address}")
        print("Network: ${deploymentInfo.network}")
        
    except Exception as e:
        print(f"Setup failed: {e}")

setup_demo()
`;

    await this.e2bService.executeCode(setupCode, 'python');
  }
}