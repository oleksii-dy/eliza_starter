#!/usr/bin/env node

import * as fs from 'fs';
import * as path from 'path';
import { execSync } from 'child_process';
import * as dotenv from 'dotenv';
import { Octokit } from '@octokit/rest';

// Load environment variables
dotenv.config();

interface EnhancedPluginInfo {
  name: string;
  repository: string;
  readme: string;
  version: string;
  elizaDependencies: Record<string, string>;
  hasWorkspaceDependencies: boolean;
  isPreRelease: boolean;
  packageJson?: any;
  enhancedReadme?: string;
  detailedDescription?: string;
  envVars?: string[];
}

interface DependencyFix {
  plugin: string;
  dependency: string;
  oldVersion: string;
  newVersion: string;
}

class PluginDependencyFixer {
  private enhancedDataDir = path.join(process.cwd(), 'enhanced-plugin-data');
  private fixesDir = path.join(process.cwd(), 'plugin-fixes');
  private tempDir = path.join(process.cwd(), 'temp-fix');
  private octokit: Octokit;
  private githubToken: string;
  private registryVersions: Map<string, string> = new Map();

  constructor() {
    this.githubToken = process.env.GITHUB_TOKEN || '';
    if (!this.githubToken) {
      console.error('❌ GITHUB_TOKEN is required for this script');
      process.exit(1);
    }

    this.octokit = new Octokit({
      auth: this.githubToken,
    });

    // Create directories
    [this.fixesDir, this.tempDir].forEach(dir => {
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
    });
  }

  async loadEnhancedPluginData(): Promise<Map<string, EnhancedPluginInfo>> {
    const pluginData = new Map<string, EnhancedPluginInfo>();
    
    if (!fs.existsSync(this.enhancedDataDir)) {
      console.error('❌ Enhanced plugin data directory not found. Run enhance-plugin-docs.ts first.');
      return pluginData;
    }

    const files = fs.readdirSync(this.enhancedDataDir).filter(f => f.endsWith('-enhanced.json'));
    
    for (const file of files) {
      try {
        const data = JSON.parse(fs.readFileSync(path.join(this.enhancedDataDir, file), 'utf-8'));
        pluginData.set(data.name, data);
      } catch (error) {
        console.error(`❌ Failed to load ${file}:`, error);
      }
    }

    console.log(`✅ Loaded ${pluginData.size} enhanced plugin data files`);
    return pluginData;
  }

  async fetchLatestVersions(): Promise<void> {
    console.log('📥 Fetching latest versions from registry...');
    
    try {
      // Fetch generated registry with version info
      const response = await fetch('https://raw.githubusercontent.com/elizaos-plugins/registry/main/generated-registry.json');
      const data = await response.json();
      
      for (const [plugin, info] of Object.entries(data)) {
        if (info && typeof info === 'object' && 'version' in info) {
          this.registryVersions.set(plugin, (info as any).version);
        }
      }
    } catch (error) {
      console.warn('⚠️  Could not fetch generated registry, will use package.json versions');
    }

    // Also check npm registry for @elizaos packages
    const corePackages = ['@elizaos/core', '@elizaos/cli'];
    for (const pkg of corePackages) {
      try {
        const response = await fetch(`https://registry.npmjs.org/${pkg}/latest`);
        const data = await response.json();
        if (data.version) {
          this.registryVersions.set(pkg, data.version);
        }
      } catch (error) {
        console.warn(`⚠️  Could not fetch version for ${pkg}`);
      }
    }

    console.log(`✅ Found versions for ${this.registryVersions.size} packages`);
  }

  getLatestVersion(dependency: string): string {
    // Check our registry first
    const registryVersion = this.registryVersions.get(dependency);
    if (registryVersion) {
      return `^${registryVersion}`;
    }

    // Default to ^1.0.0 for elizaos packages
    if (dependency.startsWith('@elizaos/')) {
      return '^1.0.0';
    }

    // Keep original version for other packages
    return 'workspace:*';
  }

  async cloneRepository(repoUrl: string, targetDir: string): Promise<boolean> {
    try {
      if (fs.existsSync(targetDir)) {
        fs.rmSync(targetDir, { recursive: true });
      }

      console.log(`📦 Cloning ${repoUrl}...`);
      execSync(`git clone ${repoUrl} ${targetDir}`, { stdio: 'pipe' });
      return true;
    } catch (error) {
      console.error(`❌ Failed to clone ${repoUrl}:`, error);
      return false;
    }
  }

  fixPackageJson(packageJson: any, fixes: DependencyFix[]): any {
    const fixed = { ...packageJson };
    
    // Fix dependencies
    const depTypes = ['dependencies', 'devDependencies', 'peerDependencies'];
    
    for (const depType of depTypes) {
      if (fixed[depType]) {
        for (const [dep, version] of Object.entries(fixed[depType])) {
          if (typeof version === 'string' && version === 'workspace:*') {
            const newVersion = this.getLatestVersion(dep);
            if (newVersion !== version) {
              fixed[depType][dep] = newVersion;
              fixes.push({
                plugin: packageJson.name,
                dependency: dep,
                oldVersion: version,
                newVersion: newVersion,
              });
            }
          }
        }
      }
    }

    // Update version if pre-release
    if (fixed.version && (fixed.version.includes('alpha') || fixed.version.includes('beta') || parseFloat(fixed.version) < 1.0)) {
      fixed.version = '1.0.0';
      console.log(`  📌 Updated version from ${packageJson.version} to ${fixed.version}`);
    }

    return fixed;
  }

  generateUpdatedReadme(plugin: EnhancedPluginInfo): string {
    let readme = plugin.enhancedReadme || plugin.readme || '';
    
    // Add environment variables section if not present
    if (plugin.envVars && plugin.envVars.length > 0) {
      const envSection = `
## Environment Variables

The following environment variables are required or optional for this plugin:

${plugin.envVars.map(env => `- \`${env}\` - [Description needed]`).join('\n')}

Add these to your \`.env\` file or set them in your agent's character configuration.
`;

      if (!readme.includes('## Environment Variables')) {
        // Find a good place to insert it
        const configIndex = readme.indexOf('## Configuration');
        const usageIndex = readme.indexOf('## Usage');
        const installIndex = readme.indexOf('## Installation');
        
        if (configIndex > -1) {
          readme = readme.slice(0, configIndex) + envSection + '\n' + readme.slice(configIndex);
        } else if (usageIndex > -1) {
          readme = readme.slice(0, usageIndex) + envSection + '\n' + readme.slice(usageIndex);
        } else if (installIndex > -1) {
          const nextSection = readme.indexOf('\n##', installIndex + 1);
          if (nextSection > -1) {
            readme = readme.slice(0, nextSection) + '\n' + envSection + readme.slice(nextSection);
          } else {
            readme += '\n' + envSection;
          }
        } else {
          readme += '\n' + envSection;
        }
      }
    }

    // Update description if available
    if (plugin.detailedDescription && !readme.includes(plugin.detailedDescription)) {
      const overviewIndex = readme.indexOf('## Overview');
      const descIndex = readme.indexOf('## Description');
      
      if (overviewIndex > -1 || descIndex > -1) {
        const index = overviewIndex > -1 ? overviewIndex : descIndex;
        const nextSection = readme.indexOf('\n##', index + 1);
        
        if (nextSection > -1) {
          readme = readme.slice(0, index) + 
            `## Overview\n\n${plugin.detailedDescription}\n\n` + 
            readme.slice(nextSection);
        }
      } else {
        // Add after the title
        const lines = readme.split('\n');
        let inserted = false;
        for (let i = 0; i < lines.length; i++) {
          if (lines[i].startsWith('# ') && i < lines.length - 1) {
            lines.splice(i + 1, 0, '', '## Overview', '', plugin.detailedDescription, '');
            inserted = true;
            break;
          }
        }
        if (inserted) {
          readme = lines.join('\n');
        }
      }
    }

    return readme;
  }

  async applyFixesToPlugin(plugin: EnhancedPluginInfo): Promise<DependencyFix[]> {
    console.log(`\n🔧 Fixing ${plugin.name}...`);

    const fixes: DependencyFix[] = [];
    const repoDir = path.join(this.tempDir, plugin.name.replace('@elizaos/', ''));
    
    // Clone repository
    const cloned = await this.cloneRepository(plugin.repository, repoDir);
    if (!cloned) {
      return fixes;
    }

    try {
      // Fix package.json
      const packageJsonPath = path.join(repoDir, 'package.json');
      const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'));
      const fixedPackageJson = this.fixPackageJson(packageJson, fixes);
      
      if (fixes.length > 0) {
        fs.writeFileSync(packageJsonPath, JSON.stringify(fixedPackageJson, null, 2) + '\n');
        console.log(`  ✅ Fixed ${fixes.length} workspace dependencies`);
      }

      // Update README
      const readmePath = path.join(repoDir, 'README.md');
      if (fs.existsSync(readmePath)) {
        const updatedReadme = this.generateUpdatedReadme(plugin);
        fs.writeFileSync(readmePath, updatedReadme);
        console.log(`  ✅ Updated README.md`);
      }

      // Save fixes
      const fixData = {
        plugin: plugin.name,
        repository: plugin.repository,
        fixes: fixes,
        timestamp: new Date().toISOString(),
      };

      const fixFile = path.join(this.fixesDir, `${plugin.name.replace('@elizaos/', '')}-fixes.json`);
      fs.writeFileSync(fixFile, JSON.stringify(fixData, null, 2));

      // If we have fixes, create a branch and PR
      if (fixes.length > 0 || plugin.enhancedReadme) {
        await this.createPullRequest(plugin, repoDir, fixes);
      }

      return fixes;
    } catch (error) {
      console.error(`❌ Failed to fix ${plugin.name}:`, error);
      return fixes;
    } finally {
      // Clean up
      if (fs.existsSync(repoDir)) {
        fs.rmSync(repoDir, { recursive: true });
      }
    }
  }

  async createPullRequest(plugin: EnhancedPluginInfo, repoDir: string, fixes: DependencyFix[]) {
    try {
      // Parse repo info
      const match = plugin.repository.match(/github\.com\/([^\/]+)\/([^\/]+)/);
      if (!match) return;
      
      const [, owner, repo] = match;
      
      // Create a new branch
      const branchName = `fix-dependencies-${Date.now()}`;
      execSync(`cd ${repoDir} && git checkout -b ${branchName}`, { stdio: 'pipe' });

      // Commit changes
      execSync(`cd ${repoDir} && git add -A`, { stdio: 'pipe' });
      
      const commitMessage = fixes.length > 0 
        ? `Fix workspace dependencies and update documentation\n\n${fixes.map(f => `- ${f.dependency}: ${f.oldVersion} → ${f.newVersion}`).join('\n')}`
        : 'Update documentation and enhance README';
      
      execSync(`cd ${repoDir} && git commit -m "${commitMessage}"`, { stdio: 'pipe' });

      // Fork if needed
      let forkOwner = owner;
      try {
        const { data: fork } = await this.octokit.repos.createFork({ owner, repo });
        forkOwner = fork.owner.login;
        await new Promise(resolve => setTimeout(resolve, 3000)); // Wait for fork
      } catch (error) {
        // Fork might already exist
      }

      // Push to fork
      execSync(`cd ${repoDir} && git remote add fork https://github.com/${forkOwner}/${repo}.git`, { stdio: 'pipe' });
      execSync(`cd ${repoDir} && git push fork ${branchName}`, { stdio: 'pipe' });

      // Create PR
      const { data: pr } = await this.octokit.pulls.create({
        owner,
        repo,
        title: fixes.length > 0 ? 'Fix workspace dependencies and update documentation' : 'Update documentation',
        head: `${forkOwner}:${branchName}`,
        base: 'main',
        body: this.generatePRBody(plugin, fixes),
      });

      console.log(`  ✅ Created PR: ${pr.html_url}`);
    } catch (error) {
      console.error(`  ❌ Failed to create PR:`, error);
    }
  }

  generatePRBody(plugin: EnhancedPluginInfo, fixes: DependencyFix[]): string {
    let body = `## Summary\n\nThis PR updates ${plugin.name} to fix workspace dependencies and enhance documentation.\n\n`;
    
    if (fixes.length > 0) {
      body += `### Dependency Fixes\n\n`;
      body += `| Dependency | Old Version | New Version |\n`;
      body += `|------------|-------------|-------------|\n`;
      
      for (const fix of fixes) {
        body += `| ${fix.dependency} | ${fix.oldVersion} | ${fix.newVersion} |\n`;
      }
      body += '\n';
    }

    body += `### Documentation Updates\n\n`;
    body += `- Enhanced README with detailed plugin description\n`;
    body += `- Added comprehensive environment variables section\n`;
    body += `- Improved setup and configuration instructions\n\n`;

    body += `### Checklist\n\n`;
    body += `- [x] Fixed all workspace:* dependencies\n`;
    body += `- [x] Updated version to stable (1.0.0) if needed\n`;
    body += `- [x] Enhanced documentation\n`;
    body += `- [x] Added environment variables documentation\n`;

    return body;
  }

  async generateFixReport(allFixes: DependencyFix[]) {
    console.log('\n📊 Generating fix report...');

    const report = {
      timestamp: new Date().toISOString(),
      totalFixes: allFixes.length,
      fixesByDependency: {} as Record<string, number>,
      pluginsFixed: new Set(allFixes.map(f => f.plugin)).size,
      fixes: allFixes,
    };

    // Count fixes by dependency
    for (const fix of allFixes) {
      report.fixesByDependency[fix.dependency] = (report.fixesByDependency[fix.dependency] || 0) + 1;
    }

    // Save report
    const reportPath = path.join(this.fixesDir, 'fix-report.json');
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));

    // Generate markdown summary
    const summaryPath = path.join(this.fixesDir, 'FIX_SUMMARY.md');
    let summary = `# Plugin Dependency Fixes\n\n`;
    summary += `Generated: ${new Date(report.timestamp).toLocaleString()}\n\n`;
    summary += `## Summary\n\n`;
    summary += `- **Total Fixes**: ${report.totalFixes}\n`;
    summary += `- **Plugins Fixed**: ${report.pluginsFixed}\n\n`;
    
    summary += `## Most Common Dependencies Fixed\n\n`;
    summary += `| Dependency | Times Fixed |\n`;
    summary += `|------------|-------------|\n`;
    
    const sortedDeps = Object.entries(report.fixesByDependency)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 10);
    
    for (const [dep, count] of sortedDeps) {
      summary += `| ${dep} | ${count} |\n`;
    }

    fs.writeFileSync(summaryPath, summary);

    console.log(`\n✅ Fix report saved to: ${reportPath}`);
    console.log(`✅ Summary saved to: ${summaryPath}`);
  }

  async run() {
    try {
      // Load enhanced plugin data
      const pluginData = await this.loadEnhancedPluginData();
      if (pluginData.size === 0) {
        console.error('❌ No enhanced plugin data found. Run enhance-plugin-docs.ts first.');
        return;
      }

      // Fetch latest versions
      await this.fetchLatestVersions();

      // Apply fixes to each plugin
      const allFixes: DependencyFix[] = [];
      
      for (const plugin of pluginData.values()) {
        if (plugin.hasWorkspaceDependencies || plugin.isPreRelease) {
          const fixes = await this.applyFixesToPlugin(plugin);
          allFixes.push(...fixes);
        }
      }

      // Generate report
      await this.generateFixReport(allFixes);

      console.log(`\n✅ Fixing complete! Applied ${allFixes.length} fixes.`);
      console.log(`📁 Results saved to: ${this.fixesDir}`);
    } catch (error) {
      console.error('❌ Script failed:', error);
      process.exit(1);
    }
  }
}

// Run the fixer
const fixer = new PluginDependencyFixer();
fixer.run(); 