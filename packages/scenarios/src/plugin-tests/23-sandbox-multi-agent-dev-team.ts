import type { Scenario } from '../types.js';
import { v4 as uuidv4 } from 'uuid';

/**
 * Multi-Agent Development Team in E2B Sandbox Scenario
 * Tests the coordination of specialized AI agents (backend, frontend, devops) 
 * working together in an isolated E2B sandbox to build a todo list application
 */
const sandboxMultiAgentDevTeamScenario: Scenario = {
  id: uuidv4() as any,
  name: 'Sandbox Multi-Agent Development Team',
  description: 'Tests spawning and coordinating specialized development agents in E2B sandbox to collaboratively build a todo list application with proper task delegation and project management',
  category: 'integration',
  tags: ['multi-agent', 'sandbox', 'development', 'collaboration', 'e2b', 'cross-plugin'],

  actors: [
    {
      id: uuidv4() as any,
      name: 'ProjectOrchestrator',
      role: 'subject', // The agent being tested
      bio: 'A project management agent that can spawn and coordinate specialized development teams in isolated sandbox environments',
      system: `You are a project orchestrator that specializes in spawning and managing development teams in E2B sandboxes.

When asked to create applications or development projects, you should:
1. Use the SPAWN_DEV_TEAM action to create a specialized team with backend, frontend, and devops agents
2. Deploy the team to an isolated E2B sandbox environment
3. Use DELEGATE_TASK action to assign specific tasks to team members
4. Coordinate the development workflow and provide status updates
5. Ensure proper communication between team members

You have access to sandbox management capabilities and can create isolated development environments where teams can work safely without affecting the host system.`,
      plugins: ['@elizaos/plugin-elizaos-services'], // Plugin that provides sandbox actions
      script: { steps: [] }, // Subject agent responds to requests
    },
    {
      id: '88a9bcd0-1234-5678-90ef-sandbox-test1',
      name: 'ProductManager',
      role: 'assistant', // Drives the scenario
      script: {
        steps: [
          {
            type: 'message',
            content: 'I need you to create a todo list application. The requirements are: React frontend with TypeScript, Express.js backend with SQLite database, responsive design with Tailwind CSS, full CRUD operations for todos, and proper project structure. Can you spawn a development team to build this?',
            description: 'Request todo app development with specific tech requirements',
          },
          {
            type: 'wait',
            waitTime: 10000, // Wait for team spawning
            description: 'Wait for development team creation',
          },
          {
            type: 'message', 
            content: 'Great! Now please delegate specific tasks to the team members. The DevOps agent should set up the project structure and build tools, the Backend agent should create the API and database schema, and the Frontend agent should build the React components and UI.',
            description: 'Delegate specific tasks to team members',
          },
          {
            type: 'wait',
            waitTime: 15000, // Wait for task delegation and initial work
            description: 'Wait for task delegation and development progress',
          },
          {
            type: 'message',
            content: 'Can you provide a status update on the project? What has each team member accomplished so far?',
            description: 'Request project status and team progress',
          },
          {
            type: 'wait',
            waitTime: 5000,
            description: 'Wait for status update',
          },
          {
            type: 'message',
            content: 'Thank you for the update. How do I access the completed application?',
            description: 'Ask about application access',
          },
        ],
      },
    },
  ],

  setup: {
    roomType: 'group',
    roomName: 'Development Project Management',
    context: 'A project management environment where development teams are assembled and coordinated in isolated sandbox environments',
    environment: {
      // E2B sandbox configuration
      E2B_API_KEY: process.env.E2B_API_KEY || 'test-api-key-for-scenario',
      SANDBOX_TEMPLATE: 'eliza-dev-team',
      HOST_URL: 'http://localhost:3000',
      // Enable sandbox services
      ENABLE_SANDBOX_MANAGER: 'true',
      // Development environment settings
      NODE_ENV: 'development',
      LOG_LEVEL: 'debug',
    },
  },

  execution: {
    maxDuration: 180000, // 3 minutes - sufficient for team creation and initial coordination
    maxSteps: 100,
    timeout: 45000, // 45 seconds per action
  },

  verification: {
    rules: [
      {
        id: 'team-spawning-success',
        type: 'llm',
        description: 'Verify that the SPAWN_DEV_TEAM action was triggered and a development team was successfully created',
        config: {
          successCriteria: [
            'SPAWN_DEV_TEAM action was executed',
            'Backend, frontend, and devops agents were created',
            'Sandbox environment was established',
            'Team coordination was initiated',
          ],
          llmPrompt: `Analyze the conversation to verify that:
1. The ProjectOrchestrator agent used the SPAWN_DEV_TEAM action when requested
2. A development team with backend, frontend, and devops specialists was created
3. The team was deployed to a sandbox environment
4. The response mentioned specific team members and their roles

Return true if team spawning was successful, false otherwise.`,
        },
      },
      {
        id: 'task-delegation-execution',
        type: 'llm', 
        description: 'Verify that tasks were properly delegated to individual team members using the DELEGATE_TASK action',
        config: {
          successCriteria: [
            'DELEGATE_TASK action was executed',
            'Specific tasks assigned to DevOps, Backend, and Frontend agents',
            'Task assignments were acknowledged',
            'Work coordination was established',
          ],
          llmPrompt: `Analyze the conversation to verify that:
1. The ProjectOrchestrator used the DELEGATE_TASK action when requested
2. Specific tasks were assigned to DevOps (project setup), Backend (API/database), and Frontend (React components)
3. The delegation was properly communicated
4. Each team member's responsibilities were clearly defined

Return true if task delegation was successful, false otherwise.`,
        },
      },
      {
        id: 'development-progress-reporting',
        type: 'llm',
        description: 'Verify that the orchestrator can track and report on development progress from team members',
        config: {
          successCriteria: [
            'Status updates were provided when requested',
            'Progress from each team member was reported',
            'Specific accomplishments were mentioned',
            'Overall project status was communicated',
          ],
          llmPrompt: `Analyze the conversation to verify that:
1. When asked for status updates, the ProjectOrchestrator provided detailed progress reports
2. Progress from DevOps, Backend, and Frontend agents was mentioned
3. Specific technical accomplishments were described (e.g., project structure, API endpoints, React components)
4. The overall project status and next steps were communicated

Return true if progress reporting was comprehensive and accurate, false otherwise.`,
        },
      },
      {
        id: 'sandbox-environment-management',
        type: 'code',
        description: 'Verify that sandbox environment was properly managed and isolated',
        config: {
          checks: [
            {
              type: 'service_registration',
              description: 'Check that sandbox manager service was registered',
              code: `
                const sandboxManager = runtime.getService('sandbox-manager');
                return sandboxManager !== null && sandboxManager !== undefined;
              `,
            },
            {
              type: 'environment_isolation',
              description: 'Verify sandbox environment isolation',
              code: `
                // Check that sandbox operations were contained
                const memories = await runtime.getMemories({ roomId: roomId, count: 100 });
                const sandboxMentions = memories.filter(m => 
                  m.content.text?.includes('sandbox') || 
                  m.content.text?.includes('E2B') ||
                  m.content.text?.includes('isolated environment')
                );
                return sandboxMentions.length > 0;
              `,
            },
          ],
        },
      },
      {
        id: 'multi-agent-coordination',
        type: 'llm',
        description: 'Verify that multiple specialized agents were effectively coordinated as a team',
        config: {
          successCriteria: [
            'Multiple specialist agents were mentioned by role',
            'Team coordination and communication was established',
            'Collaborative workflow was demonstrated',
            'Integration between different specializations was addressed',
          ],
          llmPrompt: `Analyze the conversation to verify effective multi-agent coordination:
1. Were backend, frontend, and devops specialists all mentioned and utilized?
2. Was there evidence of coordination between different team members?
3. Were integration points between specializations addressed (e.g., API contracts, deployment)?
4. Did the orchestrator manage the team effectively as a cohesive unit?

Return true if multi-agent coordination was successful, false otherwise.`,
        },
      },
      {
        id: 'technical-accuracy',
        type: 'llm',
        description: 'Verify that technical details and development approach are accurate and realistic',
        config: {
          successCriteria: [
            'Appropriate technologies were mentioned (React, Express, SQLite, Tailwind)',
            'Realistic development workflow was described',
            'Proper project structure and organization was addressed',
            'Technical implementation details were accurate',
          ],
          llmPrompt: `Evaluate the technical accuracy of the development approach:
1. Were the requested technologies (React, Express.js, SQLite, Tailwind CSS) properly incorporated?
2. Did the development workflow follow realistic software development practices?
3. Were project structure, build tools, and deployment considerations addressed appropriately?
4. Do the technical details demonstrate understanding of full-stack development?

Return true if the technical approach was accurate and realistic, false otherwise.`,
        },
      },
    ],
  },
};

export default sandboxMultiAgentDevTeamScenario;