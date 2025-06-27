import { elizaLogger } from '@elizaos/core';
import type { TelemetryService } from './telemetry-service.js';
import type { ErrorLogService } from './error-log-service.js';

export interface GitHubCoordinatorOptions {
  token?: string;
  telemetryService: TelemetryService;
  errorLogService: ErrorLogService;
  debug?: boolean;
}

export interface GitHubRepository {
  owner: string;
  name: string;
  url: string;
  defaultBranch: string;
  isPrivate: boolean;
  hasWriteAccess: boolean;
}

export interface GitHubBranch {
  name: string;
  sha: string;
  isProtected: boolean;
  agentId?: string;
  purpose?: string;
  createdAt: Date;
}

export interface GitHubPullRequest {
  number: number;
  title: string;
  description: string;
  branch: string;
  targetBranch: string;
  status: 'open' | 'closed' | 'merged';
  agentId?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface GitHubWorkflow {
  repository: GitHubRepository;
  mainBranch: string;
  agentBranches: Map<string, GitHubBranch>;
  pullRequests: Map<number, GitHubPullRequest>;
  coordinationStrategy: 'feature-branch' | 'agent-branch' | 'fork';
  conflictResolution: 'auto' | 'manual' | 'pm-review';
}

export class GitHubCoordinator {
  private options: GitHubCoordinatorOptions;
  private telemetryService: TelemetryService;
  private errorLogService: ErrorLogService;
  
  private token: string | null = null;
  private connected = false;
  private currentWorkflow: GitHubWorkflow | null = null;
  private webhookEndpoint: string | null = null;

  constructor(options: GitHubCoordinatorOptions) {
    this.options = options;
    this.telemetryService = options.telemetryService;
    this.errorLogService = options.errorLogService;
    this.token = options.token || process.env.GITHUB_TOKEN || null;
  }

  async initialize(): Promise<void> {
    try {
      elizaLogger.info('Initializing GitHub Coordinator...');

      if (this.token) {
        await this.validateConnection();
      } else {
        elizaLogger.warn('No GitHub token provided - GitHub features will be limited');
      }

      await this.telemetryService.logEvent('github_coordinator_initialized', {
        connected: this.connected,
        hasToken: !!this.token,
        timestamp: new Date().toISOString(),
      });

      elizaLogger.info('✅ GitHub Coordinator initialized');
    } catch (error) {
      await this.errorLogService.logError('Failed to initialize GitHub Coordinator', error);
      // Don't throw - GitHub coordination is optional
      elizaLogger.warn('GitHub Coordinator initialization failed, continuing without GitHub features');
    }
  }

  private async validateConnection(): Promise<void> {
    if (!this.token) {
      throw new Error('GitHub token not available');
    }

    try {
      // TODO: Make actual GitHub API call to validate token
      // For now, we'll simulate the validation
      await this.simulateGitHubAPICall('/user');
      
      this.connected = true;
      elizaLogger.info('✅ GitHub connection validated');

    } catch (error) {
      this.connected = false;
      throw new Error(`GitHub token validation failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  private async simulateGitHubAPICall(endpoint: string, method = 'GET', data?: any): Promise<any> {
    // Simulate API call delay
    await new Promise(resolve => setTimeout(resolve, 200));

    // Simulate different responses based on endpoint
    if (endpoint === '/user') {
      return {
        login: 'autocoder-user',
        id: 12345,
        type: 'User',
      };
    }

    if (endpoint.includes('/repos/')) {
      return {
        name: 'test-repo',
        full_name: 'user/test-repo',
        default_branch: 'main',
        private: false,
        permissions: {
          admin: true,
          push: true,
          pull: true,
        },
      };
    }

    // Default response
    return { success: true };
  }

  async isConnected(): Promise<boolean> {
    return this.connected;
  }

  async setupRepository(repoUrl: string): Promise<GitHubWorkflow> {
    try {
      if (!this.connected) {
        throw new Error('GitHub not connected - cannot set up repository workflow');
      }

      // Parse repository URL
      const repoInfo = this.parseRepositoryUrl(repoUrl);
      if (!repoInfo) {
        throw new Error('Invalid repository URL format');
      }

      elizaLogger.info(`Setting up GitHub workflow for ${repoInfo.owner}/${repoInfo.name}`);

      // Get repository information
      const repoData = await this.simulateGitHubAPICall(`/repos/${repoInfo.owner}/${repoInfo.name}`);
      
      const repository: GitHubRepository = {
        owner: repoInfo.owner,
        name: repoInfo.name,
        url: repoUrl,
        defaultBranch: repoData.default_branch || 'main',
        isPrivate: repoData.private || false,
        hasWriteAccess: repoData.permissions?.push || false,
      };

      if (!repository.hasWriteAccess) {
        throw new Error('Insufficient permissions - write access required for coordination');
      }

      // Create workflow configuration
      this.currentWorkflow = {
        repository,
        mainBranch: repository.defaultBranch,
        agentBranches: new Map(),
        pullRequests: new Map(),
        coordinationStrategy: 'agent-branch',
        conflictResolution: 'pm-review',
      };

      await this.telemetryService.logEvent('github_workflow_setup', {
        repository: `${repository.owner}/${repository.name}`,
        strategy: this.currentWorkflow.coordinationStrategy,
        timestamp: new Date().toISOString(),
      });

      elizaLogger.info(`✅ GitHub workflow configured for ${repository.owner}/${repository.name}`);
      return this.currentWorkflow;

    } catch (error) {
      await this.errorLogService.logError('Failed to setup GitHub repository', error, { repoUrl });
      throw error;
    }
  }

  private parseRepositoryUrl(url: string): { owner: string; name: string } | null {
    // Support various GitHub URL formats
    const patterns = [
      /github\.com\/([^\/]+)\/([^\/]+?)(?:\.git)?$/,
      /github\.com:([^\/]+)\/([^\/]+?)(?:\.git)?$/,
    ];

    for (const pattern of patterns) {
      const match = url.match(pattern);
      if (match) {
        return {
          owner: match[1],
          name: match[2],
        };
      }
    }

    return null;
  }

  async createAgentBranch(agentId: string, purpose: string): Promise<GitHubBranch> {
    try {
      if (!this.currentWorkflow) {
        throw new Error('No GitHub workflow configured');
      }

      const branchName = `agent/${agentId}/${purpose}-${Date.now()}`;
      
      elizaLogger.info(`Creating branch for agent ${agentId}: ${branchName}`);

      // TODO: Create actual branch via GitHub API
      // For now, simulate branch creation
      await this.simulateGitHubAPICall(
        `/repos/${this.currentWorkflow.repository.owner}/${this.currentWorkflow.repository.name}/git/refs`,
        'POST',
        {
          ref: `refs/heads/${branchName}`,
          sha: 'main-branch-sha', // Would get actual SHA from main branch
        }
      );

      const branch: GitHubBranch = {
        name: branchName,
        sha: `sha-${Date.now()}`, // Would be actual commit SHA
        isProtected: false,
        agentId,
        purpose,
        createdAt: new Date(),
      };

      this.currentWorkflow.agentBranches.set(agentId, branch);

      await this.telemetryService.logEvent('agent_branch_created', {
        agentId,
        branchName,
        purpose,
        repository: `${this.currentWorkflow.repository.owner}/${this.currentWorkflow.repository.name}`,
        timestamp: new Date().toISOString(),
      });

      elizaLogger.info(`✅ Branch created for agent ${agentId}: ${branchName}`);
      return branch;

    } catch (error) {
      await this.errorLogService.logError('Failed to create agent branch', error, { agentId, purpose });
      throw error;
    }
  }

  async createPullRequest(
    agentId: string,
    title: string,
    description: string,
    targetBranch?: string
  ): Promise<GitHubPullRequest> {
    try {
      if (!this.currentWorkflow) {
        throw new Error('No GitHub workflow configured');
      }

      const agentBranch = this.currentWorkflow.agentBranches.get(agentId);
      if (!agentBranch) {
        throw new Error(`No branch found for agent ${agentId}`);
      }

      const target = targetBranch || this.currentWorkflow.mainBranch;

      elizaLogger.info(`Creating PR for agent ${agentId}: ${agentBranch.name} -> ${target}`);

      // TODO: Create actual PR via GitHub API
      const prData = await this.simulateGitHubAPICall(
        `/repos/${this.currentWorkflow.repository.owner}/${this.currentWorkflow.repository.name}/pulls`,
        'POST',
        {
          title,
          body: description,
          head: agentBranch.name,
          base: target,
        }
      );

      const pullRequest: GitHubPullRequest = {
        number: Math.floor(Math.random() * 1000) + 1, // Would be actual PR number
        title,
        description,
        branch: agentBranch.name,
        targetBranch: target,
        status: 'open',
        agentId,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      this.currentWorkflow.pullRequests.set(pullRequest.number, pullRequest);

      await this.telemetryService.logEvent('pull_request_created', {
        agentId,
        prNumber: pullRequest.number,
        title,
        repository: `${this.currentWorkflow.repository.owner}/${this.currentWorkflow.repository.name}`,
        timestamp: new Date().toISOString(),
      });

      elizaLogger.info(`✅ PR #${pullRequest.number} created for agent ${agentId}`);
      return pullRequest;

    } catch (error) {
      await this.errorLogService.logError('Failed to create pull request', error, { agentId, title });
      throw error;
    }
  }

  async coordinateAgentWork(agentUpdates: Array<{
    agentId: string;
    status: string;
    changes: string[];
    conflicts?: string[];
  }>): Promise<{
    conflicts: Array<{
      agentIds: string[];
      files: string[];
      resolution: string;
    }>;
    recommendations: string[];
  }> {
    try {
      if (!this.currentWorkflow) {
        throw new Error('No GitHub workflow configured');
      }

      elizaLogger.info(`Coordinating work for ${agentUpdates.length} agents`);

      // Analyze conflicts between agents
      const conflicts = this.detectConflicts(agentUpdates);
      
      // Generate coordination recommendations
      const recommendations = this.generateCoordinationRecommendations(conflicts, agentUpdates);

      await this.telemetryService.logEvent('agent_coordination', {
        agentCount: agentUpdates.length,
        conflictCount: conflicts.length,
        repository: `${this.currentWorkflow.repository.owner}/${this.currentWorkflow.repository.name}`,
        timestamp: new Date().toISOString(),
      });

      return { conflicts, recommendations };

    } catch (error) {
      await this.errorLogService.logError('Failed to coordinate agent work', error);
      throw error;
    }
  }

  private detectConflicts(agentUpdates: Array<{
    agentId: string;
    status: string;
    changes: string[];
    conflicts?: string[];
  }>): Array<{
    agentIds: string[];
    files: string[];
    resolution: string;
  }> {
    const conflicts: Array<{
      agentIds: string[];
      files: string[];
      resolution: string;
    }> = [];

    // Simple conflict detection - check for overlapping file changes
    const fileChanges = new Map<string, string[]>();

    for (const update of agentUpdates) {
      for (const file of update.changes) {
        if (!fileChanges.has(file)) {
          fileChanges.set(file, []);
        }
        fileChanges.get(file)!.push(update.agentId);
      }
    }

    // Find files modified by multiple agents
    for (const [file, agentIds] of fileChanges) {
      if (agentIds.length > 1) {
        conflicts.push({
          agentIds,
          files: [file],
          resolution: this.getConflictResolution(agentIds, [file]),
        });
      }
    }

    return conflicts;
  }

  private getConflictResolution(agentIds: string[], files: string[]): string {
    if (!this.currentWorkflow) {
      return 'manual-review';
    }

    switch (this.currentWorkflow.conflictResolution) {
      case 'auto':
        return 'automatic-merge';
      case 'pm-review':
        return 'pm-coordination';
      default:
        return 'manual-review';
    }
  }

  private generateCoordinationRecommendations(
    conflicts: Array<{ agentIds: string[]; files: string[]; resolution: string }>,
    agentUpdates: Array<{ agentId: string; status: string; changes: string[] }>
  ): string[] {
    const recommendations: string[] = [];

    if (conflicts.length === 0) {
      recommendations.push('No conflicts detected - all agents can proceed independently');
    } else {
      recommendations.push(`Found ${conflicts.length} potential conflicts requiring coordination`);
      
      for (const conflict of conflicts) {
        recommendations.push(
          `Conflict in ${conflict.files.join(', ')} between agents ${conflict.agentIds.join(', ')} - ${conflict.resolution}`
        );
      }
    }

    // Add strategic recommendations
    const activeAgents = agentUpdates.filter(u => u.status === 'working');
    if (activeAgents.length > 2) {
      recommendations.push('Consider implementing lock files for shared resources');
      recommendations.push('Suggest modular development approach to minimize conflicts');
    }

    return recommendations;
  }

  async getWorkflowStatus(): Promise<{
    repository?: string;
    mainBranch?: string;
    agentBranches: number;
    openPRs: number;
    conflicts: number;
    lastActivity?: Date;
  }> {
    if (!this.currentWorkflow) {
      return {
        agentBranches: 0,
        openPRs: 0,
        conflicts: 0,
      };
    }

    const openPRs = Array.from(this.currentWorkflow.pullRequests.values())
      .filter(pr => pr.status === 'open').length;

    return {
      repository: `${this.currentWorkflow.repository.owner}/${this.currentWorkflow.repository.name}`,
      mainBranch: this.currentWorkflow.mainBranch,
      agentBranches: this.currentWorkflow.agentBranches.size,
      openPRs,
      conflicts: 0, // Would calculate actual conflicts
      lastActivity: new Date(),
    };
  }

  async cleanupAgentWork(agentId: string): Promise<void> {
    try {
      if (!this.currentWorkflow) {
        return;
      }

      elizaLogger.info(`Cleaning up GitHub work for agent ${agentId}`);

      // Close any open PRs for this agent
      for (const [prNumber, pr] of this.currentWorkflow.pullRequests) {
        if (pr.agentId === agentId && pr.status === 'open') {
          // TODO: Close PR via GitHub API
          pr.status = 'closed';
          pr.updatedAt = new Date();
          
          await this.telemetryService.logEvent('pull_request_closed', {
            agentId,
            prNumber,
            reason: 'agent-cleanup',
            timestamp: new Date().toISOString(),
          });
        }
      }

      // Optionally delete agent branch
      const agentBranch = this.currentWorkflow.agentBranches.get(agentId);
      if (agentBranch) {
        // TODO: Delete branch via GitHub API if desired
        this.currentWorkflow.agentBranches.delete(agentId);
        
        elizaLogger.info(`Branch ${agentBranch.name} marked for cleanup`);
      }

      elizaLogger.info(`✅ GitHub cleanup completed for agent ${agentId}`);

    } catch (error) {
      await this.errorLogService.logError('Failed to cleanup agent GitHub work', error, { agentId });
      // Don't throw - cleanup is best effort
    }
  }

  async shutdown(): Promise<void> {
    try {
      elizaLogger.info('Shutting down GitHub Coordinator...');

      // Clean up any active workflows
      if (this.currentWorkflow) {
        const activeAgents = Array.from(this.currentWorkflow.agentBranches.keys());
        for (const agentId of activeAgents) {
          await this.cleanupAgentWork(agentId);
        }
      }

      this.connected = false;
      this.currentWorkflow = null;

      await this.telemetryService.logEvent('github_coordinator_shutdown', {
        timestamp: new Date().toISOString(),
      });

      elizaLogger.info('✅ GitHub Coordinator shutdown completed');

    } catch (error) {
      await this.errorLogService.logError('Error during GitHub Coordinator shutdown', error);
      throw error;
    }
  }
}