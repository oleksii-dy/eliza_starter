/**
 * Workflow Bridge Service
 * Connects lander chat conversations to autocoder projects
 * Handles context preservation and project creation
 */

import { getSql } from '@/lib/database';
import { AutocoderAgentService } from '@/lib/autocoder/agent-service';
import { BuildQueueManager } from '@/lib/autocoder/build-queue-manager';
import { GitHubIntegrationService, ProjectMetadata } from './github-integration';
import { randomUUID } from 'crypto';

export interface ChatMessage {
  id: string;
  projectId: string;
  type: 'user' | 'agent' | 'system';
  message: string;
  timestamp: Date;
  metadata?: Record<string, any>;
}

export interface WorkflowRequest {
  userPrompt: string;
  conversationHistory: ChatMessage[];
  projectType: 'defi' | 'trading' | 'dao' | 'nft' | 'general';
  complexity: 'simple' | 'moderate' | 'advanced';
  deploymentTarget: 'ethereum' | 'polygon' | 'solana' | 'multi-chain';
  userId: string;
  userName?: string;
}

export interface WorkflowContext {
  requirements: string[];
  features: string[];
  constraints: string[];
  preferences: string[];
  riskTolerance: 'low' | 'medium' | 'high';
  timeline: string;
}

export interface ProjectSpecification {
  name: string;
  description: string;
  type: string;
  complexity: string;
  features: string[];
  requirements: string[];
  architecture: {
    frontend: string[];
    backend: string[];
    blockchain: string[];
    integrations: string[];
  };
  testing: {
    unit: boolean;
    integration: boolean;
    e2e: boolean;
    security: boolean;
  };
  deployment: {
    targets: string[];
    ci_cd: boolean;
    monitoring: boolean;
  };
  security: {
    audits: boolean;
    access_control: boolean;
    input_validation: boolean;
    encryption: boolean;
  };
}

export class WorkflowBridgeService {
  private agentService: AutocoderAgentService;
  private buildQueue: BuildQueueManager;
  private githubService?: GitHubIntegrationService;

  constructor(githubToken?: string) {
    this.agentService = new AutocoderAgentService();
    this.buildQueue = BuildQueueManager.getInstance();

    if (githubToken) {
      this.githubService = new GitHubIntegrationService({
        token: githubToken,
      });
    }
  }

  /**
   * Create a complete workflow from a chat conversation
   */
  async createWorkflowFromChat(request: WorkflowRequest): Promise<{
    projectId: string;
    specification: ProjectSpecification;
    githubRepo?: string;
  }> {
    try {
      // Initialize agent service
      await this.agentService.initialize();

      // Analyze conversation context
      const context = await this.analyzeConversationContext(request);

      // Extract technical requirements
      const specification = await this.extractTechnicalRequirements(request, context);

      // Create autocoder project
      const projectId = await this.createAutocoderProject(request, specification);

      // Initialize GitHub repository if available
      let githubRepo;
      if (this.githubService) {
        githubRepo = await this.createGitHubRepository(request, specification);
      }

      // Store workflow context
      await this.storeWorkflowContext(projectId, context, specification);

      // Start the build process
      await this.initiateBuildProcess(projectId, request, specification);

      console.log(`Created workflow for project ${projectId}`);

      return {
        projectId,
        specification,
        githubRepo,
      };
    } catch (error) {
      console.error('Failed to create workflow from chat:', error);
      throw new Error(`Workflow creation failed: ${error}`);
    }
  }

  /**
   * Analyze conversation context to extract requirements
   */
  private async analyzeConversationContext(request: WorkflowRequest): Promise<WorkflowContext> {
    const requirements = [];
    const features = [];
    const constraints = [];
    const preferences = [];
    let riskTolerance: 'low' | 'medium' | 'high' = 'medium';

    // Analyze conversation history
    for (const message of request.conversationHistory) {
      const text = message.message.toLowerCase();

      // Extract requirements
      if (text.includes('need') || text.includes('require') || text.includes('must')) {
        requirements.push(this.extractAfterKeyword(text, ['need', 'require', 'must']));
      }

      // Extract features
      if (text.includes('want') || text.includes('should') || text.includes('feature')) {
        features.push(this.extractAfterKeyword(text, ['want', 'should', 'feature']));
      }

      // Extract constraints
      if (text.includes('cannot') || text.includes('avoid') || text.includes('constraint')) {
        constraints.push(this.extractAfterKeyword(text, ['cannot', 'avoid', 'constraint']));
      }

      // Extract preferences
      if (text.includes('prefer') || text.includes('like') || text.includes('better')) {
        preferences.push(this.extractAfterKeyword(text, ['prefer', 'like', 'better']));
      }

      // Assess risk tolerance
      if (text.includes('safe') || text.includes('secure') || text.includes('conservative')) {
        riskTolerance = 'low';
      } else if (text.includes('aggressive') || text.includes('high risk') || text.includes('maximum return')) {
        riskTolerance = 'high';
      }
    }

    // Add default requirements based on project type
    this.addDefaultRequirements(requirements, request.projectType);

    return {
      requirements: this.deduplicateAndClean(requirements),
      features: this.deduplicateAndClean(features),
      constraints: this.deduplicateAndClean(constraints),
      preferences: this.deduplicateAndClean(preferences),
      riskTolerance,
      timeline: this.estimateTimeline(request.complexity),
    };
  }

  /**
   * Extract technical requirements from context
   */
  private async extractTechnicalRequirements(
    request: WorkflowRequest,
    context: WorkflowContext
  ): Promise<ProjectSpecification> {
    const spec: ProjectSpecification = {
      name: this.generateProjectName(request),
      description: request.userPrompt,
      type: request.projectType,
      complexity: request.complexity,
      features: context.features,
      requirements: context.requirements,
      architecture: {
        frontend: ['React', 'TypeScript', 'Tailwind CSS'],
        backend: ['Node.js', 'Express', 'TypeScript'],
        blockchain: this.getBlockchainTech(request.deploymentTarget),
        integrations: this.getIntegrations(request),
      },
      testing: {
        unit: true,
        integration: true,
        e2e: request.complexity !== 'simple',
        security: request.projectType === 'trading' || request.projectType === 'defi',
      },
      deployment: {
        targets: [request.deploymentTarget],
        ci_cd: request.complexity !== 'simple',
        monitoring: request.projectType === 'trading',
      },
      security: {
        audits: request.projectType === 'trading' || request.projectType === 'defi',
        access_control: true,
        input_validation: true,
        encryption: request.projectType === 'trading',
      },
    };

    return spec;
  }

  /**
   * Create autocoder project with enhanced specification
   */
  private async createAutocoderProject(
    request: WorkflowRequest,
    specification: ProjectSpecification
  ): Promise<string> {
    const sql = getSql();
    const projectId = randomUUID();

    await sql.query(
      `
      INSERT INTO autocoder_projects (
        id, user_id, name, type, description, status, specification, created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), NOW())
      `,
      [
        projectId,
        request.userId,
        specification.name,
        specification.type,
        specification.description,
        'planning',
        JSON.stringify(specification),
      ]
    );

    return projectId;
  }

  /**
   * Create GitHub repository for the project
   */
  private async createGitHubRepository(
    request: WorkflowRequest,
    specification: ProjectSpecification
  ): Promise<string> {
    if (!this.githubService) {
      throw new Error('GitHub service not configured');
    }

    const metadata: ProjectMetadata = {
      projectId: randomUUID(),
      name: specification.name,
      description: specification.description,
      type: specification.type,
      tags: [
        specification.type,
        specification.complexity,
        ...specification.features.slice(0, 5),
      ],
      userId: request.userId,
      userName: request.userName,
    };

    return await this.githubService.createPrivateRepo(metadata);
  }

  /**
   * Store workflow context in database
   */
  private async storeWorkflowContext(
    projectId: string,
    context: WorkflowContext,
    specification: ProjectSpecification
  ): Promise<void> {
    const sql = getSql();

    await sql.query(
      `
      INSERT INTO workflow_contexts (
        id, project_id, context, specification, created_at
      ) VALUES ($1, $2, $3, $4, NOW())
      `,
      [
        randomUUID(),
        projectId,
        JSON.stringify(context),
        JSON.stringify(specification),
      ]
    );
  }

  /**
   * Initiate the build process with enhanced configuration
   */
  private async initiateBuildProcess(
    projectId: string,
    request: WorkflowRequest,
    specification: ProjectSpecification
  ): Promise<void> {
    // Add to build queue with enhanced priority
    await this.buildQueue.addBuild({
      id: randomUUID(),
      projectId,
      userId: request.userId,
      specification,
      priority: this.determineBuildPriority(request.complexity),
    });

    console.log(`Initiated build process for project ${projectId}`);
  }

  /**
   * Helper methods
   */
  private extractAfterKeyword(text: string, keywords: string[]): string {
    for (const keyword of keywords) {
      const index = text.indexOf(keyword);
      if (index !== -1) {
        const after = text.substring(index + keyword.length).trim();
        return after.split('.')[0].trim(); // Get first sentence
      }
    }
    return '';
  }

  private addDefaultRequirements(requirements: string[], projectType: string): void {
    const defaults = {
      defi: ['Smart contract security', 'Gas optimization', 'Liquidity management'],
      trading: ['Risk management', 'Real-time data', 'Order execution'],
      dao: ['Governance mechanisms', 'Voting systems', 'Treasury management'],
      nft: ['Metadata standards', 'Royalty systems', 'Marketplace integration'],
      general: ['User authentication', 'Data persistence', 'Error handling'],
    };

    const typeDefaults = defaults[projectType as keyof typeof defaults] || defaults.general;
    requirements.push(...typeDefaults);
  }

  private deduplicateAndClean(items: string[]): string[] {
    return [...new Set(items.filter(item => item.length > 0))];
  }

  private estimateTimeline(complexity: string): string {
    const timelines = {
      simple: '1-2 days',
      moderate: '3-5 days',
      advanced: '1-2 weeks',
    };
    return timelines[complexity as keyof typeof timelines] || '3-5 days';
  }

  private generateProjectName(request: WorkflowRequest): string {
    const prompt = request.userPrompt.toLowerCase();

    if (prompt.includes('powell') || prompt.includes('interest rate')) {
      return 'Powell Hedging Strategy';
    }

    const typeNames = {
      defi: 'DeFi Protocol',
      trading: 'Trading Strategy',
      dao: 'DAO Governance',
      nft: 'NFT Collection',
      general: 'Custom Project',
    };

    return typeNames[request.projectType] || 'Custom Project';
  }

  private getBlockchainTech(target: string): string[] {
    const tech = {
      ethereum: ['Solidity', 'Hardhat', 'OpenZeppelin', 'Ethers.js'],
      polygon: ['Solidity', 'Hardhat', 'OpenZeppelin', 'Ethers.js'],
      solana: ['Rust', 'Anchor', 'Solana Web3.js'],
      'multi-chain': ['Solidity', 'Rust', 'Hardhat', 'Anchor'],
    };

    return tech[target as keyof typeof tech] || tech.ethereum;
  }

  private getIntegrations(request: WorkflowRequest): string[] {
    const integrations = [];
    const prompt = request.userPrompt.toLowerCase();

    if (prompt.includes('polymarket')) {integrations.push('Polymarket API');}
    if (prompt.includes('aave')) {integrations.push('Aave Protocol');}
    if (prompt.includes('uniswap')) {integrations.push('Uniswap V3');}
    if (prompt.includes('metamask')) {integrations.push('MetaMask');}
    if (prompt.includes('wallet')) {integrations.push('Wallet Connect');}

    // Default integrations
    integrations.push('Web3 Provider', 'JSON-RPC');

    return integrations;
  }

  private determineBuildPriority(complexity: string): 'low' | 'normal' | 'high' | 'urgent' {
    const priorities = {
      simple: 'normal' as const,
      moderate: 'normal' as const,
      advanced: 'high' as const,
    };
    return priorities[complexity as keyof typeof priorities] || 'normal';
  }
}

/**
 * Factory function to create workflow bridge service
 */
export function createWorkflowBridge(githubToken?: string): WorkflowBridgeService {
  return new WorkflowBridgeService(githubToken);
}
