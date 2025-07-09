import {
  Action,
  IAgentRuntime,
  Memory,
  State,
  HandlerCallback,
  ModelType,
  elizaLogger,
} from '@elizaos/core';
import { ProjectPlanningService } from '../services/project-planning-service';
import type { ProjectType } from '../types';

export const createProjectAction: Action = {
  name: 'CREATE_PROJECT',
  similes: [
    'start a new project',
    'create a project',
    'build a new plugin',
    'make a new agent',
    'develop a new workflow',
    'generate a new project',
    'scaffold a project',
  ],
  description: 'Create a new ElizaOS project (plugin, agent, workflow, etc.)',

  examples: [
    [
      {
        name: 'user',
        content: {
          text: 'I want to create a new plugin for weather data',
        },
      },
      {
        name: 'assistant',
        content: {
          text: "I'll help you create a new weather plugin. Let me start the project creation process.",
          actions: ['CREATE_PROJECT'],
        },
      },
    ],
    [
      {
        name: 'user',
        content: {
          text: 'Can you help me build an agent that trades crypto?',
        },
      },
      {
        name: 'assistant',
        content: {
          text: "I'll help you create a crypto trading agent. Starting the project setup now.",
          actions: ['CREATE_PROJECT'],
        },
      },
    ],
  ],

  validate: async (runtime: IAgentRuntime, _message: Memory, _state?: State) => {
    const projectPlanningService = runtime.getService<ProjectPlanningService>('project-planning');
    return !!projectPlanningService;
  },

  handler: async (
    runtime: IAgentRuntime,
    message: Memory,
    state?: State,
    _options?: { [key: string]: unknown },
    callback?: HandlerCallback
  ) => {
    try {
      const projectPlanningService = runtime.getService<ProjectPlanningService>('project-planning');
      if (!projectPlanningService) {
        throw new Error('Project planning service not available');
      }

      // Extract project type from message
      const projectType = await extractProjectType(runtime, message.content.text || '');

      // Create the project
      const project = await projectPlanningService.createProject(projectType);

      elizaLogger.info(`Created project ${project.id} of type ${projectType}`);

      const responseText = `I've started creating a new ${projectType} project for you. 

I'll guide you through a series of questions to gather all the requirements. This will help me generate exactly what you need.

Let's start with the basic information. ${projectType === 'plugin' ? 'What would you like to name your plugin?' : 'What would you like to name your agent?'}`;

      if (callback) {
        await callback({
          text: responseText,
          metadata: {
            projectId: project.id,
            projectType: project.type,
            formId: project.formId,
          },
        });
      }

      return {
        text: responseText,
        data: {
          project,
        },
      };
    } catch (error) {
      elizaLogger.error('Error creating project:', error);

      const errorMessage = `I encountered an error while creating the project: ${
        error instanceof Error ? error.message : 'Unknown error'
      }`;

      if (callback) {
        await callback({ text: errorMessage });
      }

      return {
        text: errorMessage,
        data: { error },
      };
    }
  },
};

/**
 * Extract project type from user message
 */
async function extractProjectType(runtime: IAgentRuntime, text: string): Promise<ProjectType> {
  const prompt = `Based on the user's message, determine what type of ElizaOS project they want to create.

Types:
- plugin: For creating ElizaOS plugins (actions, services, providers)
- agent: For creating AI agents with specific personalities and capabilities
- workflow: For creating automated workflows
- mcp: For creating Model Context Protocol servers
- full-stack: For creating full-stack applications

User message: "${text}"

Return ONLY the project type (plugin, agent, workflow, mcp, or full-stack).`;

  try {
    const response = await runtime.useModel(ModelType.TEXT_SMALL, {
      messages: [
        {
          role: 'system',
          content: 'You are a project type classifier. Return only the project type keyword.',
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      temperature: 0.1,
      max_tokens: 20,
    });

    const type = (typeof response === 'string' ? response : '').trim().toLowerCase();

    if (['plugin', 'agent', 'workflow', 'mcp', 'full-stack'].includes(type)) {
      return type as ProjectType;
    }

    // Default to plugin if unclear
    return 'plugin';
  } catch (error) {
    elizaLogger.error('Error extracting project type:', error);
    return 'plugin'; // Default
  }
}
