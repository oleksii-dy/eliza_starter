/**
 * SPAWN_DEV_TEAM Action
 * Creates a multi-agent development team in an E2B sandbox
 */

import type { Action, IAgentRuntime, Memory, State } from '@elizaos/core';
import { logger, parseJSONObjectFromText } from '@elizaos/core';
import type { SandboxManager } from '../SandboxManager.js';
import type { MockSandboxManager } from '../MockSandboxManager.js';

export interface ProjectSpecification {
  name: string;
  description: string;
  requirements: string[];
  techStack: {
    frontend: string[];
    backend: string[];
    database: string[];
    tools: string[];
  };
  timeline?: string;
  priority?: 'low' | 'medium' | 'high';
}

export const spawnDevTeamAction: Action = {
  name: 'SPAWN_DEV_TEAM',
  similes: [
    'create dev team',
    'start development team',
    'spawn agents',
    'create development sandbox',
    'launch dev environment',
    'assemble dev team',
  ],
  description: 'Spawns a specialized multi-agent development team in a sandbox environment',

  examples: [
    [
      {
        user: '{{user1}}',
        content: {
          text: 'Create a todo list app with React, Express, and SQLite',
        },
      },
      {
        user: '{{agent}}',
        content: {
          text: "I'll spawn a development team to build your todo list app! Let me create a sandbox with specialized agents.",
          action: 'SPAWN_DEV_TEAM',
        },
      },
    ],
    [
      {
        user: '{{user1}}',
        content: {
          text: 'I need a team to build a blog platform with authentication and comments',
        },
      },
      {
        user: '{{agent}}',
        content: {
          text: "Perfect! I'll assemble a development team with backend, frontend, and DevOps specialists to build your blog platform.",
          action: 'SPAWN_DEV_TEAM',
        },
      },
    ],
  ],

  validate: async (runtime: IAgentRuntime, message: Memory): Promise<boolean> => {
    // Check if sandbox manager service is available (real or mock)
    const sandboxManager = runtime.getService<SandboxManager | MockSandboxManager>(
      'sandbox-manager'
    );
    if (!sandboxManager) {
      logger.warn('Sandbox manager service not available');
      return false;
    }

    // Check if message contains project requirements
    const text = message.content.text?.toLowerCase() || '';
    const hasProjectIntent =
      text.includes('app') ||
      text.includes('project') ||
      text.includes('build') ||
      text.includes('create') ||
      text.includes('develop');

    return hasProjectIntent;
  },

  handler: async (runtime: IAgentRuntime, message: Memory, state?: State): Promise<any> => {
    try {
      logger.info('Starting SPAWN_DEV_TEAM action');

      // Parse project specification from message
      const projectSpec = await parseProjectSpecification(message.content.text || '');

      // Get sandbox manager service (real or mock)
      const sandboxManager = runtime.getService<SandboxManager | MockSandboxManager>(
        'sandbox-manager'
      );
      if (!sandboxManager) {
        throw new Error('Sandbox manager service not available');
      }

      // 1. Create E2B sandbox
      logger.info(`Creating sandbox for project: ${projectSpec.name}`);
      const sandboxId = await sandboxManager.createSandbox('eliza-dev-team');

      // 2. Create shared room for team collaboration
      const roomName = `${projectSpec.name.replace(/\s+/g, '-').toLowerCase()}-dev-team`;
      const roomId = await runtime.createRoom({
        type: 'GROUP',
        name: roomName,
        participants: [runtime.agentId],
      });

      // 3. Define specialized agent configurations
      const agents = [
        {
          character: 'backend-agent.json',
          role: 'backend',
          workspace: '/workspace',
          plugins: ['elizaos-services', 'autocoder', 'websocket-bridge'],
        },
        {
          character: 'frontend-agent.json',
          role: 'frontend',
          workspace: '/workspace',
          plugins: ['elizaos-services', 'autocoder', 'websocket-bridge'],
        },
        {
          character: 'devops-agent.json',
          role: 'devops',
          workspace: '/workspace',
          plugins: ['elizaos-services', 'autocoder', 'websocket-bridge'],
        },
      ];

      // 4. Deploy agents to sandbox
      logger.info('Deploying specialized agents to sandbox');
      await sandboxManager.deployAgents(sandboxId, agents);

      // 5. Create room in sandbox and connect to host
      const sandboxRoomId = await sandboxManager.createRoom(sandboxId, roomName);
      const hostUrl = runtime.getSetting('HOST_URL') || 'http://localhost:3000';
      await sandboxManager.connectToHost(sandboxId, hostUrl, roomId);

      // 6. Send project briefing to team
      const briefing = generateProjectBriefing(projectSpec);
      await runtime.sendMessage(roomId, {
        text: briefing,
        project: projectSpec,
        sandbox: sandboxId,
        type: 'project_briefing',
      });

      // 7. Store sandbox info for future reference
      await runtime.createMemory({
        roomId,
        content: {
          text: `Development sandbox created for ${projectSpec.name}`,
          sandbox: {
            id: sandboxId,
            project: projectSpec,
            agents: agents.map((a) => a.role),
            status: 'active',
            createdAt: new Date().toISOString(),
          },
        },
        unique: true,
      });

      // 8. Initialize project structure
      await sandboxManager.executeSandboxCommand(
        sandboxId,
        'mkdir -p /workspace/src /workspace/docs /workspace/tests'
      );

      const responseText = `🚀 **Development Team Assembled!**

**Project:** ${projectSpec.name}
**Sandbox ID:** ${sandboxId}
**Team Room:** [${roomName}](#room/${roomId})

**Team Members:**
- 🔧 Backend Agent: Ready for API development
- 🎨 Frontend Agent: Ready for UI/UX development  
- ⚙️ DevOps Agent: Ready for infrastructure setup

**Tech Stack:**
- Frontend: ${projectSpec.techStack.frontend.join(', ')}
- Backend: ${projectSpec.techStack.backend.join(', ')}
- Database: ${projectSpec.techStack.database.join(', ')}

The team is now planning your project architecture. Check the team room for real-time collaboration updates!

**Next Steps:**
1. DevOps will set up project structure
2. Backend will design API architecture
3. Frontend will plan component structure
4. All agents will collaborate on implementation

You can monitor progress in the team room or ask me for status updates anytime.`;

      return {
        text: responseText,
        data: {
          sandboxId,
          roomId,
          project: projectSpec,
          agents: agents.map((a) => a.role),
          status: 'team_assembled',
        },
      };
    } catch (error) {
      logger.error('SPAWN_DEV_TEAM action failed:', error);

      return {
        text: `❌ Failed to spawn development team: ${error instanceof Error ? error.message : 'Unknown error'}

Please check your E2B configuration and try again. Make sure you have:
- E2B_API_KEY configured
- Sandbox manager service running
- Sufficient E2B credits

Would you like me to help troubleshoot the issue?`,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  },
};

/**
 * Parse project specification from natural language
 */
async function parseProjectSpecification(text: string): Promise<ProjectSpecification> {
  // Try to extract structured project info from text
  let projectSpec: Partial<ProjectSpecification> = {};

  // Check for JSON in the text first
  try {
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      projectSpec = parseJSONObjectFromText(jsonMatch[0]);
    }
  } catch {
    // Fall back to natural language parsing
  }

  // Extract project name
  const nameMatch = text.match(/(?:app|project|build|create)\s+(?:a\s+)?([^.!?]+)/i);
  const name = projectSpec.name || (nameMatch ? nameMatch[1].trim() : '') || 'New Project';

  // Extract requirements from text
  const requirements = projectSpec.requirements || extractRequirements(text);

  // Determine tech stack from mentions in text
  const techStack = projectSpec.techStack || determineTechStack(text);

  return {
    name,
    description: projectSpec.description || `A ${name.toLowerCase()} application`,
    requirements,
    techStack,
    timeline: projectSpec.timeline || 'TBD',
    priority: projectSpec.priority || 'medium',
  };
}

/**
 * Extract requirements from natural language text
 */
function extractRequirements(text: string): string[] {
  const requirements: string[] = [];

  // Common requirement patterns
  const patterns = [
    /(?:with|include|have|support|feature)\s+([^.!?]+)/gi,
    /(?:need|want|require)\s+([^.!?]+)/gi,
    /should\s+([^.!?]+)/gi,
  ];

  patterns.forEach((pattern) => {
    const matches = Array.from(text.matchAll(pattern));
    matches.forEach((match) => {
      const requirement = match[1].trim();
      if (requirement && requirement.length > 3) {
        requirements.push(requirement);
      }
    });
  });

  // Default requirements if none found
  if (requirements.length === 0) {
    requirements.push('User-friendly interface', 'Responsive design', 'Data persistence');
  }

  return requirements.slice(0, 5); // Limit to 5 requirements
}

/**
 * Determine tech stack from text mentions
 */
function determineTechStack(text: string): ProjectSpecification['techStack'] {
  const lowercaseText = text.toLowerCase();

  const techStack = {
    frontend: [] as string[],
    backend: [] as string[],
    database: [] as string[],
    tools: [] as string[],
  };

  // Frontend technologies
  if (lowercaseText.includes('react')) {
    techStack.frontend.push('React');
  }
  if (lowercaseText.includes('vue')) {
    techStack.frontend.push('Vue.js');
  }
  if (lowercaseText.includes('angular')) {
    techStack.frontend.push('Angular');
  }
  if (lowercaseText.includes('vite')) {
    techStack.tools.push('Vite');
  }
  if (lowercaseText.includes('tailwind')) {
    techStack.tools.push('Tailwind CSS');
  }

  // Backend technologies
  if (lowercaseText.includes('express')) {
    techStack.backend.push('Express.js');
  }
  if (lowercaseText.includes('node')) {
    techStack.backend.push('Node.js');
  }
  if (lowercaseText.includes('fastify')) {
    techStack.backend.push('Fastify');
  }
  if (lowercaseText.includes('nest')) {
    techStack.backend.push('NestJS');
  }

  // Databases
  if (lowercaseText.includes('sqlite')) {
    techStack.database.push('SQLite');
  }
  if (lowercaseText.includes('postgres')) {
    techStack.database.push('PostgreSQL');
  }
  if (lowercaseText.includes('mysql')) {
    techStack.database.push('MySQL');
  }
  if (lowercaseText.includes('mongo')) {
    techStack.database.push('MongoDB');
  }

  // Default stack if nothing specified
  if (techStack.frontend.length === 0) {
    techStack.frontend.push('React');
  }
  if (techStack.backend.length === 0) {
    techStack.backend.push('Express.js', 'Node.js');
  }
  if (techStack.database.length === 0) {
    techStack.database.push('SQLite');
  }
  if (techStack.tools.length === 0) {
    techStack.tools.push('Vite', 'TypeScript');
  }

  return techStack;
}

/**
 * Generate project briefing for the team
 */
function generateProjectBriefing(projectSpec: ProjectSpecification): string {
  return `🚀 **New Development Project**

**Project Name:** ${projectSpec.name}
**Description:** ${projectSpec.description}

**Requirements:**
${projectSpec.requirements.map((req) => `- ${req}`).join('\n')}

**Technical Stack:**
- **Frontend:** ${projectSpec.techStack.frontend.join(', ')}
- **Backend:** ${projectSpec.techStack.backend.join(', ')}  
- **Database:** ${projectSpec.techStack.database.join(', ')}
- **Tools:** ${projectSpec.techStack.tools.join(', ')}

**Timeline:** ${projectSpec.timeline}
**Priority:** ${projectSpec.priority}

---

**Team Assignments:**

**@devops** - Please start with:
1. Set up project structure and build system
2. Configure development environment
3. Create deployment pipeline
4. Set up version control and CI/CD

**@backend** - Your focus areas:
1. Design database schema
2. Create REST API endpoints
3. Implement authentication & authorization
4. Add validation and error handling

**@frontend** - Your responsibilities:
1. Design component architecture
2. Create responsive UI components
3. Implement state management
4. Integrate with backend APIs

Let's collaborate effectively! Share your progress, ask questions, and coordinate on shared resources. 

**Ready to build something amazing? Let's start! 🛠️**`;
}
