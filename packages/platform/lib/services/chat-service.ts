/**
 * Real AI Chat Service
 * Replaces hardcoded responses with actual LLM integration
 */

import OpenAI from 'openai';
import { logger } from '@/lib/logger';

export interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export interface ChatContext {
  currentStep: string;
  userContext: Record<string, any>;
  chatHistory: ChatMessage[];
  sessionId: string;
}

export interface ChatResponse {
  content: string;
  suggestions?: string[];
  workflowStep?: string;
  generatedAsset?: any;
  nextStep?: string;
}

export interface WorkflowRequirements {
  type: 'n8n_workflow' | 'mcp' | 'agent_config';
  description: string;
  requirements: Record<string, any>;
  userContext: Record<string, any>;
}

export interface GeneratedAsset {
  type: 'n8n_workflow' | 'mcp' | 'agent_config';
  name: string;
  description: string;
  data: any;
  preview?: string;
  downloadUrl?: string;
}

class ChatService {
  private openai: OpenAI;
  private systemPrompts: Record<string, string>;

  constructor() {
    if (!process.env.OPENAI_API_KEY) {
      throw new Error('OPENAI_API_KEY environment variable is required');
    }

    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });

    this.systemPrompts = {
      discovery: `You are an expert AI assistant that helps users create automation workflows, MCP servers, and AI agents. 

Your role is to understand what the user wants to build and guide them through the process. Be conversational, helpful, and ask clarifying questions to understand their specific needs.

Key capabilities you help with:
- n8n workflows for business process automation
- MCP (Model Context Protocol) servers for AI integrations  
- Custom AI agents for specific use cases

Always ask follow-up questions to understand:
- What systems/tools they want to connect
- What triggers should start the automation
- What actions should happen automatically
- How often it should run
- Any specific requirements or constraints

Provide 2-4 helpful suggestions after each response.`,

      requirements: `You are gathering detailed technical requirements for the user's project. 

Based on the conversation so far, ask specific technical questions to understand:
- Exact tools and services to integrate
- Authentication methods needed
- Data formats and transformations required
- Error handling requirements
- Performance and scale considerations
- Security requirements

Be thorough but not overwhelming. Ask 2-3 focused questions at a time.`,

      generation: `You are generating a real solution based on the gathered requirements.

Create actual, working configurations that the user can deploy:
- For n8n: Generate proper workflow JSON with real nodes and connections
- For MCP: Create functional server code with proper interfaces
- For agents: Generate complete configuration with actions and providers

Explain what you're creating and how it meets their specific requirements.`,
    };
  }

  /**
   * Generate AI response for anonymous chat
   */
  async generateChatResponse(
    message: string,
    context: ChatContext,
  ): Promise<ChatResponse> {
    try {
      const { currentStep, userContext, chatHistory } = context;

      // Build conversation history for AI
      const messages: ChatMessage[] = [
        {
          role: 'system',
          content: this.getSystemPrompt(currentStep, userContext),
        },
        ...chatHistory.slice(-10), // Keep last 10 messages for context
        {
          role: 'user',
          content: message,
        },
      ];

      // Call OpenAI API
      const completion = await this.openai.chat.completions.create({
        model: process.env.OPENAI_MODEL || 'gpt-3.5-turbo',
        messages: messages.map((msg) => ({
          role: msg.role,
          content: msg.content,
        })),
        temperature: 0.7,
        max_tokens: 1000,
        presence_penalty: 0.1,
        frequency_penalty: 0.1,
      });

      const aiResponse =
        completion.choices[0]?.message?.content ||
        'I apologize, but I encountered an issue generating a response. Could you please try again?';

      // Extract structured response
      const parsedResponse = this.parseAIResponse(
        aiResponse,
        currentStep,
        userContext,
      );

      logger.info('AI chat response generated', {
        sessionId: context.sessionId,
        currentStep,
        tokenUsage: completion.usage,
        responseLength: aiResponse.length,
      });

      return parsedResponse;
    } catch (error) {
      logger.error('Failed to generate AI chat response', error as Error, {
        sessionId: context.sessionId,
        currentStep: context.currentStep,
        messageLength: message.length,
      });

      // Fallback to basic response
      return this.getFallbackResponse(context.currentStep);
    }
  }

  /**
   * Generate workflow/asset based on requirements
   */
  async generateAsset(
    requirements: WorkflowRequirements,
  ): Promise<GeneratedAsset> {
    try {
      const {
        type,
        description,
        requirements: reqs,
        userContext,
      } = requirements;

      const systemPrompt = this.getGenerationPrompt(type);
      const userPrompt = this.buildGenerationPrompt(
        type,
        description,
        reqs,
        userContext,
      );

      const completion = await this.openai.chat.completions.create({
        model: process.env.OPENAI_MODEL || 'gpt-4',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        temperature: 0.3, // Lower temperature for more consistent code generation
        max_tokens: 2000,
      });

      const generatedContent = completion.choices[0]?.message?.content || '';

      return this.parseGeneratedAsset(type, generatedContent, description);
    } catch (error) {
      logger.error('Failed to generate asset', error as Error, {
        type: requirements.type,
        description: requirements.description,
      });

      // Return a basic template as fallback
      return this.getFallbackAsset(requirements.type, requirements.description);
    }
  }

  /**
   * Get system prompt based on conversation step
   */
  private getSystemPrompt(
    currentStep: string,
    userContext: Record<string, any>,
  ): string {
    const basePrompt =
      this.systemPrompts[currentStep] || this.systemPrompts.discovery;

    // Add context-specific information
    let contextInfo = '';
    if (userContext.interestedIn) {
      contextInfo += `\nThe user is interested in: ${userContext.interestedIn}`;
    }
    if (userContext.workflowType) {
      contextInfo += `\nWorkflow type: ${userContext.workflowType}`;
    }
    if (userContext.domain) {
      contextInfo += `\nBusiness domain: ${userContext.domain}`;
    }

    return basePrompt + contextInfo;
  }

  /**
   * Parse AI response into structured format
   */
  private parseAIResponse(
    response: string,
    currentStep: string,
    userContext: Record<string, any>,
  ): ChatResponse {
    // Try to extract suggestions from the response
    const suggestions = this.extractSuggestions(response);

    // Determine next step based on current step and response content
    const nextStep = this.determineNextStep(currentStep, response, userContext);

    // Generate workflow step identifier - always provide a valid step
    const workflowStep = this.generateWorkflowStep(currentStep, userContext);

    return {
      content: response,
      suggestions:
        suggestions.length > 0
          ? suggestions
          : this.getDefaultSuggestions(currentStep),
      workflowStep,
      nextStep: nextStep || currentStep, // Ensure nextStep is never undefined
    };
  }

  /**
   * Extract suggestion options from AI response
   */
  private extractSuggestions(response: string): string[] {
    const suggestions: string[] = [];

    // Look for common patterns that indicate options/suggestions
    const patterns = [
      /(?:For example|Examples include|Such as|Options include):?\s*([^.!?]*)/gi,
      /(?:You could|You might|Consider):?\s*([^.!?]*)/gi,
      /["']([^"']{20,60})["']/g, // Quoted suggestions
    ];

    for (const pattern of patterns) {
      const matches = response.matchAll(pattern);
      for (const match of matches) {
        if (match[1]) {
          const suggestion = match[1].trim();
          if (suggestion.length > 10 && suggestion.length < 100) {
            suggestions.push(suggestion);
          }
        }
      }
    }

    // If no patterns found, generate contextual suggestions
    if (suggestions.length === 0) {
      return this.generateContextualSuggestions(response);
    }

    return suggestions.slice(0, 4); // Limit to 4 suggestions
  }

  /**
   * Get default suggestions for a step when no contextual suggestions are found
   */
  private getDefaultSuggestions(currentStep: string): string[] {
    switch (currentStep) {
      case 'discovery':
        return [
          'I want to create an n8n workflow',
          'I need an MCP server',
          'I want to build an AI agent',
          "What's the best option for my use case?",
        ];
      case 'requirements':
        return [
          'I need to connect multiple systems',
          'I want to automate data processing',
          'I need real-time notifications',
          'I want to process files automatically',
        ];
      case 'generation':
        return [
          'Generate the solution now',
          'Add more features',
          'Customize the configuration',
          'Create something else',
        ];
      default:
        return [
          'Continue with this approach',
          'Try a different solution',
          'Need more information',
          'Start over',
        ];
    }
  }

  /**
   * Generate contextual suggestions based on response content
   */
  private generateContextualSuggestions(response: string): string[] {
    const lowerResponse = response.toLowerCase();

    // Check for business context keywords
    if (
      lowerResponse.includes('customer') ||
      lowerResponse.includes('service')
    ) {
      return [
        'I want to automate customer support',
        'I need help desk automation',
        'I want to process customer inquiries',
        'I need order management automation',
      ];
    }

    if (
      lowerResponse.includes('store') ||
      lowerResponse.includes('shop') ||
      lowerResponse.includes('ecommerce')
    ) {
      return [
        'I want to sync inventory data',
        'I need order processing automation',
        'I want customer notification workflows',
        'I need payment processing integration',
      ];
    }

    if (lowerResponse.includes('n8n') || lowerResponse.includes('workflow')) {
      return [
        'I want to automate CRM data sync',
        'I need email marketing automation',
        'I want to process files automatically',
        'I need API integrations',
      ];
    }

    if (lowerResponse.includes('mcp') || lowerResponse.includes('server')) {
      return [
        'I need database access for my AI app',
        'I want to integrate external APIs',
        'I need file system operations',
        'I want custom business logic',
      ];
    }

    if (lowerResponse.includes('agent') || lowerResponse.includes('ai')) {
      return [
        'I want a customer service agent',
        'I need a research assistant',
        'I want content creation help',
        'I need task automation',
      ];
    }

    // Default suggestions with more business context
    return [
      'I want to automate my business processes',
      'I need help with customer service',
      'I want to connect my existing tools',
      "What's the best automation for my use case?",
    ];
  }

  /**
   * Determine next step based on conversation flow
   */
  private determineNextStep(
    currentStep: string,
    response: string,
    userContext: Record<string, any>,
  ): string {
    const lowerResponse = response.toLowerCase();

    // If user mentions a specific type, move to requirements
    if (
      currentStep === 'discovery' &&
      (lowerResponse.includes('n8n') ||
        lowerResponse.includes('mcp') ||
        lowerResponse.includes('agent') ||
        userContext.workflowType)
    ) {
      return 'requirements';
    }

    // If we have enough context, move to generation
    if (
      currentStep === 'requirements' &&
      (this.hasEnoughRequirements(userContext) ||
        lowerResponse.includes('generate') ||
        lowerResponse.includes('create'))
    ) {
      return 'generation';
    }

    // After generation, go to customization
    if (currentStep === 'generation') {
      return 'customization';
    }

    // Default progression for discovery step
    if (currentStep === 'discovery') {
      return 'requirements';
    }

    return currentStep;
  }

  /**
   * Check if we have enough requirements to proceed to generation
   */
  private hasEnoughRequirements(userContext: Record<string, any>): boolean {
    return !!(
      userContext.workflowType &&
      (userContext.tools || userContext.services || userContext.domain)
    );
  }

  /**
   * Generate workflow step identifier
   */
  private generateWorkflowStep(
    currentStep: string,
    userContext: Record<string, any>,
  ): string {
    const workflowType = userContext.workflowType || 'general';
    return `${workflowType}_${currentStep}`;
  }

  /**
   * Get generation prompt for specific asset type
   */
  private getGenerationPrompt(
    type: 'n8n_workflow' | 'mcp' | 'agent_config',
  ): string {
    switch (type) {
      case 'n8n_workflow':
        return 'You are an expert n8n workflow generator. Create complete, functional n8n workflow JSON that can be imported directly into n8n. Include all necessary nodes, connections, credentials, and configuration. Use real n8n node types and proper syntax.';

      case 'mcp':
        return 'You are an expert MCP (Model Context Protocol) server developer. Create complete, functional MCP server code in TypeScript that follows MCP specifications. Include proper interfaces, tools, and resources.';

      case 'agent_config':
        return 'You are an expert AI agent configuration designer. Create complete ElizaOS agent configuration with character definition, actions, evaluators, and providers. Use proper ElizaOS syntax and patterns.';

      default:
        return 'You are an expert automation and AI developer. Create functional code that meets the user\'s requirements.';
    }
  }

  /**
   * Build user prompt for asset generation
   */
  private buildGenerationPrompt(
    type: 'n8n_workflow' | 'mcp' | 'agent_config',
    description: string,
    requirements: Record<string, any>,
    userContext: Record<string, any>,
  ): string {
    let prompt = `Create a ${type} with the following requirements:\n\n`;
    prompt += `Description: ${description}\n\n`;

    prompt += 'Requirements:\n';
    for (const [key, value] of Object.entries(requirements)) {
      prompt += `- ${key}: ${value}\n`;
    }

    if (Object.keys(userContext).length > 0) {
      prompt += '\nAdditional Context:\n';
      for (const [key, value] of Object.entries(userContext)) {
        prompt += `- ${key}: ${value}\n`;
      }
    }

    prompt += '\nPlease generate complete, functional code that can be used immediately. Include comments explaining key functionality.';

    return prompt;
  }

  /**
   * Parse generated asset from AI response
   */
  private parseGeneratedAsset(
    type: 'n8n_workflow' | 'mcp' | 'agent_config',
    content: string,
    description: string,
  ): GeneratedAsset {
    // Extract JSON/code blocks from the response
    const codeBlocks = content.match(
      /```(?:json|typescript|javascript|yaml)?\n([\s\S]*?)\n```/g,
    );
    let data = {};
    let preview = content;

    if (codeBlocks && codeBlocks.length > 0) {
      // Extract the first code block as the main data
      const cleanCode = codeBlocks[0].replace(
        /```(?:json|typescript|javascript|yaml)?\n?|\n?```/g,
        '',
      );

      try {
        if (type === 'n8n_workflow') {
          data = JSON.parse(cleanCode);
        } else {
          data = { code: cleanCode };
        }
        preview = cleanCode;
      } catch (error) {
        logger.warn('Failed to parse generated code as JSON', {
          error,
          content: cleanCode.substring(0, 200),
        });
        data = { rawContent: cleanCode };
        preview = cleanCode;
      }
    } else {
      // No code blocks found, treat entire response as content
      data = { rawContent: content };
    }

    return {
      type,
      name: this.generateAssetName(type, description),
      description,
      data,
      preview: preview.substring(0, 1000), // Limit preview length
      downloadUrl: undefined, // Will be generated when user requests download
    };
  }

  /**
   * Generate asset name based on type and description
   */
  private generateAssetName(type: string, description: string): string {
    const typeNames = {
      n8n_workflow: 'Workflow',
      mcp: 'MCP Server',
      agent_config: 'AI Agent',
    };

    const baseName = typeNames[type as keyof typeof typeNames] || 'Asset';
    const descWords = description.split(' ').slice(0, 3).join(' ');

    return `${baseName}: ${descWords}`;
  }

  /**
   * Get fallback response when AI fails
   */
  private getFallbackResponse(currentStep: string): ChatResponse {
    const fallbacks = {
      discovery: {
        content:
          "I'm here to help you build amazing automation solutions! What would you like to create today - an n8n workflow, MCP server, or AI agent?",
        suggestions: [
          'I want to create an n8n workflow',
          'I need an MCP server',
          'I want to build an AI agent',
          "What's the best option for my use case?",
        ],
        nextStep: 'requirements',
        workflowStep: 'general_discovery',
      },
      requirements: {
        content:
          'Let me help you define the requirements for your project. What specific functionality do you need?',
        suggestions: [
          'Connect multiple services together',
          'Automate data processing',
          'Handle user interactions',
          'Process files automatically',
        ],
        nextStep: 'generation',
        workflowStep: 'general_requirements',
      },
      generation: {
        content:
          "I'm working on generating your solution. This might take a moment...",
        suggestions: [
          'Add more features',
          'Modify the configuration',
          'Create something else',
        ],
        nextStep: 'customization',
        workflowStep: 'general_generation',
      },
    };

    const fallback =
      fallbacks[currentStep as keyof typeof fallbacks] || fallbacks.discovery;
    return {
      content: fallback.content,
      suggestions: fallback.suggestions,
      nextStep: fallback.nextStep,
      workflowStep: fallback.workflowStep,
    };
  }

  /**
   * Get fallback asset when generation fails
   */
  private getFallbackAsset(
    type: 'n8n_workflow' | 'mcp' | 'agent_config',
    description: string,
  ): GeneratedAsset {
    const templates = {
      n8n_workflow: {
        name: 'Basic n8n Workflow',
        data: {
          name: 'Generated Workflow',
          nodes: [
            {
              parameters: {},
              type: 'n8n-nodes-base.manualTrigger',
              typeVersion: 1,
              position: [240, 300],
              id: 'manual-trigger',
            },
          ],
          connections: {},
        },
      },
      mcp: {
        name: 'Basic MCP Server',
        data: {
          code: `// Basic MCP Server Template
import { Server } from '@modelcontextprotocol/sdk/server/index.js';

const server = new Server({
  name: 'custom-mcp-server',
  version: '1.0.0'
});

// Add your custom tools and resources here

server.start();`,
        },
      },
      agent_config: {
        name: 'Basic AI Agent',
        data: {
          code: `// Basic ElizaOS Agent Configuration
export default {
  name: "CustomAgent",
  bio: "A helpful AI assistant",
  knowledge: [],
  actions: [],
  providers: [],
  evaluators: []
};`,
        },
      },
    };

    const template = templates[type as keyof typeof templates];

    return {
      type,
      name: template?.name || 'Generated Asset',
      description,
      data: template?.data || { rawContent: 'Template content' },
      preview: JSON.stringify(template?.data || {}, null, 2).substring(0, 500),
    };
  }
}

// Export singleton instance
export const chatService = new ChatService();
