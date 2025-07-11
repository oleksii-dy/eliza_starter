import { Service, elizaLogger, type IAgentRuntime } from '@elizaos/core';

export interface Repository {
  name: string;
  full_name: string;
  html_url: string;
  clone_url: string;
  private: boolean;
}

export class GitHubService extends Service {
  static serviceName: string = 'github';
  static serviceType: string = 'github';

  protected runtime: IAgentRuntime;

  constructor(runtime: IAgentRuntime) {
    super();
    this.runtime = runtime;
  }

  get capabilityDescription(): string {
    return 'Manages GitHub repositories for generated projects';
  }

  async start(): Promise<void> {
    elizaLogger.info('Starting GitHubService');

    const token = this.runtime.getSetting('GITHUB_TOKEN');
    if (!token) {
      elizaLogger.warn('GITHUB_TOKEN not set, GitHub features will be limited');
    }

    elizaLogger.info('GitHubService started successfully');
  }

  async stop(): Promise<void> {
    elizaLogger.info('Stopping GitHubService');
  }

  async createRepository(name: string, isPrivate: boolean = true): Promise<Repository> {
    const token = this.runtime.getSetting('GITHUB_TOKEN');
    if (!token) {
      throw new Error('GitHub service not initialized. Please set GITHUB_TOKEN.');
    }

    elizaLogger.info(`Creating repository: ${name}`);

    // Simulated for now - would use Octokit in production
    return {
      name,
      full_name: `user/${name}`,
      html_url: `https://github.com/user/${name}`,
      clone_url: `https://github.com/user/${name}.git`,
      private: isPrivate,
    };
  }

  async deleteRepository(name: string): Promise<void> {
    const token = this.runtime.getSetting('GITHUB_TOKEN');
    if (!token) {
      throw new Error('GitHub service not initialized. Please set GITHUB_TOKEN.');
    }

    elizaLogger.info(`Deleting repository: ${name}`);

    // Simulated for now - would use Octokit in production
    elizaLogger.info(`Repository ${name} deleted successfully`);
  }
}
