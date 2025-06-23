#!/usr/bin/env node

import * as fs from 'fs';
import * as path from 'path';
import { execSync } from 'child_process';
import * as dotenv from 'dotenv';
import { Octokit } from '@octokit/rest';

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

interface EnhancedPluginInfo extends PluginInfo {
  sourceCode: string;
  envVars: string[];
  detailedDescription: string;
  enhancedReadme: string;
  codeStructure: {
    actions: string[];
    providers: string[];
    services: string[];
    evaluators: string[];
    totalFiles: number;
    totalLines: number;
  };
}

class PluginDocumentationEnhancer {
  private pluginDataDir = path.join(process.cwd(), 'plugin-data');
  private tempDir = path.join(process.cwd(), 'temp-plugins');
  private enhancedDataDir = path.join(process.cwd(), 'enhanced-plugin-data');
  private octokit: Octokit;
  private openaiApiKey: string;
  private anthropicApiKey: string;

  constructor() {
    this.openaiApiKey = process.env.OPENAI_API_KEY || '';
    this.anthropicApiKey = process.env.ANTHROPIC_API_KEY || '';
    
    if (!this.openaiApiKey && !this.anthropicApiKey) {
      console.warn('⚠️  Neither OPENAI_API_KEY nor ANTHROPIC_API_KEY found. AI features will be limited.');
    }

    this.octokit = new Octokit({
      auth: process.env.GITHUB_TOKEN,
    });

    // Create directories
    [this.tempDir, this.enhancedDataDir].forEach(dir => {
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
    });
  }

  async loadPluginData(): Promise<Map<string, PluginInfo>> {
    const pluginData = new Map<string, PluginInfo>();
    
    if (!fs.existsSync(this.pluginDataDir)) {
      console.error('❌ Plugin data directory not found. Run analyze-plugin-registry.ts first.');
      return pluginData;
    }

    const files = fs.readdirSync(this.pluginDataDir).filter(f => f.endsWith('.json') && f !== 'analysis-report.json');
    
    for (const file of files) {
      try {
        const data = JSON.parse(fs.readFileSync(path.join(this.pluginDataDir, file), 'utf-8'));
        pluginData.set(data.name, data);
      } catch (error) {
        console.error(`❌ Failed to load ${file}:`, error);
      }
    }

    console.log(`✅ Loaded ${pluginData.size} plugin data files`);
    return pluginData;
  }

  async cloneRepository(repoUrl: string, targetDir: string): Promise<boolean> {
    try {
      if (fs.existsSync(targetDir)) {
        fs.rmSync(targetDir, { recursive: true });
      }

      console.log(`📦 Cloning ${repoUrl}...`);
      execSync(`git clone --depth 1 ${repoUrl} ${targetDir}`, { stdio: 'pipe' });
      return true;
    } catch (error) {
      console.error(`❌ Failed to clone ${repoUrl}:`, error);
      return false;
    }
  }

  getAllTypeScriptFiles(dir: string): string[] {
    const files: string[] = [];
    
    const walk = (currentDir: string) => {
      const entries = fs.readdirSync(currentDir, { withFileTypes: true });
      
      for (const entry of entries) {
        const fullPath = path.join(currentDir, entry.name);
        
        // Skip node_modules, dist, build, etc.
        if (entry.isDirectory() && !['node_modules', 'dist', 'build', '.git', 'coverage'].includes(entry.name)) {
          walk(fullPath);
        } else if (entry.isFile() && (entry.name.endsWith('.ts') || entry.name.endsWith('.tsx'))) {
          files.push(fullPath);
        }
      }
    };

    walk(dir);
    return files;
  }

  concatenateSourceCode(pluginDir: string): string {
    const srcDir = path.join(pluginDir, 'src');
    if (!fs.existsSync(srcDir)) {
      return '';
    }

    const files = this.getAllTypeScriptFiles(srcDir);
    let concatenated = '';
    let totalLines = 0;

    for (const file of files) {
      const content = fs.readFileSync(file, 'utf-8');
      const relativePath = path.relative(pluginDir, file);
      concatenated += `\n\n// File: ${relativePath}\n${content}`;
      totalLines += content.split('\n').length;
    }

    return concatenated;
  }

  extractEnvVars(sourceCode: string, readme: string): string[] {
    const envVars = new Set<string>();
    
    // Pattern 1: runtime.getSetting('ENV_VAR')
    const getSettingPattern = /runtime\.getSetting\(['"`]([A-Z_]+[A-Z0-9_]*)['"``]\)/g;
    
    // Pattern 2: process.env.ENV_VAR
    const processEnvPattern = /process\.env\.([A-Z_]+[A-Z0-9_]*)/g;
    
    // Pattern 3: Common env var patterns in README
    const readmeEnvPattern = /^([A-Z_]+[A-Z0-9_]*)\s*=/gm;
    
    // Extract from source code
    let match;
    while ((match = getSettingPattern.exec(sourceCode)) !== null) {
      envVars.add(match[1]);
    }
    while ((match = processEnvPattern.exec(sourceCode)) !== null) {
      envVars.add(match[1]);
    }
    
    // Extract from README
    while ((match = readmeEnvPattern.exec(readme)) !== null) {
      envVars.add(match[1]);
    }

    return Array.from(envVars).sort();
  }

  analyzeCodeStructure(pluginDir: string): any {
    const structure = {
      actions: [] as string[]
      providers: [] as string[]
      services: [] as string[]
      evaluators: [] as string[]
      totalFiles: 0,
      totalLines: 0,
    };

    const srcDir = path.join(pluginDir, 'src');
    if (!fs.existsSync(srcDir)) {
      return structure;
    }

    // Count TypeScript files
    const files = this.getAllTypeScriptFiles(srcDir);
    structure.totalFiles = files.length;

    // Analyze each file
    for (const file of files) {
      const content = fs.readFileSync(file, 'utf-8');
      structure.totalLines += content.split('\n').length;

      // Detect component types based on file path and content
      const relativePath = path.relative(srcDir, file);
      
      if (relativePath.includes('action') || content.includes('class') && content.includes('extends Action')) {
        structure.actions.push(path.basename(file, '.ts'));
      }
      if (relativePath.includes('provider') || content.includes('Provider')) {
        structure.providers.push(path.basename(file, '.ts'));
      }
      if (relativePath.includes('service') || content.includes('extends Service')) {
        structure.services.push(path.basename(file, '.ts'));
      }
      if (relativePath.includes('evaluator') || content.includes('Evaluator')) {
        structure.evaluators.push(path.basename(file, '.ts'));
      }
    }

    return structure;
  }

  async generateAIDescription(plugin: PluginInfo, sourceCode: string, envVars: string[]): Promise<{ description: string; readme: string }> {
    if (!this.openaiApiKey && !this.anthropicApiKey) {
      return {
        description: plugin.packageDescription,
        readme: plugin.readme,
      };
    }

    const prompt = `
Analyze this ElizaOS plugin and generate:
1. A detailed description (2-3 paragraphs) explaining what the plugin does and its key features
2. An enhanced README that includes all environment variables and setup instructions

Plugin Name: ${plugin.name}
Current Description: ${plugin.packageDescription}
Environment Variables Found: ${envVars.join(', ')}
Dependencies: ${JSON.stringify(plugin.elizaDependencies, null, 2)}

Source Code Summary (first 5000 chars):
${sourceCode.substring(0, 5000)}

Current README (first 3000 chars):
${plugin.readme.substring(0, 3000)}

Generate a response in JSON format with "description" and "readme" fields.
`;

    try {
      if (this.anthropicApiKey) {
        // Use Anthropic API
        const response = await fetch('https://api.anthropic.com/v1/messages', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-api-key': this.anthropicApiKey,
            'anthropic-version': '2023-06-01',
          },
          body: JSON.stringify({
            model: 'claude-3-sonnet-20240229',
            max_tokens: 4000,
            messages: [{ role: 'user', content: prompt }],
          }),
        });

        const data = await response.json();
        const content = data.content[0].text;
        return JSON.parse(content);
      } else if (this.openaiApiKey) {
        // Use OpenAI API
        const response = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${this.openaiApiKey}`,
          },
          body: JSON.stringify({
            model: 'gpt-4',
            messages: [{ role: 'user', content: prompt }],
            response_format: { type: 'json_object' },
          }),
        });

        const data = await response.json();
        return JSON.parse(data.choices[0].message.content);
      }
    } catch (error) {
      console.error('❌ AI generation failed:', error);
    }

    return {
      description: plugin.packageDescription,
      readme: plugin.readme,
    };
  }

  async enhancePlugin(plugin: PluginInfo): Promise<EnhancedPluginInfo | null> {
    console.log(`\n🔧 Enhancing ${plugin.name}...`);

    const repoDir = path.join(this.tempDir, plugin.name.replace('@elizaos/', ''));
    
    // Clone repository
    const cloned = await this.cloneRepository(plugin.repository, repoDir);
    if (!cloned) {
      return null;
    }

    try {
      // Concatenate source code
      const sourceCode = this.concatenateSourceCode(repoDir);
      
      // Extract environment variables
      const envVars = this.extractEnvVars(sourceCode, plugin.readme);
      
      // Analyze code structure
      const codeStructure = this.analyzeCodeStructure(repoDir);
      
      // Generate AI-enhanced documentation
      const { description, readme } = await this.generateAIDescription(plugin, sourceCode, envVars);

      const enhanced: EnhancedPluginInfo = {
        ...plugin,
        sourceCode,
        envVars,
        detailedDescription: description,
        enhancedReadme: readme,
        codeStructure,
      };

      // Save enhanced data
      const outputFile = path.join(this.enhancedDataDir, `${plugin.name.replace('@elizaos/', '')}-enhanced.json`);
      fs.writeFileSync(outputFile, JSON.stringify(enhanced, null, 2));

      // Also save the concatenated source code separately
      const sourceFile = path.join(this.enhancedDataDir, `${plugin.name.replace('@elizaos/', '')}-source.ts`);
      fs.writeFileSync(sourceFile, sourceCode);

      console.log(`✅ Enhanced ${plugin.name}`);
      console.log(`   - Found ${envVars.length} environment variables`);
      console.log(`   - ${codeStructure.totalFiles} files, ${codeStructure.totalLines} lines of code`);

      return enhanced;
    } catch (error) {
      console.error(`❌ Failed to enhance ${plugin.name}:`, error);
      return null;
    } finally {
      // Clean up cloned repo
      if (fs.existsSync(repoDir)) {
        fs.rmSync(repoDir, { recursive: true });
      }
    }
  }

  async generateEnhancedReport(enhancedPlugins: EnhancedPluginInfo[]) {
    console.log('\n📊 Generating enhanced report...');

    const report = {
      timestamp: new Date().toISOString(),
      totalPlugins: enhancedPlugins.length,
      totalEnvVars: 0,
      commonEnvVars: {} as Record<string, number>,
      pluginComplexity: [] as any[]
      enhancedPlugins: enhancedPlugins.map(p => ({
        name: p.name,
        version: p.version,
        envVars: p.envVars,
        codeStructure: p.codeStructure,
        detailedDescription: p.detailedDescription,
      })),
    };

    // Analyze environment variables
    const allEnvVars = new Map<string, number>();
    for (const plugin of enhancedPlugins) {
      report.totalEnvVars += plugin.envVars.length;
      
      for (const envVar of plugin.envVars) {
        allEnvVars.set(envVar, (allEnvVars.get(envVar) || 0) + 1);
      }

      // Calculate complexity score
      const complexity = {
        name: plugin.name,
        score: (
          plugin.codeStructure.totalFiles * 0.1 +
          plugin.codeStructure.totalLines * 0.001 +
          plugin.codeStructure.actions.length * 2 +
          plugin.codeStructure.services.length * 3 +
          plugin.codeStructure.providers.length * 1 +
          plugin.envVars.length * 0.5
        ).toFixed(2),
        metrics: {
          files: plugin.codeStructure.totalFiles,
          lines: plugin.codeStructure.totalLines,
          components: 
            plugin.codeStructure.actions.length +
            plugin.codeStructure.services.length +
            plugin.codeStructure.providers.length +
            plugin.codeStructure.evaluators.length,
        },
      };
      report.pluginComplexity.push(complexity);
    }

    // Sort by usage count
    report.commonEnvVars = Object.fromEntries(
      Array.from(allEnvVars.entries())
        .sort(([, a], [, b]) => b - a)
        .slice(0, 10)
    );

    // Sort plugins by complexity
    report.pluginComplexity.sort((a, b) => parseFloat(b.score) - parseFloat(a.score));

    // Save report
    const reportPath = path.join(this.enhancedDataDir, 'enhanced-analysis-report.json');
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));

    // Generate markdown summary
    const summaryPath = path.join(this.enhancedDataDir, 'PLUGIN_SUMMARY.md');
    const summary = this.generateMarkdownSummary(report, enhancedPlugins);
    fs.writeFileSync(summaryPath, summary);

    console.log(`\n✅ Enhanced report saved to: ${reportPath}`);
    console.log(`✅ Markdown summary saved to: ${summaryPath}`);
  }

  generateMarkdownSummary(report: any, plugins: EnhancedPluginInfo[]): string {
    let md = '# ElizaOS Plugin Registry Analysis\n\n';
    md += `Generated: ${new Date(report.timestamp).toLocaleString()}\n\n`;
    
    md += '## Summary\n\n';
    md += `- **Total Plugins**: ${report.totalPlugins}\n`;
    md += `- **Total Environment Variables**: ${report.totalEnvVars}\n`;
    md += `- **Average Env Vars per Plugin**: ${(report.totalEnvVars / report.totalPlugins).toFixed(1)}\n\n`;

    md += '## Most Common Environment Variables\n\n';
    md += '| Variable | Used By | Plugins |\n';
    md += '|----------|---------|------|\n';
    for (const [envVar, count] of Object.entries(report.commonEnvVars)) {
      md += `| ${envVar} | ${count} | ${Math.round((count as number) / report.totalPlugins * 100)}% |\n`;
    }

    md += '\n## Plugin Complexity Ranking\n\n';
    md += '| Plugin | Complexity Score | Files | Lines | Components |\n';
    md += '|--------|-----------------|-------|-------|------------|\n';
    for (const plugin of report.pluginComplexity.slice(0, 10)) {
      md += `| ${plugin.name} | ${plugin.score} | ${plugin.metrics.files} | ${plugin.metrics.lines} | ${plugin.metrics.components} |\n`;
    }

    md += '\n## Plugin Details\n\n';
    for (const plugin of plugins) {
      md += `### ${plugin.name} (v${plugin.version})\n\n`;
      md += `**Repository**: ${plugin.repository}\n\n`;
      md += `**Description**: ${plugin.detailedDescription}\n\n`;
      
      if (plugin.envVars.length > 0) {
        md += '**Environment Variables**:\n';
        for (const envVar of plugin.envVars) {
          md += `- \`${envVar}\`\n`;
        }
        md += '\n';
      }

      md += '**Components**:\n';
      if (plugin.codeStructure.actions.length > 0) {
        md += `- Actions: ${plugin.codeStructure.actions.join(', ')}\n`;
      }
      if (plugin.codeStructure.services.length > 0) {
        md += `- Services: ${plugin.codeStructure.services.join(', ')}\n`;
      }
      if (plugin.codeStructure.providers.length > 0) {
        md += `- Providers: ${plugin.codeStructure.providers.join(', ')}\n`;
      }
      md += '\n---\n\n';
    }

    return md;
  }

  async run() {
    try {
      // Load plugin data from first script
      const pluginData = await this.loadPluginData();
      if (pluginData.size === 0) {
        console.error('❌ No plugin data found. Run analyze-plugin-registry.ts first.');
        return;
      }

      // Enhance each plugin
      const enhancedPlugins: EnhancedPluginInfo[] = [];
      
      for (const plugin of pluginData.values()) {
        const enhanced = await this.enhancePlugin(plugin);
        if (enhanced) {
          enhancedPlugins.push(enhanced);
        }
      }

      // Generate enhanced report
      await this.generateEnhancedReport(enhancedPlugins);

      console.log(`\n✅ Enhancement complete! Enhanced ${enhancedPlugins.length} plugins.`);
      console.log(`📁 Results saved to: ${this.enhancedDataDir}`);
    } catch (error) {
      console.error('❌ Script failed:', error);
      process.exit(1);
    }
  }
}

// Run the enhancer
const enhancer = new PluginDocumentationEnhancer();
enhancer.run(); 