import { UUID, Memory, Content, HandlerCallback, IAgentRuntime, logger } from '@elizaos/core';
import { v4 } from 'uuid';

export interface ActionStep {
  id: string;
  action: string;
  stepIndex: number;
  status: 'pending' | 'executing' | 'completed' | 'failed';
  callback?: HandlerCallback;
  result?: Content;
  timestamp: number;
}

export interface ActionPlan {
  id: string;
  roomId: UUID;
  messageId: UUID;
  steps: ActionStep[];
  createdAt: number;
  completedSteps: number;
  totalSteps: number;
  isComplete: boolean;
}

export class ActionQueueService {
  private activePlans = new Map<string, ActionPlan>();
  private plansByRoom = new Map<UUID, Set<string>>();
  private runtime: IAgentRuntime;
  
  // Timeout for plans (5 minutes default)
  private readonly PLAN_TIMEOUT = 5 * 60 * 1000;
  
  constructor(runtime: IAgentRuntime) {
    this.runtime = runtime;
    
    // Clean up old plans every minute
    setInterval(() => {
      this.cleanupExpiredPlans();
    }, 60 * 1000);
  }

  /**
   * Create an initial action plan based on LLM response
   */
  createActionPlan(
    roomId: UUID,
    messageId: UUID,
    actions: string[]
  ): ActionPlan {
    const planId = v4();
    
    const steps: ActionStep[] = actions.map((action, index) => ({
      id: v4(),
      action,
      stepIndex: index,
      status: 'pending',
      timestamp: Date.now(),
    }));

    const plan: ActionPlan = {
      id: planId,
      roomId,
      messageId,
      steps,
      createdAt: Date.now(),
      completedSteps: 0,
      totalSteps: actions.length,
      isComplete: false,
    };

    this.activePlans.set(planId, plan);
    
    // Track plans by room
    if (!this.plansByRoom.has(roomId)) {
      this.plansByRoom.set(roomId, new Set());
    }
    this.plansByRoom.get(roomId)!.add(planId);

    logger.debug(`[ActionQueue] Created action plan ${planId} with ${actions.length} steps:`, actions);
    
    return plan;
  }

  /**
   * Get the current active plan for a room/message
   */
  getActivePlan(roomId: UUID, messageId?: UUID): ActionPlan | null {
    const roomPlans = this.plansByRoom.get(roomId);
    if (!roomPlans) return null;

    for (const planId of roomPlans) {
      const plan = this.activePlans.get(planId);
      if (plan && !plan.isComplete && (!messageId || plan.messageId === messageId)) {
        return plan;
      }
    }
    
    return null;
  }

  /**
   * Register a callback for a specific action step
   */
  registerStepCallback(
    planId: string,
    action: string,
    callback: HandlerCallback
  ): boolean {
    const plan = this.activePlans.get(planId);
    if (!plan) {
      logger.warn(`[ActionQueue] Plan ${planId} not found when registering callback for ${action}`);
      return false;
    }

    // Find the next pending step for this action
    const step = plan.steps.find(
      s => s.action === action && s.status === 'pending'
    );

    if (!step) {
      logger.warn(`[ActionQueue] No pending step found for action ${action} in plan ${planId}`);
      return false;
    }

    step.callback = callback;
    step.status = 'executing';
    
    logger.debug(`[ActionQueue] Registered callback for step ${step.stepIndex} (${action}) in plan ${planId}`);
    
    return true;
  }

  /**
   * Complete an action step with result
   */
  async completeStep(
    planId: string,
    action: string,
    result: Content
  ): Promise<void> {
    const plan = this.activePlans.get(planId);
    if (!plan) {
      logger.warn(`[ActionQueue] Plan ${planId} not found when completing ${action}`);
      return;
    }

    // Find the executing step for this action
    const step = plan.steps.find(
      s => s.action === action && s.status === 'executing'
    );

    if (!step) {
      logger.warn(`[ActionQueue] No executing step found for action ${action} in plan ${planId}`);
      return;
    }

    step.result = result;
    step.status = 'completed';
    plan.completedSteps++;

    logger.debug(`[ActionQueue] Completed step ${step.stepIndex} (${action}) in plan ${planId}. Progress: ${plan.completedSteps}/${plan.totalSteps}`);

    // Try to execute callbacks in order
    await this.executeReadyCallbacks(planId);
    
    // Check if plan is complete
    if (plan.completedSteps === plan.totalSteps) {
      await this.completePlan(planId);
    }
  }

  /**
   * Execute callbacks that are ready (in order)
   */
  private async executeReadyCallbacks(planId: string): Promise<void> {
    const plan = this.activePlans.get(planId);
    if (!plan) return;

    // Find the next sequential step that's ready to execute callback
    for (const step of plan.steps.sort((a, b) => a.stepIndex - b.stepIndex)) {
      if (step.status === 'completed' && step.callback && step.result) {
        try {
          logger.debug(`[ActionQueue] Executing callback for step ${step.stepIndex} (${step.action}) in plan ${planId}`);
          
          await step.callback(step.result);
          
          // Clear the callback after execution to avoid re-execution
          step.callback = undefined;
          
        } catch (error) {
          logger.error(`[ActionQueue] Error executing callback for step ${step.stepIndex}:`, error);
          step.status = 'failed';
        }
      } else if (step.status === 'pending' || step.status === 'executing') {
        // Stop at first non-completed step to maintain order
        break;
      }
    }
  }

  /**
   * Complete and cleanup a plan
   */
  private async completePlan(planId: string): Promise<void> {
    const plan = this.activePlans.get(planId);
    if (!plan) return;

    plan.isComplete = true;
    
    logger.debug(`[ActionQueue] Plan ${planId} completed successfully. All ${plan.totalSteps} steps finished.`);

    // Clean up plan references
    const roomPlans = this.plansByRoom.get(plan.roomId);
    if (roomPlans) {
      roomPlans.delete(planId);
      if (roomPlans.size === 0) {
        this.plansByRoom.delete(plan.roomId);
      }
    }

    // Remove plan after a delay to allow for any final processing
    setTimeout(() => {
      this.activePlans.delete(planId);
    }, 30000); // 30 seconds delay
  }

  /**
   * Fail a step due to error or timeout
   */
  async failStep(planId: string, action: string, error: string): Promise<void> {
    const plan = this.activePlans.get(planId);
    if (!plan) return;

    const step = plan.steps.find(
      s => s.action === action && (s.status === 'pending' || s.status === 'executing')
    );

    if (step) {
      step.status = 'failed';
      logger.error(`[ActionQueue] Step ${step.stepIndex} (${action}) failed in plan ${planId}: ${error}`);
      
      // Try to continue with remaining steps
      await this.executeReadyCallbacks(planId);
    }
  }

  /**
   * Clean up expired plans
   */
  private cleanupExpiredPlans(): void {
    const now = Date.now();
    const expiredPlans: string[] = [];

    for (const [planId, plan] of this.activePlans.entries()) {
      if (now - plan.createdAt > this.PLAN_TIMEOUT) {
        expiredPlans.push(planId);
      }
    }

    for (const planId of expiredPlans) {
      const plan = this.activePlans.get(planId);
      if (plan) {
        logger.warn(`[ActionQueue] Plan ${planId} expired after timeout. Cleaning up.`);
        
        const roomPlans = this.plansByRoom.get(plan.roomId);
        if (roomPlans) {
          roomPlans.delete(planId);
          if (roomPlans.size === 0) {
            this.plansByRoom.delete(plan.roomId);
          }
        }
        
        this.activePlans.delete(planId);
      }
    }

    if (expiredPlans.length > 0) {
      logger.debug(`[ActionQueue] Cleaned up ${expiredPlans.length} expired plans`);
    }
  }

  /**
   * Get plan status for debugging
   */
  getPlanStatus(planId: string): ActionPlan | null {
    return this.activePlans.get(planId) || null;
  }

  /**
   * Get all active plans for debugging
   */
  getActivePlans(): ActionPlan[] {
    return Array.from(this.activePlans.values());
  }

  /**
   * Check if an action should be queued based on existing plan
   */
  shouldQueueAction(roomId: UUID, action: string): { shouldQueue: boolean; planId?: string } {
    const activePlan = this.getActivePlan(roomId);
    if (!activePlan) {
      return { shouldQueue: false };
    }

    const hasActionInPlan = activePlan.steps.some(step => step.action === action);
    
    return {
      shouldQueue: hasActionInPlan,
      planId: hasActionInPlan ? activePlan.id : undefined
    };
  }
} 