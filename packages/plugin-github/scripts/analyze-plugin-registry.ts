#!/usr/bin/env node

import { Octokit } from '@octokit/rest';
import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config();

interface PluginInfo {
  name: string;
  repository: string;
  readme: string;
  packageDescription: string;
  version: string;
  elizaDependencies: Record<string, string>;
  hasWorkspaceDependencies: boolean;
  isPreRelease: boolean;
  packageJson?: any;
  lastUpdated?: string;
  stars?: number;
  topics?: string[];
}

interface RegistryEntry {
  [key: string]: string;
}

class PluginRegistryAnalyzer {
  private octokit: Octokit;
  private registryUrl = 'https://raw.githubusercontent.com/elizaos-plugins/registry/main/index.json';
  private generatedRegistryUrl = 'https://raw.githubusercontent.com/elizaos-plugins/registry/main/generated-registry.json';
  private pluginDataDir = path.join(process.cwd(), 'plugin-data');
  private githubToken: string;

  constructor() {
    this.githubToken = process.env.GITHUB_TOKEN || '';
    if (!this.githubToken) {
      console.warn('⚠️  GITHUB_TOKEN not found in environment. Some features may be limited.');
    }
    
    this.octokit = new Octokit({
      auth: this.githubToken,
    });

    // Create plugin data directory if it doesn't exist
    if (!fs.existsSync(this.pluginDataDir)) {
      fs.mkdirSync(this.pluginDataDir, { recursive: true });
    }
  }

  async fetchRegistry(): Promise<RegistryEntry> {
    console.log('📥 Fetching plugin registry...');
    try {
      const response = await fetch(this.registryUrl);
      const data = await response.json();
      console.log(`✅ Found ${Object.keys(data).length} plugins in registry`);
      return data;
    } catch (error) {
      console.error('❌ Failed to fetch registry:', error);
      throw error;
    }
  }

  async fetchGeneratedRegistry(): Promise<any> {
    console.log('📥 Fetching generated registry data...');
    try {
      const response = await fetch(this.generatedRegistryUrl);
      const data = await response.json();
      return data;
    } catch (error) {
      console.warn('⚠️  Could not fetch generated registry, will use basic registry only');
      return null;
    }
  }

  async getAllElizaOSPlugins(): Promise<string[]> {
    console.log('🔍 Searching for all plugins in elizaos-plugins organization...');
    const plugins: string[] = [];
    
    try {
      let page = 1;
      let hasMore = true;
      
      while (hasMore) {
        const { data: repos } = await this.octokit.repos.listForOrg({
          org: 'elizaos-plugins',
          per_page: 100,
          page,
          type: 'public',
        });
        
        if (repos.length === 0) {
          hasMore = false;
        } else {
          const pluginRepos = repos
            .filter(repo => repo.name.startsWith('plugin-'))
            .map(repo => `@elizaos/${repo.name}`);
          
          plugins.push(...pluginRepos);
          page++;
        }
      }
      
      console.log(`✅ Found ${plugins.length} plugin repositories`);
      return plugins;
    } catch (error) {
      console.error('❌ Failed to fetch plugins from GitHub:', error);
      return [];
    }
  }

  async analyzePlugin(pluginName: string, repoUrl: string): Promise<PluginInfo | null> {
    console.log(`\n📊 Analyzing plugin: ${pluginName}`);
    
    try {
      // Parse GitHub repo info
      const match = repoUrl.match(/github\.com\/([^\/]+)\/([^\/]+)/);
      if (!match) {
        console.error(`❌ Invalid GitHub URL: ${repoUrl}`);
        return null;
      }
      
      const [, owner, repo] = match;
      
      // Fetch repository info
      const { data: repoData } = await this.octokit.repos.get({ owner, repo });
      
      // Fetch package.json
      let packageJson: any = {};
      let packageDescription = '';
      let version = '0.0.0';
      let elizaDependencies: Record<string, string> = {};
      let hasWorkspaceDependencies = false;
      
      try {
        const { data: packageContent } = await this.octokit.repos.getContent({
          owner,
          repo,
          path: 'package.json',
        });
        
        if ('content' in packageContent) {
          const content = Buffer.from(packageContent.content, 'base64').toString();
          packageJson = JSON.parse(content);
          packageDescription = packageJson.description || '';
          version = packageJson.version || '0.0.0';
          
          // Find ElizaOS dependencies
          const allDeps = {
            ...packageJson.dependencies,
            ...packageJson.devDependencies,
            ...packageJson.peerDependencies,
          };
          
          for (const [dep, ver] of Object.entries(allDeps)) {
            if (dep.startsWith('@elizaos/') || dep.startsWith('@elizaos-plugins/')) {
              elizaDependencies[dep] = ver as string;
              if (ver === 'workspace:*') {
                hasWorkspaceDependencies = true;
              }
            }
          }
        }
      } catch (error) {
        console.warn(`⚠️  Could not fetch package.json for ${pluginName}`);
      }
      
      // Fetch README
      let readme = '';
      try {
        const { data: readmeContent } = await this.octokit.repos.getContent({
          owner,
          repo,
          path: 'README.md',
        });
        
        if ('content' in readmeContent) {
          readme = Buffer.from(readmeContent.content, 'base64').toString();
        }
      } catch (error) {
        console.warn(`⚠️  Could not fetch README for ${pluginName}`);
      }
      
      const pluginInfo: PluginInfo = {
        name: pluginName,
        repository: repoUrl,
        readme,
        packageDescription,
        version,
        elizaDependencies,
        hasWorkspaceDependencies,
        isPreRelease: version.includes('alpha') || version.includes('beta') || parseFloat(version) < 1.0,
        packageJson,
        lastUpdated: repoData.updated_at,
        stars: repoData.stargazers_count,
        topics: repoData.topics || [],
      };
      
      // Save plugin data to JSON file
      const pluginFile = path.join(this.pluginDataDir, `${pluginName.replace('@elizaos/', '')}.json`);
      fs.writeFileSync(pluginFile, JSON.stringify(pluginInfo, null, 2));
      
      console.log(`✅ Analyzed ${pluginName} (v${version})`);
      return pluginInfo;
    } catch (error) {
      console.error(`❌ Failed to analyze ${pluginName}:`, error);
      return null;
    }
  }

  async findMissingPlugins(registry: RegistryEntry, allPlugins: string[]): Promise<string[]> {
    const registeredPlugins = Object.keys(registry);
    const missingPlugins = allPlugins.filter(plugin => !registeredPlugins.includes(plugin));
    
    if (missingPlugins.length > 0) {
      console.log(`\n🔍 Found ${missingPlugins.length} plugins not in registry:`);
      missingPlugins.forEach(plugin => console.log(`  - ${plugin}`));
    } else {
      console.log('\n✅ All plugins are already in the registry');
    }
    
    return missingPlugins;
  }

  async createPullRequest(missingPlugins: string[], pluginData: Map<string, PluginInfo>) {
    if (missingPlugins.length === 0) {
      console.log('\n✅ No missing plugins to add');
      return;
    }

    console.log('\n📝 Creating pull request to add missing plugins...');

    try {
      // Fork the registry repository if not already forked
      const { data: fork } = await this.octokit.repos.createFork({
        owner: 'elizaos-plugins',
        repo: 'registry',
      });

      // Wait a moment for the fork to be ready
      await new Promise(resolve => setTimeout(resolve, 3000));

      // Clone the forked repository
      const tempDir = path.join(process.cwd(), 'temp-registry');
      if (fs.existsSync(tempDir)) {
        fs.rmSync(tempDir, { recursive: true });
      }

      console.log('📦 Cloning forked repository...');
      execSync(`git clone https://github.com/${fork.owner.login}/registry.git ${tempDir}`, { stdio: 'inherit' });

      // Read current index.json
      const indexPath = path.join(tempDir, 'index.json');
      const currentIndex = JSON.parse(fs.readFileSync(indexPath, 'utf-8'));

      // Add missing plugins
      for (const plugin of missingPlugins) {
        const pluginInfo = pluginData.get(plugin);
        if (pluginInfo) {
          currentIndex[plugin] = pluginInfo.repository;
        }
      }

      // Sort the index alphabetically
      const sortedIndex = Object.keys(currentIndex)
        .sort()
        .reduce((acc, key) => {
          acc[key] = currentIndex[key];
          return acc;
        }, {} as RegistryEntry);

      // Write updated index.json
      fs.writeFileSync(indexPath, JSON.stringify(sortedIndex, null, 2) + '\n');

      // Create a new branch
      const branchName = `add-missing-plugins-${Date.now()}`;
      execSync(`cd ${tempDir} && git checkout -b ${branchName}`, { stdio: 'inherit' });

      // Commit changes
      execSync(`cd ${tempDir} && git add index.json`, { stdio: 'inherit' });
      execSync(`cd ${tempDir} && git commit -m "Add ${missingPlugins.length} missing plugins to registry"`, { stdio: 'inherit' });

      // Push to fork
      execSync(`cd ${tempDir} && git push origin ${branchName}`, { stdio: 'inherit' });

      // Create pull request
      const { data: pr } = await this.octokit.pulls.create({
        owner: 'elizaos-plugins',
        repo: 'registry',
        title: `Add ${missingPlugins.length} missing plugins to registry`,
        head: `${fork.owner.login}:${branchName}`,
        base: 'main',
        body: `This PR adds the following missing plugins to the registry:\n\n${missingPlugins.map(p => `- ${p}`).join('\n')}\n\nGenerated by the plugin registry analyzer script.`,
      });

      console.log(`\n✅ Pull request created: ${pr.html_url}`);

      // Clean up
      fs.rmSync(tempDir, { recursive: true });
    } catch (error) {
      console.error('❌ Failed to create pull request:', error);
    }
  }

  async generateReport(pluginData: Map<string, PluginInfo>) {
    console.log('\n📊 Generating analysis report...');

    const report = {
      totalPlugins: pluginData.size,
      pluginsWithWorkspaceDeps: 0,
      preReleasePlugins: 0,
      pluginsByVersion: {} as Record<string, number>,
      elizaDependencyUsage: {} as Record<string, number>,
      timestamp: new Date().toISOString(),
      plugins: Array.from(pluginData.values()),
    };

    for (const plugin of pluginData.values()) {
      if (plugin.hasWorkspaceDependencies) {
        report.pluginsWithWorkspaceDeps++;
      }
      if (plugin.isPreRelease) {
        report.preReleasePlugins++;
      }

      // Count version usage
      const majorVersion = plugin.version.split('.')[0];
      report.pluginsByVersion[majorVersion] = (report.pluginsByVersion[majorVersion] || 0) + 1;

      // Count ElizaOS dependency usage
      for (const dep of Object.keys(plugin.elizaDependencies)) {
        report.elizaDependencyUsage[dep] = (report.elizaDependencyUsage[dep] || 0) + 1;
      }
    }

    // Save report
    const reportPath = path.join(this.pluginDataDir, 'analysis-report.json');
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));

    console.log('\n📈 Analysis Summary:');
    console.log(`  Total Plugins: ${report.totalPlugins}`);
    console.log(`  Plugins with workspace:* dependencies: ${report.pluginsWithWorkspaceDeps}`);
    console.log(`  Pre-release plugins (< v1.0.0): ${report.preReleasePlugins}`);
    console.log('\n  Most used ElizaOS dependencies:');
    
    const sortedDeps = Object.entries(report.elizaDependencyUsage)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5);
    
    for (const [dep, count] of sortedDeps) {
      console.log(`    - ${dep}: ${count} plugins`);
    }

    console.log(`\n✅ Report saved to: ${reportPath}`);
  }

  async run() {
    try {
      // Fetch current registry
      const registry = await this.fetchRegistry();
      const generatedRegistry = await this.fetchGeneratedRegistry();

      // Get all plugins from GitHub
      const allPlugins = await this.getAllElizaOSPlugins();

      // Find missing plugins
      const missingPlugins = await this.findMissingPlugins(registry, allPlugins);

      // Analyze all plugins (both registered and missing)
      const pluginData = new Map<string, PluginInfo>();
      
      console.log('\n🔄 Analyzing all plugins...');
      
      // Analyze registered plugins
      for (const [pluginName, repoUrl] of Object.entries(registry)) {
        const info = await this.analyzePlugin(pluginName, repoUrl);
        if (info) {
          pluginData.set(pluginName, info);
        }
      }

      // Analyze missing plugins
      for (const pluginName of missingPlugins) {
        const repoUrl = `https://github.com/elizaos-plugins/${pluginName.replace('@elizaos/', '')}`;
        const info = await this.analyzePlugin(pluginName, repoUrl);
        if (info) {
          pluginData.set(pluginName, info);
        }
      }

      // Generate report
      await this.generateReport(pluginData);

      // Create PR if there are missing plugins and we have a GitHub token
      if (missingPlugins.length > 0 && this.githubToken) {
        await this.createPullRequest(missingPlugins, pluginData);
      } else if (missingPlugins.length > 0) {
        console.log('\n⚠️  Skipping PR creation (no GitHub token provided)');
      }

      console.log('\n✅ Analysis complete! Check the plugin-data directory for results.');
    } catch (error) {
      console.error('❌ Script failed:', error);
      process.exit(1);
    }
  }
}

// Run the analyzer
const analyzer = new PluginRegistryAnalyzer();
analyzer.run(); 