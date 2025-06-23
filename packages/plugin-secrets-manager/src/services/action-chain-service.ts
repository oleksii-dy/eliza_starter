import {
  Service,
  type IAgentRuntime,
  type UUID,
  type Action,
  type Memory,
  type HandlerCallback,
  logger,
  elizaLogger,
} from '@elizaos/core';

export interface ActionChainStep {
  actionName: string;
  params?: any;
  condition?: (context: ActionChainContext) => boolean;
  onSuccess?: string[]; // Next actions on success
  onFailure?: string[]; // Next actions on failure
  retryPolicy?: {
    maxRetries: number;
    delayMs: number;
    backoffMultiplier?: number;
  };
  timeout?: number;
}

export interface ActionChainWorkflow {
  id: string;
  name: string;
  description?: string;
  steps: ActionChainStep[];
  initialParams?: any;
  metadata?: any;
}

export interface ActionChainContext {
  sessionId: string;
  userId?: string;
  worldId?: string;
  agentId: string;
  data: Map<string, any>;
  history: ActionExecution[];
  workflow?: ActionChainWorkflow;
  currentStep?: number;
}

export interface ActionExecution {
  stepIndex: number;
  actionName: string;
  params: any;
  result: any;
  success: boolean;
  error?: string;
  timestamp: number;
  duration: number;
}

export interface ActionChainResult {
  success: boolean;
  sessionId: string;
  completedSteps: number;
  totalSteps: number;
  results: ActionExecution[];
  error?: string;
  finalResult?: any;
}

/**
 * Service for managing action chains and workflows
 * Enables complex multi-step secret management operations
 */
export class ActionChainService extends Service {
  static serviceType = 'ACTION_CHAIN';
  capabilityDescription =
    'Manages and executes complex workflows with action chaining for secret management operations';

  private activeSessions: Map<string, ActionChainContext> = new Map();
  private workflows: Map<string, ActionChainWorkflow> = new Map();
  private cleanupInterval: NodeJS.Timeout | null = null;

  constructor(runtime: IAgentRuntime) {
    super(runtime);
  }

  static async start(runtime: IAgentRuntime): Promise<ActionChainService> {
    const service = new ActionChainService(runtime);
    await service.initialize();
    return service;
  }

  async initialize(): Promise<void> {
    elizaLogger.info('[ActionChainService] Starting action chain service');

    // Register built-in workflows
    this.registerBuiltInWorkflows();

    // Start cleanup interval for expired sessions
    this.cleanupInterval = setInterval(() => {
      this.cleanupExpiredSessions();
    }, 60000); // Clean up every minute

    elizaLogger.info('[ActionChainService] Action chain service started');
  }

  async stop(): Promise<void> {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }

    this.activeSessions.clear();
    this.workflows.clear();

    elizaLogger.info('[ActionChainService] Action chain service stopped');
  }

  /**
   * Register a workflow for later execution
   */
  registerWorkflow(workflow: ActionChainWorkflow): void {
    this.workflows.set(workflow.id, workflow);
    elizaLogger.info(`[ActionChainService] Registered workflow: ${workflow.id}`);
  }

  /**
   * Execute a workflow by ID
   */
  async executeWorkflow(
    workflowId: string,
    initialParams: any,
    userId?: string,
    worldId?: string
  ): Promise<ActionChainResult> {
    const workflow = this.workflows.get(workflowId);
    if (!workflow) {
      throw new Error(`Workflow ${workflowId} not found`);
    }

    return this.executeWorkflowDirect(workflow, initialParams, userId, worldId);
  }

  /**
   * Execute a workflow directly
   */
  async executeWorkflowDirect(
    workflow: ActionChainWorkflow,
    initialParams: any,
    userId?: string,
    worldId?: string
  ): Promise<ActionChainResult> {
    const sessionId = this.generateSessionId();

    const context: ActionChainContext = {
      sessionId,
      userId,
      worldId,
      agentId: this.runtime.agentId,
      data: new Map(),
      history: []
      workflow,
      currentStep: 0,
    };

    // Store initial params
    if (initialParams) {
      Object.entries(initialParams).forEach(([key, value]) => {
        context.data.set(key, value);
      });
    }

    this.activeSessions.set(sessionId, context);

    try {
      const result = await this.executeWorkflowSteps(context);
      this.activeSessions.delete(sessionId);
      return result;
    } catch (error) {
      this.activeSessions.delete(sessionId);
      throw error;
    }
  }

  /**
   * Execute workflow steps
   */
  private async executeWorkflowSteps(context: ActionChainContext): Promise<ActionChainResult> {
    const { workflow } = context;
    if (!workflow) {
      throw new Error('No workflow in context');
    }

    const result: ActionChainResult = {
      success: false,
      sessionId: context.sessionId,
      completedSteps: 0,
      totalSteps: workflow.steps.length,
      results: []
    };

    for (let i = 0; i < workflow.steps.length; i++) {
      const step = workflow.steps[i];
      context.currentStep = i;

      // Check condition if specified
      if (step.condition && !step.condition(context)) {
        elizaLogger.info(`[ActionChainService] Skipping step ${i}: condition not met`);
        continue;
      }

      try {
        const execution = await this.executeStep(step, context);
        result.results.push(execution);

        if (!execution.success) {
          // Handle failure
          if (step.onFailure && step.onFailure.length > 0) {
            elizaLogger.info(`[ActionChainService] Step failed, executing failure actions`);
            await this.executeFailureActions(step.onFailure, context);
          }

          result.success = false;
          result.error = execution.error;
          return result;
        }

        // Only count as completed if execution was successful
        result.completedSteps++;

        // Handle success
        if (step.onSuccess && step.onSuccess.length > 0) {
          await this.executeSuccessActions(step.onSuccess, context);
        }
      } catch (error) {
        const errorExecution: ActionExecution = {
          stepIndex: i,
          actionName: step.actionName,
          params: step.params,
          result: null,
          success: false,
          error: error instanceof Error ? error.message : String(error),
          timestamp: Date.now(),
          duration: 0,
        };

        result.results.push(errorExecution);
        result.success = false;
        result.error = error instanceof Error ? error.message : String(error);
        return result;
      }
    }

    result.success = true;
    if (result.results.length > 0) {
      result.finalResult = result.results[result.results.length - 1].result;
    }

    return result;
  }

  /**
   * Execute a single step
   */
  private async executeStep(
    step: ActionChainStep,
    context: ActionChainContext
  ): Promise<ActionExecution> {
    const startTime = Date.now();
    let attempts = 0;
    const maxRetries = step.retryPolicy?.maxRetries || 0;

    while (attempts <= maxRetries) {
      try {
        const result = await this.executeAction(step.actionName, step.params, context);

        const execution: ActionExecution = {
          stepIndex: context.currentStep || 0,
          actionName: step.actionName,
          params: step.params,
          result,
          success: true,
          timestamp: Date.now(),
          duration: Date.now() - startTime,
        };

        context.history.push(execution);
        return execution;
      } catch (error) {
        attempts++;

        if (attempts <= maxRetries && step.retryPolicy) {
          const delay =
            step.retryPolicy.delayMs *
            Math.pow(step.retryPolicy.backoffMultiplier || 1, attempts - 1);

          elizaLogger.warn(
            `[ActionChainService] Step ${step.actionName} failed (attempt ${attempts}), retrying in ${delay}ms`
          );

          await new Promise((resolve) => setTimeout(resolve, delay));
          continue;
        }

        const execution: ActionExecution = {
          stepIndex: context.currentStep || 0,
          actionName: step.actionName,
          params: step.params,
          result: null,
          success: false,
          error: error instanceof Error ? error.message : String(error),
          timestamp: Date.now(),
          duration: Date.now() - startTime,
        };

        context.history.push(execution);
        return execution;
      }
    }

    throw new Error('Unexpected error in step execution');
  }

  /**
   * Execute an action
   */
  private async executeAction(
    actionName: string,
    params: any,
    context: ActionChainContext
  ): Promise<any> {
    // Find the action in the runtime
    const action = this.findAction(actionName);
    if (!action) {
      throw new Error(`Action ${actionName} not found`);
    }

    // Create message from params and context
    const message: Memory = {
      id: this.generateSessionId() as UUID,
      agentId: context.agentId as UUID,
      entityId: (context.userId || context.agentId) as UUID,
      roomId: (context.worldId || context.agentId) as UUID,
      content: {
        text: JSON.stringify(params),
        source: 'action-chain',
      },
      createdAt: Date.now(),
    };

    // Execute action with promise-based callback
    return new Promise((resolve, reject) => {
      const callback: HandlerCallback = async (response) => {
        if (response.error) {
          reject(new Error(response.text || 'Action execution failed'));
        } else {
          resolve(response);
        }
        return [];
      };

      action
        .handler(this.runtime, message, { values: {}, data: {}, text: '' }, {}, callback)
        .then((success) => {
          if (!success) {
            reject(new Error('Action returned false'));
          }
        })
        .catch(reject);
    });
  }

  /**
   * Execute success actions
   */
  private async executeSuccessActions(
    actionNames: string[]
    context: ActionChainContext
  ): Promise<void> {
    for (const actionName of actionNames) {
      try {
        await this.executeAction(actionName, {}, context);
      } catch (error) {
        elizaLogger.warn(`[ActionChainService] Success action ${actionName} failed:`, error);
      }
    }
  }

  /**
   * Execute failure actions
   */
  private async executeFailureActions(
    actionNames: string[]
    context: ActionChainContext
  ): Promise<void> {
    for (const actionName of actionNames) {
      try {
        await this.executeAction(actionName, {}, context);
      } catch (error) {
        elizaLogger.warn(`[ActionChainService] Failure action ${actionName} failed:`, error);
      }
    }
  }

  /**
   * Find action by name
   */
  private findAction(actionName: string): Action | null {
    // This would need to be implemented based on how actions are registered in the runtime
    // For now, we'll assume actions are available through plugins
    if (this.runtime.plugins) {
      for (const plugin of this.runtime.plugins) {
        if (plugin.actions) {
          const action = plugin.actions.find((a) => a.name === actionName);
          if (action) return action;
        }
      }
    }
    return null;
  }

  /**
   * Register built-in workflows for secret management
   */
  private registerBuiltInWorkflows(): void {
    // User onboarding workflow
    this.registerWorkflow({
      id: 'user-secret-onboarding',
      name: 'User Secret Onboarding',
      description: 'Guide new users through setting up their secrets',
      steps: [
        {
          actionName: 'REQUEST_SECRET_FORM',
          params: {
            secrets: [
              { key: 'OPENAI_API_KEY', description: 'OpenAI API Key', required: true },
              { key: 'ANTHROPIC_API_KEY', description: 'Anthropic API Key', required: true },
            ],
            title: "Welcome! Let's set up your API keys",
            expiresIn: 30 * 60 * 1000, // 30 minutes
          },
          onSuccess: ['VALIDATE_API_KEYS'],
          onFailure: ['NOTIFY_SETUP_FAILED'],
        },
        {
          actionName: 'VALIDATE_API_KEYS',
          condition: (context) => context.data.has('secrets_provided'),
          onSuccess: ['NOTIFY_SETUP_COMPLETE'],
          onFailure: ['REQUEST_VALID_KEYS'],
        },
      ],
    });

    // Secret rotation workflow
    this.registerWorkflow({
      id: 'secret-rotation',
      name: 'Secret Rotation',
      description: 'Rotate API keys and update dependent services',
      steps: [
        {
          actionName: 'REQUEST_SECRET_FORM',
          params: {
            mode: 'inline',
            title: 'Secret Rotation Required',
          },
          onSuccess: ['BACKUP_OLD_SECRET'],
        },
        {
          actionName: 'BACKUP_OLD_SECRET',
          onSuccess: ['MANAGE_SECRET'],
        },
        {
          actionName: 'MANAGE_SECRET',
          params: { operation: 'set' },
          onSuccess: ['VALIDATE_NEW_SECRET'],
          onFailure: ['RESTORE_OLD_SECRET'],
        },
        {
          actionName: 'VALIDATE_NEW_SECRET',
          onSuccess: ['NOTIFY_ROTATION_SUCCESS'],
          onFailure: ['RESTORE_OLD_SECRET'],
        },
      ],
    });

    // Bulk secret import workflow
    this.registerWorkflow({
      id: 'bulk-secret-import',
      name: 'Bulk Secret Import',
      description: 'Import multiple secrets from a secure source',
      steps: [
        {
          actionName: 'REQUEST_SECRET_FORM',
          params: {
            secrets: [
              { key: 'IMPORT_FORMAT', description: 'Import format (JSON/ENV)', required: true },
              { key: 'IMPORT_DATA', description: 'Secrets data to import', required: true },
            ],
            title: 'Bulk Secret Import',
          },
          onSuccess: ['VALIDATE_IMPORT_FORMAT'],
        },
        {
          actionName: 'VALIDATE_IMPORT_FORMAT',
          onSuccess: ['PROCESS_BULK_IMPORT'],
          onFailure: ['NOTIFY_INVALID_FORMAT'],
        },
        {
          actionName: 'PROCESS_BULK_IMPORT',
          retryPolicy: {
            maxRetries: 3,
            delayMs: 1000,
          },
          onSuccess: ['NOTIFY_IMPORT_SUCCESS'],
          onFailure: ['NOTIFY_IMPORT_FAILED'],
        },
      ],
    });
  }

  /**
   * Generate session ID
   */
  private generateSessionId(): string {
    return 'session-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9);
  }

  /**
   * Clean up expired sessions
   */
  private cleanupExpiredSessions(): void {
    const now = Date.now();
    const maxAge = 24 * 60 * 60 * 1000; // 24 hours

    for (const [sessionId, context] of this.activeSessions) {
      const lastActivity =
        context.history.length > 0 ? context.history[context.history.length - 1].timestamp : now;

      if (now - lastActivity > maxAge) {
        this.activeSessions.delete(sessionId);
        elizaLogger.info(`[ActionChainService] Cleaned up expired session: ${sessionId}`);
      }
    }
  }

  /**
   * Get active session
   */
  getSession(sessionId: string): ActionChainContext | null {
    return this.activeSessions.get(sessionId) || null;
  }

  /**
   * Get all workflows
   */
  getWorkflows(): ActionChainWorkflow[] {
    return Array.from(this.workflows.values());
  }

  /**
   * Get workflow by ID
   */
  getWorkflow(workflowId: string): ActionChainWorkflow | null {
    return this.workflows.get(workflowId) || null;
  }
}
