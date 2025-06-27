import { Service, elizaLogger, type IAgentRuntime } from '@elizaos/core';
import { Octokit } from '@octokit/rest';
import { ErrorInstrumentation, instrumented, retryable } from '../utils/errorInstrumentation.js';

export interface GitHubIssue {
  id: number;
  number: number;
  title: string;
  body: string;
  state: 'open' | 'closed';
  labels: Array<{ name: string; color: string }>;
  assignee?: { login: string };
  user: { login: string };
  html_url: string;
  repository: {
    owner: string;
    name: string;
  };
}

export interface GitHubPullRequest {
  id: number;
  number: number;
  title: string;
  body: string;
  state: 'open' | 'closed' | 'merged';
  head: {
    ref: string;
    sha: string;
  };
  base: {
    ref: string;
  };
  html_url: string;
  user: { login: string };
  repository: {
    owner: string;
    name: string;
  };
}

export interface GitHubComment {
  id: number;
  body: string;
  user: { login: string };
  created_at: string;
  html_url: string;
}

export class GitHubIntegrationService extends Service {
  static serviceName = 'github-integration';

  private octokit: Octokit;
  private webhookListeners: Map<string, (event: any) => void> = new Map();

  constructor(runtime: IAgentRuntime) {
    super(runtime);

    const token = this.runtime.getSetting('GITHUB_TOKEN');
    if (!token) {
      throw new Error('GITHUB_TOKEN is required for GitHub integration');
    }

    this.octokit = new Octokit({
      auth: token,
      userAgent: 'ElizaOS-Agent/1.0.0',
    });
  }

  get capabilityDescription(): string {
    return 'Provides GitHub API integration for issue management, PR operations, and repository interactions';
  }

  static async start(runtime: IAgentRuntime): Promise<GitHubIntegrationService> {
    const service = new GitHubIntegrationService(runtime);
    await service.initialize();
    return service;
  }

  @instrumented('GitHubIntegrationService', 'initialize')
  async initialize(): Promise<void> {
    elizaLogger.info('Initializing GitHub integration service');

    try {
      // Test authentication
      const { data: user } = await this.octokit.rest.users.getAuthenticated();
      elizaLogger.info(`GitHub integration initialized for user: ${user.login}`);

      // Log initialization metrics
      ErrorInstrumentation.logMetrics('GitHubIntegrationService', 'initialize', {
        authenticatedUser: user.login,
        userType: user.type,
        publicRepos: user.public_repos,
        serviceReady: true,
      });
    } catch (error) {
      const instrumentedError = ErrorInstrumentation.instrumentError(error, {
        service: 'GitHubIntegrationService',
        operation: 'initialize',
        metadata: { step: 'authentication' },
      });
      elizaLogger.error('Failed to authenticate with GitHub', { error: instrumentedError });
      throw instrumentedError;
    }
  }

  async stop(): Promise<void> {
    elizaLogger.info('Stopping GitHub integration service');
    this.webhookListeners.clear();
  }

  /**
   * Fetch issues from a repository with optional filtering
   */
  @retryable('GitHubIntegrationService', 3, 1000, 'getIssues')
  async getIssues(
    owner: string,
    repo: string,
    options?: {
      state?: 'open' | 'closed' | 'all';
      labels?: string[];
      assignee?: string;
      since?: string;
      limit?: number;
    }
  ): Promise<GitHubIssue[]> {
    try {
      elizaLogger.debug('Fetching GitHub issues', { owner, repo, options });

      ErrorInstrumentation.logMetrics('GitHubIntegrationService', 'getIssues', {
        repository: `${owner}/${repo}`,
        requestOptions: options,
        startTime: Date.now(),
      });

      const { data: issues } = await this.octokit.rest.issues.listForRepo({
        owner,
        repo,
        state: options?.state || 'open',
        labels: options?.labels?.join(','),
        assignee: options?.assignee,
        since: options?.since,
        per_page: Math.min(options?.limit || 30, 100),
        sort: 'created',
        direction: 'desc',
      });

      return issues
        .filter((issue) => !issue.pull_request) // Filter out PRs
        .map((issue) => ({
          id: issue.id,
          number: issue.number,
          title: issue.title,
          body: issue.body || '',
          state: issue.state as 'open' | 'closed',
          labels: issue.labels.map((label) => ({
            name: typeof label === 'string' ? label : label.name || '',
            color: typeof label === 'string' ? '' : label.color || '',
          })),
          assignee: issue.assignee ? { login: issue.assignee.login } : undefined,
          user: { login: issue.user?.login || 'unknown' },
          html_url: issue.html_url,
          repository: { owner, name: repo },
        }));
    } catch (error) {
      elizaLogger.error('Failed to fetch GitHub issues', { owner, repo, error });
      throw error;
    }
  }

  /**
   * Get a specific issue by number
   */
  async getIssue(owner: string, repo: string, issueNumber: number): Promise<GitHubIssue> {
    try {
      const { data: issue } = await this.octokit.rest.issues.get({
        owner,
        repo,
        issue_number: issueNumber,
      });

      return {
        id: issue.id,
        number: issue.number,
        title: issue.title,
        body: issue.body || '',
        state: issue.state as 'open' | 'closed',
        labels: issue.labels.map((label) => ({
          name: typeof label === 'string' ? label : label.name || '',
          color: typeof label === 'string' ? '' : label.color || '',
        })),
        assignee: issue.assignee ? { login: issue.assignee.login } : undefined,
        user: { login: issue.user?.login || 'unknown' },
        html_url: issue.html_url,
        repository: { owner, name: repo },
      };
    } catch (error) {
      elizaLogger.error('Failed to fetch GitHub issue', { owner, repo, issueNumber, error });
      throw error;
    }
  }

  /**
   * Create a new pull request
   */
  async createPullRequest(
    owner: string,
    repo: string,
    options: {
      title: string;
      body: string;
      head: string; // branch name
      base: string; // target branch (usually 'main' or 'develop')
      draft?: boolean;
    }
  ): Promise<GitHubPullRequest> {
    try {
      elizaLogger.info('Creating GitHub pull request', { owner, repo, options });

      const { data: pr } = await this.octokit.rest.pulls.create({
        owner,
        repo,
        title: options.title,
        body: options.body,
        head: options.head,
        base: options.base,
        draft: options.draft || false,
      });

      return {
        id: pr.id,
        number: pr.number,
        title: pr.title,
        body: pr.body || '',
        state: pr.state as 'open' | 'closed' | 'merged',
        head: {
          ref: pr.head.ref,
          sha: pr.head.sha,
        },
        base: {
          ref: pr.base.ref,
        },
        html_url: pr.html_url,
        user: { login: pr.user?.login || 'unknown' },
        repository: { owner, name: repo },
      };
    } catch (error) {
      elizaLogger.error('Failed to create GitHub pull request', { owner, repo, options, error });
      throw error;
    }
  }

  /**
   * Get pull request details
   */
  async getPullRequest(owner: string, repo: string, prNumber: number): Promise<GitHubPullRequest> {
    try {
      const { data: pr } = await this.octokit.rest.pulls.get({
        owner,
        repo,
        pull_number: prNumber,
      });

      return {
        id: pr.id,
        number: pr.number,
        title: pr.title,
        body: pr.body || '',
        state: pr.state as 'open' | 'closed' | 'merged',
        head: {
          ref: pr.head.ref,
          sha: pr.head.sha,
        },
        base: {
          ref: pr.base.ref,
        },
        html_url: pr.html_url,
        user: { login: pr.user?.login || 'unknown' },
        repository: { owner, name: repo },
      };
    } catch (error) {
      elizaLogger.error('Failed to fetch GitHub pull request', { owner, repo, prNumber, error });
      throw error;
    }
  }

  /**
   * Add a comment to an issue or PR
   */
  async addComment(
    owner: string,
    repo: string,
    issueNumber: number,
    body: string
  ): Promise<GitHubComment> {
    try {
      elizaLogger.debug('Adding GitHub comment', { owner, repo, issueNumber });

      const { data: comment } = await this.octokit.rest.issues.createComment({
        owner,
        repo,
        issue_number: issueNumber,
        body,
      });

      return {
        id: comment.id,
        body: comment.body,
        user: { login: comment.user?.login || 'unknown' },
        created_at: comment.created_at,
        html_url: comment.html_url,
      };
    } catch (error) {
      elizaLogger.error('Failed to add GitHub comment', { owner, repo, issueNumber, error });
      throw error;
    }
  }

  /**
   * Get comments for an issue or PR
   */
  async getComments(owner: string, repo: string, issueNumber: number): Promise<GitHubComment[]> {
    try {
      const { data: comments } = await this.octokit.rest.issues.listComments({
        owner,
        repo,
        issue_number: issueNumber,
        sort: 'created',
        direction: 'asc',
      });

      return comments.map((comment) => ({
        id: comment.id,
        body: comment.body,
        user: { login: comment.user?.login || 'unknown' },
        created_at: comment.created_at,
        html_url: comment.html_url,
      }));
    } catch (error) {
      elizaLogger.error('Failed to fetch GitHub comments', { owner, repo, issueNumber, error });
      throw error;
    }
  }

  /**
   * Assign an issue to a user
   */
  async assignIssue(
    owner: string,
    repo: string,
    issueNumber: number,
    assignee: string
  ): Promise<void> {
    try {
      await this.octokit.rest.issues.addAssignees({
        owner,
        repo,
        issue_number: issueNumber,
        assignees: [assignee],
      });

      elizaLogger.info('Successfully assigned issue', { owner, repo, issueNumber, assignee });
    } catch (error) {
      elizaLogger.error('Failed to assign GitHub issue', {
        owner,
        repo,
        issueNumber,
        assignee,
        error,
      });
      throw error;
    }
  }

  /**
   * Close an issue
   */
  async closeIssue(
    owner: string,
    repo: string,
    issueNumber: number,
    comment?: string
  ): Promise<void> {
    try {
      // Add closing comment if provided
      if (comment) {
        await this.addComment(owner, repo, issueNumber, comment);
      }

      await this.octokit.rest.issues.update({
        owner,
        repo,
        issue_number: issueNumber,
        state: 'closed',
      });

      elizaLogger.info('Successfully closed issue', { owner, repo, issueNumber });
    } catch (error) {
      elizaLogger.error('Failed to close GitHub issue', { owner, repo, issueNumber, error });
      throw error;
    }
  }

  /**
   * Get repository information
   */
  async getRepository(owner: string, repo: string) {
    try {
      const { data: repository } = await this.octokit.rest.repos.get({
        owner,
        repo,
      });

      return {
        id: repository.id,
        name: repository.name,
        full_name: repository.full_name,
        description: repository.description,
        html_url: repository.html_url,
        clone_url: repository.clone_url,
        ssh_url: repository.ssh_url,
        default_branch: repository.default_branch,
        language: repository.language,
        topics: repository.topics || [],
      };
    } catch (error) {
      elizaLogger.error('Failed to fetch GitHub repository', { owner, repo, error });
      throw error;
    }
  }

  /**
   * Register a webhook listener for GitHub events
   */
  registerWebhookListener(eventType: string, listener: (event: any) => void): void {
    this.webhookListeners.set(eventType, listener);
    elizaLogger.debug('Registered GitHub webhook listener', { eventType });
  }

  /**
   * Process incoming webhook events
   */
  async processWebhookEvent(eventType: string, payload: any): Promise<void> {
    elizaLogger.debug('Processing GitHub webhook event', {
      eventType,
      payload: { action: payload.action },
    });

    const listener = this.webhookListeners.get(eventType);
    if (listener) {
      try {
        await listener(payload);
      } catch (error) {
        elizaLogger.error('Error in GitHub webhook listener', { eventType, error });
      }
    }
  }
}
