import {
  Action,
  type IAgentRuntime,
  type Memory,
  type State,
  type HandlerCallback,
  elizaLogger,
  ModelType,
} from '@elizaos/core';
import { CodeGenerationService } from '../services/CodeGenerationService';
import { FormsService } from '@elizaos/plugin-forms';

export const generateCodeAction: Action = {
  name: 'GENERATE_CODE',
  description: 'Generates complete ElizaOS projects using Claude Code in sandboxed environments',

  similes: [
    'create code',
    'generate project',
    'build plugin',
    'make agent',
    'develop',
    'code generation',
    'auto code',
    'write code for me',
  ],

  examples: [
    [
      {
        name: '{{user1}}',
        content: { text: 'Generate a plugin for weather data' },
      },
      {
        name: '{{agent}}',
        content: {
          text: "I'll help you generate a weather data plugin. Let me gather some requirements first.",
          actions: ['GENERATE_CODE'],
        },
      },
    ],
    [
      {
        name: '{{user1}}',
        content: { text: 'Create an agent that helps with customer support' },
      },
      {
        name: '{{agent}}',
        content: {
          text: "I'll create a customer support agent for you. Let me collect the project details.",
          actions: ['GENERATE_CODE'],
        },
      },
    ],
  ],

  validate: async (runtime: IAgentRuntime, _message: Memory, _state?: State) => {
    const codeGenService = runtime.getService<CodeGenerationService>('code-generation');
    const formsService = runtime.getService<FormsService>('forms');

    return !!(codeGenService && formsService);
  },

  handler: async (
    runtime: IAgentRuntime,
    message: Memory,
    state?: State,
    _options?: { [key: string]: unknown },
    callback?: HandlerCallback
  ) => {
    elizaLogger.info('GENERATE_CODE action triggered');

    try {
      const codeGenService = runtime.getService<CodeGenerationService>('code-generation');
      const formsService = runtime.getService<FormsService>('forms');

      if (!codeGenService || !formsService) {
        throw new Error('Required services not available');
      }

      // Extract project type from message
      const projectType = await extractProjectType(runtime, message, state);

      // Create form based on project type
      const formTemplate = getFormTemplate(projectType);

      const form = await formsService.createForm({
        ...formTemplate,
        onStepComplete: async (form: any, stepId: string) => {
          elizaLogger.info(`Step ${stepId} completed for project generation`);

          // Provide feedback after each step
          await callback?.({
            text: `Great! I've recorded the ${stepId} details. ${getNextStepPrompt(form, stepId)}`,
            actions: ['UPDATE_FORM'],
          });
        },
        onComplete: async (form) => {
          elizaLogger.info('Project form completed, starting code generation');

          // Extract values from form
          const projectData = extractProjectData(form);

          await callback?.({
            text: `Perfect! I have all the information I need. Starting code generation for your ${projectData.targetType}...`,
          });

          // Start code generation
          const result = await codeGenService.generateCode(projectData);

          if (result.success) {
            let successMessage = `🎉 Successfully generated your ${projectData.targetType}!`;

            if (result.projectPath) {
              successMessage += `\n📁 Project location: ${result.projectPath}`;
            }

            if (result.githubUrl) {
              successMessage += `\n🔗 GitHub repository: ${result.githubUrl}`;
            }

            if (result.agentId) {
              successMessage += `\n🤖 Agent ID: ${result.agentId}`;
              successMessage += `\n💬 Your agent is now connected and ready to chat!`;
            }

            await callback?.({
              text: successMessage,
            });
          } else {
            await callback?.({
              text: `❌ Code generation failed: ${result.errors?.join(', ')}`,
            });
          }
        },
      });

      // Initial response
      await callback?.(
        {
          text:
            formTemplate.initialMessage ||
            `I'll help you generate a ${projectType}. Let me gather some information to create exactly what you need.`,
          actions: ['UPDATE_FORM'],
        },
        []
      );

      return true;
    } catch (error) {
      elizaLogger.error('GENERATE_CODE error:', error);

      await callback?.({
        text: `I encountered an error: ${(error as Error).message}. Please try again.`,
      });

      return false;
    }
  },
};

async function extractProjectType(
  runtime: IAgentRuntime,
  message: Memory,
  state?: State
): Promise<string> {
  const content = message.content.text?.toLowerCase() || '';

  if (content.includes('plugin')) return 'plugin';
  if (content.includes('agent') || content.includes('bot')) return 'agent';
  if (content.includes('workflow')) return 'workflow';
  if (content.includes('mcp')) return 'mcp';
  if (content.includes('full-stack') || content.includes('app')) return 'full-stack';

  // Use LLM to determine type if not clear
  const prompt = `Based on this request: "${message.content.text}"
  
What type of ElizaOS project should be created?
Options: plugin, agent, workflow, mcp, full-stack

Reply with just the project type.`;

  const response = await runtime.useModel(ModelType.TEXT_SMALL, {
    prompt,
    maxTokens: 10,
  });

  return (response as any)?.text?.trim()?.toLowerCase() || 'plugin';
}

function getFormTemplate(projectType: string): any {
  const baseTemplate = {
    name: `${projectType}-project-form`,
    description: `Gather requirements for ${projectType} generation`,
  };

  switch (projectType) {
    case 'plugin':
      return {
        ...baseTemplate,
        initialMessage:
          "I'll help you create a new ElizaOS plugin. First, what would you like to name your plugin?",
        steps: [
          {
            id: 'basic-info',
            name: 'Basic Information',
            fields: [
              {
                name: 'projectName',
                type: 'text',
                label: 'Plugin Name',
                description: 'Name for your plugin (e.g., weather-plugin)',
                required: true,
              },
              {
                name: 'description',
                type: 'text',
                label: 'Description',
                description: 'What does this plugin do?',
                required: true,
              },
            ],
          },
          {
            id: 'requirements',
            name: 'Requirements',
            fields: [
              {
                name: 'requirements',
                type: 'text',
                label: 'Features',
                description: 'What features should the plugin have? (actions, providers, services)',
                required: true,
              },
              {
                name: 'apis',
                type: 'text',
                label: 'APIs',
                description: 'What external APIs will it use? (if any)',
                required: false,
              },
            ],
          },
          {
            id: 'deployment',
            name: 'Deployment',
            fields: [
              {
                name: 'githubRepo',
                type: 'text',
                label: 'GitHub Repository',
                description: 'Repository name for GitHub (optional)',
                required: false,
              },
              {
                name: 'testScenarios',
                type: 'text',
                label: 'Test Scenarios',
                description: 'What scenarios should be tested?',
                required: false,
              },
            ],
          },
        ],
      };

    case 'agent':
      return {
        ...baseTemplate,
        initialMessage: "Let's create a new ElizaOS agent. What should we call your agent?",
        steps: [
          {
            id: 'agent-identity',
            name: 'Agent Identity',
            fields: [
              {
                name: 'projectName',
                type: 'text',
                label: 'Agent Name',
                description: 'Name for your agent',
                required: true,
              },
              {
                name: 'description',
                type: 'text',
                label: 'Agent Purpose',
                description: "What is the agent's main purpose?",
                required: true,
              },
              {
                name: 'personality',
                type: 'text',
                label: 'Personality',
                description: "Describe the agent's personality",
                required: true,
              },
            ],
          },
          {
            id: 'capabilities',
            name: 'Capabilities',
            fields: [
              {
                name: 'requirements',
                type: 'text',
                label: 'Capabilities',
                description: 'What should the agent be able to do?',
                required: true,
              },
              {
                name: 'apis',
                type: 'text',
                label: 'Integrations',
                description: 'What services/APIs should it integrate with?',
                required: false,
              },
              {
                name: 'knowledge',
                type: 'text',
                label: 'Knowledge Base',
                description: 'What should the agent know about?',
                required: false,
              },
            ],
          },
        ],
      };

    default:
      return {
        ...baseTemplate,
        steps: [
          {
            id: 'project-details',
            name: 'Project Details',
            fields: [
              {
                name: 'projectName',
                type: 'text',
                label: 'Project Name',
                description: 'Name for your project',
                required: true,
              },
              {
                name: 'description',
                type: 'text',
                label: 'Description',
                description: 'What does this project do?',
                required: true,
              },
              {
                name: 'requirements',
                type: 'text',
                label: 'Requirements',
                description: 'List the main requirements',
                required: true,
              },
            ],
          },
        ],
      };
  }
}

function getNextStepPrompt(form: any, completedStepId: string): string {
  const currentIndex = form.steps.findIndex((s: any) => s.id === completedStepId);
  const nextStep = form.steps[currentIndex + 1];

  if (!nextStep) {
    return "That's all the information I need!";
  }

  const prompts: Record<string, string> = {
    requirements: "Now, let's talk about what features and capabilities you need.",
    deployment: "Finally, let's discuss deployment options.",
    capabilities: 'What capabilities should your agent have?',
    'agent-identity': "Tell me about your agent's personality and purpose.",
  };

  return prompts[nextStep.id] || `Let's move on to ${nextStep.name}.`;
}

function extractProjectData(form: any): any {
  const data: any = {
    targetType: form.name.replace('-project-form', ''),
    requirements: [],
    apis: [],
  };

  // Extract all field values from all steps
  for (const step of form.steps) {
    for (const field of step.fields) {
      if (field.value) {
        if (field.name === 'requirements') {
          // Split requirements by common delimiters
          data.requirements = field.value
            .split(/[,;\n]/)
            .map((r: string) => r.trim())
            .filter((r: string) => r);
        } else if (field.name === 'apis') {
          // Split APIs
          data.apis = field.value
            .split(/[,;\n]/)
            .map((a: string) => a.trim())
            .filter((a: string) => a);
        } else if (field.name === 'testScenarios') {
          data.testScenarios = field.value
            .split(/[,;\n]/)
            .map((s: string) => s.trim())
            .filter((s: string) => s);
        } else {
          data[field.name] = field.value;
        }
      }
    }
  }

  return data;
}
