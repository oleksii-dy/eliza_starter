/**
 * Platform Workflow Action - Complete End-to-End Plugin Development
 *
 * This action orchestrates the complete platform workflow:
 * 1. Research & Planning with user confirmation
 * 2. Secrets collection and validation
 * 3. Registry item creation/validation
 * 4. Plugin/MCP generation with AutoCoder
 * 5. Testing and validation
 * 6. Registry publication and sharing
 */

import {
  type Action,
  type IAgentRuntime,
  type Memory,
  type State,
  type HandlerCallback,
  type ActionResult,
  elizaLogger,
} from '@elizaos/core';
import type {
  PluginCreationService,
  PluginSpecification,
} from '../services/PluginCreationService.js';
// AutoCodeService removed - using existing services

export interface PlatformWorkflowRequest {
  intent: 'create' | 'update' | 'publish' | 'discover';
  projectType: 'plugin' | 'mcp' | 'workflow';
  projectName: string;
  description: string;
  requirements?: string[];
  targetPlatform?: string;
  skipResearch?: boolean;
  autoConfirm?: boolean;
}

export interface WorkflowState {
  phase:
    | 'research'
    | 'planning'
    | 'secrets'
    | 'development'
    | 'testing'
    | 'publishing'
    | 'completed'
    | 'failed';
  projectId?: string;
  registryItemId?: string;
  requiredSecrets: string[];
  providedSecrets: string[];
  researchFindings?: any;
  userConfirmation?: boolean;
  buildJobId?: string;
  errors: string[];
  warnings: string[];
}

export const platformWorkflowAction: Action = {
  name: 'PLATFORM_WORKFLOW',
  description:
    'Complete end-to-end platform workflow for creating, building, and sharing plugins, MCPs, and workflows',
  similes: [
    'create platform plugin',
    'build new plugin',
    'develop mcp server',
    'make workflow',
    'platform development',
    'full plugin workflow',
    'end to end development',
  ],
  examples: [
    [
      {
        name: 'User',
        content: {
          text: 'I want to create a weather plugin that gets current conditions and forecasts from OpenWeatherMap API',
        },
      },
      {
        name: 'Assistant',
        content: {
          text: "I'll help you create a comprehensive weather plugin using our platform workflow. Let me start by researching the best practices for weather APIs and plugin architecture.",
          actions: ['PLATFORM_WORKFLOW'],
        },
      },
    ],
    [
      {
        name: 'User',
        content: {
          text: 'Build an MCP server for GitHub integration with repository management',
        },
      },
      {
        name: 'Assistant',
        content: {
          text: "I'll create a GitHub MCP server with comprehensive repository management capabilities. Starting the research and planning phase.",
          actions: ['PLATFORM_WORKFLOW'],
        },
      },
    ],
  ],

  validate: async (runtime: IAgentRuntime) => {
    const pluginCreationService = runtime.getService('plugin_creation');
    const pluginManagerService = runtime.getService('plugin-manager');
    const platformRegistryService = runtime.getService('platform-registry');

    return !!(pluginCreationService && (pluginManagerService || platformRegistryService));
  },

  handler: async (
    runtime: IAgentRuntime,
    message: Memory,
    state?: State,
    options?: { [key: string]: unknown },
    callback?: HandlerCallback
  ): Promise<ActionResult> => {
    try {
      elizaLogger.info('🚀 Starting Platform Workflow');

      // Get services
      const pluginCreationService = runtime.getService<PluginCreationService>('plugin_creation');
      const secretsManagerService = runtime.getService('SECRETS');
      const researchService = runtime.getService('research');
      const platformRegistryService = runtime.getService('platform-registry');

      if (!pluginCreationService) {
        throw new Error('Plugin creation service not available');
      }

      // Parse user request using AI
      const messageText = message.content.text || '';
      const parseResponse = await runtime.useModel('TEXT_LARGE', {
        prompt: `
Parse this platform development request: "${messageText}"

Extract:
1. Intent: create, update, publish, or discover
2. Project type: plugin, mcp, or workflow
3. Project name: suggested name for the project
4. Description: what the project should do
5. Requirements: specific features or integrations needed
6. Target platform: specific platform constraints (if any)

Respond with JSON containing these fields.
`,
        temperature: 0.1,
        maxTokens: 1000,
      });

      let workflowRequest: PlatformWorkflowRequest;
      try {
        const parsed = JSON.parse(parseResponse);
        workflowRequest = {
          intent: parsed.intent || 'create',
          projectType: parsed.projectType || 'plugin',
          projectName: parsed.projectName || 'generated-project',
          description: parsed.description || 'AI-generated project',
          requirements: parsed.requirements || [],
          targetPlatform: parsed.targetPlatform,
        };
      } catch (parseError) {
        throw new Error(`Failed to parse request: ${parseError}`);
      }

      // Initialize workflow state
      const workflowState: WorkflowState = {
        phase: 'research',
        requiredSecrets: [],
        providedSecrets: [],
        errors: [],
        warnings: [],
      };

      let responseText = '🎯 **Platform Workflow Started**\n\n';
      responseText += `**Project**: ${workflowRequest.projectName}\n`;
      responseText += `**Type**: ${workflowRequest.projectType}\n`;
      responseText += `**Intent**: ${workflowRequest.intent}\n`;
      responseText += `**Description**: ${workflowRequest.description}\n\n`;

      // Phase 1: Research & Analysis
      if (researchService && !workflowRequest.skipResearch) {
        responseText += '🔍 **Phase 1: Research & Analysis**\n';

        try {
          const researchQuery = `Best practices for ${workflowRequest.projectType} development: ${workflowRequest.description}. Include API integration patterns, security considerations, and ElizaOS plugin architecture guidelines.`;

          const researchResult = await (researchService as any).conductResearch(
            researchQuery,
            'software-engineering'
          );

          workflowState.researchFindings = researchResult;
          responseText += `✅ Research completed: Found ${researchResult.sources?.length || 0} relevant sources\n`;
          responseText += `📚 Key findings: ${researchResult.summary?.substring(0, 200)}...\n\n`;

          // Extract potential secrets from research
          const secretsAnalysis = await runtime.useModel('TEXT_LARGE', {
            prompt: `
Based on this research for ${workflowRequest.projectType} development:
${JSON.stringify(researchResult.summary)}

Identify required environment variables/secrets that would be needed:
- API keys
- Authentication tokens
- Configuration values
- External service credentials

Return a JSON array of secret names (e.g., ["OPENWEATHER_API_KEY", "DATABASE_URL"]).
`,
            temperature: 0.1,
            maxTokens: 500,
          });

          try {
            const requiredSecrets = JSON.parse(secretsAnalysis);
            workflowState.requiredSecrets = Array.isArray(requiredSecrets) ? requiredSecrets : [];
          } catch {
            workflowState.requiredSecrets = [];
          }
        } catch (researchError) {
          workflowState.warnings.push(`Research phase failed: ${researchError}`);
          responseText += '⚠️ Research failed, proceeding with basic development\n\n';
        }
      }

      // Phase 2: Planning & User Confirmation
      workflowState.phase = 'planning';
      responseText += '📋 **Phase 2: Planning & Architecture**\n';

      const planningResponse = await runtime.useModel('TEXT_LARGE', {
        prompt: `
Create a detailed development plan for this ${workflowRequest.projectType}:

Project: ${workflowRequest.projectName}
Description: ${workflowRequest.description}
Requirements: ${workflowRequest.requirements?.join(', ')}
Research findings: ${workflowState.researchFindings?.summary || 'None'}

Generate a structured plan including:
1. Architecture overview
2. Key components to implement
3. Dependencies and integrations
4. Testing strategy
5. Security considerations
6. Deployment approach

Format as markdown for user review.
`,
        temperature: 0.3,
        maxTokens: 2000,
      });

      responseText += '\n**Development Plan**:\n';
      responseText += planningResponse;
      responseText += '\n\n';

      // Phase 3: Secrets Collection
      if (workflowState.requiredSecrets.length > 0 && secretsManagerService) {
        workflowState.phase = 'secrets';
        responseText += '🔐 **Phase 3: Secrets & Configuration**\n';
        responseText += `Required secrets identified: ${workflowState.requiredSecrets.join(', ')}\n\n`;

        // Check which secrets are already available
        const availableSecrets: string[] = [];
        for (const secretName of workflowState.requiredSecrets) {
          try {
            const secretValue = await (secretsManagerService as any).get(secretName, {
              level: 'global',
              agentId: runtime.agentId,
              requesterId: message.entityId || runtime.agentId,
            });
            if (secretValue) {
              availableSecrets.push(secretName);
            }
          } catch {
            // Secret not available
          }
        }

        workflowState.providedSecrets = availableSecrets;
        const missingSecrets = workflowState.requiredSecrets.filter(
          (s) => !availableSecrets.includes(s)
        );

        if (missingSecrets.length > 0) {
          responseText += `⚠️ **Missing Secrets**: ${missingSecrets.join(', ')}\n`;
          responseText +=
            'Please provide these secrets using the secrets manager before proceeding with development.\n\n';
          responseText += '**Next Steps**:\n';
          missingSecrets.forEach((secret) => {
            responseText += `- Set ${secret}: Use the secrets manager to securely store this value\n`;
          });
          responseText +=
            '\nOnce secrets are provided, re-run this workflow to continue development.\n';

          // Save workflow state for resumption
          await callback?.({
            text: responseText,
            action: 'PLATFORM_WORKFLOW',
            metadata: {
              workflowState,
              workflowRequest,
              phase: 'awaiting_secrets',
              missingSecrets,
            },
          });

          return {
            text: responseText,
            data: { workflowState, workflowRequest },
            values: {
              phase: 'awaiting_secrets',
              missingSecrets: missingSecrets.length,
              requiredSecrets: workflowState.requiredSecrets.length,
            },
          };
        }

        responseText += `✅ All required secrets available (${availableSecrets.length})\n\n`;
      }

      // Phase 4: Registry Integration
      if (platformRegistryService) {
        responseText += '📦 **Phase 4: Registry Preparation**\n';

        // Check if item already exists in registry
        const existingItems = await (platformRegistryService as any).searchItems({
          search: workflowRequest.projectName,
          type: workflowRequest.projectType,
        });

        if (existingItems.total > 0) {
          responseText += '⚠️ Similar items found in registry:\n';
          existingItems.items.slice(0, 3).forEach((item: any) => {
            responseText += `- ${item.name}: ${item.description}\n`;
          });
          responseText += '\nProceeding with unique implementation...\n\n';
        }

        // Create registry item
        try {
          const registryCreateRequest = {
            type: workflowRequest.projectType as any,
            name: workflowRequest.projectName,
            description: workflowRequest.description,
            version: '1.0.0',
            tags: workflowRequest.requirements || [],
            category: 'utilities',
            visibility: 'public' as const,
            license: 'MIT',
            metadata: {
              createdBy: 'platform-workflow',
              researchBased: !!workflowState.researchFindings,
              autoGenerated: true,
            },
          };

          // Add type-specific data
          if (workflowRequest.projectType === 'plugin') {
            (registryCreateRequest as any).pluginData = {
              entryPoint: 'index.js',
              dependencies: [],
              engines: {
                node: '>=18.0.0',
                elizaos: '>=1.0.0',
              },
              capabilities: {
                actions: [],
                providers: [],
                services: [],
                evaluators: [],
              },
              configuration: {
                required: workflowState.requiredSecrets.length > 0,
              },
              testing: {
                hasTests: true,
                framework: 'vitest',
              },
            };
          } else if (workflowRequest.projectType === 'mcp') {
            (registryCreateRequest as any).mcpData = {
              protocol: 'stdio',
              connection: {
                command: 'node',
                args: ['server.js'],
              },
              capabilities: {
                tools: [],
                resources: [],
                prompts: [],
              },
              authenticationRequired: workflowState.requiredSecrets.length > 0,
              performance: {
                averageResponseTime: 100,
              },
            };
          }

          const registryItem = await (platformRegistryService as any).createItem(
            registryCreateRequest,
            message.entityId || runtime.agentId
          );

          workflowState.registryItemId = registryItem.id;
          responseText += `✅ Registry item created: ${registryItem.id}\n\n`;
        } catch (registryError) {
          workflowState.warnings.push(`Registry creation failed: ${registryError}`);
          responseText += '⚠️ Registry item creation failed, proceeding with development\n\n';
        }
      }

      // Phase 5: Development
      workflowState.phase = 'development';
      responseText += '🛠️ **Phase 5: Development & Generation**\n';

      try {
        // Create AutoCoder project
        const projectSpecification = {
          name: workflowRequest.projectName,
          type: workflowRequest.projectType,
          description: workflowRequest.description,
          requirements: workflowRequest.requirements || [],
          secretsRequired: workflowState.requiredSecrets,
          customInstructions: workflowState.researchFindings
            ? [
                `Use these research findings: ${workflowState.researchFindings.summary}`,
                ...Object.keys(workflowState.researchFindings.sources || {}).map(
                  (source) => `Reference: ${source}`
                ),
              ]
            : [],
        };

        const project = await autocoderService.createPluginProject(
          message.entityId || runtime.agentId,
          projectSpecification,
          runtime
        );

        const projectId = typeof project === 'string' ? project : project.id;
        workflowState.projectId = projectId;
        responseText += `✅ Development project created: ${projectId}\n`;

        // Start development phases
        await autocoderService.runDiscoveryPhase(projectId, runtime);
        responseText += '✅ Discovery phase completed\n';

        await autocoderService.runDevelopmentPhase(projectId, runtime);
        responseText += '✅ MVP development started\n\n';

        // Phase 6: Testing & Validation
        workflowState.phase = 'testing';
        responseText += '🧪 **Phase 6: Testing & Validation**\n';

        // Monitor project progress
        let attempts = 0;
        const maxAttempts = 30; // 5 minutes with 10-second intervals

        while (attempts < maxAttempts) {
          const project = await autocoderService.getProject(projectId);

          if (project && project.status === 'completed') {
            responseText += '✅ Development completed successfully!\n';
            responseText += `🔗 Pull Request: ${project.pullRequestUrl || 'N/A'}\n\n`;
            workflowState.phase = 'completed';
            break;
          } else if (project && project.status === 'failed') {
            responseText += `❌ Development failed: ${project.error || 'Unknown error'}\n\n`;
            workflowState.phase = 'failed';
            workflowState.errors.push(project.error || 'Unknown development error');
            break;
          }

          // Check for user notifications requiring action
          const actionRequiredNotifs =
            project?.userNotifications?.filter((n: any) => n.requiresAction) || [];
          if (actionRequiredNotifs.length > 0) {
            responseText += '⚡ **User Action Required**:\n';
            actionRequiredNotifs.forEach((notif: any) => {
              responseText += `- ${(notif as any).message || notif._message || 'Action required'}\n`;
            });
            responseText += '\nPlease address these issues and the development will continue.\n\n';
            break;
          }

          attempts++;
          await new Promise((resolve) => setTimeout(resolve, 10000)); // Wait 10 seconds
        }

        if (attempts >= maxAttempts) {
          responseText += `⏱️ Development in progress... Check project status: ${projectId}\n\n`;
        }
      } catch (developmentError) {
        workflowState.phase = 'failed';
        workflowState.errors.push(`Development failed: ${developmentError}`);
        responseText += `❌ Development failed: ${developmentError}\n\n`;
      }

      // Phase 7: Registry Publishing
      if (
        workflowState.phase === 'completed' &&
        workflowState.registryItemId &&
        platformRegistryService
      ) {
        responseText += '📢 **Phase 7: Registry Publishing**\n';

        try {
          // Update registry item with build results
          await (platformRegistryService as any).updateItem(
            {
              id: workflowState.registryItemId,
              status: 'active',
              metadata: {
                buildCompleted: true,
                projectId: workflowState.projectId,
                completedAt: new Date().toISOString(),
              },
            },
            message.entityId || runtime.agentId
          );

          responseText += '✅ Registry item published and active\n';
          responseText += '🌐 Available for discovery and sharing\n\n';
        } catch (publishError) {
          workflowState.warnings.push(`Publishing failed: ${publishError}`);
          responseText +=
            '⚠️ Registry publishing failed, but development completed successfully\n\n';
        }
      }

      // Summary
      responseText += '📊 **Workflow Summary**\n';
      responseText += `- Phase: ${workflowState.phase}\n`;
      responseText += `- Project ID: ${workflowState.projectId || 'N/A'}\n`;
      responseText += `- Registry Item: ${workflowState.registryItemId || 'N/A'}\n`;
      responseText += `- Secrets: ${workflowState.providedSecrets.length}/${workflowState.requiredSecrets.length}\n`;
      responseText += `- Warnings: ${workflowState.warnings.length}\n`;
      responseText += `- Errors: ${workflowState.errors.length}\n\n`;

      if (workflowState.phase === 'completed') {
        responseText += '🎉 **Platform workflow completed successfully!**\n';
        responseText += `Your ${workflowRequest.projectType} is now built, tested, and ready for use.\n`;
      } else if (workflowState.errors.length > 0) {
        responseText += '❌ **Workflow encountered errors:**\n';
        workflowState.errors.forEach((error) => {
          responseText += `- ${error}\n`;
        });
      }

      await callback?.({
        text: responseText,
        action: 'PLATFORM_WORKFLOW',
        metadata: {
          workflowState,
          workflowRequest,
          phase: workflowState.phase,
          projectId: workflowState.projectId,
          registryItemId: workflowState.registryItemId,
        },
      });

      return {
        text: responseText,
        data: { workflowState, workflowRequest },
        values: {
          phase: workflowState.phase,
          success: workflowState.phase === 'completed',
          projectId: workflowState.projectId,
          registryItemId: workflowState.registryItemId,
          errorsCount: workflowState.errors.length,
          warningsCount: workflowState.warnings.length,
        },
      };
    } catch (error) {
      elizaLogger.error('Error in PLATFORM_WORKFLOW:', error);

      let errorText = '❌ **Platform Workflow Failed**\n\n';
      errorText += `Error: ${error instanceof Error ? error.message : 'Unknown error'}\n\n`;
      errorText +=
        'Please check your configuration and try again. Ensure all required services are available:\n';
      errorText += '- AutoCoder service\n';
      errorText += '- Plugin Manager service\n';
      errorText += '- Secrets Manager service (for API keys)\n';
      errorText += '- Research service (for enhanced development)\n';

      await callback?.({
        text: errorText,
        action: 'PLATFORM_WORKFLOW',
      });

      throw error;
    }
  },
};
