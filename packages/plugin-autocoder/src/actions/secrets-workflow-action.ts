/**
 * Secrets Workflow Action - Intelligent Secrets Management for Development
 *
 * This action provides intelligent secrets management during development workflows:
 * - Detects required secrets from project analysis
 * - Guides users through secure credential setup
 * - Validates and tests secrets before development
 * - Integrates with platform registry for credential requirements
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

export interface SecretRequirement {
  name: string;
  description: string;
  required: boolean;
  category: 'api_key' | 'database' | 'auth' | 'config' | 'webhook';
  validationPattern?: string;
  testEndpoint?: string;
  documentation?: string;
}

export interface SecretsAnalysis {
  projectType: string;
  projectName: string;
  requirements: SecretRequirement[];
  estimatedSecrets: number;
  securityLevel: 'low' | 'medium' | 'high';
  recommendations: string[];
}

export const secretsWorkflowAction: Action = {
  name: 'SECRETS_WORKFLOW',
  description: 'Intelligent secrets management and guidance for development workflows',
  similes: [
    'manage secrets',
    'setup api keys',
    'configure credentials',
    'security setup',
    'environment variables',
    'api key management',
  ],
  examples: [
    [
      {
        name: 'User',
        content: {
          text: 'I need help setting up API keys for my weather plugin',
        },
      },
      {
        name: 'Assistant',
        content: {
          text: "I'll help you securely configure the required API keys for your weather plugin. Let me analyze what credentials you'll need.",
          actions: ['SECRETS_WORKFLOW'],
        },
      },
    ],
    [
      {
        name: 'User',
        content: {
          text: 'What secrets do I need for a GitHub MCP server?',
        },
      },
      {
        name: 'Assistant',
        content: {
          text: "I'll analyze the GitHub MCP server requirements and guide you through setting up the necessary authentication credentials.",
          actions: ['SECRETS_WORKFLOW'],
        },
      },
    ],
  ],

  validate: async (runtime: IAgentRuntime) => {
    const secretsService = runtime.getService('SECRETS') as any;
    return !!secretsService;
  },

  handler: async (
    runtime: IAgentRuntime,
    message: Memory,
    state?: State,
    options?: { [key: string]: unknown },
    callback?: HandlerCallback
  ): Promise<ActionResult> => {
    try {
      elizaLogger.info('🔐 Starting Secrets Workflow');

      const secretsService = runtime.getService('SECRETS') as any;
      if (!secretsService) {
        throw new Error('Secrets service not available');
      }

      const messageText = message.content.text || '';

      // Parse the secrets request
      const analysisResponse = await runtime.useModel('TEXT_LARGE', {
        prompt: `
Analyze this request for secrets/credentials management: "${messageText}"

Determine:
1. Project type (plugin, mcp, workflow, general)
2. Project name or context
3. What type of secrets/credentials are needed
4. The intent (setup, validate, analyze, troubleshoot)

Common secret categories:
- API keys (weather, github, openai, etc.)
- Database credentials
- Authentication tokens
- Webhook URLs
- Configuration values

Respond with JSON containing: projectType, projectName, intent, secretCategories.
`,
        temperature: 0.1,
        maxTokens: 1000,
      });

      let analysisData: any;
      try {
        analysisData = JSON.parse(analysisResponse);
      } catch {
        analysisData = {
          projectType: 'general',
          projectName: 'unknown',
          intent: 'setup',
          secretCategories: ['api_key'],
        };
      }

      let responseText = '🔐 **Secrets Management Workflow**\n\n';
      responseText += `**Project**: ${analysisData.projectName}\n`;
      responseText += `**Type**: ${analysisData.projectType}\n`;
      responseText += `**Intent**: ${analysisData.intent}\n\n`;

      // Generate secrets analysis based on project type
      const secretsAnalysis = await generateSecretsAnalysis(
        analysisData.projectType,
        analysisData.projectName,
        analysisData.secretCategories,
        runtime
      );

      responseText += '📊 **Secrets Analysis**\n';
      responseText += `- Security Level: ${secretsAnalysis.securityLevel.toUpperCase()}\n`;
      responseText += `- Required Secrets: ${secretsAnalysis.requirements.filter((r) => r.required).length}\n`;
      responseText += `- Optional Secrets: ${secretsAnalysis.requirements.filter((r) => !r.required).length}\n\n`;

      // Check current secrets status
      const secretsStatus = await checkSecretsStatus(
        secretsAnalysis.requirements,
        secretsService,
        runtime,
        message.entityId
      );

      responseText += '🔍 **Current Status**\n';
      responseText += `- Available: ${secretsStatus.available.length}\n`;
      responseText += `- Missing: ${secretsStatus.missing.length}\n`;
      responseText += `- Invalid: ${secretsStatus.invalid.length}\n\n`;

      if (secretsStatus.missing.length > 0) {
        responseText += '❗ **Missing Required Secrets**\n';
        for (const req of secretsStatus.missing) {
          responseText += `\n**${req.name}** (${req.category})\n`;
          responseText += `📝 ${req.description}\n`;
          if (req.documentation) {
            responseText += `📚 Documentation: ${req.documentation}\n`;
          }
          responseText += '⚙️ **Setup Instructions**:\n';
          responseText += await generateSetupInstructions(req, runtime);
          responseText += '\n';
        }
      }

      if (secretsStatus.available.length > 0) {
        responseText += '✅ **Available Secrets**\n';
        secretsStatus.available.forEach((secret) => {
          responseText += `- ${secret.name}: Ready ✓\n`;
        });
        responseText += '\n';
      }

      if (secretsStatus.invalid.length > 0) {
        responseText += '⚠️ **Invalid/Expired Secrets**\n';
        secretsStatus.invalid.forEach((secret) => {
          responseText += `- ${secret.name}: Needs updating\n`;
        });
        responseText += '\n';
      }

      // Provide recommendations
      if (secretsAnalysis.recommendations.length > 0) {
        responseText += '💡 **Security Recommendations**\n';
        secretsAnalysis.recommendations.forEach((rec) => {
          responseText += `- ${rec}\n`;
        });
        responseText += '\n';
      }

      // Generate validation commands
      if (secretsStatus.available.length > 0) {
        responseText += '🧪 **Testing Commands**\n';
        responseText += 'Use these commands to validate your secrets:\n';
        for (const secret of secretsStatus.available) {
          if (secret.testEndpoint) {
            responseText += `- Test ${secret.name}: curl -H "Authorization: Bearer $${secret.name}" ${secret.testEndpoint}\n`;
          }
        }
        responseText += '\n';
      }

      // Next steps
      responseText += '🎯 **Next Steps**\n';
      if (secretsStatus.missing.length > 0) {
        responseText += '1. Set up missing secrets using the instructions above\n';
        responseText += '2. Use the secrets manager to securely store credentials\n';
        responseText += '3. Re-run this workflow to validate setup\n';
      } else if (secretsStatus.invalid.length > 0) {
        responseText += '1. Update invalid/expired secrets\n';
        responseText += '2. Test credentials with provided commands\n';
        responseText += '3. Verify integration functionality\n';
      } else {
        responseText += '1. ✅ All secrets configured correctly\n';
        responseText += '2. Ready to proceed with development\n';
        responseText += '3. Consider running platform workflow to build your project\n';
      }

      await callback?.({
        text: responseText,
        action: 'SECRETS_WORKFLOW',
        metadata: {
          secretsAnalysis,
          secretsStatus,
          projectType: analysisData.projectType,
          projectName: analysisData.projectName,
        },
      });

      return {
        text: responseText,
        data: { secretsAnalysis, secretsStatus },
        values: {
          totalSecrets: secretsAnalysis.requirements.length,
          availableSecrets: secretsStatus.available.length,
          missingSecrets: secretsStatus.missing.length,
          invalidSecrets: secretsStatus.invalid.length,
          securityLevel: secretsAnalysis.securityLevel,
          readyForDevelopment:
            secretsStatus.missing.length === 0 && secretsStatus.invalid.length === 0,
        },
      };
    } catch (_error) {
      elizaLogger.error('Error in SECRETS_WORKFLOW:', _error);

      let errorText = '❌ **Secrets Workflow Failed**\n\n';
      errorText += `Error: ${_error instanceof Error ? _error.message : 'Unknown error'}\n\n`;
      errorText +=
        'Please ensure the secrets manager service is available and properly configured.';

      await callback?.({
        text: errorText,
        action: 'SECRETS_WORKFLOW',
      });

      throw _error;
    }
  },
};

async function generateSecretsAnalysis(
  projectType: string,
  projectName: string,
  categories: string[],
  runtime: IAgentRuntime
): Promise<SecretsAnalysis> {
  const analysisPrompt = `
Generate a comprehensive secrets analysis for this project:
Type: ${projectType}
Name: ${projectName}
Categories: ${categories.join(', ')}

Based on common patterns for ${projectType} development, identify:
1. Required API keys and their purposes
2. Optional credentials that enhance functionality
3. Security considerations and best practices
4. Specific documentation links where possible

Common project patterns:
- Weather plugins: OpenWeatherMap API, WeatherAPI, etc.
- GitHub integrations: Personal access tokens, GitHub Apps
- Database plugins: Connection strings, credentials
- Social media: OAuth tokens, API keys
- AI/ML: OpenAI, Anthropic, Hugging Face keys

Respond with JSON containing detailed requirements array with name, description, required, category, validationPattern, testEndpoint, documentation fields.
`;

  const response = await runtime.useModel('TEXT_LARGE', {
    prompt: analysisPrompt,
    temperature: 0.2,
    maxTokens: 2000,
  });

  try {
    const analysis = JSON.parse(response);

    // Calculate security level
    const requiredCount = analysis.requirements?.filter((r: any) => r.required).length || 0;
    const apiKeyCount =
      analysis.requirements?.filter((r: any) => r.category === 'api_key').length || 0;

    let securityLevel: 'low' | 'medium' | 'high' = 'low';
    if (apiKeyCount > 2 || requiredCount > 3) {
      securityLevel = 'high';
    } else if (apiKeyCount > 0 || requiredCount > 1) {
      securityLevel = 'medium';
    }

    return {
      projectType,
      projectName,
      requirements: analysis.requirements || [],
      estimatedSecrets: analysis.requirements?.length || 0,
      securityLevel,
      recommendations: analysis.recommendations || [
        'Store secrets securely using the secrets manager',
        'Never commit secrets to version control',
        'Use environment-specific configurations',
        'Regularly rotate API keys and tokens',
      ],
    };
  } catch (_parseError) {
    // Fallback analysis
    return {
      projectType,
      projectName,
      requirements: [],
      estimatedSecrets: 0,
      securityLevel: 'low',
      recommendations: ['Use the secrets manager for secure credential storage'],
    };
  }
}

async function checkSecretsStatus(
  requirements: SecretRequirement[],
  secretsService: any,
  runtime: IAgentRuntime,
  entityId?: string
): Promise<{
  available: SecretRequirement[];
  missing: SecretRequirement[];
  invalid: SecretRequirement[];
}> {
  const available: SecretRequirement[] = [];
  const missing: SecretRequirement[] = [];
  const invalid: SecretRequirement[] = [];

  for (const requirement of requirements) {
    try {
      const secretValue = await (secretsService as any).get(requirement.name, {
        level: 'global',
        agentId: runtime.agentId,
        requesterId: entityId || runtime.agentId,
      });

      if (secretValue) {
        // Basic validation
        if (requirement.validationPattern) {
          const regex = new RegExp(requirement.validationPattern);
          if (regex.test(secretValue)) {
            available.push(requirement);
          } else {
            invalid.push(requirement);
          }
        } else {
          available.push(requirement);
        }
      } else {
        missing.push(requirement);
      }
    } catch (_error) {
      missing.push(requirement);
    }
  }

  return { available, missing, invalid };
}

async function generateSetupInstructions(
  requirement: SecretRequirement,
  runtime: IAgentRuntime
): Promise<string> {
  const instructionsPrompt = `
Generate step-by-step setup instructions for this credential:
Name: ${requirement.name}
Category: ${requirement.category}
Description: ${requirement.description}

Provide specific instructions for:
1. Where to obtain this credential (official website/portal)
2. How to create/generate the credential
3. Any special configuration needed
4. How to store it securely using ElizaOS secrets manager

Keep instructions practical and specific.
`;

  try {
    const response = await runtime.useModel('TEXT_LARGE', {
      prompt: instructionsPrompt,
      temperature: 0.1,
      maxTokens: 1000,
    });

    return response;
  } catch (_error) {
    return `1. Obtain ${requirement.name} from the appropriate service provider\n2. Store securely using: Set secret "${requirement.name}" via secrets manager\n3. Validate the credential is working correctly`;
  }
}
