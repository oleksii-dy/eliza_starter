#!/usr/bin/env tsx

import { Octokit } from '@octokit/rest';
import { BaseScript } from './base-script';
import { config } from './config';
import { logger } from './logger';
import { githubRateLimiter } from './rate-limiter';
import { writeFileSync, readFileSync, existsSync, mkdirSync } from 'fs';
import { join } from 'path';

interface PluginInfo {
  name: string;
  repo: string;
  owner: string;
  version?: string;
  description?: string;
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
  hasWorkspaceRefs?: boolean;
  lastCommit?: string;
  stars?: number;
  issues?: number;
  inRegistry?: boolean;
  packageJsonError?: string;
}

interface RegistryPlugin {
  name: string;
  description: string;
  repo: string;
  version?: string;
}

class AnalyzePluginRegistryScript extends BaseScript {
  private octokit!: Octokit;
  private plugins: PluginInfo[] = [];
  private registryPlugins: RegistryPlugin[] = [];

  constructor() {
    super('analyze-plugin-registry');
  }

  protected getRequiredEnvVars(): string[] {
    return ['GITHUB_TOKEN'];
  }

  protected async validate(): Promise<void> {
    await super.validate();

    // Initialize Octokit with rate limiting
    this.octokit = new Octokit({
      auth: config.github.token,
    });

    // Test GitHub connection
    try {
      const { data: user } = await githubRateLimiter.execute(
        () => this.octokit.users.getAuthenticated(),
        'auth-check'
      );
      logger.info('GitHub authenticated', { user: user.login });
    } catch (error) {
      logger.error('GitHub authentication failed', error);
      throw error;
    }
  }

  async execute(): Promise<void> {
    logger.info('Starting plugin registry analysis');

    // Step 1: Fetch current registry
    await this.fetchRegistry();

    // Step 2: Discover all plugins
    await this.discoverPlugins();

    // Step 3: Analyze each plugin
    await this.analyzePlugins();

    // Step 4: Generate reports
    await this.generateReports();

    // Step 5: Create PRs for missing plugins
    if (config.features.createPRs && !this.isDryRun()) {
      await this.createPullRequests();
    }
  }

  private async fetchRegistry(): Promise<void> {
    logger.startOperation('Fetching plugin registry');

    try {
      const { data } = await githubRateLimiter.execute(
        () =>
          this.octokit.repos.getContent({
            owner: config.registry.owner,
            repo: config.registry.repo,
            path: config.registry.path,
          }),
        'fetch-registry'
      );

      if ('content' in data && data.content) {
        const content = Buffer.from(data.content, 'base64').toString('utf-8');
        const lines = content.split('\n');
        
        for (const line of lines) {
          const match = line.match(/\[(.+?)\]\((.+?)\)/);
          if (match) {
            const [, name, repo] = match;
            const description = line.split(' - ')[1]?.trim() || '';
            this.registryPlugins.push({
              name,
              description,
              repo,
            });
          }
        }
      }

      logger.endOperation('Fetching plugin registry', {
        count: this.registryPlugins.length,
      });
    } catch (error) {
      logger.error('Failed to fetch registry', error);
      throw error;
    }
  }

  private async discoverPlugins(): Promise<void> {
    logger.startOperation('Discovering plugins');

    try {
      let page = 1;
      let hasMore = true;

      while (hasMore) {
        const { data: repos } = await githubRateLimiter.execute(
          () =>
            this.octokit.repos.listForOrg({
              org: 'elizaos',
              type: 'public',
              per_page: 100,
              page,
            }),
          `list-repos-page-${page}`
        );

        for (const repo of repos) {
          if (repo.name.startsWith('plugin-')) {
            const inRegistry = this.registryPlugins.some(
              (p) => p.repo.includes(repo.name)
            );

            this.plugins.push({
              name: repo.name,
              repo: repo.full_name,
              owner: repo.owner.login,
              description: repo.description || undefined,
              stars: repo.stargazers_count,
              issues: repo.open_issues_count,
              inRegistry,
            });
          }
        }

        hasMore = repos.length === 100;
        page++;

        this.updateProgress(
          this.plugins.length,
          this.plugins.length + (hasMore ? 100 : 0),
          'Discovering plugins'
        );
      }

      logger.endOperation('Discovering plugins', {
        total: this.plugins.length,
        inRegistry: this.plugins.filter((p) => p.inRegistry).length,
      });
    } catch (error) {
      logger.error('Failed to discover plugins', error);
      throw error;
    }
  }

  private async analyzePlugins(): Promise<void> {
    logger.startOperation('Analyzing plugins');

    const results = await this.executeParallel(
      this.plugins,
      async (plugin, index) => {
        try {
          // Fetch package.json
          const { data } = await githubRateLimiter.execute(
            () =>
              this.octokit.repos.getContent({
                owner: plugin.owner,
                repo: plugin.name,
                path: 'package.json',
              }),
            `fetch-package-${plugin.name}`
          );

          if ('content' in data && data.content) {
            const packageJson = JSON.parse(
              Buffer.from(data.content, 'base64').toString('utf-8')
            );

            plugin.version = packageJson.version;
            plugin.dependencies = packageJson.dependencies;
            plugin.devDependencies = packageJson.devDependencies;

            // Check for workspace references
            const allDeps = {
              ...packageJson.dependencies,
              ...packageJson.devDependencies,
            };

            plugin.hasWorkspaceRefs = Object.values(allDeps).some(
              (version) => typeof version === 'string' && version.includes('workspace:')
            );
          }

          // Get latest commit
          const { data: commits } = await githubRateLimiter.execute(
            () =>
              this.octokit.repos.listCommits({
                owner: plugin.owner,
                repo: plugin.name,
                per_page: 1,
              }),
            `fetch-commits-${plugin.name}`
          );

          if (commits.length > 0) {
            plugin.lastCommit = commits[0].sha.substring(0, 7);
          }
        } catch (error: any) {
          plugin.packageJsonError = error.message;
          logger.warn(`Failed to analyze ${plugin.name}`, { error: error.message });
        }

        return plugin;
      },
      {
        maxConcurrency: 5,
        onProgress: (completed) => {
          this.updateProgress(completed, this.plugins.length, 'Analyzing plugins');
        },
      }
    );

    logger.endOperation('Analyzing plugins', {
      analyzed: results.length,
      errors: this.plugins.filter((p) => p.packageJsonError).length,
    });
  }

  private async generateReports(): Promise<void> {
    logger.startOperation('Generating reports');

    // Ensure output directory exists
    if (!existsSync(config.paths.pluginData)) {
      mkdirSync(config.paths.pluginData, { recursive: true });
    }

    // Save raw data
    const dataFile = join(config.paths.pluginData, 'registry-analysis.json');
    writeFileSync(
      dataFile,
      JSON.stringify(
        {
          timestamp: new Date().toISOString(),
          registry: this.registryPlugins,
          discovered: this.plugins,
          stats: this.calculateStats(),
        },
        null,
        2
      )
    );

    // Generate markdown report
    const reportFile = join(config.paths.pluginData, 'registry-report.md');
    const report = this.generateMarkdownReport();
    writeFileSync(reportFile, report);

    logger.endOperation('Generating reports', {
      dataFile,
      reportFile,
    });

    // Log summary
    logger.info('Analysis Summary', this.calculateStats());
  }

  private calculateStats() {
    const total = this.plugins.length;
    const inRegistry = this.plugins.filter((p) => p.inRegistry).length;
    const missing = this.plugins.filter((p) => !p.inRegistry);
    const withWorkspaceRefs = this.plugins.filter((p) => p.hasWorkspaceRefs).length;
    const withErrors = this.plugins.filter((p) => p.packageJsonError).length;

    return {
      total,
      inRegistry,
      missing: missing.length,
      withWorkspaceRefs,
      withErrors,
      coverage: Math.round((inRegistry / total) * 100) + '%',
    };
  }

  private generateMarkdownReport(): string {
    const stats = this.calculateStats();
    const missing = this.plugins.filter((p) => !p.inRegistry);

    let report = `# ElizaOS Plugin Registry Analysis\n\n`;
    report += `Generated: ${new Date().toISOString()}\n\n`;
    report += `## Summary\n\n`;
    report += `- Total plugins discovered: ${stats.total}\n`;
    report += `- Plugins in registry: ${stats.inRegistry}\n`;
    report += `- Missing from registry: ${stats.missing}\n`;
    report += `- Registry coverage: ${stats.coverage}\n`;
    report += `- Plugins with workspace references: ${stats.withWorkspaceRefs}\n`;
    report += `- Plugins with errors: ${stats.withErrors}\n\n`;

    if (missing.length > 0) {
      report += `## Missing Plugins\n\n`;
      report += `The following plugins are not in the registry:\n\n`;
      for (const plugin of missing) {
        report += `- [${plugin.name}](https://github.com/${plugin.repo})`;
        if (plugin.description) {
          report += ` - ${plugin.description}`;
        }
        report += `\n`;
      }
      report += `\n`;
    }

    const withWorkspace = this.plugins.filter((p) => p.hasWorkspaceRefs);
    if (withWorkspace.length > 0) {
      report += `## Plugins with Workspace References\n\n`;
      report += `These plugins need dependency fixes:\n\n`;
      for (const plugin of withWorkspace) {
        report += `- ${plugin.name} (v${plugin.version || 'unknown'})\n`;
      }
      report += `\n`;
    }

    return report;
  }

  private async createPullRequests(): Promise<void> {
    const missing = this.plugins.filter((p) => !p.inRegistry);
    
    if (missing.length === 0) {
      logger.info('No missing plugins to add to registry');
      return;
    }

    logger.startOperation('Creating pull requests', { count: missing.length });

    for (const plugin of missing) {
      try {
        await this.createRegistryPR(plugin);
      } catch (error) {
        logger.error(`Failed to create PR for ${plugin.name}`, error);
      }
    }

    logger.endOperation('Creating pull requests');
  }

  private async createRegistryPR(plugin: PluginInfo): Promise<void> {
    this.logDryRunAction(`create PR to add ${plugin.name} to registry`, {
      plugin: plugin.name,
      description: plugin.description,
    });

    if (this.isDryRun()) {
      return;
    }

    // Implementation would create actual PR
    logger.info(`Would create PR for ${plugin.name}`);
  }
}

// Run the script if called directly
if (require.main === module) {
  const script = new AnalyzePluginRegistryScript();
  script.run().catch((error) => {
    logger.error('Script failed', error);
    process.exit(1);
  });
}

export default AnalyzePluginRegistryScript; 