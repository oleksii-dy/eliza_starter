import {
  type Provider,
  type IAgentRuntime,
  type Memory,
  type State,
  elizaLogger,
} from '@elizaos/core';
import type { AutocodingPlan } from '../services/E2BAgentOrchestrator.ts';

/**
 * Autocoder Plan Provider
 * Provides current autocoding plan and progress information
 */
export class AutocoderPlanProvider implements Provider {
  static _providerName = 'autocoder-plan';

  name = 'autocoder-plan';

  get description(): string {
    return 'Provides current autocoding plan and progress';
  }

  async get(runtime: IAgentRuntime, message: Memory, state: State): Promise<{ text: string }> {
    try {
      const taskId =
        state?.taskId || runtime.getSetting('CURRENT_TASK_ID') || runtime.getSetting('TASK_ID');

      if (!taskId) {
        return { text: 'No active autocoding task.' };
      }

      // Get E2B Agent Orchestrator service
      const orchestrator = runtime.getService('e2b-agent-orchestrator') as any;
      if (!orchestrator) {
        return { text: 'Autocoding orchestrator not available.' };
      }

      // Get room state which contains the plan
      const roomState = await orchestrator.getRoomState(taskId);
      if (!roomState || !roomState.plan) {
        return { text: `No plan found for task ${taskId}.` };
      }

      // Format the plan
      return { text: this.formatPlan(roomState.plan, taskId) };
    } catch (error) {
      elizaLogger.error('Error fetching autocoding plan:', error);
      return { text: 'Error fetching autocoding plan.' };
    }
  }

  private formatPlan(plan: AutocodingPlan, taskId: string): string {
    const progressPercentage =
      plan.totalSteps > 0 ? Math.round((plan.completedSteps / plan.totalSteps) * 100) : 0;

    const progressBar = this.generateProgressBar(progressPercentage);

    return `Current Autocoding Plan:
    
Project: ${plan.projectName}
Task ID: ${taskId}
Status: ${plan.status}
Progress: ${progressBar} ${plan.completedSteps}/${plan.totalSteps} (${progressPercentage}%)

Current Phase: ${plan.currentPhase}

Active Agents (${plan.activeAgents.length}):
${plan.activeAgents.map((a) => `  - ${a.role} (${a.agentId}): ${a.currentTask} [${a.progress}%]`).join('\n') || '  No active agents'}

Recent Updates:
${
  plan.recentUpdates
    .slice(-5)
    .map(
      (u) =>
        `  - ${u.timestamp.toISOString().substring(11, 19)}: ${u.message}${u.agentId ? ` (${u.agentId})` : ''}`
    )
    .join('\n') || '  No recent updates'
}

Next Steps:
${plan.nextSteps.map((s, i) => `  ${i + 1}. ${s}`).join('\n') || '  No next steps defined'}

Timeline:
- Started: ${plan.activeAgents.length > 0 ? 'Active' : 'Not started'}
- Estimated completion: ${this.estimateCompletion(plan)}`;
  }

  private generateProgressBar(percentage: number): string {
    const filled = Math.round(percentage / 10);
    const empty = 10 - filled;
    return `[${'█'.repeat(filled)}${'░'.repeat(empty)}]`;
  }

  private estimateCompletion(plan: AutocodingPlan): string {
    if (plan.status === 'completed') {
      return 'Completed';
    }

    if (plan.status === 'failed') {
      return 'Failed';
    }

    if (plan.completedSteps === 0) {
      return 'Not started';
    }

    if (plan.totalSteps === 0) {
      return 'Unknown';
    }

    const remainingSteps = plan.totalSteps - plan.completedSteps;
    const avgTimePerStep = 5; // minutes, rough estimate
    const remainingMinutes = remainingSteps * avgTimePerStep;

    if (remainingMinutes < 60) {
      return `~${remainingMinutes} minutes`;
    } else {
      const hours = Math.round(remainingMinutes / 60);
      return `~${hours} hour${hours > 1 ? 's' : ''}`;
    }
  }

  async validate(runtime: IAgentRuntime): Promise<boolean> {
    // Check if we have access to task information
    const taskId = runtime.getSetting('CURRENT_TASK_ID') || runtime.getSetting('TASK_ID');
    return !!taskId;
  }
}
