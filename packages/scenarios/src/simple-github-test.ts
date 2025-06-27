/**
 * Simple GitHub Integration Test
 * Tests the GitHub API authentication and basic functionality
 */

import { Octokit } from '@octokit/rest';

async function testGitHubIntegration() {
  console.log('🚀 Testing GitHub Integration...');

  // Check for GitHub token
  const githubToken = process.env.GITHUB_TOKEN;
  if (!githubToken) {
    throw new Error('GITHUB_TOKEN environment variable is required');
  }

  console.log(`✅ GitHub token found: ${githubToken.substring(0, 20)}...`);

  // Initialize GitHub client
  const octokit = new Octokit({
    auth: githubToken,
  });

  console.log('✅ GitHub client initialized');

  try {
    // Test authentication
    const { data: user } = await octokit.rest.users.getAuthenticated();
    console.log(`✅ GitHub authenticated as: ${user.login} (${user.name})`);
    console.log(`   Account type: ${user.type}`);
    console.log(`   Public repos: ${user.public_repos}`);
    console.log(`   Plan: ${user.plan?.name || 'Free'}`);

    // Test repository listing
    const { data: repos } = await octokit.rest.repos.listForAuthenticatedUser({
      visibility: 'public',
      sort: 'updated',
      per_page: 5,
    });

    console.log(`✅ Found ${repos.length} recent public repositories:`);
    repos.forEach((repo, index) => {
      console.log(`   ${index + 1}. ${repo.full_name} - ${repo.description || 'No description'}`);
    });

    // Test rate limiting
    const { data: rateLimit } = await octokit.rest.rateLimit.get();
    console.log(`✅ Rate limit status:`);
    console.log(`   Remaining: ${rateLimit.rate.remaining}/${rateLimit.rate.limit}`);
    console.log(`   Resets at: ${new Date(rateLimit.rate.reset * 1000).toLocaleString()}`);

    // Test creating a test repository
    const testRepoName = `eliza-github-test-${Date.now()}`;

    console.log(`🧪 Creating test repository: ${testRepoName}`);

    const { data: newRepo } = await octokit.rest.repos.createForAuthenticatedUser({
      name: testRepoName,
      description: 'Test repository for ElizaOS GitHub integration verification',
      private: false,
      auto_init: true,
      gitignore_template: 'Node',
      license_template: 'mit',
    });

    console.log(`✅ Test repository created: ${newRepo.html_url}`);

    // Test creating an issue
    const { data: issue } = await octokit.rest.issues.create({
      owner: user.login,
      repo: testRepoName,
      title: 'ElizaOS Integration Test',
      body: `# GitHub Integration Test

This issue was created by ElizaOS to verify GitHub plugin functionality.

## Test Details
- **Created**: ${new Date().toISOString()}
- **Agent**: GitHub Integration Test
- **Purpose**: Verify API connectivity and basic operations

## Test Results
✅ Repository creation: Success
✅ Issue creation: Success  
✅ API authentication: Success

This test confirms that ElizaOS can successfully interact with GitHub repositories.`,
      labels: ['test', 'eliza-generated'],
    });

    console.log(`✅ Test issue created: ${issue.html_url}`);

    // Test commenting on issue
    const { data: comment } = await octokit.rest.issues.createComment({
      owner: user.login,
      repo: testRepoName,
      issue_number: issue.number,
      body: '🤖 This comment was created by ElizaOS to demonstrate GitHub integration capabilities. All systems are functioning correctly!',
    });

    console.log(`✅ Test comment created on issue`);

    // Cleanup - delete the test repository
    console.log(`🧹 Cleaning up test repository...`);

    await octokit.rest.repos.delete({
      owner: user.login,
      repo: testRepoName,
    });

    console.log(`✅ Test repository cleaned up`);

    console.log('\n🎉 GitHub Integration Test Summary:');
    console.log('✅ Authentication: Working');
    console.log('✅ Repository operations: Working');
    console.log('✅ Issue management: Working');
    console.log('✅ Comment creation: Working');
    console.log('✅ Repository cleanup: Working');
    console.log('✅ Rate limiting: Monitored');
    console.log('\n✨ GitHub integration is fully functional!');

    return {
      success: true,
      user: user.login,
      repositories: repos.length,
      rateLimit: rateLimit.rate,
      testRepository: newRepo.full_name,
      testIssue: issue.html_url,
    };
  } catch (error) {
    console.error('❌ GitHub integration test failed:', error);
    throw error;
  }
}

// Run the test if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  testGitHubIntegration()
    .then((result) => {
      console.log('\n✅ Test completed successfully:', result);
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n❌ Test failed:', error);
      process.exit(1);
    });
}

export { testGitHubIntegration };
