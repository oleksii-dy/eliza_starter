#!/usr/bin/env node

import { spawn } from 'child_process';
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

console.log('🚀 ElizaDev Plugin Live Test Setup\n');

// Check if .env exists, if not create from template
const envPath = join(__dirname, '.env');
const envTestPath = join(__dirname, '.env.test');

if (!existsSync(envPath)) {
  console.log('📝 Creating .env file from template...');
  if (existsSync(envTestPath)) {
    const envTemplate = readFileSync(envTestPath, 'utf8');
    writeFileSync(envPath, envTemplate);
    console.log('✅ Created .env file');
    console.log('⚠️  Please edit .env with your actual values before continuing!\n');
    
    console.log('Required settings to update in .env:');
    console.log('- GITHUB_TOKEN: Your GitHub personal access token');
    console.log('- GITHUB_OWNER: Your GitHub username');
    console.log('- GITHUB_REPO: Repository name for testing');
    console.log('- OPENAI_API_KEY or ANTHROPIC_API_KEY: AI provider key\n');
    
    process.exit(1);
  }
}

// Check if required environment variables are set
const envContent = readFileSync(envPath, 'utf8');
const requiredVars = ['GITHUB_TOKEN', 'GITHUB_OWNER', 'GITHUB_REPO'];
const missingVars = [];

for (const varName of requiredVars) {
  const match = envContent.match(new RegExp(`^${varName}=(.+)$`, 'm'));
  if (!match || match[1].includes('your_') || match[1].includes('here')) {
    missingVars.push(varName);
  }
}

if (missingVars.length > 0) {
  console.log('❌ Missing required environment variables in .env:');
  missingVars.forEach(v => console.log(`   - ${v}`));
  console.log('\nPlease update .env with your actual values.');
  process.exit(1);
}

console.log('✅ Environment configuration looks good!');
console.log('🏗️  Building ElizaDev plugin...\n');

// Build the plugin first
const buildProcess = spawn('npm', ['run', 'build'], {
  cwd: join(__dirname, 'packages/plugin-eliza-dev'),
  stdio: 'inherit'
});

buildProcess.on('exit', (code) => {
  if (code !== 0) {
    console.error('❌ Plugin build failed');
    process.exit(1);
  }
  
  console.log('\n✅ Plugin built successfully!');
  console.log('🤖 Starting ElizaDev agent...\n');
  
  // Start the agent with our dev character
  const agentProcess = spawn('npx', [
    'eliza', 
    '--character=packages/cli/src/characters/eliza-dev.ts',
    '--client=direct'
  ], {
    cwd: __dirname,
    stdio: 'inherit',
    env: {
      ...process.env,
      NODE_ENV: 'development'
    }
  });
  
  console.log('💡 Agent starting with ElizaDev character...');
  console.log('\n📋 Available Commands:');
  console.log('   /capture_feature <description> - Convert idea to GitHub issue');
  console.log('   /implement_feature <issue_url> - TDD implementation (coming soon)');
  console.log('   /review_pr <pr_url> - Code review (coming soon)');
  console.log('   /ship_report <days> - Release notes (coming soon)');
  console.log('\n💬 Example usage:');
  console.log('   /capture_feature Add user authentication with OAuth2');
  console.log('\n🔧 Press Ctrl+C to stop the agent\n');
  
  agentProcess.on('exit', (code) => {
    console.log(`\n🛑 Agent stopped with code ${code}`);
  });
  
  // Handle Ctrl+C gracefully
  process.on('SIGINT', () => {
    console.log('\n🛑 Stopping agent...');
    agentProcess.kill('SIGINT');
    process.exit(0);
  });
});