/**
 * Example: Spawning a project team with automatic complexity analysis
 *
 * This example shows how to use the autocoder plugin to automatically
 * spawn a team of agents based on project requirements.
 */

import { elizaLogger } from '@elizaos/core';

// Example project descriptions of varying complexity

const simpleProject = `
Create a simple todo app with React. Features:
- Add/remove todos
- Mark todos as complete
- Filter by status
- Local storage persistence
`;

const moderateProject = `
Build a blog platform with React frontend and Node.js backend:
- User authentication (register, login, logout)
- Create, edit, delete blog posts
- Comments system
- Categories and tags
- Search functionality
- PostgreSQL database
- RESTful API
`;

const complexProject = `
Develop a full-stack e-commerce platform:
- React frontend with TypeScript
- Node.js/Express backend
- PostgreSQL database
- User authentication with JWT
- Product catalog with search and filters
- Shopping cart and checkout
- Payment integration with Stripe
- Order management
- Admin dashboard
- Email notifications
- Real-time inventory updates
- Redis caching
- Docker deployment
`;

const enterpriseProject = `
Build a comprehensive SaaS project management platform:
- Next.js frontend with TypeScript
- Microservices backend (Node.js, Python)
- PostgreSQL and MongoDB databases
- Multi-tenant architecture
- Advanced authentication (OAuth, SAML, 2FA)
- Real-time collaboration with WebSockets
- AI-powered task suggestions
- Advanced reporting and analytics
- File storage with S3
- Email and Slack integrations
- Stripe billing and subscriptions
- Kubernetes deployment
- CI/CD pipeline
- Comprehensive test coverage
- Security compliance (SOC2)
`;

async function demonstrateProjectTeamSpawning() {
  elizaLogger.info('=== Autocoder Project Team Spawning Demo ===\n');

  // The system will analyze each project and:
  // 1. Determine complexity level
  // 2. Calculate estimated hours
  // 3. Decide optimal team composition
  // 4. Create task breakdown with dependencies
  // 5. Spawn appropriate number of agents

  const projects = [
    { name: 'Simple Todo App', description: simpleProject },
    { name: 'Blog Platform', description: moderateProject },
    { name: 'E-commerce Platform', description: complexProject },
    { name: 'SaaS Management Platform', description: enterpriseProject },
  ];

  for (const project of projects) {
    elizaLogger.info(`\n📋 Project: ${project.name}`);
    elizaLogger.info('─'.repeat(50));

    // In actual usage, you would send this to your Eliza agent:
    // "Build a todo app with React"
    //
    // The agent would:
    // 1. Use ProjectComplexityEstimator to analyze the request
    // 2. Determine it needs 3-4 agents (frontend, backend, tester, reviewer)
    // 3. Create a GitHub repository
    // 4. Spawn agents in E2B containers
    // 5. Distribute tasks based on dependencies
    // 6. Monitor progress and redistribute as needed

    elizaLogger.info('Expected team composition:');

    if (project.name.includes('Simple')) {
      elizaLogger.info('• 1x Lead agent (coordination)');
      elizaLogger.info('• 1x Frontend agent (React)');
      elizaLogger.info('• 1x Testing agent');
      elizaLogger.info('• 1x Reviewer agent');
      elizaLogger.info('Total: 4 agents, ~10-15 hours');
    } else if (project.name.includes('Blog')) {
      elizaLogger.info('• 1x Lead agent (architecture)');
      elizaLogger.info('• 1x Frontend agent (React UI)');
      elizaLogger.info('• 2x Backend agents (API, database)');
      elizaLogger.info('• 1x Database agent (PostgreSQL)');
      elizaLogger.info('• 1x Testing agent');
      elizaLogger.info('• 1x Reviewer agent');
      elizaLogger.info('Total: 7 agents, ~30-40 hours');
    } else if (project.name.includes('E-commerce')) {
      elizaLogger.info('• 1x Lead agent (architecture)');
      elizaLogger.info('• 2x Frontend agents (UI, admin)');
      elizaLogger.info('• 3x Backend agents (API, payments, notifications)');
      elizaLogger.info('• 1x Database agent (PostgreSQL, Redis)');
      elizaLogger.info('• 1x Testing agent');
      elizaLogger.info('• 1x Reviewer agent');
      elizaLogger.info('Total: 9 agents, ~60-80 hours');
    } else if (project.name.includes('SaaS')) {
      elizaLogger.info('• 1x Lead agent (architecture)');
      elizaLogger.info('• 2x Frontend agents (Next.js)');
      elizaLogger.info('• 3x Backend agents (microservices)');
      elizaLogger.info('• 1x Database agent (multi-DB)');
      elizaLogger.info('• 1x DevOps agent (K8s, CI/CD)');
      elizaLogger.info('• 1x Testing agent');
      elizaLogger.info('• 1x Reviewer agent');
      elizaLogger.info('Total: 10 agents, ~120-150 hours');
    }
  }

  elizaLogger.info('\n\n🔄 Workflow Process:');
  elizaLogger.info('1. Main agent creates GitHub repository');
  elizaLogger.info('2. Each agent clones repo and creates feature branch');
  elizaLogger.info('3. Agents work on non-blocking tasks in parallel');
  elizaLogger.info('4. Agents sleep when waiting for dependencies');
  elizaLogger.info('5. Tasks are redistributed as agents complete work');
  elizaLogger.info('6. Code reviews happen before merging to main');
  elizaLogger.info('7. Final integration and testing');
}

// Example agent conversation
function showExampleConversation() {
  elizaLogger.info('\n\n💬 Example Conversation:');
  elizaLogger.info('─'.repeat(50));

  elizaLogger.info('\nUser: Build a React todo app with authentication and a Node.js backend');

  elizaLogger.info(
    '\nAssistant: 🤔 Analyzing project requirements to determine optimal team composition...'
  );

  elizaLogger.info('\nAssistant: ✅ Project team spawned successfully!');
  elizaLogger.info('\n📊 **Project Analysis:**');
  elizaLogger.info('• Complexity: moderate');
  elizaLogger.info('• Estimated Hours: 28');
  elizaLogger.info('• Total Agents: 6');
  elizaLogger.info('\n👥 **Team Composition:**');
  elizaLogger.info('• 1x lead (project-management, architecture, coordination)');
  elizaLogger.info('• 1x frontend (ui, ux, responsive-design)');
  elizaLogger.info('• 2x backend (api, database, business-logic)');
  elizaLogger.info('• 1x testing (unit-testing, e2e-testing, test-automation)');
  elizaLogger.info('• 1x reviewer (code-review, security, best-practices)');
  elizaLogger.info('\n📋 **Initial Tasks:**');
  elizaLogger.info('• Project Setup (2h) - lead');
  elizaLogger.info('• Database Design (4h) - database');
  elizaLogger.info('• API Development (8h) - backend');
  elizaLogger.info('• UI Components (6h) - frontend');
  elizaLogger.info('• Authentication System (6h) - backend');
  elizaLogger.info('• ... and 7 more tasks');
  elizaLogger.info('\n🔗 **Repository:** https://github.com/elizaos/autocoder-todo-app-1234567890');
  elizaLogger.info('\nTask ID: project-1234567890-abc123');
  elizaLogger.info(
    '\n🚀 Agents are now working on their assigned tasks! They will collaborate through the shared repository.'
  );
}

// Run the demonstration
demonstrateProjectTeamSpawning();
showExampleConversation();

elizaLogger.info('\n\n✨ Key Benefits:');
elizaLogger.info('• Automatic team sizing based on project complexity');
elizaLogger.info('• Non-blocking parallel task execution');
elizaLogger.info('• Intelligent dependency management');
elizaLogger.info('• Agents sleep/wake based on task availability');
elizaLogger.info('• Real-time task redistribution');
elizaLogger.info('• Git-based collaboration workflow');
elizaLogger.info('• No manual agent configuration needed');
