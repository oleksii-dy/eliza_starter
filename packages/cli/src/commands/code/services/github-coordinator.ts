import { elizaLogger } from '@elizaos/core';
import type { TelemetryService } from './telemetry-service.js';
import type { ErrorLogService } from './error-log-service.js';
import { Octokit } from '@octokit/rest';

export interface GitHubCoordinatorOptions {
  token?: string;
  telemetryService: TelemetryService;
  errorLogService: ErrorLogService;
  debug?: boolean;
  organization?: string;
}

export interface GitHubRepository {
  name: string;
  fullName: string;
  url: string;
  isPrivate: boolean;
  branch: string;
  createdAt: string;
}

export interface ArtifactRepository {
  name: string;
  type: 'code' | 'documentation' | 'telemetry' | 'error-logs' | 'scenarios' | 'benchmarks';
  description: string;
  repository: GitHubRepository;
}

export interface CoordinationSession {
  id: string;
  projectName: string;
  repository: GitHubRepository;
  branches: Map<string, string>; // agentId -> branchName
  pullRequests: Map<string, number>; // agentId -> PR number
  createdAt: string;
  status: 'active' | 'completed' | 'cancelled';
}

export class GitHubCoordinator {
  private options: GitHubCoordinatorOptions;
  private octokit: Octokit | null = null;
  private telemetryService: TelemetryService;
  private errorLogService: ErrorLogService;
  private organization: string;
  private _isConnected = false;
  private sessions: Map<string, CoordinationSession> = new Map();
  private artifactRepositories: Map<string, ArtifactRepository> = new Map();

  constructor(options: GitHubCoordinatorOptions) {
    this.options = options;
    this.telemetryService = options.telemetryService;
    this.errorLogService = options.errorLogService;
    this.organization = options.organization || 'elizaos-artifacts';
  }

  async initialize(): Promise<void> {
    try {
      elizaLogger.info('Initializing GitHub Coordinator...');

      if (this.options.token) {
        try {
          this.octokit = new Octokit({
            auth: this.options.token,
          });

          // Verify authentication
          await this.verifyAuthentication();
          
          // Initialize artifact repositories
          await this.initializeArtifactRepositories();
          
          this._isConnected = true;
          elizaLogger.info('✅ GitHub Coordinator initialized with authentication');
        } catch (error) {
          elizaLogger.warn('GitHub authentication failed, continuing without GitHub integration:', error);
          this._isConnected = false;
          this.octokit = null;
        }
      } else {
        elizaLogger.warn('GitHub Coordinator initialized without token - limited functionality');
        this._isConnected = false;
      }

      await this.telemetryService.logEvent('github_coordinator_initialized', {
        connected: this._isConnected,
        organization: this.organization,
      }, 'github');

    } catch (error) {
      await this.errorLogService.logError('Failed to initialize GitHub Coordinator', error as Error, {}, 'github');
      elizaLogger.warn('GitHub Coordinator initialization failed, continuing without GitHub integration');
      this._isConnected = false;
      this.octokit = null;
    }
  }

  private async verifyAuthentication(): Promise<void> {
    if (!this.octokit) {
      throw new Error('GitHub client not initialized');
    }

    try {
      const { data: user } = await this.octokit.rest.users.getAuthenticated();
      elizaLogger.info(`Authenticated as GitHub user: ${user.login}`);
      
      await this.telemetryService.logEvent('github_authentication_verified', {
        username: user.login,
        userType: user.type,
      }, 'github');
    } catch (error) {
      throw new Error('GitHub authentication failed');
    }
  }

  private async initializeArtifactRepositories(): Promise<void> {
    const repositoryConfigs: Array<{
      name: string;
      type: ArtifactRepository['type'];
      description: string;
    }> = [
      {
        name: 'code-artifacts',
        type: 'code',
        description: 'Generated code artifacts and implementations',
      },
      {
        name: 'documentation-artifacts',
        type: 'documentation',
        description: 'Generated documentation and guides',
      },
      {
        name: 'telemetry-artifacts',
        type: 'telemetry',
        description: 'Telemetry data and analytics',
      },
      {
        name: 'error-log-artifacts',
        type: 'error-logs',
        description: 'Error logs and debugging information',
      },
      {
        name: 'scenario-artifacts',
        type: 'scenarios',
        description: 'Test scenarios and benchmarks',
      },
      {
        name: 'benchmark-artifacts',
        type: 'benchmarks',
        description: 'Performance benchmarks and metrics',
      },
    ];

    for (const config of repositoryConfigs) {
      try {
        const repository = await this.ensureArtifactRepository(config.name, config.description);
        
        this.artifactRepositories.set(config.type, {
          name: config.name,
          type: config.type,
          description: config.description,
          repository,
        });
      } catch (error) {
        elizaLogger.warn(`Failed to initialize artifact repository ${config.name}:`, error);
      }
    }

    elizaLogger.info(`Initialized ${this.artifactRepositories.size} artifact repositories`);
  }

  private async ensureArtifactRepository(name: string, description: string): Promise<GitHubRepository> {
    if (!this.octokit) {
      throw new Error('GitHub client not available');
    }

    const fullName = `${this.organization}/${name}`;

    try {
      // Try to get existing repository
      const { data: repo } = await this.octokit.rest.repos.get({
        owner: this.organization,
        repo: name,
      });

      return {
        name: repo.name,
        fullName: repo.full_name,
        url: repo.html_url,
        isPrivate: repo.private,
        branch: repo.default_branch,
        createdAt: repo.created_at,
      };
    } catch (error: any) {
      if (error.status === 404) {
        // Repository doesn't exist, create it
        return await this.createArtifactRepository(name, description);
      }
      throw error;
    }
  }

  private async createArtifactRepository(name: string, description: string): Promise<GitHubRepository> {
    if (!this.octokit) {
      throw new Error('GitHub client not available');
    }

    try {
      const { data: repo } = await this.octokit.rest.repos.createInOrg({
        org: this.organization,
        name,
        description,
        private: true, // Artifact repositories are private by default
        auto_init: true,
        gitignore_template: 'Node',
      });

      elizaLogger.info(`Created artifact repository: ${repo.full_name}`);

      await this.telemetryService.logEvent('artifact_repository_created', {
        name,
        fullName: repo.full_name,
        url: repo.html_url,
      }, 'github');

      return {
        name: repo.name,
        fullName: repo.full_name,
        url: repo.html_url,
        isPrivate: repo.private,
        branch: repo.default_branch,
        createdAt: repo.created_at,
      };
    } catch (error) {
      await this.errorLogService.logError('Failed to create artifact repository', error as Error, { name, description }, 'github');
      throw error;
    }
  }

  async uploadArtifact(
    type: ArtifactRepository['type'],
    fileName: string,
    content: string,
    commitMessage: string,
    path?: string
  ): Promise<string> {
    const artifactRepo = this.artifactRepositories.get(type);
    if (!artifactRepo) {
      throw new Error(`Artifact repository for type ${type} not found`);
    }

    if (!this.octokit) {
      throw new Error('GitHub client not available');
    }

    try {
      const filePath = path ? `${path}/${fileName}` : fileName;
      const owner = this.organization;
      const repo = artifactRepo.repository.name;

      // Check if file already exists
      let sha: string | undefined;
      try {
        const { data: existingFile } = await this.octokit.rest.repos.getContent({
          owner,
          repo,
          path: filePath,
        });

        if ('sha' in existingFile) {
          sha = existingFile.sha;
        }
      } catch (error: any) {
        if (error.status !== 404) {
          throw error;
        }
        // File doesn't exist, that's fine
      }

      // Create or update the file
      const { data: result } = await this.octokit.rest.repos.createOrUpdateFileContents({
        owner,
        repo,
        path: filePath,
        message: commitMessage,
        content: Buffer.from(content).toString('base64'),
        sha, // Include SHA if updating existing file
      });

      const fileUrl = `https://github.com/${owner}/${repo}/blob/${artifactRepo.repository.branch}/${filePath}`;

      await this.telemetryService.logEvent('artifact_uploaded', {
        type,
        fileName,
        filePath,
        fileUrl,
        contentSize: content.length,
        repository: artifactRepo.repository.fullName,
      }, 'github');

      elizaLogger.info(`Uploaded artifact: ${fileUrl}`);
      return fileUrl;

    } catch (error) {
      await this.errorLogService.logError('Failed to upload artifact', error as Error, {
        type,
        fileName,
        repository: artifactRepo.repository.fullName,
      }, 'github');
      throw error;
    }
  }

  async createCoordinationSession(projectName: string): Promise<string> {
    if (!this._isConnected) {
      throw new Error('GitHub Coordinator not connected');
    }

    const sessionId = `session-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    try {
      // Create a dedicated repository for this project
      const repository = await this.createProjectRepository(projectName, sessionId);

      const session: CoordinationSession = {
        id: sessionId,
        projectName,
        repository,
        branches: new Map(),
        pullRequests: new Map(),
        createdAt: new Date().toISOString(),
        status: 'active',
      };

      this.sessions.set(sessionId, session);

      await this.telemetryService.logEvent('coordination_session_created', {
        sessionId,
        projectName,
        repository: repository.fullName,
      }, 'github');

      elizaLogger.info(`Created coordination session: ${sessionId} for project: ${projectName}`);
      return sessionId;

    } catch (error) {
      await this.errorLogService.logError('Failed to create coordination session', error as Error, {
        projectName,
        sessionId,
      }, 'github');
      throw error;
    }
  }

  private async createProjectRepository(projectName: string, sessionId: string): Promise<GitHubRepository> {
    if (!this.octokit) {
      throw new Error('GitHub client not available');
    }

    const repoName = `project-${projectName.toLowerCase().replace(/[^a-z0-9-]/g, '-')}-${sessionId.split('-').slice(-1)[0]}`;
    
    try {
      const { data: repo } = await this.octokit.rest.repos.createInOrg({
        org: this.organization,
        name: repoName,
        description: `Coordinated development project: ${projectName}`,
        private: true,
        auto_init: true,
        gitignore_template: 'Node',
      });

      return {
        name: repo.name,
        fullName: repo.full_name,
        url: repo.html_url,
        isPrivate: repo.private,
        branch: repo.default_branch,
        createdAt: repo.created_at,
      };
    } catch (error) {
      await this.errorLogService.logError('Failed to create project repository', error as Error, {
        repoName,
        projectName,
      }, 'github');
      throw error;
    }
  }

  async assignAgentToBranch(sessionId: string, agentId: string, role: string): Promise<string> {
    const session = this.sessions.get(sessionId);
    if (!session) {
      throw new Error(`Coordination session ${sessionId} not found`);
    }

    if (!this.octokit) {
      throw new Error('GitHub client not available');
    }

    const branchName = `agent/${role}-${agentId}`;
    
    try {
      // Create branch for the agent
      const { data: mainBranch } = await this.octokit.rest.repos.getBranch({
        owner: this.organization,
        repo: session.repository.name,
        branch: session.repository.branch,
      });

      await this.octokit.rest.git.createRef({
        owner: this.organization,
        repo: session.repository.name,
        ref: `refs/heads/${branchName}`,
        sha: mainBranch.commit.sha,
      });

      session.branches.set(agentId, branchName);

      await this.telemetryService.logEvent('agent_branch_assigned', {
        sessionId,
        agentId,
        role,
        branchName,
        repository: session.repository.fullName,
      }, 'github');

      elizaLogger.info(`Assigned agent ${agentId} to branch: ${branchName}`);
      return branchName;

    } catch (error) {
      await this.errorLogService.logError('Failed to assign agent to branch', error as Error, {
        sessionId,
        agentId,
        role,
      }, 'github');
      throw error;
    }
  }

  async commitAgentWork(
    sessionId: string,
    agentId: string,
    files: Array<{ path: string; content: string }>,
    commitMessage: string
  ): Promise<string> {
    const session = this.sessions.get(sessionId);
    if (!session) {
      throw new Error(`Coordination session ${sessionId} not found`);
    }

    const branchName = session.branches.get(agentId);
    if (!branchName) {
      throw new Error(`No branch assigned to agent ${agentId}`);
    }

    if (!this.octokit) {
      throw new Error('GitHub client not available');
    }

    try {
      // Get the current tree
      const { data: branch } = await this.octokit.rest.repos.getBranch({
        owner: this.organization,
        repo: session.repository.name,
        branch: branchName,
      });

      // Create blobs for all files
      const blobs = await Promise.all(
        files.map(async (file) => {
          const { data: blob } = await this.octokit!.rest.git.createBlob({
            owner: this.organization,
            repo: session.repository.name,
            content: Buffer.from(file.content).toString('base64'),
            encoding: 'base64',
          });
          return { path: file.path, sha: blob.sha };
        })
      );

      // Create new tree
      const { data: tree } = await this.octokit.rest.git.createTree({
        owner: this.organization,
        repo: session.repository.name,
        base_tree: branch.commit.commit.tree.sha,
        tree: blobs.map(blob => ({
          path: blob.path,
          mode: '100644',
          type: 'blob',
          sha: blob.sha,
        })),
      });

      // Create commit
      const { data: commit } = await this.octokit.rest.git.createCommit({
        owner: this.organization,
        repo: session.repository.name,
        message: commitMessage,
        tree: tree.sha,
        parents: [branch.commit.sha],
      });

      // Update branch reference
      await this.octokit.rest.git.updateRef({
        owner: this.organization,
        repo: session.repository.name,
        ref: `heads/${branchName}`,
        sha: commit.sha,
      });

      const commitUrl = `https://github.com/${session.repository.fullName}/commit/${commit.sha}`;

      await this.telemetryService.logEvent('agent_work_committed', {
        sessionId,
        agentId,
        branchName,
        commitSha: commit.sha,
        filesCount: files.length,
        commitUrl,
      }, 'github');

      elizaLogger.info(`Agent ${agentId} committed work: ${commitUrl}`);
      return commitUrl;

    } catch (error) {
      await this.errorLogService.logError('Failed to commit agent work', error as Error, {
        sessionId,
        agentId,
        branchName,
        filesCount: files.length,
      }, 'github');
      throw error;
    }
  }

  async createPullRequest(sessionId: string, agentId: string, title: string, description: string): Promise<number> {
    const session = this.sessions.get(sessionId);
    if (!session) {
      throw new Error(`Coordination session ${sessionId} not found`);
    }

    const branchName = session.branches.get(agentId);
    if (!branchName) {
      throw new Error(`No branch assigned to agent ${agentId}`);
    }

    if (!this.octokit) {
      throw new Error('GitHub client not available');
    }

    try {
      const { data: pr } = await this.octokit.rest.pulls.create({
        owner: this.organization,
        repo: session.repository.name,
        title,
        body: description,
        head: branchName,
        base: session.repository.branch,
      });

      session.pullRequests.set(agentId, pr.number);

      await this.telemetryService.logEvent('pull_request_created', {
        sessionId,
        agentId,
        prNumber: pr.number,
        title,
        url: pr.html_url,
      }, 'github');

      elizaLogger.info(`Created PR #${pr.number} for agent ${agentId}: ${pr.html_url}`);
      return pr.number;

    } catch (error) {
      await this.errorLogService.logError('Failed to create pull request', error as Error, {
        sessionId,
        agentId,
        title,
      }, 'github');
      throw error;
    }
  }

  async isConnected(): Promise<boolean> {
    return this._isConnected;
  }

  async getSessionStatus(sessionId: string): Promise<CoordinationSession | null> {
    return this.sessions.get(sessionId) || null;
  }

  async listArtifactRepositories(): Promise<ArtifactRepository[]> {
    return Array.from(this.artifactRepositories.values());
  }

  async shutdown(): Promise<void> {
    try {
      elizaLogger.info('Shutting down GitHub Coordinator...');

      // Complete all active sessions
      for (const [sessionId, session] of this.sessions) {
        if (session.status === 'active') {
          session.status = 'completed';
          await this.telemetryService.logEvent('coordination_session_completed', {
            sessionId,
            projectName: session.projectName,
            duration: Date.now() - new Date(session.createdAt).getTime(),
          }, 'github');
        }
      }

      await this.telemetryService.logEvent('github_coordinator_shutdown', {
        totalSessions: this.sessions.size,
        artifactRepositories: this.artifactRepositories.size,
      }, 'github');

      elizaLogger.info('✅ GitHub Coordinator shutdown completed');
    } catch (error) {
      await this.errorLogService.logError('Error during GitHub Coordinator shutdown', error as Error, {}, 'github');
    }
  }
}