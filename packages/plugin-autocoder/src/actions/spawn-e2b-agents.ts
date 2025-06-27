import {
  type Action,
  type IAgentRuntime,
  type Memory,
  type State,
  type HandlerCallback,
  elizaLogger,
} from '@elizaos/core';
import type { UUID } from '@elizaos/core';
import type { E2BAgentOrchestrator, E2BAgentRequest } from '../services/E2BAgentOrchestrator.ts';
import type { GitWorkflowManager, TaskWorkflow } from '../services/GitWorkflowManager.ts';

/**
 * Action to spawn E2B agents for autocoding tasks
 */
export const spawnE2BAgentsAction: Action = {
  name: 'spawn-e2b-agents',
  description: 'Spawn E2B sandboxed agents to work on an autocoding task collaboratively',

  similes: [
    'create autocoding agents',
    'start agent team',
    'spawn coding agents',
    'initialize agent workflow',
    'create sandboxed coders',
  ],

  examples: [
    [
      {
        name: 'user',
        content: {
          text: 'Create a team of agents to build a React todo app',
          type: 'text',
        },
      },
      {
        name: 'assistant',
        content: {
          text: "I'll spawn a team of agents to build your React todo app. Let me set up the coding agents...",
          type: 'text',
        },
      },
    ],
    [
      {
        name: 'user',
        content: {
          text: 'Spawn agents to implement a REST API with authentication',
          type: 'text',
        },
      },
      {
        name: 'assistant',
        content: {
          text: 'Setting up specialized agents to build your REST API with authentication...',
          type: 'text',
        },
      },
    ],
  ],

  validate: async (runtime: IAgentRuntime, message: Memory, state?: State): Promise<boolean> => {
    // Check if E2B orchestrator is available
    const orchestrator = runtime.getService('e2b-agent-orchestrator');
    if (!orchestrator) {
      elizaLogger.warn('E2B Agent Orchestrator service not available');
      return false;
    }

    // Check if message contains a coding request
    const text = message.content?.text?.toLowerCase() || '';
    const keywords = [
      'build',
      'create',
      'implement',
      'code',
      'develop',
      'make',
      'spawn agents',
      'agent team',
    ];

    return keywords.some((keyword) => text.includes(keyword));
  },

  handler: async (
    runtime: IAgentRuntime,
    message: Memory,
    state?: State,
    options?: { [key: string]: unknown },
    callback?: HandlerCallback
  ): Promise<boolean> => {
    try {
      elizaLogger.info('Starting E2B agent spawn handler');

      // Get services
      const orchestrator = runtime.getService('e2b-agent-orchestrator') as E2BAgentOrchestrator;
      const gitWorkflow = runtime.getService('git-workflow-manager') as GitWorkflowManager | null;

      if (!orchestrator) {
        await callback?.({
          text: 'The E2B orchestration service is not available. Please ensure the autocoder plugin is properly configured.',
          type: 'text',
        });
        return false;
      }

      const text = message.content?.text || '';

      // Check if we should use automatic team composition
      const shouldUseAutoComposition = !text.toLowerCase().includes('spawn agents manually');

      if (shouldUseAutoComposition) {
        // Use the new project team spawning with complexity estimation
        elizaLogger.info('Using automatic team composition based on project complexity');

        await callback?.({
          text: '🤔 Analyzing project requirements to determine optimal team composition...',
          type: 'text',
        });

        // Get Git credentials if available
        const gitCredentials = runtime.getSetting('GITHUB_TOKEN')
          ? {
              username: runtime.getSetting('GITHUB_USERNAME') || 'eliza-agent',
              email: runtime.getSetting('GITHUB_EMAIL') || 'agent@elizaos.ai',
              token: runtime.getSetting('GITHUB_TOKEN'),
            }
          : undefined;

        try {
          const teamResult = await orchestrator.spawnProjectTeam(text, gitCredentials);

          await callback?.({
            text: [
              `✅ Project team spawned successfully!`,
              '',
              `📊 **Project Analysis:**`,
              `• Complexity: ${teamResult.requirements.complexity}`,
              `• Estimated Hours: ${teamResult.requirements.estimatedHours}`,
              `• Total Agents: ${teamResult.agents.length}`,
              '',
              `👥 **Team Composition:**`,
              ...teamResult.requirements.requiredAgents.roles.map(
                (role) => `• ${role.count}x ${role.role} (${role.skills.join(', ')})`
              ),
              '',
              `📋 **Initial Tasks:**`,
              ...teamResult.requirements.tasks
                .slice(0, 5)
                .map((task) => `• ${task.name} (${task.estimatedHours}h) - ${task.assignedRole}`),
              teamResult.requirements.tasks.length > 5
                ? `• ... and ${teamResult.requirements.tasks.length - 5} more tasks`
                : '',
              '',
              teamResult.repositoryUrl ? `🔗 **Repository:** ${teamResult.repositoryUrl}` : '',
              '',
              `Task ID: ${teamResult.taskId}`,
              '',
              '🚀 Agents are now working on their assigned tasks! They will collaborate through the shared repository.',
            ]
              .filter(Boolean)
              .join('\n'),
            type: 'text',
          });

          // Start monitoring task redistribution
          const monitoringInterval = setInterval(() => {
            orchestrator.monitorAndRedistribute(teamResult.taskId).catch((error) => {
              elizaLogger.error('Error during task redistribution:', error);
            });
          }, 30000); // Check every 30 seconds

          // Update state with task info
          if (state) {
            state.taskId = teamResult.taskId;
            state.spawnedAgents = teamResult.agents;
            state.repositoryUrl = teamResult.repositoryUrl;
            state.monitoringInterval = monitoringInterval;
          }

          return true;
        } catch (error) {
          elizaLogger.error('Failed to spawn project team:', error);

          await callback?.({
            text: `❌ Failed to spawn project team: ${error instanceof Error ? error.message : String(error)}`,
            type: 'text',
          });

          return false;
        }
      }

      // Otherwise, use manual agent spawning (existing code)
      elizaLogger.info('Using manual agent spawning');

      // Parse the request
      const request = parseCodeRequest(text);
      // Generate UUID-like string
      const taskId =
        `${Date.now()}-${Math.random().toString(36).substring(2, 9)}-${Math.random().toString(36).substring(2, 9)}-${Math.random().toString(36).substring(2, 9)}-${Math.random().toString(36).substring(2, 9)}` as UUID;

      await callback?.({
        text: `🚀 Starting autocoding task: ${request.description}\n\nTask ID: ${taskId}\nI'll spawn specialized agents to work on this...`,
        type: 'text',
      });

      // Determine agents needed
      const agentsNeeded = determineAgentsNeeded(request);

      await callback?.({
        text: `📋 Planning agent team:\n${agentsNeeded.map((a) => `- ${a.role} agent${a.specialization ? ` (${a.specialization})` : ''}`).join('\n')}`,
        type: 'text',
      });

      // Create Git workflow if available
      let workflowHandle;
      if (gitWorkflow) {
        const taskWorkflow: TaskWorkflow = {
          id: taskId,
          description: request.description,
          agents: agentsNeeded.map((a) => ({
            agentId:
              `pending-${Date.now()}-${Math.random().toString(36).substring(2, 6)}-xxxx-xxxx-xxxxxxxxxxxx` as UUID, // Will be updated when agents are spawned
            role: a.role,
            tasks: a.tasks,
            dependencies: a.dependencies || [],
          })),
          repository: {
            owner: runtime.getSetting('GITHUB_ORG') || 'elizaos',
            name: runtime.getSetting('GITHUB_REPO') || 'autocoder-workspace',
            url: `https://github.com/${runtime.getSetting('GITHUB_ORG') || 'elizaos'}/${runtime.getSetting('GITHUB_REPO') || 'autocoder-workspace'}`,
          },
        };

        workflowHandle = await gitWorkflow.createAgentWorkflow(taskWorkflow);

        await callback?.({
          text: `📝 Created GitHub workflow: PR #${workflowHandle.prNumber}`,
          type: 'text',
        });
      }

      // Spawn agents
      const spawnedAgents = [];
      for (const agentSpec of agentsNeeded) {
        try {
          const agentRequest: E2BAgentRequest = {
            taskId,
            role: agentSpec.role as 'coder' | 'reviewer' | 'tester',
            requirements: agentSpec.tasks,
            specialization: agentSpec.specialization,
            priority: request.priority || 'medium',
            gitCredentials: {
              username: `agent-${agentSpec.role}`,
              email: `${agentSpec.role}@elizaos.ai`,
              token: runtime.getSetting('GITHUB_TOKEN'),
            },
            projectContext: {
              repositoryUrl: workflowHandle
                ? `https://github.com/${runtime.getSetting('GITHUB_ORG')}/${runtime.getSetting('GITHUB_REPO')}`
                : '',
              projectType: request.projectType,
              dependencies: request.dependencies,
              existingCode: false,
            },
          };

          const handle = await orchestrator.spawnE2BAgent(agentRequest);
          spawnedAgents.push(handle);

          await callback?.({
            text: `✅ Spawned ${agentSpec.role} agent${agentSpec.specialization ? ` (${agentSpec.specialization})` : ''}: ${handle.agentId}`,
            type: 'text',
          });

          // Update workflow with agent ID if available
          if (workflowHandle && gitWorkflow) {
            const workflowAgent = workflowHandle.agents.get(handle.agentId);
            if (workflowAgent) {
              workflowAgent.agentId = handle.agentId;
            }
          }
        } catch (error) {
          elizaLogger.error(`Failed to spawn ${agentSpec.role} agent:`, error);
          await callback?.({
            text: `❌ Failed to spawn ${agentSpec.role} agent: ${error instanceof Error ? error.message : String(error)}`,
            type: 'text',
          });
        }
      }

      // Update state with task info
      if (state) {
        state.taskId = taskId;
        state.spawnedAgents = spawnedAgents;
        state.workflowHandle = workflowHandle;
      }

      // Final summary
      await callback?.({
        text: `🎯 Agent team spawned successfully!

Task ID: ${taskId}
Agents: ${spawnedAgents.length}/${agentsNeeded.length}
${workflowHandle ? `GitHub PR: #${workflowHandle.prNumber}` : 'Git workflow: Not configured'}

The agents are now initializing and will begin working on your project. You can check their progress using the task ID.`,
        type: 'text',
      });

      return true;
    } catch (error) {
      elizaLogger.error('Error in spawn E2B agents handler:', error);

      await callback?.({
        text: `Error spawning agents: ${error instanceof Error ? error.message : String(error)}`,
        type: 'text',
      });

      return false;
    }
  },
};

// Helper functions

interface CodeRequest {
  description: string;
  projectType?: string;
  technologies?: string[];
  features?: string[];
  priority?: 'low' | 'medium' | 'high' | 'critical';
  dependencies?: string[];
}

interface AgentSpec {
  role: string;
  specialization?: string;
  tasks: string[];
  dependencies?: string[];
}

function parseCodeRequest(text: string): CodeRequest {
  const lowerText = text.toLowerCase();

  // Detect project type
  let projectType = 'general';
  if (lowerText.includes('react') || lowerText.includes('vue') || lowerText.includes('angular')) {
    projectType = 'frontend';
  } else if (
    lowerText.includes('api') ||
    lowerText.includes('backend') ||
    lowerText.includes('server')
  ) {
    projectType = 'backend';
  } else if (lowerText.includes('full stack') || lowerText.includes('fullstack')) {
    projectType = 'fullstack';
  }

  // Extract technologies
  const technologies = [];
  const techKeywords = [
    'react',
    'vue',
    'angular',
    'node',
    'express',
    'fastapi',
    'django',
    'typescript',
    'javascript',
    'python',
  ];
  for (const tech of techKeywords) {
    if (lowerText.includes(tech)) {
      technologies.push(tech);
    }
  }

  // Extract features
  const features = [];
  const featureKeywords = [
    'authentication',
    'auth',
    'database',
    'crud',
    'api',
    'ui',
    'frontend',
    'backend',
  ];
  for (const feature of featureKeywords) {
    if (lowerText.includes(feature)) {
      features.push(feature);
    }
  }

  // Determine priority
  let priority: 'low' | 'medium' | 'high' | 'critical' = 'medium';
  if (
    lowerText.includes('urgent') ||
    lowerText.includes('asap') ||
    lowerText.includes('critical')
  ) {
    priority = 'critical';
  } else if (lowerText.includes('important') || lowerText.includes('high priority')) {
    priority = 'high';
  }

  return {
    description: text,
    projectType,
    technologies,
    features,
    priority,
    dependencies: technologies,
  };
}

function determineAgentsNeeded(request: CodeRequest): AgentSpec[] {
  const agents: AgentSpec[] = [];

  // Always include at least one coder
  if (request.projectType === 'frontend' || request.projectType === 'fullstack') {
    agents.push({
      role: 'coder',
      specialization: 'frontend',
      tasks: [
        'Implement UI components',
        'Set up frontend framework',
        'Create responsive layouts',
        'Implement client-side logic',
      ],
    });
  }

  if (request.projectType === 'backend' || request.projectType === 'fullstack') {
    agents.push({
      role: 'coder',
      specialization: 'backend',
      tasks: [
        'Implement API endpoints',
        'Set up database models',
        'Implement business logic',
        'Configure server and middleware',
      ],
    });
  }

  if (request.projectType === 'general') {
    agents.push({
      role: 'coder',
      tasks: [
        'Implement core functionality',
        'Set up project structure',
        'Write main application code',
      ],
    });
  }

  // Add reviewer for quality
  agents.push({
    role: 'reviewer',
    tasks: [
      'Review code quality',
      'Check best practices',
      'Verify security considerations',
      'Ensure code documentation',
    ],
    dependencies: agents.map((_, i) => `coder-${i}`),
  });

  // Add tester for validation
  agents.push({
    role: 'tester',
    tasks: [
      'Write unit tests',
      'Create integration tests',
      'Verify functionality',
      'Check edge cases',
    ],
    dependencies: agents.map((_, i) => `coder-${i}`),
  });

  return agents;
}
