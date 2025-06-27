import { IAgentRuntime, ModelType } from '@elizaos/core';
import { AutocoderAgentService } from '@/lib/autocoder/agent-service';
import { getSql } from '@/lib/database';
import { randomUUID } from 'crypto';

interface ConversationAnalysis {
  intent: 'general_chat' | 'project_request' | 'implementation_ready' | 'technical_question';
  confidence: number;
  projectType?: 'defi' | 'trading' | 'dao' | 'nft' | 'general';
  complexity?: 'simple' | 'moderate' | 'advanced';
  suggestedActions: string[];
  extractedRequirements: string[];
  urgency: 'low' | 'medium' | 'high';
  context: {
    hasHistory: boolean;
    conversationLength: number;
    previousIntent?: string;
    projectStage?: 'planning' | 'implementation' | 'testing' | 'deployment';
  };
}

interface TransitionDecision {
  shouldTransition: boolean;
  reason: string;
  recommendedWorkflow: 'autocoder_session' | 'continue_chat' | 'research_mode' | 'implementation_mode';
  transitionData?: {
    projectId?: string;
    analysisResults: ConversationAnalysis;
    userPrompt: string;
    conversationHistory: Array<{ type: 'user' | 'agent'; message: string; timestamp: Date }>;
  };
}

interface WorkflowState {
  currentMode: 'chat' | 'autocoder' | 'transition';
  projectId?: string;
  sessionId: string;
  userId: string;
  context: {
    conversationHistory: Array<{ type: 'user' | 'agent'; message: string; timestamp: Date }>;
    intentHistory: ConversationAnalysis[];
    transitionAttempts: number;
    lastTransitionTime?: Date;
  };
  metadata: {
    totalMessages: number;
    autocoderSessionCount: number;
    averageResponseTime: number;
    userSatisfactionScore?: number;
  };
}

export class WorkflowBridgeService {
  private agentService: AutocoderAgentService;
  private runtime: IAgentRuntime | null = null;
  private activeWorkflows = new Map<string, WorkflowState>();

  constructor() {
    this.agentService = new AutocoderAgentService();
  }

  async initialize(): Promise<void> {
    await this.agentService.initialize();
    // Initialize with a simple runtime wrapper if needed
    this.runtime = {
      useModel: this.agentService['runtime']?.useModel?.bind(this.agentService['runtime']),
      logger: {
        info: console.log,
        warn: console.warn,
        error: console.error,
        debug: console.debug,
      },
    } as any;
  }

  /**
   * Analyze conversation context to determine user intent and optimal workflow
   */
  async analyzeConversation(
    message: string,
    conversationHistory: Array<{ type: 'user' | 'agent'; message: string; timestamp: Date }>,
    userId: string
  ): Promise<ConversationAnalysis> {
    if (!this.runtime) {
      await this.initialize();
    }

    try {
      // Build comprehensive analysis prompt
      const historyContext = conversationHistory
        .slice(-10) // Last 10 messages for context
        .map(msg => `${msg.type}: ${msg.message}`)
        .join('\n');

      const analysisPrompt = `Analyze this conversation to determine user intent and optimal workflow:

Current Message: "${message}"

Recent Conversation History:
${historyContext}

Analyze for:
1. Primary Intent: Is this general chat, a project request, ready for implementation, or a technical question?
2. Project Type: If project-related, what category (defi, trading, dao, nft, general)?
3. Complexity Level: How complex would implementation be?
4. Urgency: How urgent is the user's request?
5. Suggested Actions: What should happen next?
6. Requirements: What specific requirements can be extracted?

Consider conversation patterns:
- Keywords indicating project requests: "build", "create", "implement", "develop", "make"
- Implementation readiness: "proceed", "start", "begin", "go ahead", "build it"
- Technical depth: mentions of specific technologies, frameworks, or protocols
- Complexity indicators: scope, integrations, custom requirements

Provide analysis as JSON:
{
  "intent": "general_chat|project_request|implementation_ready|technical_question",
  "confidence": 0.0-1.0,
  "projectType": "defi|trading|dao|nft|general",
  "complexity": "simple|moderate|advanced",
  "suggestedActions": ["action1", "action2"],
  "extractedRequirements": ["req1", "req2"],
  "urgency": "low|medium|high",
  "context": {
    "hasHistory": boolean,
    "conversationLength": number,
    "previousIntent": "string",
    "projectStage": "planning|implementation|testing|deployment"
  }
}`;

      const response = await this.runtime!.useModel(ModelType.TEXT_REASONING_LARGE, {
        prompt: analysisPrompt,
        temperature: 0.3,
        maxTokens: 1000,
      });

      try {
        const analysis = JSON.parse(response as string) as ConversationAnalysis;

        // Validate and enhance analysis
        analysis.confidence = Math.max(0, Math.min(1, analysis.confidence || 0.5));
        analysis.context = analysis.context || {
          hasHistory: conversationHistory.length > 0,
          conversationLength: conversationHistory.length,
        };

        return analysis;
      } catch (parseError) {
        // Fallback analysis based on keywords
        return this.createFallbackAnalysis(message, conversationHistory);
      }
    } catch (error) {
      console.error('Conversation analysis failed:', error);
      return this.createFallbackAnalysis(message, conversationHistory);
    }
  }

  /**
   * Determine if conversation should transition to autocoder workflow
   */
  async evaluateTransition(
    analysis: ConversationAnalysis,
    workflowState: WorkflowState,
    userMessage: string
  ): Promise<TransitionDecision> {
    // Transition rules based on intent and context
    const transitionRules = {
      // Strong indicators for autocoder transition
      strongIndicators: [
        analysis.intent === 'project_request' && analysis.confidence > 0.7,
        analysis.intent === 'implementation_ready' && analysis.confidence > 0.6,
        analysis.extractedRequirements.length >= 2,
        analysis.urgency === 'high' && analysis.intent !== 'general_chat',
      ],

      // Weak indicators
      weakIndicators: [
        analysis.projectType !== undefined && analysis.confidence > 0.5,
        analysis.complexity !== undefined,
        analysis.suggestedActions.some(action =>
          action.includes('implement') || action.includes('build') || action.includes('create')
        ),
      ],

      // Blockers
      blockers: [
        analysis.intent === 'general_chat' && analysis.confidence > 0.8,
        workflowState.context.transitionAttempts >= 3, // Avoid transition loops
        workflowState.metadata.totalMessages < 2, // Need some conversation context
      ],
    };

    const strongCount = transitionRules.strongIndicators.filter(Boolean).length;
    const weakCount = transitionRules.weakIndicators.filter(Boolean).length;
    const blockerCount = transitionRules.blockers.filter(Boolean).length;

    // Decision logic
    let shouldTransition = false;
    let reason = '';
    let recommendedWorkflow: TransitionDecision['recommendedWorkflow'] = 'continue_chat';

    if (blockerCount > 0) {
      shouldTransition = false;
      reason = 'Transition blocked due to conversation context or previous attempts';
      recommendedWorkflow = 'continue_chat';
    } else if (strongCount >= 2) {
      shouldTransition = true;
      reason = 'Strong indicators for project implementation detected';
      recommendedWorkflow = 'autocoder_session';
    } else if (strongCount >= 1 && weakCount >= 2) {
      shouldTransition = true;
      reason = 'Moderate confidence in project request with supporting indicators';
      recommendedWorkflow = 'autocoder_session';
    } else if (analysis.intent === 'technical_question' && analysis.confidence > 0.7) {
      shouldTransition = false;
      reason = 'Technical question - better handled in research mode';
      recommendedWorkflow = 'research_mode';
    } else {
      shouldTransition = false;
      reason = 'Insufficient confidence for autocoder transition';
      recommendedWorkflow = 'continue_chat';
    }

    return {
      shouldTransition,
      reason,
      recommendedWorkflow,
      transitionData: shouldTransition ? {
        analysisResults: analysis,
        userPrompt: userMessage,
        conversationHistory: workflowState.context.conversationHistory,
      } : undefined,
    };
  }

  /**
   * Execute workflow transition to autocoder session
   */
  async executeTransition(
    userId: string,
    transitionData: NonNullable<TransitionDecision['transitionData']>,
    workflowState: WorkflowState
  ): Promise<{ success: boolean; projectId?: string; error?: string }> {
    try {
      const sql = getSql();

      // Create new autocoder project
      const projectId = randomUUID();
      const analysis = transitionData.analysisResults;

      // Generate project specification from analysis
      const projectSpec = {
        name: this.generateProjectName(transitionData.userPrompt, analysis.projectType),
        description: transitionData.userPrompt,
        type: analysis.projectType || 'general',
        complexity: analysis.complexity || 'moderate',
        features: analysis.extractedRequirements,
        suggestions: analysis.suggestedActions,
        conversationContext: {
          originalPrompt: transitionData.userPrompt,
          extractedFromChat: true,
          analysisConfidence: analysis.confidence,
          conversationLength: transitionData.conversationHistory.length,
        },
        bridgeMetadata: {
          transitionReason: 'workflow_bridge_analysis',
          originalIntent: analysis.intent,
          bridgeConfidence: analysis.confidence,
          timestamp: new Date().toISOString(),
        },
      };

      // Create autocoder project in database
      await sql.query(
        `
        INSERT INTO autocoder_projects (
          id, user_id, name, type, description, status, specification, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), NOW())
        `,
        [
          projectId,
          userId,
          projectSpec.name,
          projectSpec.type,
          projectSpec.description,
          'planning',
          JSON.stringify(projectSpec)
        ]
      );

      // Store transition message in autocoder_messages
      await sql.query(
        `
        INSERT INTO autocoder_messages (
          id, project_id, user_id, type, message, timestamp, metadata
        ) VALUES ($1, $2, $3, $4, $5, NOW(), $6)
        `,
        [
          randomUUID(),
          projectId,
          userId,
          'user',
          transitionData.userPrompt,
          JSON.stringify({
            transitionedFromChat: true,
            originalAnalysis: analysis,
            conversationHistory: transitionData.conversationHistory.slice(-5), // Last 5 messages
          })
        ]
      );

      // Update workflow state
      workflowState.currentMode = 'autocoder';
      workflowState.projectId = projectId;
      workflowState.context.transitionAttempts++;
      workflowState.context.lastTransitionTime = new Date();
      workflowState.metadata.autocoderSessionCount++;

      // Initialize autocoder conversation
      await this.initializeAutocoderSession(projectId, userId, transitionData.userPrompt, analysis);

      return { success: true, projectId };
    } catch (error) {
      console.error('Transition execution failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown transition error'
      };
    }
  }

  /**
   * Process message through appropriate workflow
   */
  async processMessage(
    userId: string,
    message: string,
    sessionId?: string
  ): Promise<{
    response: string;
    workflowState: WorkflowState;
    transitionOccurred?: boolean;
    projectId?: string;
    metadata: {
      intent: string;
      confidence: number;
      workflow: string;
      processingTime: number;
    };
  }> {
    const startTime = Date.now();

    // Get or create workflow state
    const workflowKey = sessionId || `${userId}-default`;
    const workflowState = this.activeWorkflows.get(workflowKey) || this.createInitialWorkflowState(userId, sessionId || randomUUID());

    // Add message to conversation history
    workflowState.context.conversationHistory.push({
      type: 'user',
      message,
      timestamp: new Date(),
    });
    workflowState.metadata.totalMessages++;

    try {
      // Analyze conversation
      const analysis = await this.analyzeConversation(
        message,
        workflowState.context.conversationHistory,
        userId
      );

      // Store intent history
      workflowState.context.intentHistory.push(analysis);
      if (workflowState.context.intentHistory.length > 10) {
        workflowState.context.intentHistory = workflowState.context.intentHistory.slice(-10);
      }

      // Evaluate transition
      const transitionDecision = await this.evaluateTransition(analysis, workflowState, message);

      let response: string;
      let transitionOccurred = false;
      let projectId: string | undefined;

      if (transitionDecision.shouldTransition && transitionDecision.transitionData) {
        // Execute transition to autocoder
        const transitionResult = await this.executeTransition(
          userId,
          transitionDecision.transitionData,
          workflowState
        );

        if (transitionResult.success) {
          transitionOccurred = true;
          projectId = transitionResult.projectId;
          workflowState.projectId = projectId;

          response = `Perfect! I've analyzed your request and I'm ready to help you build this ${analysis.projectType || 'project'}. 

**What I understand:**
${analysis.extractedRequirements.map(req => `• ${req}`).join('\n')}

**Next Steps:**
${analysis.suggestedActions.map(action => `• ${action}`).join('\n')}

I'm setting up a dedicated workspace for this project. Let's dive into the technical details and create something amazing together!

Would you like me to start with research and planning, or do you have specific technical requirements we should discuss first?`;
        } else {
          response = `I understand you'd like to build something, but I encountered an issue setting up the project workspace. Let me help you in a different way. Could you provide more specific details about what you'd like to create?

${transitionResult.error ? `(Technical note: ${transitionResult.error})` : ''}`;
        }
      } else {
        // Continue in chat mode
        response = await this.generateChatResponse(analysis, workflowState, message);
      }

      // Add response to conversation history
      workflowState.context.conversationHistory.push({
        type: 'agent',
        message: response,
        timestamp: new Date(),
      });

      // Update workflow state
      this.activeWorkflows.set(workflowKey, workflowState);

      const processingTime = Date.now() - startTime;
      workflowState.metadata.averageResponseTime =
        (workflowState.metadata.averageResponseTime * (workflowState.metadata.totalMessages - 1) + processingTime) / workflowState.metadata.totalMessages;

      return {
        response,
        workflowState,
        transitionOccurred,
        projectId,
        metadata: {
          intent: analysis.intent,
          confidence: analysis.confidence,
          workflow: transitionDecision.recommendedWorkflow,
          processingTime,
        },
      };
    } catch (error) {
      console.error('Message processing failed:', error);

      const fallbackResponse = "I'm having trouble processing your message right now. Could you try rephrasing your request?";

      workflowState.context.conversationHistory.push({
        type: 'agent',
        message: fallbackResponse,
        timestamp: new Date(),
      });

      return {
        response: fallbackResponse,
        workflowState,
        metadata: {
          intent: 'error',
          confidence: 0,
          workflow: 'error_handling',
          processingTime: Date.now() - startTime,
        },
      };
    }
  }

  /**
   * Generate contextual chat response
   */
  private async generateChatResponse(
    analysis: ConversationAnalysis,
    workflowState: WorkflowState,
    userMessage: string
  ): Promise<string> {
    try {
      // Build response based on intent and context
      const responsePrompt = `Generate a helpful response for this conversation:

User Message: "${userMessage}"
Detected Intent: ${analysis.intent}
Confidence: ${analysis.confidence}
Project Type: ${analysis.projectType || 'none detected'}
Context: ${analysis.context.conversationLength} messages in conversation

Recent conversation shows patterns of: ${workflowState.context.intentHistory.slice(-3).map(h => h.intent).join(', ')}

Guidelines:
1. If intent is "project_request" but confidence is low, ask clarifying questions
2. If intent is "technical_question", provide detailed technical guidance
3. If intent is "general_chat", be conversational but watch for project indicators
4. Always be helpful and encourage deeper technical discussions
5. Subtly guide towards actionable project work when appropriate

Generate a natural, helpful response that fits the conversation context.`;

      const response = await this.runtime!.useModel(ModelType.TEXT_LARGE, {
        prompt: responsePrompt,
        temperature: 0.7,
        maxTokens: 400,
      });

      return response as string;
    } catch (error) {
      console.error('Chat response generation failed:', error);
      return this.getFallbackResponse(analysis.intent);
    }
  }

  /**
   * Initialize autocoder conversation with enhanced context
   */
  private async initializeAutocoderSession(
    projectId: string,
    userId: string,
    userPrompt: string,
    analysis: ConversationAnalysis
  ): Promise<void> {
    try {
      const sql = getSql();

      // Create enhanced system message
      const systemMessage = `Welcome to your dedicated project workspace! 🚀

I've analyzed your request: "${userPrompt}"

**Project Analysis:**
• **Type**: ${analysis.projectType?.toUpperCase() || 'GENERAL'} project
• **Complexity**: ${analysis.complexity?.toUpperCase() || 'MODERATE'}
• **Confidence**: ${Math.round((analysis.confidence || 0) * 100)}%

**What I've Identified:**
${analysis.extractedRequirements.map(req => `✓ ${req}`).join('\n')}

**Recommended Next Steps:**
${analysis.suggestedActions.map((action, i) => `${i + 1}. ${action}`).join('\n')}

I'm ready to help you build this from concept to deployment. I can:
🔍 **Research** existing solutions and best practices
📐 **Design** detailed architecture and implementation plan
⚡ **Generate** production-ready code with comprehensive testing
🚀 **Deploy** and guide you through the entire process

What would you like to focus on first? Technical architecture, specific implementation details, or shall I start with comprehensive research?`;

      await sql.query(
        `
        INSERT INTO autocoder_messages (
          id, project_id, user_id, type, message, timestamp, metadata
        ) VALUES ($1, $2, $3, $4, $5, NOW(), $6)
        `,
        [
          randomUUID(),
          projectId,
          userId,
          'system',
          systemMessage,
          JSON.stringify({
            step: 'workspace_initialization',
            analysis,
            capabilities: [
              'research',
              'planning',
              'code_generation',
              'testing',
              'deployment',
              'technical_guidance'
            ],
            workflowBridge: true,
          })
        ]
      );

      console.log(`Initialized autocoder session for project ${projectId} via workflow bridge`);
    } catch (error) {
      console.error('Failed to initialize autocoder session:', error);
    }
  }

  /**
   * Helper methods
   */
  private createInitialWorkflowState(userId: string, sessionId: string): WorkflowState {
    return {
      currentMode: 'chat',
      sessionId,
      userId,
      context: {
        conversationHistory: [],
        intentHistory: [],
        transitionAttempts: 0,
      },
      metadata: {
        totalMessages: 0,
        autocoderSessionCount: 0,
        averageResponseTime: 0,
      },
    };
  }

  private createFallbackAnalysis(
    message: string,
    conversationHistory: Array<{ type: 'user' | 'agent'; message: string; timestamp: Date }>
  ): ConversationAnalysis {
    const lowerMessage = message.toLowerCase();

    // Simple keyword-based analysis
    let intent: ConversationAnalysis['intent'] = 'general_chat';
    let projectType: ConversationAnalysis['projectType'] = undefined;
    const complexity: ConversationAnalysis['complexity'] = 'moderate';

    if (lowerMessage.includes('build') || lowerMessage.includes('create') || lowerMessage.includes('make')) {
      intent = 'project_request';
    } else if (lowerMessage.includes('proceed') || lowerMessage.includes('start') || lowerMessage.includes('implement')) {
      intent = 'implementation_ready';
    } else if (lowerMessage.includes('how') || lowerMessage.includes('what') || lowerMessage.includes('explain')) {
      intent = 'technical_question';
    }

    if (lowerMessage.includes('defi') || lowerMessage.includes('yield')) {
      projectType = 'defi';
    } else if (lowerMessage.includes('trading') || lowerMessage.includes('bot')) {
      projectType = 'trading';
    } else if (lowerMessage.includes('dao') || lowerMessage.includes('governance')) {
      projectType = 'dao';
    } else if (lowerMessage.includes('nft')) {
      projectType = 'nft';
    }

    return {
      intent,
      confidence: intent === 'general_chat' ? 0.6 : 0.4, // Lower confidence for fallback
      projectType,
      complexity,
      suggestedActions: intent === 'project_request' ? ['Clarify requirements', 'Research solutions'] : ['Continue conversation'],
      extractedRequirements: [],
      urgency: 'medium',
      context: {
        hasHistory: conversationHistory.length > 0,
        conversationLength: conversationHistory.length,
      },
    };
  }

  private generateProjectName(prompt: string, projectType?: string): string {
    const words = prompt.split(' ').slice(0, 3);
    const firstWord = words[0]?.charAt(0).toUpperCase() + words[0]?.slice(1).toLowerCase() || 'Project';

    if (prompt.toLowerCase().includes('powell') || prompt.toLowerCase().includes('interest rate')) {
      return 'Powell Hedging Strategy';
    }

    const typeMap = {
      defi: 'DeFi Protocol',
      trading: 'Trading System',
      dao: 'DAO Platform',
      nft: 'NFT Project',
      general: 'Development Project',
    };

    const suffix = typeMap[projectType as keyof typeof typeMap] || typeMap.general;
    return `${firstWord} ${suffix}`;
  }

  private getFallbackResponse(intent: string): string {
    const responses = {
      general_chat: "That's interesting! I'm here to help with both technical discussions and building projects. What would you like to explore?",
      project_request: "I'd love to help you build that! Could you provide more details about what you have in mind?",
      implementation_ready: "Great! I'm ready to help implement your project. Let me set up a proper workspace for us.",
      technical_question: "That's a great technical question! Let me provide some insights based on current best practices.",
    };

    return responses[intent as keyof typeof responses] || responses.general_chat;
  }

  /**
   * Get workflow analytics
   */
  async getWorkflowAnalytics(userId?: string): Promise<{
    totalSessions: number;
    totalTransitions: number;
    averageMessagesBeforeTransition: number;
    transitionSuccessRate: number;
    mostCommonIntents: Array<{ intent: string; count: number }>;
    averageResponseTime: number;
  }> {
    const allWorkflows = Array.from(this.activeWorkflows.values())
      .filter(w => !userId || w.userId === userId);

    const totalSessions = allWorkflows.length;
    const totalTransitions = allWorkflows.reduce((sum, w) => sum + w.metadata.autocoderSessionCount, 0);
    const allIntents = allWorkflows.flatMap(w => w.context.intentHistory.map(h => h.intent));

    const intentCounts = allIntents.reduce((acc, intent) => {
      acc[intent] = (acc[intent] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const mostCommonIntents = Object.entries(intentCounts)
      .map(([intent, count]) => ({ intent, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    return {
      totalSessions,
      totalTransitions,
      averageMessagesBeforeTransition: totalSessions > 0
        ? allWorkflows.reduce((sum, w) => sum + w.metadata.totalMessages, 0) / totalSessions
        : 0,
      transitionSuccessRate: totalSessions > 0 ? totalTransitions / totalSessions : 0,
      mostCommonIntents,
      averageResponseTime: totalSessions > 0
        ? allWorkflows.reduce((sum, w) => sum + w.metadata.averageResponseTime, 0) / totalSessions
        : 0,
    };
  }

  /**
   * Clean up inactive workflows
   */
  cleanupInactiveWorkflows(maxAgeHours: number = 24): void {
    const cutoffTime = new Date(Date.now() - maxAgeHours * 60 * 60 * 1000);

    for (const [key, workflow] of this.activeWorkflows.entries()) {
      const lastActivity = workflow.context.conversationHistory
        .slice(-1)[0]?.timestamp || new Date(0);

      if (lastActivity < cutoffTime) {
        this.activeWorkflows.delete(key);
      }
    }
  }
}
