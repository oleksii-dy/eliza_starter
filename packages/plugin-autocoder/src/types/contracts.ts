/**
 * Contract generation and deployment types
 */

export interface ContractGenerationOptions {
  blockchain: 'ethereum' | 'base' | 'arbitrum' | 'polygon' | 'solana';
  contractType: 'token' | 'nft' | 'defi' | 'dao' | 'custom';
  network?: string;
  compile?: boolean;
  deploy?: boolean;
  generateTestInterface?: boolean;
  generateFrontend?: boolean;
  deploymentConfig?: DeploymentConfig;
  
  // Template options
  template?: ContractTemplate;
  complexity?: 'simple' | 'medium' | 'advanced';
  features?: string[];
}

export interface ContractTemplate {
  name: string;
  description: string;
  blockchain: string;
  category: string;
  boilerplate: string;
  dependencies?: string[];
  exampleUsage?: string;
}

export interface GeneratedContract {
  id: string;
  name: string;
  description: string;
  blockchain: string;
  contractType: string;
  sourceCode: string;
  abi?: any;
  bytecode?: string;
  testInterface?: string;
  frontend?: string;
  metadata: {
    requirements: string;
    generatedAt: Date;
    compiler: string;
    [key: string]: any;
  };
  compilationArtifacts?: CompilationArtifacts;
  deploymentInfo?: DeploymentInfo;
}

export interface CompilationResult {
  success: boolean;
  abi?: any;
  bytecode?: string;
  artifacts?: CompilationArtifacts;
  error?: string;
}

export interface CompilationArtifacts {
  metadata?: any;
  compilerVersion?: string;
  optimizationUsed?: boolean;
  optimizationRuns?: number;
  [key: string]: any;
}

export interface DeploymentConfig {
  network?: string;
  privateKey?: string;
  rpcUrl?: string;
  gasLimit?: number;
  gasPrice?: string;
  constructorArgs?: any[];
  
  // Solana specific
  keypairPath?: string;
  commitment?: string;
  
  // Verification
  verify?: boolean;
  apiKey?: string;
}

export interface DeploymentInfo {
  address: string;
  transactionHash: string;
  blockNumber?: number;
  network: string;
  deployer?: string;
  gasUsed?: number;
  deployedAt: Date;
  verificationStatus: 'pending' | 'verified' | 'failed';
  metadata?: {
    [key: string]: any;
  };
}

export interface DAppGenerationOptions {
  type: 'full-stack' | 'frontend-only' | 'contract-only';
  frontend: 'react' | 'vue' | 'svelte' | 'vanilla';
  backend?: 'express' | 'fastify' | 'bun' | 'none';
  styling: 'tailwind' | 'mui' | 'chakra' | 'styled-components';
  blockchain: 'ethereum' | 'base' | 'arbitrum' | 'polygon' | 'solana';
  features: DAppFeature[];
  deployment: {
    frontend?: 'vercel' | 'netlify' | 'subdomain';
    backend?: 'railway' | 'render' | 'subdomain';
    database?: 'postgres' | 'mongodb' | 'supabase';
  };
}

export interface DAppFeature {
  name: string;
  description: string;
  contractRequirements?: string[];
  frontendComponents?: string[];
  backendEndpoints?: string[];
}

export interface GeneratedDApp {
  id: string;
  name: string;
  description: string;
  type: 'full-stack' | 'frontend-only' | 'contract-only';
  blockchain: string;
  
  // Contract
  contract?: GeneratedContract;
  
  // Frontend
  frontend?: {
    framework: string;
    sourceCode: string;
    components: Record<string, string>;
    styles: string;
    buildConfig: any;
  };
  
  // Backend
  backend?: {
    framework: string;
    sourceCode: string;
    routes: Record<string, string>;
    middleware: string[];
    database?: DatabaseConfig;
  };
  
  // Deployment
  deploymentUrls?: {
    frontend?: string;
    backend?: string;
    contract?: string;
  };
  
  // Demo
  demoUrl?: string;
  testInterface?: string;
  
  metadata: {
    generatedAt: Date;
    requirements: string;
    features: string[];
  };
}

export interface DatabaseConfig {
  type: 'postgres' | 'mongodb' | 'supabase';
  schema?: string;
  migrations?: string[];
  connectionString?: string;
}

export interface E2BTemplate {
  name: string;
  description: string;
  blockchain: string;
  type: 'contract-dev' | 'frontend-dev' | 'full-stack';
  baseImage: string;
  packages: string[];
  env: Record<string, string>;
  startupScript?: string;
  ports: number[];
}

export interface BenchmarkScenario {
  id: string;
  name: string;
  description: string;
  userPrompt: string;
  expectedOutputs: {
    contractGenerated: boolean;
    contractCompiled: boolean;
    contractDeployed: boolean;
    testInterfaceGenerated: boolean;
    frontendGenerated: boolean;
    demoAccessible: boolean;
  };
  blockchain: string;
  complexity: 'simple' | 'medium' | 'complex';
  estimatedTime: number; // milliseconds
  successCriteria: string[];
}

export interface BenchmarkResult {
  scenarioId: string;
  success: boolean;
  duration: number;
  outputs: {
    contractGenerated: boolean;
    contractCompiled: boolean;
    contractDeployed: boolean;
    testInterfaceGenerated: boolean;
    frontendGenerated: boolean;
    demoAccessible: boolean;
  };
  errors: string[];
  generatedArtifacts: {
    contractAddress?: string;
    demoUrl?: string;
    repositoryUrl?: string;
  };
  metadata: {
    executedAt: Date;
    agentId: string;
    sandboxId?: string;
  };
}