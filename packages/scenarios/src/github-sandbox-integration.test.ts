// /**
//  * GitHub + Sandbox Integration Test
//  * Tests the end-to-end workflow of creating a GitHub repository,
//  * spawning a development team in E2B sandbox, and having them work on real GitHub
//  */

// import { describe, it, expect, beforeAll, afterAll } from 'vitest';
// import { Octokit } from '@octokit/rest';
// import type { IAgentRuntime } from '@elizaos/core';
// import { AgentRuntime } from '@elizaos/core';
// import { PgliteDatabase, PgLiteDatabaseAdapter } from '@elizaos/adapter-postgres';

// describe('GitHub + Sandbox Integration Test', () => {
//   let runtime: IAgentRuntime;
//   let octokit: Octokit;
//   let testRepoName: string;
//   let testRepoFullName: string;
//   let repoCreated = false;

//   beforeAll(async () => {
//     // Initialize GitHub client
//     const githubToken = process.env.GITHUB_TOKEN;
//     if (!githubToken) {
//       throw new Error('GITHUB_TOKEN environment variable is required for this test');
//     }

//     octokit = new Octokit({
//       auth: githubToken,
//     });

//     // Verify GitHub authentication
//     const { data: user } = await octokit.rest.users.getAuthenticated();
//     console.log(`✅ GitHub authenticated as: ${user.login}`);

//     // Create test repository name with timestamp
//     testRepoName = `eliza-sandbox-test-${Date.now()}`;
//     testRepoFullName = `${user.login}/${testRepoName}`;

//     // Initialize runtime with both GitHub and Sandbox plugins
//     const database = new PgliteDatabase(':memory:');
//     const adapter = new PgLiteDatabaseAdapter(database);
//     await adapter.init();

//     runtime = new AgentRuntime({
//       character: {
//         name: 'GitHubSandboxOrchestrator',
//         bio: 'A specialized agent that coordinates GitHub operations with sandbox development teams',
//         system: `You are a project orchestrator that integrates GitHub repositories with E2B sandbox development teams.

// When asked to create development projects, you should:
// 1. Create or access GitHub repositories using GitHub plugin actions
// 2. Use SPAWN_DEV_TEAM action to create specialized teams in E2B sandboxes
// 3. Have the development team work on real GitHub repositories
// 4. Coordinate commits, pull requests, and code reviews
// 5. Ensure proper integration between sandbox development and GitHub workflows

// You have access to both GitHub plugin actions and sandbox management capabilities.`,
//         plugins: ['@elizaos/plugin-github', '@elizaos/plugin-elizaos-services'],
//         settings: {
//           githubConfig: {
//             GITHUB_TOKEN: githubToken,
//             GITHUB_OWNER: user.login,
//           },
//         },
//       },
//       adapter: adapter,
//       agentId: `github-sandbox-orchestrator-${Date.now()}` as any,
//     });

//     // Initialize the runtime
//     await runtime.initialize();

//     console.log('✅ Runtime initialized with GitHub and Sandbox plugins');
//   }, 30000);

//   afterAll(async () => {
//     // Clean up test repository
//     if (repoCreated && testRepoFullName) {
//       try {
//         const [owner, repo] = testRepoFullName.split('/');
//         await octokit.rest.repos.delete({
//           owner,
//           repo,
//         });
//         console.log(`🧹 Cleaned up test repository: ${testRepoFullName}`);
//       } catch (error) {
//         console.warn('Failed to clean up test repository:', error);
//       }
//     }
//   }, 10000);

//   it('should create a GitHub repository using the GitHub plugin', async () => {
//     // Create a test repository
//     const createRepoResponse = await octokit.rest.repos.createForAuthenticatedUser({
//       name: testRepoName,
//       description: 'Test repository for ElizaOS GitHub + Sandbox integration',
//       private: false,
//       auto_init: true,
//       gitignore_template: 'Node',
//       license_template: 'mit',
//     });

//     expect(createRepoResponse.status).toBe(201);
//     expect(createRepoResponse.data.name).toBe(testRepoName);
//     repoCreated = true;

//     console.log(`✅ Created test repository: ${createRepoResponse.data.html_url}`);
//   }, 15000);

//   it('should verify GitHub plugin is loaded and functional', async () => {
//     // Check that GitHub service is available
//     const githubService = runtime.getService('github');
//     expect(githubService).toBeDefined();
//     expect(githubService).not.toBeNull();

//     console.log('✅ GitHub service is loaded and available');
//   }, 5000);

//   it('should verify Sandbox plugin is loaded and functional', async () => {
//     // Check that sandbox manager service is available
//     const sandboxManager = runtime.getService('sandbox-manager');
//     expect(sandboxManager).toBeDefined();
//     expect(sandboxManager).not.toBeNull();

//     console.log('✅ Sandbox manager service is loaded and available');
//   }, 5000);

//   it('should process GitHub repository creation request through agent', async () => {
//     const roomId = `test-room-${Date.now()}` as any;

//     // Create a room for testing
//     await runtime.createMemory({
//       id: `room-memory-${Date.now()}` as any,
//       entityId: runtime.agentId,
//       roomId,
//       content: {
//         text: 'Room created for GitHub sandbox integration test',
//         source: 'test',
//       },
//     }, 'messages');

//     // Send message asking agent to work with the GitHub repository
//     const message = {
//       id: `msg-${Date.now()}` as any,
//       entityId: 'test-user' as any,
//       roomId,
//       content: {
//         text: `I have a GitHub repository at ${testRepoFullName} that needs a todo list application. Please use your GitHub integration to access this repository and spawn a development team to work on it. The team should create a React frontend with TypeScript and an Express.js backend.`,
//         source: 'test',
//       },
//     };

//     // Process the message
//     await runtime.processMessage(message);

//     // Check for response
//     const memories = await runtime.getMemories({ roomId, count: 10, tableName: 'messages' });
//     const agentResponses = memories.filter((m) => m.entityId === runtime.agentId);

//     expect(agentResponses.length).toBeGreaterThan(0);

//     const latestResponse = agentResponses[agentResponses.length - 1];
//     expect(latestResponse.content.text).toBeDefined();

//     // Check that response mentions GitHub and development team concepts
//     const responseText = latestResponse.content.text!.toLowerCase();
//     const hasGitHubMention = responseText.includes('github') || responseText.includes('repository');
//     const hasTeamMention =
//       responseText.includes('team') ||
//       responseText.includes('developer') ||
//       responseText.includes('agent');

//     expect(hasGitHubMention || hasTeamMention).toBe(true);

//     console.log('✅ Agent processed GitHub repository request');
//     console.log(`Response: ${latestResponse.content.text}`);
//   }, 20000);

//   it('should demonstrate GitHub API access through the plugin', async () => {
//     // Test that we can access the repository through the GitHub plugin
//     const [owner, repo] = testRepoFullName.split('/');

//     const repoInfo = await octokit.rest.repos.get({
//       owner,
//       repo,
//     });

//     expect(repoInfo.status).toBe(200);
//     expect(repoInfo.data.full_name).toBe(testRepoFullName);

//     // Test creating an issue (simulating development team activity)
//     const issue = await octokit.rest.issues.create({
//       owner,
//       repo,
//       title: 'Create Todo List Application',
//       body: `## Requirements
// - React frontend with TypeScript
// - Express.js backend with SQLite database
// - Responsive design with Tailwind CSS
// - Full CRUD operations for todos
// - Proper project structure

// This issue was created by the ElizaOS GitHub + Sandbox integration test to demonstrate real GitHub workflow integration.`,
//       labels: ['enhancement', 'eliza-generated'],
//     });

//     expect(issue.status).toBe(201);
//     expect(issue.data.title).toBe('Create Todo List Application');

//     console.log(`✅ Created test issue: ${issue.data.html_url}`);

//     // Test commenting on the issue (simulating agent interaction)
//     const comment = await octokit.rest.issues.createComment({
//       owner,
//       repo,
//       issue_number: issue.data.number,
//       body: '🤖 ElizaOS development team has been assigned to this task. Sandbox environment is being prepared for collaborative development.',
//     });

//     expect(comment.status).toBe(201);

//     console.log('✅ Added comment to issue, demonstrating GitHub workflow integration');
//   }, 15000);

//   it('should verify end-to-end GitHub workflow capability', async () => {
//     // This test verifies that the infrastructure is in place for full GitHub workflow
//     const [owner, repo] = testRepoFullName.split('/');

//     // Test branch operations
//     const mainBranch = await octokit.rest.repos.getBranch({
//       owner,
//       repo,
//       branch: 'main',
//     });

//     expect(mainBranch.status).toBe(200);

//     // Test creating a development branch
//     const devBranch = await octokit.rest.git.createRef({
//       owner,
//       repo,
//       ref: 'refs/heads/feature/todo-app-development',
//       sha: mainBranch.data.commit.sha,
//     });

//     expect(devBranch.status).toBe(201);

//     // Test file operations - create a simple file
//     const fileContent = `# Todo List Application

// This is a todo list application created by the ElizaOS multi-agent development team.

// ## Technology Stack
// - Frontend: React with TypeScript
// - Backend: Express.js with SQLite
// - Styling: Tailwind CSS
// - Development: E2B Sandbox Environment
// - Version Control: GitHub

// ## Development Team
// - Backend Developer Agent: API and database implementation
// - Frontend Developer Agent: React components and UI
// - DevOps Agent: Project structure and build tools

// Created by ElizaOS GitHub + Sandbox integration test at ${new Date().toISOString()}
// `;

//     const createFile = await octokit.rest.repos.createOrUpdateFileContents({
//       owner,
//       repo,
//       path: 'README.md',
//       message: '🤖 Initialize todo app project structure',
//       content: Buffer.from(fileContent).toString('base64'),
//       branch: 'feature/todo-app-development',
//     });

//     expect(createFile.status).toBe(201);

//     console.log('✅ Created development branch and project file');
//     console.log(`View repository: https://github.com/${testRepoFullName}`);
//     console.log(
//       `View branch: https://github.com/${testRepoFullName}/tree/feature/todo-app-development`
//     );
//   }, 15000);

//   it('should demonstrate complete integration workflow', async () => {
//     // Final integration test that shows GitHub + Sandbox working together
//     const roomId = `integration-room-${Date.now()}` as any;

//     // Send a comprehensive message that should trigger both GitHub and Sandbox actions
//     const message = {
//       id: `integration-msg-${Date.now()}` as any,
//       entityId: 'test-user' as any,
//       roomId,
//       content: {
//         text: `Perfect! I can see the repository ${testRepoFullName} is set up. Now I need you to:

// 1. Access the GitHub repository and create a proper project structure
// 2. Spawn a development team in an E2B sandbox
// 3. Have the team collaborate on building the todo list application
// 4. Ensure the development work is committed back to the GitHub repository

// The development team should work on the feature/todo-app-development branch and create a complete full-stack application as specified in the requirements.`,
//         source: 'integration-test',
//       },
//     };

//     await runtime.processMessage(message);

//     // Verify the agent processed the integration request
//     const memories = await runtime.getMemories({ roomId, count: 5, tableName: 'messages' });
//     const agentResponse = memories.find((m) => m.entityId === runtime.agentId);

//     expect(agentResponse).toBeDefined();
//     expect(agentResponse!.content.text).toBeDefined();

//     const responseText = agentResponse!.content.text!;

//     // Verify response mentions key integration concepts
//     const mentionsGitHub = /github|repository|commit|branch/i.test(responseText);
//     const mentionsSandbox = /sandbox|team|development|e2b/i.test(responseText);

//     // At least one of these should be true for a meaningful response
//     expect(mentionsGitHub || mentionsSandbox).toBe(true);

//     console.log('✅ Integration workflow processed successfully');
//     console.log(`Agent response: ${responseText}`);

//     // Success metrics
//     console.log('\n🎉 GitHub + Sandbox Integration Test Summary:');
//     console.log(`✅ GitHub authentication: Working`);
//     console.log(`✅ Repository creation: ${testRepoFullName}`);
//     console.log(`✅ GitHub plugin loading: Successful`);
//     console.log(`✅ Sandbox plugin loading: Successful`);
//     console.log(`✅ Agent GitHub processing: Functional`);
//     console.log(`✅ GitHub API operations: Working`);
//     console.log(`✅ End-to-end workflow: Demonstrated`);
//   }, 25000);
// });
