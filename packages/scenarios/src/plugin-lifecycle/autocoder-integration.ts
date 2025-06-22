import type { Scenario, UUID } from "../types.js";

export const autocoderIntegrationScenario: Scenario = {
  id: 'autocoder-integration-comprehensive',
  name: 'Autocoder Plugin Integration Testing',
  description: 'Testing of autocoder plugin functionality for ElizaOS plugin development workflows',
  category: 'plugin-integration',
  tags: ['autocoder', 'plugin-development', 'eliza-plugins'],
  
  actors: [
    {
      id: 'f47ac10b-58cc-4372-a567-0e02b2c3d479' as UUID,
      name: 'Autocoder Agent',
      role: 'subject',
      plugins: ['@elizaos/plugin-autocoder'],
      systemPrompt: `You are an AI agent with the autocoder plugin loaded. You specialize in ElizaOS plugin development and can:
- Create new ElizaOS plugins from descriptions
- Update existing plugins with new features
- Check status of plugin development projects
- Publish completed plugins to registries
- Manage plugin development lifecycles
- Orchestrate containerized development environments

You respond with detailed plugin development assistance and can execute autocoder actions.`,
    },
    {
      id: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890' as UUID,
      name: 'Plugin Developer',
      role: 'assistant',
      script: {
        steps: [
          {
            type: 'message',
            content: 'Create a plugin named "email-validator-plugin" that validates email addresses and provides email formatting utilities for ElizaOS agents',
          },
          {
            type: 'wait',
            waitTime: 8000,
          },
          {
            type: 'message',
            content: 'Update plugin "email-validator-plugin" with TypeScript support and better error handling mechanisms',
          },
          {
            type: 'wait',
            waitTime: 6000,
          },
          {
            type: 'message',
            content: 'Check the status of project email-validator-plugin and show me the current development progress',
          },
          {
            type: 'wait',
            waitTime: 4000,
          },
          {
            type: 'message',
            content: 'Add custom instructions to the email-validator-plugin project to include regex validation patterns',
          },
          {
            type: 'wait',
            waitTime: 5000,
          },
          {
            type: 'message',
            content: 'Publish plugin email-validator-plugin to the ElizaOS plugin registry',
          },
        ],
      },
    },
    {
      id: 'b2c3d4e5-f6a7-8901-bcde-f23456789012' as UUID,
      name: 'Project Manager',
      role: 'observer',
      script: {
        steps: [
          {
            type: 'wait',
            waitTime: 35000,
          },
          {
            type: 'message',
            content: 'Get notifications for all active plugin development projects',
          },
          {
            type: 'wait',
            waitTime: 3000,
          },
          {
            type: 'message',
            content: 'Create a plugin named "project-tracker-plugin" that helps manage plugin development projects',
          },
        ],
      },
    },
  ],
  
  setup: {
    roomName: 'Autocoder Development Environment',
    roomType: 'group',
    initialContext: {
      purpose: 'code-development-testing',
      environment: 'development',
      projectType: 'full-stack-web-application',
    },
  },
  
  execution: {
    maxDuration: 180000, // 3 minutes for complex code generation
    maxSteps: 60,
    strategy: 'sequential',
  },
  
  verification: {
    strategy: 'llm',
    confidence: 0.85,
    rules: [
      {
        id: 'plugin-creation-triggered',
        type: 'llm',
        description: 'Autocoder createPluginProject action was triggered for plugin creation requests',
        weight: 4,
        config: {
          successCriteria: 'Verify that the autocoder agent properly triggered the createPluginProject action when asked to create a plugin. The agent should acknowledge the plugin creation request and indicate that the project has been started.',
          category: 'functional',
          priority: 'HIGH',
        },
      },
      {
        id: 'plugin-update-handling',
        type: 'llm',
        description: 'Autocoder updatePluginProject action was triggered for plugin update requests',
        weight: 4,
        config: {
          successCriteria: 'Verify that the autocoder agent properly triggered the updatePluginProject action when asked to update an existing plugin. The agent should acknowledge the update request and describe the changes being made.',
          category: 'functional',
          priority: 'HIGH',
        },
      },
      {
        id: 'project-status-monitoring',
        type: 'llm',
        description: 'Autocoder checkProjectStatus action was triggered for status inquiries',
        weight: 3,
        config: {
          successCriteria: 'Verify that the autocoder agent properly triggered the checkProjectStatus action when asked about project status. The agent should provide information about the current state of plugin development.',
          category: 'functional',
          priority: 'HIGH',
        },
      },
      {
        id: 'custom-instructions-handling',
        type: 'llm',
        description: 'Autocoder addCustomInstructions action was triggered appropriately',
        weight: 3,
        config: {
          successCriteria: 'Verify that the autocoder agent properly triggered the addCustomInstructions action when custom development instructions were provided.',
          category: 'functional',
          priority: 'MEDIUM',
        },
      },
      {
        id: 'plugin-publishing-workflow',
        type: 'llm',
        description: 'Autocoder publishPlugin action was triggered for publishing requests',
        weight: 3,
        config: {
          successCriteria: 'Verify that the autocoder agent properly triggered the publishPlugin action when asked to publish a completed plugin.',
          category: 'functional',
          priority: 'MEDIUM',
        },
      },
      {
        id: 'notification-system',
        type: 'llm',
        description: 'Autocoder notification system responds to project inquiries',
        weight: 2,
        config: {
          successCriteria: 'Verify that the autocoder agent properly handles notification requests and provides project updates.',
          category: 'behavioral',
          priority: 'LOW',
        },
      },
      {
        id: 'multiple-project-handling',
        type: 'llm',
        description: 'Autocoder can handle multiple concurrent plugin development projects',
        weight: 2,
        config: {
          successCriteria: 'Verify that the autocoder agent can manage multiple plugin projects simultaneously and keep track of different project states.',
          category: 'behavioral',
          priority: 'MEDIUM',
        },
      },
      {
        id: 'appropriate-action-selection',
        type: 'llm',
        description: 'Autocoder selects appropriate actions based on request types',
        weight: 3,
        config: {
          successCriteria: 'Verify that the autocoder agent consistently selects the correct actions (createPluginProject, updatePluginProject, checkProjectStatus, etc.) based on the type of request received.',
          category: 'behavioral',
          priority: 'HIGH',
        },
      },
    ],
  },
  
  benchmarks: {
    responseTime: 8000, // Plugin development operations can take time
    completionTime: 120000, // 2 minutes
    successRate: 0.90,
    customMetrics: {
      pluginProjectsCreated: 2,
      pluginUpdatesRequested: 1,
      statusChecksPerformed: 1,
      publishingAttempts: 1,
      notificationRequests: 1,
    },
  },
  
  metadata: {
    complexity: 'medium',
    systemRequirements: ['autocoder-plugin'],
    skills: ['plugin-development', 'eliza-ecosystem', 'project-management'],
    testType: 'integration',
  },
};

export default autocoderIntegrationScenario;