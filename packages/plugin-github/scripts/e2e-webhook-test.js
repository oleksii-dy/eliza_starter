#!/usr/bin/env node

/**
 * End-to-End Webhook Testing Script
 * 
 * This script automates the testing of GitHub webhook functionality with real events.
 * It requires a running ElizaOS instance with GitHub and Ngrok plugins enabled.
 * 
 * Prerequisites:
 * - GitHub token with webhook permissions
 * - ElizaOS server running with webhook endpoint
 * - Test repository where you have admin access
 */

const { Octokit } = require('@octokit/rest');
const axios = require('axios');
const readline = require('readline');

// Configuration
const config = {
  githubToken: process.env.GITHUB_TOKEN,
  webhookSecret: process.env.GITHUB_WEBHOOK_SECRET || 'test-webhook-secret-123',
  agentUrl: process.env.AGENT_URL || 'http://localhost:3000',
  testRepo: process.env.TEST_REPO || 'test-webhook-repo',
  testOwner: process.env.TEST_OWNER || process.env.GITHUB_OWNER,
  agentName: process.env.AGENT_NAME || 'ElizaAgent',
};

// Validate configuration
if (!config.githubToken) {
  console.error('❌ GITHUB_TOKEN environment variable is required');
  process.exit(1);
}

if (!config.testOwner) {
  console.error('❌ TEST_OWNER or GITHUB_OWNER environment variable is required');
  process.exit(1);
}

// Initialize Octokit
const octokit = new Octokit({ auth: config.githubToken });

// Test results tracking
const testResults = {
  passed: 0,
  failed: 0,
  skipped: 0,
  tests: [],
};

// Utility functions
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function logTest(name, status, details = '') {
  const icon = status === 'PASS' ? '✅' : status === 'FAIL' ? '❌' : '⏭️';
  console.log(`\n${icon} ${name}: ${status}`);
  if (details) console.log(`   ${details}`);
  
  testResults.tests.push({ name, status, details });
  if (status === 'PASS') testResults.passed++;
  else if (status === 'FAIL') testResults.failed++;
  else testResults.skipped++;
}

async function prompt(question) {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });
  
  return new Promise(resolve => {
    rl.question(question, answer => {
      rl.close();
      resolve(answer);
    });
  });
}

// Test functions
async function testWebhookCreation() {
  console.log('\n🧪 Test 1: Webhook Creation via Agent');
  
  try {
    // Check if agent is running
    const healthResponse = await axios.get(`${config.agentUrl}/api/runtime/health`);
    if (healthResponse.data.status !== 'OK') {
      throw new Error('Agent is not healthy');
    }
    
    // Get webhook URL from agent (assuming it's available via an endpoint)
    const ngrokResponse = await axios.get(`${config.agentUrl}/api/ngrok/status`).catch(() => null);
    
    if (!ngrokResponse || !ngrokResponse.data.url) {
      logTest('Webhook Creation', 'SKIP', 'Ngrok not available - using manual webhook URL');
      const webhookUrl = await prompt('Enter webhook URL (or press Enter to skip): ');
      if (!webhookUrl) return null;
      return webhookUrl;
    }
    
    const webhookUrl = `${ngrokResponse.data.url}/api/github/webhook`;
    console.log(`   Using webhook URL: ${webhookUrl}`);
    
    // Create webhook via GitHub API
    const webhook = await octokit.repos.createWebhook({
      owner: config.testOwner,
      repo: config.testRepo,
      config: {
        url: webhookUrl,
        content_type: 'json',
        secret: config.webhookSecret,
      },
      events: ['issues', 'issue_comment', 'pull_request'],
    });
    
    logTest('Webhook Creation', 'PASS', `Webhook ID: ${webhook.data.id}`);
    return webhook.data;
  } catch (error) {
    logTest('Webhook Creation', 'FAIL', error.message);
    return null;
  }
}

async function testWebhookPing(webhookId) {
  console.log('\n🧪 Test 2: Webhook Ping');
  
  if (!webhookId) {
    logTest('Webhook Ping', 'SKIP', 'No webhook ID available');
    return;
  }
  
  try {
    await octokit.repos.pingWebhook({
      owner: config.testOwner,
      repo: config.testRepo,
      hook_id: webhookId,
    });
    
    // Wait for ping to be delivered
    await sleep(2000);
    
    // Check recent deliveries
    const deliveries = await octokit.repos.listWebhookDeliveries({
      owner: config.testOwner,
      repo: config.testRepo,
      hook_id: webhookId,
      per_page: 5,
    });
    
    const pingDelivery = deliveries.data.find(d => d.event === 'ping');
    if (pingDelivery && pingDelivery.status === 'OK') {
      logTest('Webhook Ping', 'PASS', 'Ping delivered successfully');
    } else {
      logTest('Webhook Ping', 'FAIL', 'Ping delivery failed or not found');
    }
  } catch (error) {
    logTest('Webhook Ping', 'FAIL', error.message);
  }
}

async function testIssueMention() {
  console.log('\n🧪 Test 3: Issue Mention Detection');
  
  try {
    // Create issue with mention
    const issue = await octokit.issues.create({
      owner: config.testOwner,
      repo: config.testRepo,
      title: `E2E Test: Issue Mention ${Date.now()}`,
      body: `@${config.agentName} this is a test issue. Can you help with adding a test line to README?`,
    });
    
    console.log(`   Created issue #${issue.data.number}`);
    console.log(`   Waiting for agent response...`);
    
    // Wait for webhook processing and agent response
    await sleep(10000); // 10 seconds
    
    // Check for agent comments
    const comments = await octokit.issues.listComments({
      owner: config.testOwner,
      repo: config.testRepo,
      issue_number: issue.data.number,
    });
    
    const agentComment = comments.data.find(c => 
      c.user.login.toLowerCase() === config.agentName.toLowerCase() ||
      c.body.includes('received your request') ||
      c.body.includes('analyze')
    );
    
    if (agentComment) {
      logTest('Issue Mention Detection', 'PASS', `Agent responded: "${agentComment.body.substring(0, 50)}..."`);
      
      // Check if PR was created
      await sleep(5000);
      const prs = await octokit.pulls.list({
        owner: config.testOwner,
        repo: config.testRepo,
        state: 'open',
        per_page: 10,
      });
      
      const relatedPR = prs.data.find(pr => 
        pr.body.includes(`#${issue.data.number}`) ||
        pr.title.includes(issue.data.number.toString())
      );
      
      if (relatedPR) {
        logTest('Auto-PR Creation', 'PASS', `PR #${relatedPR.number} created`);
      } else {
        logTest('Auto-PR Creation', 'FAIL', 'No PR was created for the issue');
      }
    } else {
      logTest('Issue Mention Detection', 'FAIL', 'Agent did not respond to mention');
    }
    
    // Close the test issue
    await octokit.issues.update({
      owner: config.testOwner,
      repo: config.testRepo,
      issue_number: issue.data.number,
      state: 'closed',
    });
    
    return issue.data.number;
  } catch (error) {
    logTest('Issue Mention Detection', 'FAIL', error.message);
    return null;
  }
}

async function testComplexIssue() {
  console.log('\n🧪 Test 4: Complex Issue Handling');
  
  try {
    // Create complex issue
    const issue = await octokit.issues.create({
      owner: config.testOwner,
      repo: config.testRepo,
      title: `E2E Test: Complex Refactoring ${Date.now()}`,
      body: `@${config.agentName} please refactor the entire authentication system to use OAuth2 with multi-factor authentication, migrate the database schema, and update all API endpoints.`,
    });
    
    console.log(`   Created complex issue #${issue.data.number}`);
    console.log(`   Waiting for agent response...`);
    
    // Wait for processing
    await sleep(10000);
    
    // Check for agent response
    const comments = await octokit.issues.listComments({
      owner: config.testOwner,
      repo: config.testRepo,
      issue_number: issue.data.number,
    });
    
    const agentComment = comments.data.find(c => 
      c.body.includes('complex') ||
      c.body.includes('human intervention') ||
      c.body.includes('requires manual')
    );
    
    if (agentComment && !comments.data.some(c => c.body.includes('created a pull request'))) {
      logTest('Complex Issue Handling', 'PASS', 'Agent correctly identified complexity');
    } else {
      logTest('Complex Issue Handling', 'FAIL', 'Agent did not handle complex issue appropriately');
    }
    
    // Close issue
    await octokit.issues.update({
      owner: config.testOwner,
      repo: config.testRepo,
      issue_number: issue.data.number,
      state: 'closed',
    });
  } catch (error) {
    logTest('Complex Issue Handling', 'FAIL', error.message);
  }
}

async function testWebhookDeletion(webhookId) {
  console.log('\n🧪 Test 5: Webhook Deletion');
  
  if (!webhookId) {
    logTest('Webhook Deletion', 'SKIP', 'No webhook ID available');
    return;
  }
  
  try {
    await octokit.repos.deleteWebhook({
      owner: config.testOwner,
      repo: config.testRepo,
      hook_id: webhookId,
    });
    
    logTest('Webhook Deletion', 'PASS', 'Webhook deleted successfully');
  } catch (error) {
    logTest('Webhook Deletion', 'FAIL', error.message);
  }
}

// Main test runner
async function runTests() {
  console.log('🚀 ElizaOS GitHub Plugin E2E Webhook Tests');
  console.log('==========================================');
  console.log(`Agent URL: ${config.agentUrl}`);
  console.log(`Test Repo: ${config.testOwner}/${config.testRepo}`);
  console.log(`Agent Name: ${config.agentName}`);
  console.log('');
  
  // Check if test repo exists
  try {
    await octokit.repos.get({
      owner: config.testOwner,
      repo: config.testRepo,
    });
  } catch (error) {
    console.error(`❌ Test repository ${config.testOwner}/${config.testRepo} not found`);
    console.log('   Please create the test repository or set TEST_REPO environment variable');
    process.exit(1);
  }
  
  // Run tests
  const webhook = await testWebhookCreation();
  const webhookId = webhook?.id;
  
  if (webhookId) {
    await testWebhookPing(webhookId);
  }
  
  await testIssueMention();
  await testComplexIssue();
  
  if (webhookId) {
    await testWebhookDeletion(webhookId);
  }
  
  // Print summary
  console.log('\n\n📊 Test Summary');
  console.log('===============');
  console.log(`Total Tests: ${testResults.tests.length}`);
  console.log(`✅ Passed: ${testResults.passed}`);
  console.log(`❌ Failed: ${testResults.failed}`);
  console.log(`⏭️  Skipped: ${testResults.skipped}`);
  
  if (testResults.failed > 0) {
    console.log('\n❌ Some tests failed. Please check the details above.');
    process.exit(1);
  } else {
    console.log('\n✅ All tests passed!');
  }
}

// Run tests
runTests().catch(error => {
  console.error('\n❌ Test runner failed:', error);
  process.exit(1);
});