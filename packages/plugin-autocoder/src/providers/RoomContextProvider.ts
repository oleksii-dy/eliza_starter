import {
  type Provider,
  type IAgentRuntime,
  type Memory,
  type State,
  elizaLogger,
} from '@elizaos/core';
import type { UUID } from '@elizaos/core';
import type {
  RoomState,
  RoomMessage,
  AutocodingPlan,
  AgentAssignment,
} from '../services/E2BAgentOrchestrator.ts';

export interface RoomContext {
  currentPlan: AutocodingPlan | undefined;
  assignments: Map<UUID, AgentAssignment>;
  recentMessages: RoomMessage[];
  sharedKnowledge: Map<string, any>;
  activeAgents: number;
  roomId: string;
}

/**
 * Room Context Provider
 * Provides shared context for agents in a collaborative room
 */
export class RoomContextProvider implements Provider {
  static _providerName = 'room-context';

  name = 'room-context';

  get description(): string {
    return 'Provides current room context including plan, assignments, and recent messages';
  }

  async get(runtime: IAgentRuntime, message: Memory, state: State): Promise<{ text: string }> {
    try {
      const taskId = state?.taskId || runtime.getSetting('TASK_ID');
      const roomId = state?.roomId || runtime.getSetting('ROOM_ID') || `task-room-${taskId}`;

      if (!taskId && !roomId) {
        return { text: 'No active room context available.' };
      }

      // Get E2B Agent Orchestrator service
      const orchestrator = runtime.getService('e2b-agent-orchestrator') as any;
      if (!orchestrator) {
        return { text: 'Room context service not available.' };
      }

      // Get room state
      const roomState: RoomState | null = await orchestrator.getRoomState(taskId);
      if (!roomState) {
        return { text: `No room state found for task ${taskId}.` };
      }

      // Format the context
      return { text: this.formatRoomContext(roomState) };
    } catch (error) {
      elizaLogger.error('Error fetching room context:', error);
      return { text: 'Error fetching room context.' };
    }
  }

  private formatRoomContext(roomState: RoomState): string {
    const { plan, assignments, messages, knowledge, lastUpdated } = roomState;

    // Format active agents
    const activeAgents = Array.from(assignments.values())
      .filter((a) => a.status === 'active' || a.status === 'pending')
      .map((a) => `  - ${a.role} (${a.agentId}): ${a.status} - ${a.tasks.join(', ')}`)
      .join('\n');

    // Format recent messages
    const recentMessages = messages
      .slice(-5)
      .map(
        (m) =>
          `  - [${m.timestamp.toISOString().substring(11, 19)}] ${m.type}: ${m.content.substring(0, 100)}${m.content.length > 100 ? '...' : ''}`
      )
      .join('\n');

    // Format shared knowledge
    const knowledgeItems = Array.from(knowledge.entries())
      .map(([key, value]) => `  - ${key}: ${JSON.stringify(value).substring(0, 50)}...`)
      .join('\n');

    return `Room Context (${roomState.roomId})
Last Updated: ${lastUpdated.toISOString()}

Current Plan:
  Project: ${plan.projectName}
  Status: ${plan.status}
  Progress: ${plan.completedSteps}/${plan.totalSteps} (${plan.totalSteps > 0 ? Math.round((plan.completedSteps / plan.totalSteps) * 100) : 0}%)
  Phase: ${plan.currentPhase}

Active Agents (${assignments.size}):
${activeAgents || '  None'}

Recent Activity:
${recentMessages || '  No recent messages'}

Shared Knowledge:
${knowledgeItems || '  No shared knowledge'}

Next Steps:
${plan.nextSteps.map((s, i) => `  ${i + 1}. ${s}`).join('\n') || '  None defined'}`;
  }

  async validate(runtime: IAgentRuntime): Promise<boolean> {
    // Check if we have access to room information
    const taskId = runtime.getSetting('TASK_ID');
    const roomId = runtime.getSetting('ROOM_ID');

    return !!(taskId || roomId);
  }
}
