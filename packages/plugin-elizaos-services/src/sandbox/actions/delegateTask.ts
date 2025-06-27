/**
 * DELEGATE_TASK Action
 * Delegates specific development tasks to team members in the sandbox
 */

import type { Action, IAgentRuntime, Memory, State } from '@elizaos/core';
import { logger, parseJSONObjectFromText } from '@elizaos/core';
import type { TaskAssignment, TaskDelegationRequest } from './spawnDevTeam.js';

export const delegateTaskAction: Action = {
  name: 'DELEGATE_TASK',
  similes: [
    'assign task',
    'delegate work',
    'give assignment',
    'assign to team',
    'distribute work',
    'create tasks',
  ],
  description: 'Delegates specific development tasks to specialized team members',

  examples: [
    [
      {
        name: 'user',
        content: {
          text: 'Assign the backend team to create user authentication and the frontend team to build the login form',
        },
      },
      {
        name: 'agent',
        content: {
          text: "I'll delegate these tasks to the appropriate team members right away!",
          action: 'DELEGATE_TASK',
        },
      },
    ],
    [
      {
        name: 'user',
        content: {
          text: 'Create tasks for setting up the database schema and building the API endpoints',
        },
      },
      {
        name: 'agent',
        content: {
          text: "Perfect! I'll break this down into specific tasks and assign them to the backend and devops teams.",
          action: 'DELEGATE_TASK',
        },
      },
    ],
  ],

  validate: async (runtime: IAgentRuntime, message: Memory): Promise<boolean> => {
    const text = message.content.text?.toLowerCase() || '';

    // Check for task delegation keywords
    const hasTaskIntent =
      text.includes('assign') ||
      text.includes('delegate') ||
      text.includes('task') ||
      text.includes('work on') ||
      text.includes('create') ||
      text.includes('build') ||
      text.includes('implement');

    // Check for team member mentions
    const hasTeamMention =
      text.includes('backend') ||
      text.includes('frontend') ||
      text.includes('devops') ||
      text.includes('team');

    return hasTaskIntent && hasTeamMention;
  },

  handler: async (runtime: IAgentRuntime, message: Memory, _state?: State): Promise<any> => {
    try {
      logger.info('Starting DELEGATE_TASK action');

      // Parse task delegation request
      const delegationRequest = await parseTaskDelegation(message.content.text || '');

      // Get current room (should be the dev team room)
      const roomId = message.roomId;
      if (!roomId) {
        throw new Error('No room context available for task delegation');
      }

      // Generate task assignments
      const tasks = await generateTaskAssignments(delegationRequest);

      // Create task tracking memory
      await runtime.createMemory(
        {
          roomId,
          entityId: runtime.agentId,
          content: {
            text: `Task delegation created: ${tasks.length} tasks assigned`,
            tasks,
            sprintGoal: delegationRequest.sprintGoal,
            createdAt: new Date().toISOString(),
            type: 'task_delegation',
          },
        },
        'messages',
        false
      );

      // Send individual task assignments to each agent
      const assignmentPromises = tasks.map((task) => sendTaskAssignment(runtime, roomId, task));

      await Promise.all(assignmentPromises);

      // Send summary to room
      const summary = generateTaskSummary(tasks, delegationRequest.sprintGoal);
      await runtime.createMemory(
        {
          roomId,
          entityId: runtime.agentId,
          content: {
            text: summary,
            tasks: tasks.map((t) => ({
              id: t.id,
              title: t.title,
              assignedTo: t.assignedTo,
              priority: t.priority,
            })),
            type: 'task_summary',
          },
        },
        'messages',
        false
      );

      return {
        text: `📋 **Tasks Delegated Successfully!**

Created ${tasks.length} tasks and assigned them to team members:

${tasks
  .map((task) => `- **${task.title}** → @${task.assignedTo} (${task.priority} priority)`)
  .join('\n')}

${delegationRequest.sprintGoal ? `**Sprint Goal:** ${delegationRequest.sprintGoal}\n` : ''}

All team members have been notified and can start working immediately. Track progress in this room!`,
        data: {
          tasksCreated: tasks.length,
          assignments: tasks.map((t) => ({
            id: t.id,
            title: t.title,
            assignedTo: t.assignedTo,
            priority: t.priority,
          })),
          sprintGoal: delegationRequest.sprintGoal,
        },
      };
    } catch (error) {
      logger.error('DELEGATE_TASK action failed:', error);

      return {
        text: `❌ Failed to delegate tasks: ${error instanceof Error ? error.message : 'Unknown error'}

Please check your task description and try again. Make sure to specify:
- What needs to be done
- Which team member should handle it
- Any specific requirements or deadlines`,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  },
};

/**
 * Parse task delegation from natural language
 */
async function parseTaskDelegation(text: string): Promise<TaskDelegationRequest> {
  // Try to extract JSON first
  let request: Partial<TaskDelegationRequest> = {};

  try {
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = parseJSONObjectFromText(jsonMatch[0]);
      if (parsed) {
        request = parsed as Partial<TaskDelegationRequest>;
      }
    }
  } catch {
    // Fall back to natural language parsing
  }

  // Extract tasks from natural language
  const tasks = request.tasks || extractTasksFromText(text);

  // Extract sprint goal
  const sprintGoalMatch = text.match(/(?:goal|objective|aim)(?:\s+is)?[:\s]+([^.!?]+)/i);
  const sprintGoal =
    request.sprintGoal || (sprintGoalMatch ? sprintGoalMatch[1].trim() : undefined);

  // Extract deadline
  const deadlineMatch = text.match(/(?:by|due|deadline)[:\s]+([^.!?]+)/i);
  const deadline = request.deadline || (deadlineMatch ? deadlineMatch[1].trim() : undefined);

  return {
    tasks,
    sprintGoal,
    deadline,
    projectId: request.projectId,
  };
}

/**
 * Extract tasks from natural language text
 */
function extractTasksFromText(text: string): Omit<TaskAssignment, 'id' | 'status'>[] {
  const tasks: Omit<TaskAssignment, 'id' | 'status'>[] = [];

  // Split text into sentences and analyze each for task assignments
  const sentences = text.split(/[.!?]+/).filter((s) => s.trim().length > 5);

  sentences.forEach((sentence) => {
    const task = extractTaskFromSentence(sentence.trim());
    if (task) {
      tasks.push(task);
    }
  });

  // If no specific tasks found, create default tasks based on general mentions
  if (tasks.length === 0) {
    tasks.push(...generateDefaultTasks(text));
  }

  return tasks;
}

/**
 * Extract a single task from a sentence
 */
function extractTaskFromSentence(sentence: string): Omit<TaskAssignment, 'id' | 'status'> | null {
  const lower = sentence.toLowerCase();

  // Determine assignee
  let assignedTo = 'backend'; // default
  if (lower.includes('frontend') || lower.includes('ui') || lower.includes('component')) {
    assignedTo = 'frontend';
  } else if (lower.includes('devops') || lower.includes('deploy') || lower.includes('setup')) {
    assignedTo = 'devops';
  } else if (lower.includes('backend') || lower.includes('api') || lower.includes('database')) {
    assignedTo = 'backend';
  }

  // Extract task description
  const taskPatterns = [
    /(?:create|build|implement|develop|design|setup|configure)\s+([^,]+)/i,
    /(?:make|add|write|code)\s+([^,]+)/i,
    /(authentication|login|database|api|endpoint|component|form|page|route)/i,
  ];

  let taskDescription = '';
  for (const pattern of taskPatterns) {
    const match = sentence.match(pattern);
    if (match) {
      taskDescription = match[1] || match[0];
      break;
    }
  }

  if (!taskDescription) {
    return null;
  }

  // Determine priority
  let priority: 'low' | 'medium' | 'high' | 'urgent' = 'medium';
  if (lower.includes('urgent') || lower.includes('asap') || lower.includes('critical')) {
    priority = 'urgent';
  } else if (lower.includes('high') || lower.includes('important')) {
    priority = 'high';
  } else if (lower.includes('low') || lower.includes('nice to have')) {
    priority = 'low';
  }

  return {
    title: taskDescription.charAt(0).toUpperCase() + taskDescription.slice(1),
    description: sentence,
    assignedTo,
    priority,
    deliverables: [`Completed ${taskDescription}`],
    acceptanceCriteria: [`${taskDescription} is implemented and tested`],
  };
}

/**
 * Generate default tasks based on general project mentions
 */
function generateDefaultTasks(text: string): Omit<TaskAssignment, 'id' | 'status'>[] {
  const tasks: Omit<TaskAssignment, 'id' | 'status'>[] = [];
  const lower = text.toLowerCase();

  // Backend tasks
  if (lower.includes('api') || lower.includes('backend') || lower.includes('database')) {
    tasks.push({
      title: 'Set up backend API structure',
      description: 'Create the basic Express.js server structure with routing',
      assignedTo: 'backend',
      priority: 'high',
      deliverables: ['Express server setup', 'Basic routing structure'],
      acceptanceCriteria: ['Server starts successfully', 'Basic endpoints respond'],
    });
  }

  // Frontend tasks
  if (lower.includes('ui') || lower.includes('frontend') || lower.includes('component')) {
    tasks.push({
      title: 'Create React component structure',
      description: 'Set up the main React components and routing',
      assignedTo: 'frontend',
      priority: 'high',
      deliverables: ['Component structure', 'Routing setup'],
      acceptanceCriteria: ['Components render correctly', 'Navigation works'],
    });
  }

  // DevOps tasks
  if (lower.includes('setup') || lower.includes('config') || lower.includes('deploy')) {
    tasks.push({
      title: 'Configure development environment',
      description: 'Set up build tools, linting, and development scripts',
      assignedTo: 'devops',
      priority: 'high',
      deliverables: ['Build configuration', 'Development scripts'],
      acceptanceCriteria: ['Build process works', 'Development server runs'],
    });
  }

  return tasks;
}

/**
 * Generate unique task IDs and finalize task assignments
 */
function generateTaskAssignments(request: TaskDelegationRequest): TaskAssignment[] {
  return request.tasks.map((task, index) => ({
    ...task,
    id: `task-${Date.now()}-${index}`,
    status: 'assigned' as const,
  }));
}

/**
 * Send individual task assignment to specific agent
 */
async function sendTaskAssignment(
  runtime: IAgentRuntime,
  roomId: string,
  task: TaskAssignment
): Promise<void> {
  const assignmentMessage = `🎯 **New Task Assignment**

**@${task.assignedTo}** - You have been assigned a new task:

**Task:** ${task.title}
**Priority:** ${task.priority.toUpperCase()}
**Description:** ${task.description}

**Deliverables:**
${task.deliverables.map((d) => `- ${d}`).join('\n')}

**Acceptance Criteria:**
${task.acceptanceCriteria.map((c) => `- ${c}`).join('\n')}

${task.estimatedHours ? `**Estimated Time:** ${task.estimatedHours} hours\n` : ''}
${task.dueDate ? `**Due Date:** ${task.dueDate}\n` : ''}
${task.dependencies?.length ? `**Dependencies:** ${task.dependencies.join(', ')}\n` : ''}

**Task ID:** \`${task.id}\`

Please acknowledge this task and provide an estimated start time. Update the room when you begin work!`;

  await runtime.createMemory(
    {
      roomId: roomId as any,
      entityId: runtime.agentId,
      content: {
        text: assignmentMessage,
        task,
        recipient: task.assignedTo,
        type: 'task_assignment',
      },
    },
    'messages',
    false
  );
}

/**
 * Generate task summary for the room
 */
function generateTaskSummary(tasks: TaskAssignment[], sprintGoal?: string): string {
  const tasksByRole = tasks.reduce(
    (acc, task) => {
      if (!acc[task.assignedTo]) {
        acc[task.assignedTo] = [];
      }
      acc[task.assignedTo].push(task);
      return acc;
    },
    {} as Record<string, TaskAssignment[]>
  );

  let summary = '📊 **Sprint Task Summary**\n\n';

  if (sprintGoal) {
    summary += `🎯 **Sprint Goal:** ${sprintGoal}\n\n`;
  }

  summary += `**Total Tasks:** ${tasks.length}\n\n`;

  // Task breakdown by role
  Object.entries(tasksByRole).forEach(([role, roleTasks]) => {
    summary += `**@${role}** (${roleTasks.length} tasks):\n`;
    roleTasks.forEach((task, index) => {
      summary += `${index + 1}. ${task.title} (${task.priority})\n`;
    });
    summary += '\n';
  });

  // Priority breakdown
  const priorityCounts = tasks.reduce(
    (acc, task) => {
      acc[task.priority] = (acc[task.priority] || 0) + 1;
      return acc;
    },
    {} as Record<string, number>
  );

  summary += '**Priority Breakdown:**\n';
  Object.entries(priorityCounts).forEach(([priority, count]) => {
    summary += `- ${priority.charAt(0).toUpperCase() + priority.slice(1)}: ${count}\n`;
  });

  summary +=
    '\n🚀 **Ready to start development!** All team members should acknowledge their tasks and begin work.';

  return summary;
}
