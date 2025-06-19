import { type IAgentRuntime } from '@elizaos/core';
import type { ScenarioContext } from '../../scenario-runner/types.js';

/**
 * Tracks action executions during scenario runs
 */
export class ScenarioActionTracker {
  private actionExecutions: Map<string, number> = new Map();
  private originalExecute: any;

  constructor(private metricsCollector: any) {}

  /**
   * Start tracking actions for a runtime
   */
  async startTracking(runtime: IAgentRuntime, _context: ScenarioContext): Promise<void> {
    // Track through the runtime's action service if available
    if ((runtime as any).actions) {
      this.originalExecute = (runtime as any).actions.execute;
      (runtime as any).actions.execute = async (...args: any[]) => {
        const actionName = args[0]?.name || args[0] || 'unknown';
        this.recordActionExecution(actionName);
        return this.originalExecute.apply((runtime as any).actions, args);
      };
    }
  }

  /**
   * Stop tracking actions
   */
  async stopTracking(): Promise<void> {
    // Restore original execute method
    if (this.originalExecute && (global as any).runtime?.actions) {
      (global as any).runtime.actions.execute = this.originalExecute;
    }
    this.actionExecutions.clear();
  }

  /**
   * Record an action execution
   */
  private recordActionExecution(actionName: string): void {
    const count = this.actionExecutions.get(actionName) || 0;
    this.actionExecutions.set(actionName, count + 1);
    this.metricsCollector.recordAction(actionName);
  }

  /**
   * Get action execution counts
   */
  getActionCounts(): Record<string, number> {
    const counts: Record<string, number> = {};
    for (const [action, count] of this.actionExecutions.entries()) {
      counts[action] = count;
    }
    return counts;
  }

  /**
   * Get total action count
   */
  getTotalActionCount(): number {
    let total = 0;
    for (const count of this.actionExecutions.values()) {
      total += count;
    }
    return total;
  }
}
