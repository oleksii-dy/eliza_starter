#!/usr/bin/env node

import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config();

interface TestResult {
  script: string;
  passed: boolean;
  error?: string;
  details?: any;
}

class PluginScriptTester {
  private results: TestResult[] = [];

  constructor() {
    console.log('🧪 ElizaOS Plugin Registry Scripts Test Suite\n');
  }

  async testEnvironmentSetup(): Promise<void> {
    console.log('1️⃣  Testing Environment Setup...');
    
    const githubToken = process.env.GITHUB_TOKEN;
    const openaiKey = process.env.OPENAI_API_KEY;
    const anthropicKey = process.env.ANTHROPIC_API_KEY;

    if (!githubToken) {
      this.results.push({
        script: 'environment',
        passed: false,
        error: 'GITHUB_TOKEN not found in environment',
      });
      console.error('   ❌ GITHUB_TOKEN is required for all scripts');
    } else {
      console.log('   ✅ GITHUB_TOKEN found');
      this.results.push({
        script: 'environment',
        passed: true,
        details: { hasGithubToken: true },
      });
    }

    if (!openaiKey && !anthropicKey) {
      console.warn('   ⚠️  No AI API keys found (optional for enhance-docs script)');
    } else {
      console.log(`   ✅ AI API key found: ${openaiKey ? 'OpenAI' : 'Anthropic'}`);
    }

    console.log();
  }

  async testScriptExistence(): Promise<void> {
    console.log('2️⃣  Testing Script Files...');
    
    const scripts = [
      'analyze-plugin-registry.ts',
      'enhance-plugin-docs.ts',
      'fix-plugin-dependencies.ts',
    ];

    for (const script of scripts) {
      const scriptPath = path.join(process.cwd(), 'scripts', script);
      if (fs.existsSync(scriptPath)) {
        console.log(`   ✅ ${script} exists`);
        this.results.push({
          script: `file-${script}`,
          passed: true,
        });
      } else {
        console.error(`   ❌ ${script} not found`);
        this.results.push({
          script: `file-${script}`,
          passed: false,
          error: 'File not found',
        });
      }
    }

    console.log();
  }

  async testTypeScriptCompilation(): Promise<void> {
    console.log('3️⃣  Testing TypeScript Compilation...');
    
    try {
      const { execSync } = await import('child_process');
      execSync('cd scripts && npx tsc --noEmit', { stdio: 'pipe' });
      console.log('   ✅ All scripts compile successfully');
      this.results.push({
        script: 'typescript',
        passed: true,
      });
    } catch (error) {
      console.error('   ❌ TypeScript compilation failed');
      this.results.push({
        script: 'typescript',
        passed: false,
        error: error instanceof Error ? error.message : 'Compilation failed',
      });
    }

    console.log();
  }

  async testDirectoryStructure(): Promise<void> {
    console.log('4️⃣  Testing Directory Structure...');
    
    const directories = [
      'plugin-data',
      'enhanced-plugin-data',
      'plugin-fixes',
    ];

    for (const dir of directories) {
      const dirPath = path.join(process.cwd(), dir);
      console.log(`   📁 ${dir} - Will be created when scripts run`);
    }

    console.log();
  }

  async testGitHubConnectivity(): Promise<void> {
    console.log('5️⃣  Testing GitHub API Connectivity...');
    
    if (!process.env.GITHUB_TOKEN) {
      console.log('   ⏭️  Skipping - No GitHub token');
      return;
    }

    try {
      const response = await fetch('https://api.github.com/user', {
        headers: {
          'Authorization': `token ${process.env.GITHUB_TOKEN}`,
          'Accept': 'application/vnd.github.v3+json',
        },
      });

      if (response.ok) {
        const user = await response.json() as { login: string };
        console.log(`   ✅ GitHub API accessible (authenticated as ${user.login})`);
        this.results.push({
          script: 'github-api',
          passed: true,
          details: { user: user.login },
        });
      } else {
        throw new Error(`GitHub API returned ${response.status}`);
      }
    } catch (error) {
      console.error('   ❌ GitHub API connection failed');
      this.results.push({
        script: 'github-api',
        passed: false,
        error: error instanceof Error ? error.message : 'Connection failed',
      });
    }

    console.log();
  }

  async testRegistryAccess(): Promise<void> {
    console.log('6️⃣  Testing Registry Access...');
    
    try {
      const response = await fetch('https://raw.githubusercontent.com/elizaos-plugins/registry/main/index.json');
      
      if (response.ok) {
        const registry = await response.json() as Record<string, string>;
        const pluginCount = Object.keys(registry).length;
        console.log(`   ✅ Registry accessible (${pluginCount} plugins registered)`);
        this.results.push({
          script: 'registry-access',
          passed: true,
          details: { pluginCount },
        });
      } else {
        throw new Error(`Registry returned ${response.status}`);
      }
    } catch (error) {
      console.error('   ❌ Registry access failed');
      this.results.push({
        script: 'registry-access',
        passed: false,
        error: error instanceof Error ? error.message : 'Access failed',
      });
    }

    console.log();
  }

  generateReport(): void {
    console.log('📊 Test Summary\n');
    
    const passed = this.results.filter(r => r.passed).length;
    const failed = this.results.filter(r => !r.passed).length;
    const total = this.results.length;

    console.log(`Total Tests: ${total}`);
    console.log(`Passed: ${passed} ✅`);
    console.log(`Failed: ${failed} ❌`);
    
    if (failed > 0) {
      console.log('\nFailed Tests:');
      this.results
        .filter(r => !r.passed)
        .forEach(r => {
          console.log(`  - ${r.script}: ${r.error}`);
        });
    }

    // Save test results
    const reportPath = path.join(process.cwd(), 'scripts', 'test-results.json');
    fs.writeFileSync(reportPath, JSON.stringify({
      timestamp: new Date().toISOString(),
      summary: { total, passed, failed },
      results: this.results,
    }, null, 2));

    console.log(`\n📄 Detailed results saved to: ${reportPath}`);
  }

  async run(): Promise<void> {
    try {
      await this.testEnvironmentSetup();
      await this.testScriptExistence();
      await this.testTypeScriptCompilation();
      await this.testDirectoryStructure();
      await this.testGitHubConnectivity();
      await this.testRegistryAccess();
      
      this.generateReport();
      
      const failed = this.results.filter(r => !r.passed).length;
      if (failed > 0) {
        console.log('\n⚠️  Some tests failed. Please check your configuration.');
        process.exit(1);
      } else {
        console.log('\n✅ All tests passed! Your scripts are ready to use.');
      }
    } catch (error) {
      console.error('\n❌ Test suite failed:', error);
      process.exit(1);
    }
  }
}

// Run the tests
const tester = new PluginScriptTester();
tester.run(); 