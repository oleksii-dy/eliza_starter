/**
 * Repository Cloner - Core Infrastructure for Training Data Generation
 *
 * Handles cloning and managing repositories for training data extraction.
 * Supports both main ElizaOS repo and plugin repositories discovery.
 * Features real git operations with authentication, error handling, and progress tracking.
 */

import { simpleGit, SimpleGit, CleanOptions } from 'simple-git';
import * as fs from 'fs/promises';
import * as path from 'path';
import type { IAgentRuntime } from '@elizaos/core';
import { elizaLogger } from '@elizaos/core';
import { getTrainingConfig } from '../../config/training-config.js';
import {
  NetworkError,
  APIError,
  RateLimitError,
  AuthenticationError,
  FileSystemError,
  ResourceError,
  ErrorHandler,
  withErrorHandling,
  withRetry,
  safely,
} from '../../errors/training-errors.js';

export interface RepositoryInfo {
  url: string;
  name: string;
  localPath: string;
  type: 'core' | 'plugin' | 'docs';
  lastUpdated: string;
  commit?: string;
  branch?: string;
  size?: number;
  fileCount?: number;
}

export interface CloneProgress {
  repository: string;
  status: 'starting' | 'cloning' | 'completed' | 'failed';
  progress: number;
  message: string;
  error?: string;
}

export interface CloneOptions {
  depth?: number;
  branch?: string;
  timeout?: number;
  retries?: number;
  skipExisting?: boolean;
}

export class RepositoryCloner {
  private workspaceDir: string;
  private clonedRepos: Map<string, RepositoryInfo> = new Map();
  private git: SimpleGit;
  private runtime?: IAgentRuntime;
  private githubToken?: string;
  private config: ReturnType<typeof getTrainingConfig>;

  constructor(workspaceDir: string = './training-workspace', runtime?: IAgentRuntime) {
    this.workspaceDir = path.resolve(workspaceDir);
    this.runtime = runtime;
    this.config = getTrainingConfig(runtime);
    this.githubToken = runtime?.getSetting('GITHUB_TOKEN') as string;

    // Ensure workspace directory exists before initializing git
    this.initializeWorkspace();

    // Initialize simple-git with configuration
    this.git = simpleGit({
      baseDir: this.workspaceDir,
      binary: 'git',
      maxConcurrentProcesses: 3,
      timeout: {
        block: 60000, // 60 seconds for git operations
      },
    });
  }

  /**
   * Initialize workspace directory synchronously
   */
  private initializeWorkspace(): void {
    try {
      const fs = require('fs');
      if (!fs.existsSync(this.workspaceDir)) {
        fs.mkdirSync(this.workspaceDir, { recursive: true });
      }
    } catch (error) {
      // If sync creation fails, we'll handle it later in async operations
      elizaLogger.warn('Failed to create workspace directory synchronously', {
        error: error instanceof Error ? error.message : String(error),
        workspaceDir: this.workspaceDir,
      });
    }
  }

  /**
   * Clone the main ElizaOS repository with real git operations
   */
  async cloneMainRepository(options: CloneOptions = {}): Promise<RepositoryInfo> {
    return await withRetry(
      async () => {
        const repoUrl = this.config.getAPIConfig().github.defaultRepository;

        // Validate repository URL
        ErrorHandler.validateURL(repoUrl, 'GITHUB_DEFAULT_REPOSITORY');

        elizaLogger.info('Starting main ElizaOS repository clone...');
        elizaLogger.info('📥 Cloning main ElizaOS repository...');

        const repoInfo = await this.cloneRepository(repoUrl, 'core', {
          depth: 1, // Shallow clone for faster downloads
          timeout: 120000, // 2 minutes for large repository
          retries: 3,
          ...options,
        });

        elizaLogger.info(`Successfully cloned ElizaOS repository`, {
          path: repoInfo.localPath,
          commit: repoInfo.commit,
          fileCount: repoInfo.fileCount,
        });

        elizaLogger.info(`✅ Cloned main ElizaOS repository to: ${repoInfo.localPath}`);
        elizaLogger.info(
          `   📊 Files: ${repoInfo.fileCount}, Commit: ${repoInfo.commit?.substring(0, 8)}`
        );

        return repoInfo;
      },
      'clone_main_repository',
      { repoType: 'core' },
      3
    );
  }

  /**
   * Discover and clone all plugin repositories with progress tracking
   */
  async cloneAllPluginRepositories(
    options: CloneOptions = {},
    progressCallback?: (progress: CloneProgress) => void
  ): Promise<RepositoryInfo[]> {
    elizaLogger.info('🔍 Discovering plugin repositories...');
    elizaLogger.info('Starting plugin repository discovery...');

    const pluginRepos = await this.discoverPluginRepositories();
    const clonedPlugins: RepositoryInfo[] = [];
    const failures: Array<{ url: string; error: string }> = [];

    elizaLogger.info(`📦 Found ${pluginRepos.length} plugin repositories`);
    elizaLogger.info(`Discovered ${pluginRepos.length} plugin repositories`);

    let completed = 0;
    for (const repoUrl of pluginRepos) {
      const repoName = this.extractRepoName(repoUrl);

      try {
        // Progress callback
        progressCallback?.({
          repository: repoName,
          status: 'starting',
          progress: (completed / pluginRepos.length) * 100,
          message: `Starting clone of ${repoName}...`,
        });

        const repoInfo = await this.cloneRepository(repoUrl, 'plugin', {
          depth: 1,
          timeout: 60000, // 1 minute per plugin
          retries: 2,
          ...options,
        });

        clonedPlugins.push(repoInfo);
        completed++;

        progressCallback?.({
          repository: repoName,
          status: 'completed',
          progress: (completed / pluginRepos.length) * 100,
          message: `✅ Cloned ${repoName} (${repoInfo.fileCount} files)`,
        });

        elizaLogger.info(`✅ Cloned plugin: ${repoInfo.name} (${repoInfo.fileCount} files)`);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        failures.push({ url: repoUrl, error: errorMessage });
        completed++;

        progressCallback?.({
          repository: repoName,
          status: 'failed',
          progress: (completed / pluginRepos.length) * 100,
          message: `❌ Failed to clone ${repoName}`,
          error: errorMessage,
        });

        elizaLogger.warn(`Failed to clone plugin repository`, {
          url: repoUrl,
          error: errorMessage,
        });

        elizaLogger.warn(`⚠️  Failed to clone ${repoUrl}: ${errorMessage}`);
      }
    }

    // Summary
    elizaLogger.info(`\n📊 Plugin Repository Clone Summary:`);
    elizaLogger.info(`✅ Successfully cloned: ${clonedPlugins.length}`);
    elizaLogger.info(`❌ Failed: ${failures.length}`);

    if (failures.length > 0) {
      elizaLogger.info(`\n❌ Failed repositories:`);
      failures.forEach((failure) => {
        elizaLogger.info(`   - ${failure.url}: ${failure.error}`);
      });
    }

    elizaLogger.info(`Plugin repository cloning completed`, {
      successful: clonedPlugins.length,
      failed: failures.length,
      totalFiles: clonedPlugins.reduce((sum, repo) => sum + (repo.fileCount || 0), 0),
    });

    return clonedPlugins;
  }

  /**
   * Clone a specific repository with real git operations, authentication, and error handling
   */
  async cloneRepository(
    repoUrl: string,
    type: 'core' | 'plugin' | 'docs' = 'plugin',
    options: CloneOptions = {}
  ): Promise<RepositoryInfo> {
    const repoName = this.extractRepoName(repoUrl);
    const targetDir = path.join(this.workspaceDir, type, repoName);

    const {
      depth = 1,
      branch = 'main',
      timeout = 60000,
      retries = 1,
      skipExisting = false,
    } = options;

    // Check if repository already exists
    if (skipExisting && (await this.directoryExists(targetDir))) {
      elizaLogger.info(`⏭️  Skipping ${repoName} (already exists)`);
      return this.getExistingRepoInfo(targetDir, repoUrl, type, repoName);
    }

    // Ensure workspace directory exists
    await fs.mkdir(path.dirname(targetDir), { recursive: true });

    // Clean up any existing directory
    await this.cleanupDirectory(targetDir);

    // Prepare clone URL with authentication if available
    const cloneUrl = this.prepareCloneUrl(repoUrl);

    let lastError: Error | null = null;

    // Use error handler with retry logic for clone operation
    return await ErrorHandler.handleError(
      new Error('Repository clone operation'),
      'clone_repository',
      { repoName, repoUrl, targetDir, type },
      async () => {
        elizaLogger.info(`📥 Cloning ${repoName}...`);
        elizaLogger.debug(`Cloning repository`, {
          url: repoUrl,
          targetDir,
          depth,
          branch,
        });

        // Create git instance for this clone operation
        const git = simpleGit({
          timeout: {
            block: timeout,
          },
        });

        try {
          // Perform the clone with proper options
          await git.clone(cloneUrl, targetDir, [
            '--depth',
            depth.toString(),
            '--branch',
            branch,
            '--single-branch',
          ]);
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : String(error);
          
          // Categorize git errors properly
          if (errorMessage.includes('Authentication failed') || errorMessage.includes('access denied')) {
            throw new AuthenticationError('Git', `Repository access denied: ${repoUrl}`);
          }
          
          if (errorMessage.includes('not found') || errorMessage.includes('does not exist')) {
            throw new ResourceError('repository', 'clone', `Repository not found: ${repoUrl}`);
          }
          
          if (errorMessage.includes('timeout') || errorMessage.includes('network')) {
            throw new NetworkError(`Git clone failed: ${errorMessage}`, repoUrl);
          }
          
          // Generic git error
          throw new ResourceError('git', 'clone', errorMessage, { repoUrl, targetDir });
        }

        // Get repository information with error handling
        const repoGit = simpleGit(targetDir);
        const [log, status] = await Promise.all([
          safely(
            () => repoGit.log({ maxCount: 1 }),
            'get_git_log',
            { targetDir }
          ),
          safely(
            () => repoGit.status(),
            'get_git_status',
            { targetDir }
          ),
        ]);

        // Count files in repository with error handling
        const [fileCount, size] = await Promise.all([
          safely(
            () => this.countFiles(targetDir),
            'count_repository_files',
            { targetDir }
          ) || 0,
          safely(
            () => this.calculateDirectorySize(targetDir),
            'calculate_repository_size',
            { targetDir }
          ) || 0,
        ]);

        const repoInfo: RepositoryInfo = {
          url: repoUrl,
          name: repoName,
          localPath: targetDir,
          type,
          lastUpdated: new Date().toISOString(),
          commit: log?.latest?.hash,
          branch: status?.current || branch,
          size,
          fileCount,
        };

        this.clonedRepos.set(repoName, repoInfo);

        elizaLogger.info(`Successfully cloned repository`, {
          name: repoName,
          commit: repoInfo.commit,
          fileCount: repoInfo.fileCount,
          size: repoInfo.size,
        });

        return repoInfo;
      }
    );
  }

  /**
   * Discover all plugin repositories in elizaos-plugins organization
   */
  async discoverPluginRepositories(): Promise<string[]> {
    try {
      // First try elizaos-plugins org
      let repos = await this.fetchGitHubRepos('elizaos-plugins');

      // Also check main elizaOS org for plugins
      const mainOrgRepos = await this.fetchGitHubRepos('elizaOS');
      const pluginReposFromMain = mainOrgRepos.filter(
        (repo) => repo.name.startsWith('plugin-') || repo.name.includes('plugin')
      );

      repos = repos.concat(pluginReposFromMain);

      return repos
        .filter((repo) => repo.name.startsWith('plugin-'))
        .map((repo) => repo.clone_url)
        .filter((url, index, self) => self.indexOf(url) === index); // Remove duplicates
    } catch (error) {
      elizaLogger.warn('Failed to discover repositories via API, using fallback list');
      return this.getFallbackPluginList();
    }
  }

  /**
   * Fetch repositories from GitHub organization with authentication
   */
  private async fetchGitHubRepos(org: string): Promise<any[]> {
    return await withRetry(
      async () => {
        const allRepos: any[] = [];
        let page = 1;
        const perPage = 100;

        // Prepare headers with authentication if available
        const headers: Record<string, string> = {
          Accept: 'application/vnd.github.v3+json',
          'User-Agent': 'ElizaOS-Training-System',
        };

        if (this.githubToken) {
          headers['Authorization'] = `Bearer ${this.githubToken}`;
        }

        elizaLogger.info(`Fetching repositories from GitHub org: ${org}`, {
          authenticated: !!this.githubToken,
        });

        while (true) {
          const url = `${this.config.getAPIConfig().github.apiUrl}/orgs/${org}/repos?per_page=${perPage}&page=${page}&sort=updated&direction=desc`;

          elizaLogger.debug(`Fetching GitHub API page ${page}`, { url });

          const response = await fetch(url, { headers });

          // Handle different response statuses with proper error types
          if (response.status === 403) {
            const rateLimitReset = response.headers.get('x-ratelimit-reset');
            if (rateLimitReset) {
              const resetTime = new Date(parseInt(rateLimitReset) * 1000);
              throw new RateLimitError('GitHub API', resetTime.getTime());
            }
            throw new AuthenticationError('GitHub', 'API access forbidden - check token permissions');
          }

          if (response.status === 401) {
            throw new AuthenticationError('GitHub', 'Invalid or expired authentication token');
          }

          if (response.status === 404) {
            elizaLogger.warn(`Organization ${org} not found or not accessible`);
            break;
          }

          if (!response.ok) {
            throw new APIError(
              'GitHub',
              `API request failed: ${response.statusText}`,
              response.status,
              { org, page, url }
            );
          }

          const repos = await response.json();

          if (!Array.isArray(repos)) {
            throw new APIError(
              'GitHub',
              'Invalid response format - expected array of repositories',
              response.status,
              { org, page, responseType: typeof repos }
            );
          }

          if (repos.length === 0) {
            break; // No more repos
          }

          elizaLogger.debug(`Fetched ${repos.length} repositories from page ${page}`);
          allRepos.push(...repos);
          page++;

          // Respectful rate limiting using configuration
          const delay = this.githubToken
            ? this.config.getAPIConfig().github.rateLimitDelay.withToken
            : this.config.getAPIConfig().github.rateLimitDelay.withoutToken;
          await new Promise((resolve) => setTimeout(resolve, delay));
        }

        elizaLogger.info(`Successfully fetched ${allRepos.length} repositories from ${org}`);
        return allRepos;
      },
      'fetch_github_repos',
      { org, authenticated: !!this.githubToken },
      3
    );
  }

  /**
   * Get fallback list of known plugin repositories
   */
  private getFallbackPluginList(): string[] {
    return [
      'https://github.com/elizaOS/plugin-sql.git',
      'https://github.com/elizaOS/plugin-openai.git',
      // Add more known plugins as needed
    ];
  }

  /**
   * Extract repository name from URL
   */
  private extractRepoName(repoUrl: string): string {
    return repoUrl.split('/').pop()?.replace('.git', '') || 'unknown';
  }

  /**
   * Get information about cloned repositories
   */
  getClonedRepositories(): RepositoryInfo[] {
    return Array.from(this.clonedRepos.values());
  }

  /**
   * Get workspace directory
   */
  getWorkspaceDir(): string {
    return this.workspaceDir;
  }

  /**
   * Clean up workspace
   */
  async cleanup(): Promise<void> {
    try {
      await fs.rm(this.workspaceDir, { recursive: true, force: true });
      elizaLogger.info(`🧹 Cleaned up workspace: ${this.workspaceDir}`);
    } catch (error) {
      elizaLogger.warn('Failed to clean up workspace:', error);
    }
  }

  /**
   * Get repository statistics
   */
  async getRepositoryStats(): Promise<{
    totalRepos: number;
    coreRepos: number;
    pluginRepos: number;
    totalSizeMB: number;
  }> {
    const repos = this.getClonedRepositories();
    let totalSize = 0;

    for (const repo of repos) {
      try {
        const stats = await this.getDirectorySize(repo.localPath);
        totalSize += stats;
      } catch (error) {
        // Skip if can't get size
      }
    }

    return {
      totalRepos: repos.length,
      coreRepos: repos.filter((r) => r.type === 'core').length,
      pluginRepos: repos.filter((r) => r.type === 'plugin').length,
      totalSizeMB: Math.round(totalSize / (1024 * 1024)),
    };
  }

  /**
   * Check if directory exists
   */
  private async directoryExists(dirPath: string): Promise<boolean> {
    try {
      const stats = await fs.stat(dirPath);
      return stats.isDirectory();
    } catch {
      return false;
    }
  }

  /**
   * Clean up directory safely
   */
  private async cleanupDirectory(dirPath: string): Promise<void> {
    await safely(
      async () => {
        await fs.rm(dirPath, { recursive: true, force: true });
      },
      'cleanup_directory',
      { dirPath }
    );
  }

  /**
   * Prepare clone URL with authentication if available
   */
  private prepareCloneUrl(repoUrl: string): string {
    if (this.githubToken && repoUrl.includes('github.com')) {
      // Add GitHub token for authenticated access
      return repoUrl.replace('https://github.com', `https://${this.githubToken}@github.com`);
    }
    return repoUrl;
  }

  /**
   * Get existing repository information
   */
  private async getExistingRepoInfo(
    targetDir: string,
    repoUrl: string,
    type: 'core' | 'plugin' | 'docs',
    repoName: string
  ): Promise<RepositoryInfo> {
    try {
      const repoGit = simpleGit(targetDir);
      const [log, status] = await Promise.all([repoGit.log({ maxCount: 1 }), repoGit.status()]);

      const fileCount = await this.countFiles(targetDir);
      const size = await this.calculateDirectorySize(targetDir);

      return {
        url: repoUrl,
        name: repoName,
        localPath: targetDir,
        type,
        lastUpdated: new Date().toISOString(),
        commit: log.latest?.hash,
        branch: status.current || 'main',
        size,
        fileCount,
      };
    } catch (error) {
      // Fallback for directories without git info
      return {
        url: repoUrl,
        name: repoName,
        localPath: targetDir,
        type,
        lastUpdated: new Date().toISOString(),
        fileCount: await this.countFiles(targetDir),
        size: await this.calculateDirectorySize(targetDir),
      };
    }
  }

  /**
   * Count files in directory (excluding .git)
   */
  private async countFiles(dirPath: string): Promise<number> {
    try {
      let count = 0;

      const countRecursive = async (currentPath: string): Promise<void> => {
        const entries = await fs.readdir(currentPath, { withFileTypes: true });

        for (const entry of entries) {
          if (entry.name === '.git') continue; // Skip .git directory

          const fullPath = path.join(currentPath, entry.name);

          if (entry.isDirectory()) {
            await countRecursive(fullPath);
          } else {
            count++;
          }
        }
      };

      await countRecursive(dirPath);
      return count;
    } catch (error) {
      elizaLogger.warn(`Failed to count files in ${dirPath}`, { error });
      return 0;
    }
  }

  /**
   * Calculate directory size in bytes (excluding .git)
   */
  private async calculateDirectorySize(dirPath: string): Promise<number> {
    try {
      let totalSize = 0;

      const calculateRecursive = async (currentPath: string): Promise<void> => {
        const entries = await fs.readdir(currentPath, { withFileTypes: true });

        for (const entry of entries) {
          if (entry.name === '.git') continue; // Skip .git directory

          const fullPath = path.join(currentPath, entry.name);

          if (entry.isDirectory()) {
            await calculateRecursive(fullPath);
          } else {
            const stats = await fs.stat(fullPath);
            totalSize += stats.size;
          }
        }
      };

      await calculateRecursive(dirPath);
      return totalSize;
    } catch (error) {
      elizaLogger.warn(`Failed to calculate directory size for ${dirPath}`, { error });
      return 0;
    }
  }

  /**
   * Get directory size in bytes
   */
  private async getDirectorySize(dirPath: string): Promise<number> {
    return this.calculateDirectorySize(dirPath);
  }
}

elizaLogger.info('✅ Repository cloner module loaded');
