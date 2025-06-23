#!/usr/bin/env node

/**
 * Example usage of the ElizaOS Plugin Registry Scripts
 * 
 * This demonstrates how to use the scripts programmatically
 * for custom workflows or integration into other tools.
 */

import * as fs from 'fs';
import * as path from 'path';
import { Octokit } from '@octokit/rest';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Example 1: Find specific plugins
async function findPluginsByPattern(pattern: string) {
  console.log(`\n🔍 Finding plugins matching "${pattern}"...`);
  
  const octokit = new Octokit({
    auth: process.env.GITHUB_TOKEN,
  });

  try {
    const { data: repos } = await octokit.repos.listForOrg({
      org: 'elizaos-plugins',
      per_page: 100,
      type: 'public',
    });

    const matchingPlugins = repos
      .filter(repo => repo.name.includes(pattern))
      .map(repo => ({
        name: `@elizaos/${repo.name}`,
        url: repo.html_url,
        stars: repo.stargazers_count,
        updated: repo.updated_at,
      }));

    console.log(`Found ${matchingPlugins.length} plugins:`);
    matchingPlugins.forEach(plugin => {
      console.log(`  - ${plugin.name} (⭐ ${plugin.stars})`);
    });

    return matchingPlugins;
  } catch (error) {
    console.error('Error:', error);
    return [];
  }
}

// Example 2: Analyze a specific plugin
async function analyzePlugin(pluginName: string) {
  console.log(`\n📊 Analyzing ${pluginName}...`);
  
  const dataFile = path.join(process.cwd(), 'plugin-data', `${pluginName.replace('@elizaos/', '')}.json`);
  
  if (!fs.existsSync(dataFile)) {
    console.log('Plugin data not found. Run analyze-registry first.');
    return;
  }

  const pluginData = JSON.parse(fs.readFileSync(dataFile, 'utf-8'));
  
  console.log(`
Plugin: ${pluginData.name}
Version: ${pluginData.version}
Pre-release: ${pluginData.isPreRelease ? 'Yes' : 'No'}
Has workspace deps: ${pluginData.hasWorkspaceDependencies ? 'Yes' : 'No'}
Stars: ${pluginData.stars || 'N/A'}
Last updated: ${pluginData.lastUpdated ? new Date(pluginData.lastUpdated).toLocaleDateString() : 'N/A'}

ElizaOS Dependencies:
${Object.entries(pluginData.elizaDependencies || {}).map(([dep, ver]) => `  - ${dep}: ${ver}`).join('\n') || '  None'}
`);
}

// Example 3: Generate custom report
async function generateCustomReport() {
  console.log('\n📈 Generating Custom Report...');
  
  const pluginDataDir = path.join(process.cwd(), 'plugin-data');
  
  if (!fs.existsSync(pluginDataDir)) {
    console.log('No plugin data found. Run analyze-registry first.');
    return;
  }

  const files = fs.readdirSync(pluginDataDir)
    .filter(f => f.endsWith('.json') && f !== 'analysis-report.json');

  const plugins = files.map(file => {
    const data = JSON.parse(fs.readFileSync(path.join(pluginDataDir, file), 'utf-8'));
    return {
      name: data.name,
      version: data.version,
      stars: data.stars || 0,
      hasIssues: data.hasWorkspaceDependencies || data.isPreRelease,
    };
  });

  // Sort by stars
  const topPlugins = plugins
    .sort((a, b) => b.stars - a.stars)
    .slice(0, 10);

  console.log('\nTop 10 Plugins by Stars:');
  topPlugins.forEach((plugin, index) => {
    console.log(`${index + 1}. ${plugin.name} (⭐ ${plugin.stars})`);
  });

  // Find plugins needing fixes
  const needsFixes = plugins.filter(p => p.hasIssues);
  console.log(`\n${needsFixes.length} plugins need dependency fixes`);

  // Save custom report
  const report = {
    generated: new Date().toISOString(),
    totalPlugins: plugins.length,
    topPlugins,
    needsFixes: needsFixes.length,
    pluginsNeedingFixes: needsFixes.map(p => p.name),
  };

  const reportPath = path.join(process.cwd(), 'custom-report.json');
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
  console.log(`\n✅ Custom report saved to: ${reportPath}`);
}

// Example 4: Check for updates
async function checkForUpdates() {
  console.log('\n🔄 Checking for Registry Updates...');
  
  try {
    const response = await fetch('https://raw.githubusercontent.com/elizaos-plugins/registry/main/index.json');
    const currentRegistry = await response.json() as Record<string, string>;
    
    const localReportPath = path.join(process.cwd(), 'plugin-data', 'analysis-report.json');
    
    if (!fs.existsSync(localReportPath)) {
      console.log('No local data to compare. Run analyze-registry first.');
      return;
    }

    const localReport = JSON.parse(fs.readFileSync(localReportPath, 'utf-8'));
    const localPluginCount = localReport.totalPlugins || 0;
    const currentPluginCount = Object.keys(currentRegistry).length;

    if (currentPluginCount > localPluginCount) {
      console.log(`🆕 ${currentPluginCount - localPluginCount} new plugins added to registry!`);
      console.log('Run analyze-registry to update your local data.');
    } else {
      console.log('✅ Your local data is up to date.');
    }
  } catch (error) {
    console.error('Error checking for updates:', error);
  }
}

// Main function to run examples
async function main() {
  console.log('🚀 ElizaOS Plugin Registry Script Examples\n');

  if (!process.env.GITHUB_TOKEN) {
    console.error('❌ GITHUB_TOKEN not found. Please set it in .env file.');
    process.exit(1);
  }

  // Run examples based on command line arguments
  const args = process.argv.slice(2);
  
  if (args.length === 0) {
    console.log('Usage: tsx scripts/example-usage.ts [command]');
    console.log('\nCommands:');
    console.log('  find <pattern>    - Find plugins matching pattern');
    console.log('  analyze <plugin>  - Analyze a specific plugin');
    console.log('  report            - Generate custom report');
    console.log('  check             - Check for registry updates');
    console.log('  all               - Run all examples');
    return;
  }

  const command = args[0];

  switch (command) {
    case 'find':
      await findPluginsByPattern(args[1] || 'plugin-');
      break;
    
    case 'analyze':
      if (!args[1]) {
        console.log('Please specify a plugin name');
        return;
      }
      await analyzePlugin(args[1]);
      break;
    
    case 'report':
      await generateCustomReport();
      break;
    
    case 'check':
      await checkForUpdates();
      break;
    
    case 'all':
      await findPluginsByPattern('solana');
      await checkForUpdates();
      // Note: analyze and report need data from analyze-registry
      console.log('\nTo see plugin analysis and reports, run:');
      console.log('  1. npm run analyze-registry');
      console.log('  2. tsx scripts/example-usage.ts analyze @elizaos/plugin-solana');
      console.log('  3. tsx scripts/example-usage.ts report');
      break;
    
    default:
      console.log(`Unknown command: ${command}`);
  }
}

// Run the main function
main().catch(console.error); 