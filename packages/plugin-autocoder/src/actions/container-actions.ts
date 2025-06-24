import type {
  Action,
  ActionResult,
  ActionExample,
  IAgentRuntime,
  Memory,
  State,
  HandlerCallback,
  UUID,
} from '@elizaos/core';
import { elizaLogger } from '@elizaos/core';
import type { ContainerOrchestrator } from '../services/ContainerOrchestrator';
import type { TaskManager } from '../services/TaskManager';
import type { SecureEnvironment } from '../services/SecureEnvironment';
import type { CommunicationBridge } from '../services/CommunicationBridge';

export const spawnSubAgentAction: Action = {
  name: 'SPAWN_SUB_AGENT',
  similes: ['CREATE_SUB_AGENT', 'DEPLOY_AGENT', 'START_CONTAINER_AGENT'],
  description:
    'Spawns a containerized sub-agent for auto-coding tasks. Returns task and container information for action chaining.',

  validate: async (runtime: IAgentRuntime, message: Memory, state?: State) => {
    // Check if required services are available
    const orchestrator = runtime.getService('container-orchestrator');
    const taskManager = runtime.getService('task-manager');
    const secureEnv = runtime.getService('secure-environment');

    if (!orchestrator || !taskManager || !secureEnv) {
      elizaLogger.warn('Container orchestration services not available');
      return false;
    }

    // Check if message contains task requirements
    const content = message.content.text?.toLowerCase() || '';
    return (
      content.includes('code') ||
      content.includes('implement') ||
      content.includes('develop') ||
      content.includes('fix') ||
      content.includes('feature')
    );
  },

  handler: async (
    runtime: IAgentRuntime,
    message: Memory,
    state?: State,
    options?: any,
    callback?: HandlerCallback
  ): Promise<ActionResult> => {
    try {
      elizaLogger.info('Spawning sub-agent for auto-coding task');

      // Get services
      const orchestrator = runtime.getService('container-orchestrator') as ContainerOrchestrator;
      const taskManager = runtime.getService('task-manager') as TaskManager;
      const secureEnv = runtime.getService('secure-environment') as SecureEnvironment;

      // Extract task requirements from message using LLM
      const taskDetails = await extractTaskDetails(message.content.text || '', runtime);

      // Create secure task environment
      const secureEnvironment = await secureEnv.createTaskEnvironment(taskDetails.taskId as any, {
        requiredSecrets: taskDetails.requiredSecrets,
        sandboxConfig: {
          allowNetworkAccess: true,
          allowFileSystemWrite: true,
          securityLevel: 'moderate',
        },
      });

      // Create task
      const taskId = await taskManager.createTask({
        title: taskDetails.title,
        description: taskDetails.description,
        requirements: taskDetails.requirements,
        priority: taskDetails.priority,
        context: {
          repositoryPath: '/workspace',
          branchName: `task-${Date.now()}`,
          baseBranch: 'main',
          files: taskDetails.files,
          environment: await secureEnv.getAgentEnvironment(
            taskDetails.taskId as any,
            runtime.agentId
          ),
        },
      });

      // Spawn sub-agents
      const containerIds: string[] = [];
      for (const role of taskDetails.requiredRoles) {
        const containerId = await orchestrator.spawnSubAgent({
          taskId,
          agentRole: role,
          requirements: taskDetails.requirements,
          priority: taskDetails.priority,
        });
        containerIds.push(containerId);
      }

      await callback?.({
        text:
          '✅ Auto-coding task created successfully!\n\n' +
          `**Task ID**: ${taskId}\n` +
          `**Title**: ${taskDetails.title}\n` +
          `**Agents**: ${taskDetails.requiredRoles.join(', ')}\n` +
          `**Containers**: ${containerIds.length} spawned\n\n` +
          "The sub-agents are now working on your task. I'll monitor their progress and provide updates.",
        thought: `Successfully created auto-coding task with ${containerIds.length} sub-agents. Task involves ${taskDetails.requiredRoles.join(', ')} roles.`,
        actions: ['SPAWN_SUB_AGENT'],
      });

      return {
        text: `✅ Auto-coding task created successfully!\n\n**Task ID**: ${taskId}\n**Title**: ${taskDetails.title}\n**Agents**: ${taskDetails.requiredRoles.join(', ')}\n**Containers**: ${containerIds.length} spawned\n\nThe sub-agents are now working on your task.`,
        values: {
          success: true,
          taskCreated: true,
          taskId,
          containersSpawned: containerIds.length,
          agentRoles: taskDetails.requiredRoles,
          taskPriority: taskDetails.priority,
        },
        data: {
          actionName: 'SPAWN_SUB_AGENT',
          taskId,
          containerIds,
          taskDetails,
          secureEnvironment,
          roles: taskDetails.requiredRoles,
        },
      };
    } catch (error) {
      elizaLogger.error('Failed to spawn sub-agent:', error);

      await callback?.({
        text: `❌ Failed to spawn sub-agent: ${error instanceof Error ? error.message : String(error)}\n\nPlease check the system status and try again.`,
        thought: `Sub-agent spawning failed due to: ${error instanceof Error ? error.message : String(error)}`,
        actions: [],
      });

      return {
        text: `❌ Failed to spawn sub-agent: ${error instanceof Error ? error.message : String(error)}`,
        values: {
          success: false,
          error: true,
          errorMessage: error instanceof Error ? error.message : String(error),
        },
        data: {
          actionName: 'SPAWN_SUB_AGENT',
          error: error instanceof Error ? error.message : String(error),
          errorType: 'spawn_error',
        },
      };
    }
  },

  examples: [
    [
      {
        name: '{{user}}',
        content: { text: 'I need to implement a new user authentication feature with JWT tokens' },
      },
      {
        name: '{{agent}}',
        content: {
          text: '✅ Auto-coding task created successfully!\n\n**Task ID**: task_auth_jwt\n**Title**: Implement JWT Authentication\n**Agents**: coder, reviewer, tester\n**Containers**: 3 spawned\n\nThe sub-agents are now working on your task.',
          thought: 'Created authentication task with three specialized agents',
          actions: ['SPAWN_SUB_AGENT'],
        },
      },
    ],
    [
      {
        name: '{{user}}',
        content: { text: 'Create a payment processing system and then set up monitoring for it' },
      },
      {
        name: '{{agent}}',
        content: {
          text: "I'll spawn sub-agents to implement the payment system first, then set up monitoring.",
          thought:
            'User wants payment system with monitoring - a multi-stage development workflow.',
          actions: ['SPAWN_SUB_AGENT', 'MONITOR_TASK'],
        },
      },
    ],
  ] as ActionExample[][],
};

export const monitorTaskAction: Action = {
  name: 'MONITOR_TASK',
  similes: ['CHECK_TASK_STATUS', 'TASK_PROGRESS', 'AGENT_STATUS'],
  description:
    'Monitors the progress of auto-coding tasks and sub-agents. Returns status reports and metrics for action chaining.',

  validate: async (runtime: IAgentRuntime, message: Memory, state?: State) => {
    const taskManager = runtime.getService('task-manager');
    if (!taskManager) {
      return false;
    }

    const content = message.content.text?.toLowerCase() || '';
    return (
      content.includes('status') ||
      content.includes('progress') ||
      content.includes('check') ||
      content.includes('monitor') ||
      content.includes('task')
    );
  },

  handler: async (
    runtime: IAgentRuntime,
    message: Memory,
    state?: State,
    options?: any,
    callback?: HandlerCallback
  ): Promise<ActionResult> => {
    try {
      const taskManager = runtime.getService('task-manager') as TaskManager;
      const orchestrator = runtime.getService('container-orchestrator') as ContainerOrchestrator;

      // Get all active tasks
      const tasks = await taskManager.listTasks({
        status: 'in_progress',
      });

      if (tasks.length === 0) {
        const text =
          "📊 **Task Status**: No active auto-coding tasks currently running.\n\nYou can create a new task by describing what you'd like me to implement!";
        await callback?.({
          text,
          thought: 'No active tasks to monitor',
          actions: ['MONITOR_TASK'],
        });
        return {
          text,
          values: {
            success: true,
            activeTasks: 0,
            noTasksRunning: true,
          },
          data: {
            actionName: 'MONITOR_TASK',
            activeTasks: 0,
            status: 'no_active_tasks',
          },
        };
      }

      let statusReport = '📊 **Auto-Coding Task Status Report**\n\n';

      for (const task of tasks) {
        const containers = await orchestrator.getTaskContainers(task.id);

        statusReport += `**${task.title}** (${task.id})\n`;
        statusReport += `├ Status: ${task.status.toUpperCase()}\n`;
        statusReport += `├ Priority: ${task.priority.toUpperCase()}\n`;
        statusReport += `├ Agents: ${containers.length} active\n`;

        for (const container of containers) {
          const status = await orchestrator.getContainerStatus(container.containerId);
          statusReport += `│  └ ${container.agentConfig.role}: ${status?.state || 'unknown'}\n`;
        }

        statusReport += `├ Created: ${task.createdAt.toLocaleString()}\n`;
        if (task.deadline) {
          statusReport += `└ Deadline: ${task.deadline.toLocaleString()}\n`;
        }
        statusReport += '\n';
      }

      // Get task metrics
      const metrics = await taskManager.getTaskMetrics();
      statusReport += '**Overall Metrics**\n';
      statusReport += `├ Total Tasks: ${metrics.total}\n`;
      statusReport += `├ Success Rate: ${(metrics.successRate * 100).toFixed(1)}%\n`;
      statusReport += `└ Avg Duration: ${Math.round(metrics.averageDuration / 1000 / 60)} minutes\n`;

      await callback?.({
        text: statusReport,
        thought: `Monitoring ${tasks.length} active tasks with overall ${(metrics.successRate * 100).toFixed(1)}% success rate`,
        actions: ['MONITOR_TASK'],
      });

      return {
        text: statusReport,
        values: {
          success: true,
          activeTasks: tasks.length,
          totalTasks: metrics.total,
          successRate: parseFloat((metrics.successRate * 100).toFixed(1)),
          avgDuration: Math.round(metrics.averageDuration / 1000 / 60),
        },
        data: {
          actionName: 'MONITOR_TASK',
          tasks,
          metrics,
          statusReport,
          containers: await Promise.all(
            tasks.map(async (task) => await orchestrator.getTaskContainers(task.id))
          ),
        },
      };
    } catch (error) {
      elizaLogger.error('Failed to monitor tasks:', error);

      const errorText = `❌ Failed to retrieve task status: ${error instanceof Error ? error.message : String(error)}`;
      await callback?.({
        text: errorText,
        thought: `Task monitoring failed: ${error instanceof Error ? error.message : String(error)}`,
        actions: [],
      });

      return {
        text: errorText,
        values: {
          success: false,
          error: true,
          errorMessage: error instanceof Error ? error.message : String(error),
        },
        data: {
          actionName: 'MONITOR_TASK',
          error: error instanceof Error ? error.message : String(error),
          errorType: 'monitoring_error',
        },
      };
    }
  },

  examples: [
    [
      {
        name: '{{user}}',
        content: { text: "What's the status of my coding tasks?" },
      },
      {
        name: '{{agent}}',
        content: {
          text: '📊 **Auto-Coding Task Status Report**\n\n**JWT Authentication** (task_auth_jwt)\n├ Status: IN_PROGRESS\n├ Priority: HIGH\n├ Agents: 3 active\n│  └ coder: running\n│  └ reviewer: running\n│  └ tester: running\n└ Created: 2024-01-15 10:30:00',
          thought: 'Monitoring 1 active task with 3 sub-agents working',
          actions: ['MONITOR_TASK'],
        },
      },
    ],
    [
      {
        name: '{{user}}',
        content: { text: 'Check task progress and update me with a summary report' },
      },
      {
        name: '{{agent}}',
        content: {
          text: "I'll check the current task status first, then generate a detailed summary report.",
          thought: 'User wants monitoring followed by report generation - a two-step workflow.',
          actions: ['MONITOR_TASK', 'GENERATE_SUMMARY'],
        },
      },
    ],
  ] as ActionExample[][],
};

export const terminateTaskAction: Action = {
  name: 'TERMINATE_TASK',
  similes: ['CANCEL_TASK', 'STOP_AGENTS', 'ABORT_TASK'],
  description: 'Terminates auto-coding tasks and cleans up sub-agents',

  validate: async (runtime: IAgentRuntime, message: Memory, state?: State) => {
    const taskManager = runtime.getService('task-manager');
    if (!taskManager) {
      return false;
    }

    const content = message.content.text?.toLowerCase() || '';
    return (
      content.includes('cancel') ||
      content.includes('stop') ||
      content.includes('terminate') ||
      content.includes('abort')
    );
  },

  handler: async (
    runtime: IAgentRuntime,
    message: Memory,
    state?: State,
    options?: any,
    callback?: HandlerCallback
  ) => {
    try {
      const taskManager = runtime.getService('task-manager') as TaskManager;
      const secureEnv = runtime.getService('secure-environment') as SecureEnvironment;

      // Extract task ID from message or get latest task
      const taskId = extractTaskId(message.content.text || '');

      if (!taskId) {
        const tasks = await taskManager.listTasks({
          status: 'in_progress',
        });

        if (tasks.length === 0) {
          await callback?.({
            text: '📋 No active tasks to terminate.',
            thought: 'No active tasks found to terminate',
            actions: ['TERMINATE_TASK'],
          });
          return;
        }

        // Terminate the most recent task
        const latestTask = tasks[0];
        await taskManager.cancelTask(latestTask.id, 'User requested cancellation');
        await secureEnv.cleanupTaskEnvironment(latestTask.id);

        await callback?.({
          text: `✅ Task terminated: **${latestTask.title}**\n\nAll sub-agents have been stopped and resources cleaned up.`,
          thought: `Terminated latest task: ${latestTask.title}`,
          actions: ['TERMINATE_TASK'],
        });

        return;
      }

      // Terminate specific task
      const task = await taskManager.getTask(taskId as UUID);
      if (!task) {
        const notFoundText = `❌ Task not found: ${taskId}`;
        await callback?.({
          text: notFoundText,
          thought: `Task ${taskId} not found`,
          actions: [],
        });
        return {
          text: notFoundText,
          values: {
            success: false,
            taskNotFound: true,
            taskId,
          },
          data: {
            actionName: 'TERMINATE_TASK',
            error: `Task ${taskId} not found`,
            errorType: 'task_not_found',
          },
        };
      }

      await taskManager.cancelTask(taskId as UUID, 'User requested cancellation');
      await secureEnv.cleanupTaskEnvironment(taskId as UUID);

      await callback?.({
        text:
          `✅ Task terminated: **${task.title}**\n\n` +
          'All sub-agents have been stopped and resources cleaned up.\n' +
          'Reason: User requested cancellation',
        thought: `Successfully terminated task: ${task.title}`,
        actions: ['TERMINATE_TASK'],
      });
    } catch (error) {
      elizaLogger.error('Failed to terminate task:', error);

      await callback?.({
        text: `❌ Failed to terminate task: ${error instanceof Error ? error.message : String(error)}`,
        thought: `Task termination failed: ${error instanceof Error ? error.message : String(error)}`,
        actions: [],
      });
    }
  },

  examples: [
    [
      {
        name: '{{user}}',
        content: { text: 'Cancel the authentication task, I want to change the approach' },
      },
      {
        name: '{{agent}}',
        content: {
          text: '✅ Task terminated: **JWT Authentication**\n\nAll sub-agents have been stopped and resources cleaned up.\nReason: User requested cancellation',
          thought: 'Successfully terminated authentication task per user request',
          actions: ['TERMINATE_TASK'],
        },
      },
    ],
    [
      {
        name: '{{user}}',
        content: {
          text: 'Stop the current task and then start a new one for database optimization',
        },
      },
      {
        name: '{{agent}}',
        content: {
          text: "I'll terminate the current task first, then spawn new agents for database optimization.",
          thought:
            'User wants to cancel current work and start a new optimization task - sequential workflow.',
          actions: ['TERMINATE_TASK', 'SPAWN_SUB_AGENT'],
        },
      },
    ],
  ] as ActionExample[][],
};

// Helper functions
export async function extractTaskDetails(
  text: string,
  runtime: IAgentRuntime
): Promise<{
  taskId: string;
  title: string;
  description: string;
  requirements: string[];
  requiredSecrets: string[];
  requiredRoles: ('coder' | 'reviewer' | 'tester')[];
  priority: 'low' | 'medium' | 'high' | 'critical';
  files: string[];
}> {
  const taskId = `task_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

  try {
    // Use LLM to extract structured task information
    const extractionPrompt = `
You are a task analysis system. Extract structured information from the following coding request:

"${text}"

Return a JSON object with these exact fields:
{
  "title": "concise task title (max 50 chars)",
  "requirements": ["specific requirement 1", "specific requirement 2", ...],
  "requiredSecrets": ["SECRET_NAME1", "SECRET_NAME2", ...],
  "requiredRoles": ["coder", "reviewer", "tester"],
  "priority": "low|medium|high|critical",
  "files": ["file/path1.ts", "file/path2.ts", ...],
  "taskType": "feature|bug_fix|refactor|documentation|testing"
}

Rules:
- Always include "coder" and "reviewer" in requiredRoles
- Add "tester" if testing is mentioned
- Common secrets: GITHUB_TOKEN, JWT_SECRET, DATABASE_URL, API_KEY
- Priority: urgent/critical -> "critical", normal -> "medium", minor -> "low"
- Extract any mentioned file paths or create likely ones
- Make requirements specific and actionable

Only return the JSON object, no other text.
`;

    const response = await runtime.useModel('TEXT_LARGE', {
      prompt: extractionPrompt,
      temperature: 0.1, // Low temperature for consistent extraction
    });

    // Parse LLM response
    const jsonMatch = response.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('Failed to extract JSON from LLM response');
    }

    const extracted = JSON.parse(jsonMatch[0]);

    // Validate and sanitize extracted data
    return {
      taskId,
      title: extracted.title || text.slice(0, 50),
      description: text,
      requirements: Array.isArray(extracted.requirements)
        ? extracted.requirements
        : [
          'Implement functionality as described',
          'Follow coding best practices',
          'Add proper error handling',
          'Include comprehensive tests',
        ],
      requiredSecrets: Array.isArray(extracted.requiredSecrets)
        ? extracted.requiredSecrets
        : ['GITHUB_TOKEN'],
      requiredRoles: Array.isArray(extracted.requiredRoles)
        ? extracted.requiredRoles.filter((role: string) =>
          ['coder', 'reviewer', 'tester'].includes(role)
        )
        : ['coder', 'reviewer'],
      priority: ['low', 'medium', 'high', 'critical'].includes(extracted.priority)
        ? extracted.priority
        : 'medium',
      files: Array.isArray(extracted.files) ? extracted.files : [],
    };
  } catch (error) {
    elizaLogger.warn('LLM extraction failed, using fallback logic:', error);

    // Fallback to rule-based extraction if LLM fails
    return fallbackTaskExtraction(text, taskId);
  }
}

function fallbackTaskExtraction(text: string, taskId: string) {
  const isHighPriority = /\b(urgent|critical|asap|immediately)\b/i.test(text);
  const isCritical = /\b(critical|emergency|broken|failing)\b/i.test(text);
  const needsTesting = /\b(test|testing|coverage|spec|unit test|integration test)\b/i.test(text);
  const isSecurityRelated = /\b(auth|security|login|jwt|oauth|encrypt|password)\b/i.test(text);
  const isApiRelated = /\b(api|endpoint|rest|graphql|server|backend)\b/i.test(text);
  const isDatabaseRelated = /\b(database|db|sql|mongo|postgres|mysql)\b/i.test(text);

  const roles: ('coder' | 'reviewer' | 'tester')[] = ['coder', 'reviewer'];
  if (needsTesting) {
    roles.push('tester');
  }

  const secrets: string[] = ['GITHUB_TOKEN'];
  if (isSecurityRelated) {
    secrets.push('JWT_SECRET');
  }
  if (isDatabaseRelated) {
    secrets.push('DATABASE_URL');
  }
  if (isApiRelated) {
    secrets.push('API_KEY');
  }

  // Extract potential file paths from text
  const filePathRegex = /\b[\w-]+\/[\w-]+\.[\w]+\b/g;
  const files = text.match(filePathRegex) || [];

  let priority: 'low' | 'medium' | 'high' | 'critical' = 'medium';
  if (isCritical) {
    priority = 'critical';
  } else if (isHighPriority) {
    priority = 'high';
  }

  return {
    taskId,
    title: extractTitleFromText(text),
    description: text,
    requirements: generateRequirementsFromText(text),
    requiredSecrets: secrets,
    requiredRoles: roles,
    priority,
    files,
  };
}

function extractTitleFromText(text: string): string {
  // Extract a reasonable title from the request
  const sentences = text.split(/[.!?]/);
  const firstSentence = sentences[0] || text;

  // Take first 6 meaningful words
  const words = firstSentence
    .replace(/[^\w\s]/g, '')
    .split(/\s+/)
    .filter((word) => word.length > 2)
    .slice(0, 6);

  return words.join(' ').trim() || 'Auto-coding Task';
}

function generateRequirementsFromText(text: string): string[] {
  const requirements: string[] = [
    'Implement functionality as described',
    'Follow coding best practices',
    'Include proper error handling',
    'Add comprehensive tests',
  ];

  const lowerText = text.toLowerCase();

  // Add specific requirements based on detected patterns
  if (/\b(auth|login|security)\b/.test(lowerText)) {
    requirements.push('Implement secure authentication');
    requirements.push('Add proper session management');
  }

  if (/\b(api|endpoint|rest)\b/.test(lowerText)) {
    requirements.push('Create RESTful API endpoints');
    requirements.push('Add proper request validation');
  }

  if (/\b(database|db|data)\b/.test(lowerText)) {
    requirements.push('Design proper database schema');
    requirements.push('Add data validation and constraints');
  }

  if (/\b(ui|frontend|component)\b/.test(lowerText)) {
    requirements.push('Create responsive user interface');
    requirements.push('Add proper accessibility features');
  }

  if (/\b(performance|optimize|speed)\b/.test(lowerText)) {
    requirements.push('Optimize for performance');
    requirements.push('Add performance monitoring');
  }

  return requirements;
}

function extractTaskId(text: string): string | null {
  // Extract task ID from text - look for task_xxx pattern
  const match = text.match(/task_[a-zA-Z0-9_]+/);
  return match ? match[0] : null;
}

export const containerActions = [spawnSubAgentAction, monitorTaskAction, terminateTaskAction];
