// IMPLEMENTED: Using real runtime factory for proper isolation
import { RealRuntimeFactory, type RealRuntimeConfig } from '../utils/real-runtime-factory.js';

import {
  type IAgentRuntime,
  type UUID,
  type Memory,
  type Character,
  logger,
  asUUID,
} from '@elizaos/core';
import { v4 as uuidv4 } from 'uuid';
import type { ScenarioActor } from './types.js';

export interface AgentInstance {
  actor: ScenarioActor;
  runtime: IAgentRuntime;
  messageQueue: Memory[];
  actionHistory: Array<{
    timestamp: number;
    action: string;
    params: any;
    result: any;
  }>;
}

export class AgentManager {
  private agents = new Map<UUID, AgentInstance>();
  private messageRouter: MessageRouter;
  private agentMessageStore = new Map<UUID, Memory[]>();

  constructor(private primaryRuntime: IAgentRuntime) {
    this.messageRouter = new MessageRouter();
  }

  // private _getAgentMessages(agentId: UUID): Memory[] {
  //   if (!this.agentMessageStore.has(agentId)) {
  //     this.agentMessageStore.set(agentId, []);
  //   }
  //   return this.agentMessageStore.get(agentId)!;
  // }

  async createAgentForActor(
    actor: ScenarioActor,
    worldId: UUID,
    roomId: UUID
  ): Promise<IAgentRuntime> {
    logger.info(`Creating isolated runtime for actor ${actor.name} (${actor.id})`);

    // Create a unique character for this actor
    const character: Character = {
      id: actor.id,
      name: actor.name,
      bio: actor.personality?.traits || ['An actor in a scenario'],
      system: actor.personality?.systemPrompt || this.primaryRuntime.character.system,
      messageExamples: [],
      postExamples: [],
      topics: actor.personality?.interests || [],
      knowledge: actor.knowledge || [],
      plugins: this.primaryRuntime.character.plugins || [],
      settings: {
        ...this.primaryRuntime.character.settings,
        ...actor.settings,
      },
    };

    // Create isolated runtime with its own memory and services
    const runtime = await this.createIsolatedRuntime(character, worldId, roomId);

    // Store the agent instance
    const instance: AgentInstance = {
      actor,
      runtime,
      messageQueue: [],
      actionHistory: [],
    };

    this.agents.set(actor.id, instance);

    // Set up message routing
    this.messageRouter.registerAgent(actor.id, runtime);

    return runtime;
  }

  private async createIsolatedRuntime(
    character: Character,
    worldId: UUID,
    roomId: UUID
  ): Promise<IAgentRuntime> {
    // Create real runtime configuration for proper isolation
    const config: RealRuntimeConfig = {
      character,
      database: {
        type: 'pglite',
        dataDir: `/tmp/eliza-scenario-${worldId}`,
      },
      plugins: {
        enabled: character.plugins || [],
        config: {},
      },
      environment: {
        apiKeys: {
          OPENAI_API_KEY: process.env.OPENAI_API_KEY || 'test-openai-key',
          ANTHROPIC_API_KEY: process.env.ANTHROPIC_API_KEY || 'test-anthropic-key',
        },
        settings: {
          NODE_ENV: 'test',
          LOG_LEVEL: 'info',
          worldId,
          roomId,
        },
      },
      isolation: {
        uniqueAgentId: true,
        isolatedDatabase: true,
        cleanupOnStop: true,
      },
    };

    // Create real runtime instance
    const runtime = await RealRuntimeFactory.createRuntime(config);

    logger.info(`Created isolated runtime for actor ${character.name} (${runtime.agentId})`);

    return runtime;
  }

  async routeMessage(fromActorId: UUID, toActorId: UUID | 'all', message: Memory): Promise<void> {
    if (toActorId === 'all') {
      // Broadcast to all agents
      for (const [actorId, agent] of this.agents) {
        if (actorId !== fromActorId) {
          agent.messageQueue.push(message);
        }
      }
    } else {
      // Direct message
      const targetAgent = this.agents.get(toActorId);
      if (targetAgent) {
        targetAgent.messageQueue.push(message);
      }
    }
  }

  async executeAction(actorId: UUID, actionName: string, params: any): Promise<any> {
    const agent = this.agents.get(actorId);
    if (!agent) {
      throw new Error(`Agent ${actorId} not found`);
    }

    const action = agent.runtime.actions.find((a) => a.name === actionName);
    if (!action) {
      throw new Error(`Action ${actionName} not found for agent ${actorId}`);
    }

    // Create a synthetic message for the action
    const message: Memory = {
      id: asUUID(uuidv4()),
      entityId: actorId,
      agentId: agent.runtime.agentId,
      roomId: params.roomId || asUUID(uuidv4()),
      content: {
        text: params.text || `Execute ${actionName}`,
        actions: [actionName],
        ...params,
      },
      createdAt: Date.now(),
    };

    const state = await agent.runtime.composeState(message);

    if (!(await action.validate(agent.runtime, message, state))) {
      throw new Error(`Action ${actionName} validation failed`);
    }

    const result = await action.handler(agent.runtime, message, state, params, async (response) => {
      logger.info(`Action ${actionName} response:`, response);
      return [];
    });

    // Record in history
    agent.actionHistory.push({
      timestamp: Date.now(),
      action: actionName,
      params,
      result,
    });

    return result;
  }

  getAgent(actorId: UUID): AgentInstance | undefined {
    return this.agents.get(actorId);
  }

  getAllAgents(): AgentInstance[] {
    return Array.from(this.agents.values());
  }

  getActionHistory(actorId?: UUID): any[] {
    if (actorId) {
      return this.agents.get(actorId)?.actionHistory || [];
    }

    // Return all action history
    const allHistory: any[] = [];
    for (const agent of this.agents.values()) {
      allHistory.push(
        ...agent.actionHistory.map((h) => ({
          ...h,
          actorId: agent.actor.id,
          actorName: agent.actor.name,
        }))
      );
    }
    return allHistory.sort((a, b) => a.timestamp - b.timestamp);
  }

  async cleanup(): Promise<void> {
    // Stop all runtime instances using the factory
    for (const agent of this.agents.values()) {
      try {
        await RealRuntimeFactory.stopRuntime(agent.runtime);
      } catch (error) {
        logger.warn(`Error stopping runtime for agent ${agent.actor.id}:`, error);
      }
    }

    this.agents.clear();
    this.agentMessageStore.clear();
  }
}

class MessageRouter {
  private routes = new Map<UUID, IAgentRuntime>();

  registerAgent(actorId: UUID, runtime: IAgentRuntime): void {
    this.routes.set(actorId, runtime);
  }

  async routeMessage(from: UUID, to: UUID | 'all', message: Memory): Promise<void> {
    if (to === 'all') {
      for (const [actorId, runtime] of this.routes) {
        if (actorId !== from) {
          await (runtime as any).messageManager.createMemory(message);
        }
      }
    } else {
      const runtime = this.routes.get(to);
      if (runtime) {
        await (runtime as any).messageManager.createMemory(message);
      }
    }
  }
}
