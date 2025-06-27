import { Service, elizaLogger } from '@elizaos/core';
import type { IAgentRuntime, UUID } from '@elizaos/core';
import type { E2BAgentHandle } from './E2BAgentOrchestrator.ts';

export interface WorkflowHandle {
  prNumber: number;
  branchName: string;
  taskId: UUID;
  status: 'draft' | 'open' | 'review' | 'approved' | 'merged' | 'closed';
  agents: Map<UUID, AgentWorkflowInfo>;
  createdAt: Date;
  lastUpdated: Date;
}

export interface AgentWorkflowInfo {
  agentId: UUID;
  role: string;
  branch: string;
  commits: CommitInfo[];
  status: 'assigned' | 'working' | 'submitted' | 'reviewing';
}

export interface CommitInfo {
  sha: string;
  message: string;
  timestamp: Date;
  filesChanged: string[];
}

export interface FileChange {
  path: string;
  action: 'create' | 'modify' | 'delete';
  content?: string;
  oldContent?: string;
}

export interface AgentIdentity {
  agentId: UUID;
  role: string;
  branch: string;
  workflowHandle: WorkflowHandle;
}

export interface TaskWorkflow {
  id: UUID;
  description: string;
  agents: AgentAssignment[];
  repository: {
    owner: string;
    name: string;
    url: string;
  };
}

export interface AgentAssignment {
  agentId: UUID;
  role: string;
  tasks: string[];
  dependencies?: string[];
}

interface GitHubService {
  createPullRequest(owner: string, repo: string, options: any): Promise<any>;
  addComment(owner: string, repo: string, issueNumber: number, body: string): Promise<any>;
  getPullRequest(owner: string, repo: string, prNumber: number): Promise<any>;
  assignIssue(owner: string, repo: string, issueNumber: number, assignee: string): Promise<void>;
}

/**
 * Git Workflow Manager Service
 * Manages GitHub-based collaboration workflow for agents
 */
export class GitWorkflowManager extends Service {
  static _serviceName = 'git-workflow-manager';
  static serviceType = 'workflow' as const;

  private githubService: GitHubService | null = null;
  private workflows: Map<UUID, WorkflowHandle> = new Map();
  private agentWorkflows: Map<UUID, WorkflowHandle> = new Map(); // agent ID to workflow

  private owner: string;
  private repo: string;
  private defaultBranch: string;

  capabilityDescription = 'Manages GitHub-based collaborative workflow for auto-coding agents';

  constructor(_runtime?: IAgentRuntime) {
    super(_runtime);
    this.owner = _runtime?.getSetting('GITHUB_ORG') || 'elizaos';
    this.repo = _runtime?.getSetting('GITHUB_REPO') || 'autocoder-workspace';
    this.defaultBranch = _runtime?.getSetting('GITHUB_DEFAULT_BRANCH') || 'main';
  }

  static async start(_runtime: IAgentRuntime): Promise<GitWorkflowManager> {
    const service = new GitWorkflowManager(_runtime);
    await service.initialize();
    elizaLogger.info('GitWorkflowManager started successfully');
    return service;
  }

  private async initialize(): Promise<void> {
    try {
      // Get GitHub service
      let attempts = 0;
      const maxAttempts = 50;

      while (attempts < maxAttempts) {
        this.githubService = this.runtime?.getService('github-integration') as GitHubService | null;

        if (this.githubService) {
          elizaLogger.debug(`GitHub service found on attempt ${attempts + 1}`);
          break;
        }

        attempts++;
        if (attempts < maxAttempts) {
          elizaLogger.debug(`Waiting for GitHub service... (attempt ${attempts}/${maxAttempts})`);
          await new Promise((resolve) => setTimeout(resolve, 200));
        }
      }

      if (!this.githubService) {
        elizaLogger.warn('GitHub service not available - Git workflow features will be limited');
      }

      elizaLogger.info('Git Workflow Manager initialized');
    } catch (_error) {
      elizaLogger.error('Failed to initialize GitWorkflowManager:', _error);
      throw _error;
    }
  }

  async createAgentWorkflow(task: TaskWorkflow): Promise<WorkflowHandle> {
    try {
      if (!this.githubService) {
        throw new Error('GitHub service not available');
      }

      elizaLogger.info(`Creating agent workflow for task ${task.id}: ${task.description}`);

      // Create feature branch
      const branchName = `feature/${task.id}-${this.slugify(task.description)}`;

      // Create workflow handle
      const workflow: WorkflowHandle = {
        prNumber: 0, // Will be set after PR creation
        branchName,
        taskId: task.id,
        status: 'draft',
        agents: new Map(),
        createdAt: new Date(),
        lastUpdated: new Date(),
      };

      // Assign agents to workflow
      for (const agent of task.agents) {
        const agentInfo: AgentWorkflowInfo = {
          agentId: agent.agentId,
          role: agent.role,
          branch: `${branchName}-${agent.role}`,
          commits: [],
          status: 'assigned',
        };

        workflow.agents.set(agent.agentId, agentInfo);
        this.agentWorkflows.set(agent.agentId, workflow);
      }

      // Create initial PR
      const pr = await this.githubService.createPullRequest(this.owner, this.repo, {
        title: `[WIP] ${task.description}`,
        body: this.generatePRDescription(task, workflow),
        head: branchName,
        base: this.defaultBranch,
        draft: true,
      });

      workflow.prNumber = pr.number;
      this.workflows.set(task.id, workflow);

      // Add agents as assignees if possible
      for (const agent of task.agents) {
        const githubUsername = await this.getAgentGitHubUsername(agent.agentId);
        if (githubUsername) {
          await this.githubService.assignIssue(this.owner, this.repo, pr.number, githubUsername);
        }
      }

      elizaLogger.info(`Agent workflow created with PR #${pr.number}`);
      return workflow;
    } catch (_error) {
      elizaLogger.error(`Failed to create agent workflow for task ${task.id}:`, _error);
      throw _error;
    }
  }

  async handleAgentCommit(agent: AgentIdentity, changes: FileChange[]): Promise<CommitInfo> {
    try {
      elizaLogger.info(
        `Handling commit from agent ${agent.agentId} with ${changes.length} changes`
      );

      // Generate commit message
      const commitMessage = await this.generateCommitMessage(agent, changes);

      // Create commit info
      const commit: CommitInfo = {
        sha: this.generateCommitSha(), // In real implementation, would get from Git
        message: commitMessage,
        timestamp: new Date(),
        filesChanged: changes.map((c) => c.path),
      };

      // Update agent workflow info
      const agentInfo = agent.workflowHandle.agents.get(agent.agentId);
      if (agentInfo) {
        agentInfo.commits.push(commit);
        agentInfo.status = 'working';
      }

      // Update PR progress
      await this.updatePRProgress(agent.workflowHandle);

      elizaLogger.info(`Agent commit handled: ${commit.sha}`);
      return commit;
    } catch (_error) {
      elizaLogger.error(`Failed to handle agent commit:`, _error);
      throw _error;
    }
  }

  async submitAgentWork(agentId: UUID): Promise<void> {
    try {
      const workflow = this.agentWorkflows.get(agentId);
      if (!workflow) {
        throw new Error(`No workflow found for agent ${agentId}`);
      }

      const agentInfo = workflow.agents.get(agentId);
      if (!agentInfo) {
        throw new Error(`Agent ${agentId} not found in workflow`);
      }

      elizaLogger.info(`Agent ${agentId} submitting work for review`);

      // Update agent status
      agentInfo.status = 'submitted';

      // Add comment to PR
      if (this.githubService && workflow.prNumber > 0) {
        const comment = this.generateAgentSubmissionComment(agentInfo);
        await this.githubService.addComment(this.owner, this.repo, workflow.prNumber, comment);
      }

      // Check if all agents have submitted
      const allSubmitted = Array.from(workflow.agents.values()).every(
        (info) => info.status === 'submitted' || info.status === 'reviewing'
      );

      if (allSubmitted) {
        workflow.status = 'review';
        await this.updatePRStatus(workflow, false); // Mark as ready for review
      }

      elizaLogger.info(`Agent ${agentId} work submitted successfully`);
    } catch (_error) {
      elizaLogger.error(`Failed to submit agent work:`, _error);
      throw _error;
    }
  }

  async requestReview(taskId: UUID, reviewerId: UUID): Promise<void> {
    try {
      const workflow = this.workflows.get(taskId);
      if (!workflow) {
        throw new Error(`No workflow found for task ${taskId}`);
      }

      const reviewerInfo = workflow.agents.get(reviewerId);
      if (!reviewerInfo) {
        throw new Error(`Reviewer ${reviewerId} not found in workflow`);
      }

      elizaLogger.info(`Requesting review from agent ${reviewerId} for task ${taskId}`);

      // Update reviewer status
      reviewerInfo.status = 'reviewing';

      // Add review request comment
      if (this.githubService && workflow.prNumber > 0) {
        const comment = `🔍 **Review Requested**\n\n@${await this.getAgentGitHubUsername(reviewerId)} please review the changes in this PR.`;
        await this.githubService.addComment(this.owner, this.repo, workflow.prNumber, comment);
      }

      elizaLogger.info(`Review requested from agent ${reviewerId}`);
    } catch (_error) {
      elizaLogger.error(`Failed to request review:`, _error);
      throw _error;
    }
  }

  async mergeWorkflow(taskId: UUID): Promise<void> {
    try {
      const workflow = this.workflows.get(taskId);
      if (!workflow) {
        throw new Error(`No workflow found for task ${taskId}`);
      }

      if (!this.githubService) {
        throw new Error('GitHub service not available');
      }

      elizaLogger.info(`Merging workflow for task ${taskId}`);

      // In a real implementation, would merge the PR
      // For now, just update status
      workflow.status = 'merged';
      workflow.lastUpdated = new Date();

      // Add merge comment
      if (workflow.prNumber > 0) {
        const comment = `✅ **Workflow Completed**\n\nAll agent work has been reviewed and approved. Merging to ${this.defaultBranch}.`;
        await this.githubService.addComment(this.owner, this.repo, workflow.prNumber, comment);
      }

      elizaLogger.info(`Workflow merged for task ${taskId}`);
    } catch (_error) {
      elizaLogger.error(`Failed to merge workflow:`, _error);
      throw _error;
    }
  }

  private generatePRDescription(task: TaskWorkflow, workflow: WorkflowHandle): string {
    const agentList = Array.from(workflow.agents.values())
      .map((agent) => `- **${agent.role}** (${agent.agentId}): ${agent.branch}`)
      .join('\n');

    return `## 🤖 Auto-generated PR for Task ${task.id}

### Description
${task.description}

### Assigned Agents
${agentList}

### Task Requirements
${task.agents.map((a) => a.tasks.join(', ')).join('\n')}

### Progress Tracking
- [ ] Code implementation
- [ ] Unit tests
- [ ] Integration tests
- [ ] Code review
- [ ] Documentation

### Workflow Status
🚧 **Status**: Draft
📅 **Created**: ${workflow.createdAt.toISOString()}

---
*This PR is managed by the ElizaOS AutoCoder system. Agents will automatically update progress.*`;
  }

  private async generateCommitMessage(
    agent: AgentIdentity,
    changes: FileChange[]
  ): Promise<string> {
    const action = this.summarizeChanges(changes);
    const scope = this.determineScope(changes);

    return `${agent.role}(${scope}): ${action}

Agent: ${agent.agentId}
Files changed: ${changes.length}
${changes.map((c) => `- ${c.action} ${c.path}`).join('\n')}`;
  }

  private summarizeChanges(changes: FileChange[]): string {
    const actions = changes.map((c) => c.action);
    const creates = actions.filter((a) => a === 'create').length;
    const modifies = actions.filter((a) => a === 'modify').length;
    const deletes = actions.filter((a) => a === 'delete').length;

    const parts = [];
    if (creates > 0) parts.push(`add ${creates} file${creates > 1 ? 's' : ''}`);
    if (modifies > 0) parts.push(`update ${modifies} file${modifies > 1 ? 's' : ''}`);
    if (deletes > 0) parts.push(`remove ${deletes} file${deletes > 1 ? 's' : ''}`);

    return parts.join(', ') || 'update code';
  }

  private determineScope(changes: FileChange[]): string {
    // Analyze file paths to determine scope
    const paths = changes.map((c) => c.path);

    if (paths.some((p) => p.includes('test'))) return 'test';
    if (paths.some((p) => p.includes('src/components'))) return 'components';
    if (paths.some((p) => p.includes('src/services'))) return 'services';
    if (paths.some((p) => p.includes('src/utils'))) return 'utils';
    if (paths.some((p) => p.includes('docs'))) return 'docs';

    return 'core';
  }

  private async updatePRProgress(workflow: WorkflowHandle): Promise<void> {
    if (!this.githubService || workflow.prNumber === 0) {
      return;
    }

    const progress = this.calculateWorkflowProgress(workflow);
    const comment = this.generateProgressComment(workflow, progress);

    await this.githubService.addComment(this.owner, this.repo, workflow.prNumber, comment);
  }

  private calculateWorkflowProgress(workflow: WorkflowHandle): {
    totalAgents: number;
    workingAgents: number;
    submittedAgents: number;
    totalCommits: number;
    progressPercentage: number;
  } {
    const agents = Array.from(workflow.agents.values());
    const totalAgents = agents.length;
    const workingAgents = agents.filter((a) => a.status === 'working').length;
    const submittedAgents = agents.filter(
      (a) => a.status === 'submitted' || a.status === 'reviewing'
    ).length;
    const totalCommits = agents.reduce((sum, a) => sum + a.commits.length, 0);

    const progressPercentage =
      totalAgents > 0 ? Math.round((submittedAgents / totalAgents) * 100) : 0;

    return {
      totalAgents,
      workingAgents,
      submittedAgents,
      totalCommits,
      progressPercentage,
    };
  }

  private generateProgressComment(workflow: WorkflowHandle, progress: any): string {
    const progressBar = this.generateProgressBar(progress.progressPercentage);

    return `## 📊 Workflow Progress Update

${progressBar} ${progress.progressPercentage}%

### Agent Status
- Total Agents: ${progress.totalAgents}
- Working: ${progress.workingAgents}
- Submitted: ${progress.submittedAgents}
- Total Commits: ${progress.totalCommits}

### Agent Details
${Array.from(workflow.agents.values())
  .map(
    (agent) =>
      `- **${agent.role}** (${agent.agentId}): ${agent.status} - ${agent.commits.length} commits`
  )
  .join('\n')}

---
*Last updated: ${new Date().toISOString()}*`;
  }

  private generateProgressBar(percentage: number): string {
    const filled = Math.round(percentage / 10);
    const empty = 10 - filled;
    return `[${'█'.repeat(filled)}${'░'.repeat(empty)}]`;
  }

  private generateAgentSubmissionComment(agentInfo: AgentWorkflowInfo): string {
    return `## ✅ Agent Work Submitted

**Agent**: ${agentInfo.role} (${agentInfo.agentId})
**Branch**: ${agentInfo.branch}
**Commits**: ${agentInfo.commits.length}

### Summary
Agent has completed their assigned tasks and submitted work for review.

### Commits
${agentInfo.commits.map((c) => `- \`${c.sha.substring(0, 7)}\` ${c.message.split('\n')[0]}`).join('\n')}
`;
  }

  private async updatePRStatus(workflow: WorkflowHandle, draft: boolean): Promise<void> {
    // In a real implementation, would update PR draft status
    elizaLogger.info(`Would update PR #${workflow.prNumber} draft status to ${draft}`);
  }

  private async getAgentGitHubUsername(agentId: UUID): Promise<string> {
    // In a real implementation, would look up agent's GitHub username
    return `agent-${agentId.substring(0, 8)}`;
  }

  private slugify(text: string): string {
    return text
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .substring(0, 30);
  }

  private generateCommitSha(): string {
    // Generate a fake SHA for demo purposes
    return Math.random().toString(36).substring(2, 10) + Date.now().toString(36);
  }

  async getWorkflow(taskId: UUID): Promise<WorkflowHandle | null> {
    return this.workflows.get(taskId) || null;
  }

  async getAgentWorkflow(agentId: UUID): Promise<WorkflowHandle | null> {
    return this.agentWorkflows.get(agentId) || null;
  }

  async listWorkflows(): Promise<WorkflowHandle[]> {
    return Array.from(this.workflows.values());
  }

  async stop(): Promise<void> {
    elizaLogger.info('Stopping Git Workflow Manager');
    this.workflows.clear();
    this.agentWorkflows.clear();
    elizaLogger.info('Git Workflow Manager stopped');
  }
}
