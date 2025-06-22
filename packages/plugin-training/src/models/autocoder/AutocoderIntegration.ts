import { elizaLogger, type IAgentRuntime, type Memory, type Action, type HandlerCallback } from '@elizaos/core';
import { TrajectoryRecorder, type CodeTrajectory, type CodeTrajectoryStep } from './TrajectoryRecorder';
import { v4 as uuidv4 } from 'uuid';

/**
 * AutocoderIntegration - Integrates trajectory recording with autocoder and MCP plugin creation
 * 
 * This integration automatically captures trajectories during code generation sessions,
 * including MCP plugin creation, self-generated code plugins, and debugging workflows.
 * It hooks into the autocoder process to record every step and decision.
 */

export interface AutocoderSession {
  session_id: string;
  start_time: number;
  user_request: string;
  project_type: 'mcp_plugin' | 'eliza_plugin' | 'code_generation' | 'debugging' | 'refactoring';
  tools_available: string[];
  current_trajectory?: string;
  status: 'active' | 'completed' | 'failed' | 'cancelled';
}

export class AutocoderIntegration {
  private trajectoryRecorder: TrajectoryRecorder;
  private activeSessions: Map<string, AutocoderSession> = new Map();
  private runtime?: IAgentRuntime;

  constructor(runtime?: IAgentRuntime) {
    this.runtime = runtime;
    this.trajectoryRecorder = new TrajectoryRecorder(runtime);
  }

  /**
   * Initialize autocoder integration with existing autocoder system
   */
  async initialize(): Promise<void> {
    if (!this.runtime) {
      elizaLogger.warn('No runtime available for autocoder integration');
      return;
    }

    elizaLogger.info('🤖 Initializing autocoder trajectory recording integration...');

    // Register autocoder actions that will trigger trajectory recording
    await this.registerAutocoderActions();

    // Hook into existing autocoder events if available
    await this.hookIntoAutocoderEvents();

    elizaLogger.info('✅ Autocoder integration initialized');
  }

  /**
   * Register actions that trigger trajectory recording
   */
  private async registerAutocoderActions(): Promise<void> {
    if (!this.runtime) return;

    // Action to start a new coding session with trajectory recording
    const startCodingSessionAction: Action = {
      name: 'START_CODING_SESSION',
      similes: ['BEGIN_CODING', 'START_DEVELOPMENT', 'CREATE_CODE'],
      description: 'Start a new coding session with trajectory recording',
      
      validate: async (runtime, message) => {
        // Validate that this is a coding request
        const text = message.content.text?.toLowerCase() || '';
        return text.includes('code') || text.includes('plugin') || text.includes('implement') || text.includes('create');
      },

      handler: async (runtime, message, state, options, callback) => {
        try {
          const userRequest = message.content.text || '';
          const projectType = this.detectProjectType(userRequest);
          
          const sessionId = await this.startCodingSession(userRequest, projectType, {
            user_id: message.entityId,
            room_id: message.roomId,
            available_tools: this.getAvailableTools(runtime),
            context: state,
          });

          await callback?.({
            text: `🚀 Started coding session: ${sessionId}\nProject type: ${projectType}\nI'll record every step of the development process for training.`,
            thought: `Starting trajectory recording for coding session. This will help train future autocoder models.`,
            actions: ['START_CODING_SESSION'],
          });

          return {
            text: `Coding session started: ${sessionId}`,
            data: {
              session_id: sessionId,
              project_type: projectType,
              recording_active: true,
            },
          };

        } catch (error) {
          elizaLogger.error('Failed to start coding session:', error);
          await callback?.({
            text: 'Failed to start coding session. Please try again.',
            thought: `Error starting coding session: ${error}`,
          });
          return null;
        }
      },

      examples: [
        [
          { name: 'User', content: { text: 'Can you help me create an MCP plugin for weather data?' } },
          { 
            name: 'Agent', 
            content: { 
              text: '🚀 Started coding session: session-123\nProject type: mcp_plugin\nI\'ll record every step of the development process for training.',
              thought: 'Starting trajectory recording for MCP plugin creation.',
              actions: ['START_CODING_SESSION'],
            } 
          },
        ],
      ],
    };

    // Action to record individual coding steps
    const recordCodingStepAction: Action = {
      name: 'RECORD_CODING_STEP',
      similes: ['LOG_STEP', 'TRACK_PROGRESS'],
      description: 'Record a step in the coding process',
      
      validate: async (runtime, message) => {
        // Check if there's an active coding session
        const sessionId = this.findActiveSession(message.entityId);
        return !!sessionId;
      },

      handler: async (runtime, message, state, options, callback) => {
        try {
          const sessionId = this.findActiveSession(message.entityId);
          if (!sessionId) {
            throw new Error('No active coding session found');
          }

          const session = this.activeSessions.get(sessionId);
          if (!session?.current_trajectory) {
            throw new Error('No active trajectory for session');
          }

          // Extract step information from message/state
          const stepInfo = this.extractStepInfo(message, state, options);
          
          await this.trajectoryRecorder.recordStep(
            session.current_trajectory,
            stepInfo.step_type,
            stepInfo.input,
            stepInfo.reasoning,
            stepInfo.action,
            stepInfo.output,
            stepInfo.metadata
          );

          await callback?.({
            text: `📝 Recorded ${stepInfo.step_type} step in trajectory`,
            thought: `Captured step: ${stepInfo.action.description}`,
          });

          return {
            text: `Recorded ${stepInfo.step_type} step`,
            data: {
              step_recorded: true,
              step_type: stepInfo.step_type,
            },
          };

        } catch (error) {
          elizaLogger.error('Failed to record coding step:', error);
          return null;
        }
      },

      examples: [
        [
          { name: 'User', content: { text: 'I\'ve analyzed the requirements and planned the plugin structure' } },
          { 
            name: 'Agent', 
            content: { 
              text: '📝 Recorded planning step in trajectory',
              thought: 'Captured step: Plugin structure planning completed',
            } 
          },
        ],
      ],
    };

    // Action to complete a coding session
    const completeCodingSessionAction: Action = {
      name: 'COMPLETE_CODING_SESSION',
      similes: ['FINISH_CODING', 'END_SESSION'],
      description: 'Complete a coding session and finalize trajectory',
      
      validate: async (runtime, message) => {
        const sessionId = this.findActiveSession(message.entityId);
        return !!sessionId;
      },

      handler: async (runtime, message, state, options, callback) => {
        try {
          const sessionId = this.findActiveSession(message.entityId);
          if (!sessionId) {
            throw new Error('No active coding session found');
          }

          const finalResult = this.extractFinalResult(message, state, options);
          const trajectory = await this.completeCodingSession(sessionId, finalResult);

          await callback?.({
            text: `✅ Coding session completed!\n📊 Trajectory: ${trajectory.trajectory.length} steps recorded\n🎯 Success: ${finalResult.success ? 'Yes' : 'No'}\n📚 Training data generated for future autocoder improvements`,
            thought: `Completed trajectory recording. Generated training data for autocoder model.`,
            actions: ['COMPLETE_CODING_SESSION'],
          });

          return {
            text: `Coding session completed successfully`,
            data: {
              session_completed: true,
              trajectory_id: trajectory.trajectory_id,
              steps_recorded: trajectory.trajectory.length,
              success: finalResult.success,
            },
          };

        } catch (error) {
          elizaLogger.error('Failed to complete coding session:', error);
          await callback?.({
            text: 'Failed to complete coding session properly.',
            thought: `Error completing session: ${error}`,
          });
          return null;
        }
      },

      examples: [
        [
          { name: 'User', content: { text: 'The plugin is working perfectly! All tests pass.' } },
          { 
            name: 'Agent', 
            content: { 
              text: '✅ Coding session completed!\n📊 Trajectory: 8 steps recorded\n🎯 Success: Yes\n📚 Training data generated for future autocoder improvements',
              thought: 'Completed trajectory recording successfully.',
              actions: ['COMPLETE_CODING_SESSION'],
            } 
          },
        ],
      ],
    };

    // Register actions with runtime
    this.runtime.actions.push(startCodingSessionAction);
    this.runtime.actions.push(recordCodingStepAction);
    this.runtime.actions.push(completeCodingSessionAction);

    elizaLogger.info('📋 Registered autocoder trajectory recording actions');
  }

  /**
   * Hook into existing autocoder events
   */
  private async hookIntoAutocoderEvents(): Promise<void> {
    if (!this.runtime) return;

    // Listen for autocoder-related events
    const autocoderEvents = [
      'AUTOCODER_START',
      'AUTOCODER_STEP',
      'AUTOCODER_COMPLETE',
      'AUTOCODER_ERROR',
      'MCP_PLUGIN_CREATED',
      'CODE_GENERATED',
    ];

    for (const eventType of autocoderEvents) {
      this.runtime.events.set(eventType, [
        async (payload: any) => {
          await this.handleAutocoderEvent(eventType, payload);
        },
      ]);
    }

    elizaLogger.info('🔗 Hooked into autocoder events');
  }

  /**
   * Handle autocoder events and record trajectory steps
   */
  private async handleAutocoderEvent(eventType: string, payload: any): Promise<void> {
    try {
      switch (eventType) {
        case 'AUTOCODER_START':
          await this.handleAutocoderStart(payload);
          break;
        case 'AUTOCODER_STEP':
          await this.handleAutocoderStep(payload);
          break;
        case 'AUTOCODER_COMPLETE':
          await this.handleAutocoderComplete(payload);
          break;
        case 'AUTOCODER_ERROR':
          await this.handleAutocoderError(payload);
          break;
        case 'MCP_PLUGIN_CREATED':
          await this.handleMCPPluginCreated(payload);
          break;
        case 'CODE_GENERATED':
          await this.handleCodeGenerated(payload);
          break;
      }
    } catch (error) {
      elizaLogger.error(`Failed to handle autocoder event ${eventType}:`, error);
    }
  }

  /**
   * Start a new coding session with trajectory recording
   */
  async startCodingSession(
    userRequest: string,
    projectType: AutocoderSession['project_type'],
    context: any
  ): Promise<string> {
    const sessionId = uuidv4();
    
    const session: AutocoderSession = {
      session_id: sessionId,
      start_time: Date.now(),
      user_request: userRequest,
      project_type: projectType,
      tools_available: context.available_tools || [],
      status: 'active',
    };

    // Start trajectory recording
    const trajectoryId = await this.trajectoryRecorder.startTrajectory(
      sessionId,
      userRequest,
      projectType,
      {
        starting_state: context.context || {},
        requirements: this.extractRequirements(userRequest),
        constraints: this.extractConstraints(context),
        success_criteria: this.extractSuccessCriteria(userRequest, projectType),
        available_tools: context.available_tools || [],
        knowledge_base: this.getKnowledgeBase(),
      }
    );

    session.current_trajectory = trajectoryId;
    this.activeSessions.set(sessionId, session);

    elizaLogger.info(`🚀 Started coding session ${sessionId} with trajectory ${trajectoryId}`);
    return sessionId;
  }

  /**
   * Complete a coding session and finalize trajectory
   */
  async completeCodingSession(
    sessionId: string,
    finalResult: any
  ): Promise<CodeTrajectory> {
    const session = this.activeSessions.get(sessionId);
    if (!session) {
      throw new Error(`Session ${sessionId} not found`);
    }

    if (!session.current_trajectory) {
      throw new Error(`No trajectory for session ${sessionId}`);
    }

    // Complete trajectory recording
    const trajectory = await this.trajectoryRecorder.completeTrajectory(
      session.current_trajectory,
      finalResult
    );

    // Update session status
    session.status = finalResult.success ? 'completed' : 'failed';
    this.activeSessions.delete(sessionId);

    elizaLogger.info(`✅ Completed coding session ${sessionId}`);
    return trajectory;
  }

  /**
   * Detect project type from user request
   */
  private detectProjectType(userRequest: string): AutocoderSession['project_type'] {
    const text = userRequest.toLowerCase();
    
    if (text.includes('mcp') || text.includes('model context protocol')) {
      return 'mcp_plugin';
    }
    if (text.includes('eliza') || text.includes('plugin')) {
      return 'eliza_plugin';
    }
    if (text.includes('debug') || text.includes('fix') || text.includes('error')) {
      return 'debugging';
    }
    if (text.includes('refactor') || text.includes('improve') || text.includes('optimize')) {
      return 'refactoring';
    }
    
    return 'code_generation';
  }

  /**
   * Find active session for a user
   */
  private findActiveSession(entityId: string): string | null {
    for (const [sessionId, session] of this.activeSessions) {
      if (session.status === 'active') {
        // In a real implementation, we'd track which user started each session
        // For now, return the first active session
        return sessionId;
      }
    }
    return null;
  }

  /**
   * Extract step information from message and context
   */
  private extractStepInfo(message: Memory, state: any, options: any): {
    step_type: CodeTrajectoryStep['step_type'];
    input: CodeTrajectoryStep['input'];
    reasoning: CodeTrajectoryStep['reasoning'];
    action: CodeTrajectoryStep['action'];
    output: CodeTrajectoryStep['output'];
    metadata: CodeTrajectoryStep['metadata'];
  } {
    const text = message.content.text || '';
    
    // Determine step type based on content
    const step_type = this.determineStepType(text, options);
    
    return {
      step_type,
      input: {
        context: state || {},
        previous_code: options?.previous_code,
        feedback: options?.feedback,
      },
      reasoning: {
        thinking: options?.thinking || 'Processing step...',
        approach: this.extractApproach(text),
        alternatives_considered: options?.alternatives || [],
        decisions_made: options?.decisions || [],
        risks_identified: options?.risks || [],
      },
      action: {
        action_type: step_type,
        description: this.extractDescription(text),
        code_generated: options?.code_generated,
        files_created: options?.files_created || [],
        tests_written: options?.tests_written,
        documentation_added: options?.documentation_added,
      },
      output: {
        result: options?.result || { status: 'completed' },
        code_diff: options?.code_diff,
        test_results: options?.test_results,
        success: options?.success ?? true,
        error_messages: options?.error_messages || [],
      },
      metadata: {
        complexity_level: this.estimateComplexity(text, options),
        confidence: options?.confidence || 0.8,
        requires_human_review: options?.requires_review || false,
        tools_used: this.extractToolsUsed(text, options),
        knowledge_domains: this.extractKnowledgeDomains(text),
      },
    };
  }

  /**
   * Extract final result from session completion
   */
  private extractFinalResult(message: Memory, state: any, options: any): CodeTrajectory['final_result'] {
    const text = message.content.text || '';
    const success = this.determineSuccess(text, options);
    
    return {
      success,
      final_code: options?.final_code || '',
      files_created: options?.files_created || [],
      tests_passing: options?.tests_passing || false,
      documentation_complete: options?.documentation_complete || false,
      user_satisfaction: this.estimateUserSatisfaction(text, success),
    };
  }

  // Event handlers for autocoder events
  private async handleAutocoderStart(payload: any): Promise<void> {
    if (payload.session_id && !this.activeSessions.has(payload.session_id)) {
      await this.startCodingSession(
        payload.user_request || 'Autocoder session',
        payload.project_type || 'code_generation',
        payload.context || {}
      );
    }
  }

  private async handleAutocoderStep(payload: any): Promise<void> {
    const sessionId = payload.session_id;
    const session = this.activeSessions.get(sessionId);
    
    if (session?.current_trajectory) {
      const stepInfo = this.convertPayloadToStepInfo(payload);
      await this.trajectoryRecorder.recordStep(
        session.current_trajectory,
        stepInfo.step_type,
        stepInfo.input,
        stepInfo.reasoning,
        stepInfo.action,
        stepInfo.output,
        stepInfo.metadata
      );
    }
  }

  private async handleAutocoderComplete(payload: any): Promise<void> {
    const sessionId = payload.session_id;
    if (sessionId && this.activeSessions.has(sessionId)) {
      const finalResult = this.convertPayloadToFinalResult(payload);
      await this.completeCodingSession(sessionId, finalResult);
    }
  }

  private async handleAutocoderError(payload: any): Promise<void> {
    // Record error step in trajectory
    const sessionId = payload.session_id;
    const session = this.activeSessions.get(sessionId);
    
    if (session?.current_trajectory) {
      await this.trajectoryRecorder.recordStep(
        session.current_trajectory,
        'implementation',
        { context: payload.context },
        { 
          thinking: 'Error occurred during implementation',
          approach: 'error_handling',
          alternatives_considered: [],
          decisions_made: ['handle_error'],
          risks_identified: [payload.error_type],
        },
        {
          action_type: 'error_handling',
          description: `Error: ${payload.error_message}`,
        },
        {
          result: { error: payload.error_message },
          success: false,
          error_messages: [payload.error_message],
        },
        {
          complexity_level: 5,
          confidence: 0.1,
          requires_human_review: true,
          tools_used: payload.tools_used || [],
          knowledge_domains: ['error_handling'],
        }
      );
    }
  }

  private async handleMCPPluginCreated(payload: any): Promise<void> {
    // Record successful MCP plugin creation
    elizaLogger.info(`📦 MCP Plugin created: ${payload.plugin_name}`);
  }

  private async handleCodeGenerated(payload: any): Promise<void> {
    // Record code generation step
    elizaLogger.info(`💻 Code generated: ${payload.code_lines} lines`);
  }

  // Helper methods
  private getAvailableTools(runtime: IAgentRuntime): string[] {
    return [
      'file_system',
      'code_editor',
      'test_runner',
      'documentation_generator',
      'mcp_sdk',
      'eliza_core',
      'typescript_compiler',
      'npm_package_manager',
    ];
  }

  private extractRequirements(userRequest: string): string[] {
    // Simple keyword extraction - in practice, this would use NLP
    const requirements: string[] = [];
    
    if (userRequest.includes('plugin')) requirements.push('Create plugin structure');
    if (userRequest.includes('test')) requirements.push('Include comprehensive tests');
    if (userRequest.includes('document')) requirements.push('Provide documentation');
    if (userRequest.includes('mcp')) requirements.push('Implement MCP protocol');
    
    return requirements.length > 0 ? requirements : ['Implement requested functionality'];
  }

  private extractConstraints(context: any): string[] {
    return [
      'Follow TypeScript best practices',
      'Ensure compatibility with ElizaOS',
      'Include proper error handling',
      'Maintain code quality standards',
    ];
  }

  private extractSuccessCriteria(userRequest: string, projectType: string): string[] {
    const criteria = ['Code compiles without errors', 'Basic functionality works'];
    
    if (projectType === 'mcp_plugin') {
      criteria.push('MCP protocol compliance', 'Plugin loads correctly');
    }
    if (userRequest.includes('test')) {
      criteria.push('All tests pass');
    }
    
    return criteria;
  }

  private getKnowledgeBase(): string[] {
    return [
      'typescript',
      'eliza_core',
      'mcp_protocol',
      'plugin_development',
      'testing_practices',
      'documentation_standards',
    ];
  }

  private determineStepType(text: string, options: any): CodeTrajectoryStep['step_type'] {
    if (text.includes('analyz') || text.includes('understand')) return 'analysis';
    if (text.includes('plan') || text.includes('design')) return 'planning';
    if (text.includes('implement') || text.includes('code') || text.includes('create')) return 'implementation';
    if (text.includes('test') || text.includes('verify')) return 'testing';
    if (text.includes('refine') || text.includes('improve')) return 'refinement';
    if (text.includes('document') || text.includes('readme')) return 'documentation';
    
    return 'implementation'; // Default
  }

  private extractApproach(text: string): string {
    // Extract approach from text - simplified implementation
    if (text.includes('step by step')) return 'incremental_development';
    if (text.includes('test')) return 'test_driven_development';
    if (text.includes('prototype')) return 'prototyping';
    
    return 'standard_development';
  }

  private extractDescription(text: string): string {
    // Extract a concise description of what was done
    return text.slice(0, 100) + (text.length > 100 ? '...' : '');
  }

  private estimateComplexity(text: string, options: any): number {
    let complexity = 3; // Base complexity
    
    if (text.length > 200) complexity += 1;
    if (text.includes('complex') || text.includes('advanced')) complexity += 2;
    if (options?.code_generated && options.code_generated.length > 500) complexity += 2;
    if (options?.files_created && options.files_created.length > 3) complexity += 1;
    
    return Math.min(complexity, 10);
  }

  private extractToolsUsed(text: string, options: any): string[] {
    const tools: string[] = [];
    
    if (text.includes('code') || options?.code_generated) tools.push('code_editor');
    if (text.includes('test') || options?.test_results) tools.push('test_runner');
    if (text.includes('file') || options?.files_created) tools.push('file_system');
    if (text.includes('npm') || text.includes('package')) tools.push('npm_package_manager');
    
    return tools.length > 0 ? tools : ['code_editor'];
  }

  private extractKnowledgeDomains(text: string): string[] {
    const domains: string[] = [];
    
    if (text.includes('typescript') || text.includes('ts')) domains.push('typescript');
    if (text.includes('mcp')) domains.push('mcp_protocol');
    if (text.includes('plugin')) domains.push('plugin_development');
    if (text.includes('test')) domains.push('testing');
    if (text.includes('eliza')) domains.push('eliza_core');
    
    return domains.length > 0 ? domains : ['general_programming'];
  }

  private determineSuccess(text: string, options: any): boolean {
    const successIndicators = ['success', 'working', 'complete', 'done', 'finished'];
    const failureIndicators = ['error', 'failed', 'broken', 'issue', 'problem'];
    
    const hasSuccess = successIndicators.some(word => text.toLowerCase().includes(word));
    const hasFailure = failureIndicators.some(word => text.toLowerCase().includes(word));
    
    if (options?.success !== undefined) return options.success;
    if (hasSuccess && !hasFailure) return true;
    if (hasFailure && !hasSuccess) return false;
    
    return true; // Default to success if unclear
  }

  private estimateUserSatisfaction(text: string, success: boolean): number {
    let satisfaction = success ? 0.8 : 0.4;
    
    const positiveWords = ['great', 'excellent', 'perfect', 'amazing', 'love'];
    const negativeWords = ['bad', 'terrible', 'awful', 'hate', 'disappointed'];
    
    for (const word of positiveWords) {
      if (text.toLowerCase().includes(word)) satisfaction += 0.1;
    }
    
    for (const word of negativeWords) {
      if (text.toLowerCase().includes(word)) satisfaction -= 0.2;
    }
    
    return Math.max(0, Math.min(1, satisfaction));
  }

  private convertPayloadToStepInfo(payload: any): any {
    // Convert autocoder event payload to trajectory step format
    return {
      step_type: payload.step_type || 'implementation',
      input: payload.input || {},
      reasoning: payload.reasoning || { thinking: 'Processing...', approach: 'standard' },
      action: payload.action || { action_type: 'process', description: 'Processing step' },
      output: payload.output || { result: {}, success: true },
      metadata: payload.metadata || { complexity_level: 3, confidence: 0.8, tools_used: [], knowledge_domains: [] },
    };
  }

  private convertPayloadToFinalResult(payload: any): CodeTrajectory['final_result'] {
    return {
      success: payload.success ?? true,
      final_code: payload.final_code || '',
      files_created: payload.files_created || [],
      tests_passing: payload.tests_passing ?? false,
      documentation_complete: payload.documentation_complete ?? false,
      user_satisfaction: payload.user_satisfaction || 0.8,
    };
  }

  /**
   * Get all registered actions for testing
   */
  getActions(): Action[] {
    const actions: Action[] = [];

    // Start coding session action
    const startCodingSessionAction: Action = {
      name: 'START_CODING_SESSION',
      similes: ['BEGIN_CODING', 'START_DEVELOPMENT', 'CREATE_CODE'],
      description: 'Start a new coding session with trajectory recording',
      
      validate: async (runtime, message) => {
        const text = message.content.text?.toLowerCase() || '';
        return text.includes('code') || text.includes('plugin') || text.includes('implement') || text.includes('create');
      },

      handler: async (runtime, message, state, options, callback) => {
        try {
          const userRequest = message.content.text || '';
          const projectType = this.detectProjectType(userRequest);
          
          const sessionId = await this.startCodingSession(userRequest, projectType, {
            user_id: message.entityId,
            room_id: message.roomId,
            available_tools: this.getAvailableTools(runtime),
            context: state,
          });

          await callback?.({
            text: `🚀 Started coding session: ${sessionId}\nProject type: ${projectType}\nI'll record every step of the development process for training.`,
            thought: `Starting trajectory recording for coding session. This will help train future autocoder models.`,
            actions: ['START_CODING_SESSION'],
          });

          return {
            text: `Coding session started: ${sessionId}`,
            data: {
              session_id: sessionId,
              project_type: projectType,
              recording_active: true,
            },
          };

        } catch (error) {
          elizaLogger.error('Failed to start coding session:', error);
          await callback?.({
            text: 'Failed to start coding session. Please try again.',
            thought: `Error starting coding session: ${error}`,
          });
          return null;
        }
      },

      examples: [
        [
          { name: 'User', content: { text: 'Can you help me create an MCP plugin for weather data?' } },
          { 
            name: 'Agent', 
            content: { 
              text: '🚀 Started coding session: session-123\nProject type: mcp_plugin\nI\'ll record every step of the development process for training.',
              thought: 'Starting trajectory recording for MCP plugin creation.',
              actions: ['START_CODING_SESSION'],
            } 
          },
        ],
      ],
    };

    actions.push(startCodingSessionAction);
    return actions;
  }

  /**
   * Export autocoder integration status
   */
  getIntegrationStatus(): {
    active_sessions: number;
    total_sessions_started: number;
    recording_enabled: boolean;
  } {
    return {
      active_sessions: this.activeSessions.size,
      total_sessions_started: this.activeSessions.size,
      recording_enabled: true,
    };
  }
}