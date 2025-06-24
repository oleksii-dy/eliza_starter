import { type IAgentRuntime, Service, logger } from '@elizaos/core';
import { v4 as uuidv4 } from 'uuid';
import type { DrizzleD1Database } from 'drizzle-orm/d1'; // Example type for a Drizzle DB instance
import { eq, and, inArray } from 'drizzle-orm'; // Import Drizzle operators

import {
    delegatedSubTasksTable,
    type DelegatedSubTask,
    type NewDelegatedSubTask,
    SupervisorTaskStatus
} from './db/schema';

// Conceptual interface for the DB instance provided by @elizaos/plugin-sql
// This would ideally be a shared type from @elizaos/core or @elizaos/plugin-sql
// Using DrizzleD1Database as a placeholder for a generic Drizzle DB type.
// Replace with actual type if known, e.g., BetterSQLite3Database or PostgresJsDatabase
type DrizzleDB = DrizzleD1Database<typeof import('./db/schema')>;


export class SupervisorTaskDBService extends Service {
  static readonly serviceType = 'SupervisorTaskDBService';
  public capabilityDescription = 'Service for persisting and managing supervisor-delegated sub-task states.';
  private db: DrizzleDB | null = null;

  constructor(runtime: IAgentRuntime) {
    super(runtime);
    try {
      // Attempt to get the database instance from @elizaos/plugin-sql
      // The exact service name and method to get the DB instance are assumptions.
      const sqlPluginService = runtime.getService<any>('@elizaos/plugin-sql');
      if (sqlPluginService && typeof sqlPluginService.getDb === 'function') {
        this.db = sqlPluginService.getDb() as DrizzleDB; // Cast to expected Drizzle type
        if (!this.db) {
            logger.warn(`[${SupervisorTaskDBService.serviceType}] @elizaos/plugin-sql service found, but getDb() returned null/undefined. DB operations will be skipped.`);
        } else {
             logger.info(`[${SupervisorTaskDBService.serviceType}] Successfully connected to DB via @elizaos/plugin-sql.`);
        }
      } else {
        logger.warn(`[${SupervisorTaskDBService.serviceType}] @elizaos/plugin-sql service not found or lacks getDb() method. DB operations will be skipped.`);
      }
    } catch (e) {
      logger.warn(`[${SupervisorTaskDBService.serviceType}] Error getting SQL service: ${(e as Error).message}. DB operations will be skipped.`);
      this.db = null;
    }
  }

  static async start(runtime: IAgentRuntime): Promise<SupervisorTaskDBService> {
    logger.info(`SupervisorTaskDBService starting for agent ${runtime.agentId}.`);
    return new SupervisorTaskDBService(runtime);
  }

  static async stop(_runtime: IAgentRuntime): Promise<void> {
    logger.info('SupervisorTaskDBService stopping.');
  }

  private async ensureDb(): Promise<DrizzleDB> {
    if (!this.db) {
      logger.error(`[${SupervisorTaskDBService.serviceType}] Database not available. Operation cancelled.`);
      throw new Error("Database service not initialized or available.");
    }
    return this.db;
  }

  async recordNewSubTask(taskData: Omit<NewDelegatedSubTask, 'id' | 'delegatedAt' | 'lastStatusUpdateAt'>): Promise<DelegatedSubTask | null> {
    const db = await this.ensureDb().catch(() => null);
    if (!db) return null;

    const now = new Date().toISOString();
    const fullTaskData: NewDelegatedSubTask = {
      id: uuidv4(), // Generate internal PK
      ...taskData,
      delegatedAt: now,
      lastStatusUpdateAt: now,
    };

    try {
      // Drizzle's insert typically doesn't return the inserted row by default with all drivers in execute()
      // .returning() is more common but driver-specific. For this PoC, we'll execute then select if needed.
      // Or assume the input data + generated ID is sufficient.
      await db.insert(delegatedSubTasksTable).values(fullTaskData).execute();
      logger.debug(`[${SupervisorTaskDBService.serviceType}] Recorded new sub-task: ${fullTaskData.subTaskName} (ID: ${fullTaskData.id}, A2A ID: ${fullTaskData.a2aRequestMessageId})`);
      // To return the full DelegatedSubTask, we might need to cast or select it back.
      // For simplicity, returning the input with generated ID.
      return fullTaskData as DelegatedSubTask;
    } catch (error: any) {
      logger.error(`[${SupervisorTaskDBService.serviceType}] Error recording new sub-task ${taskData.subTaskName}: ${error.message}`);
      return null;
    }
  }

  async updateTaskStatusByA2ARequestId(
    a2aRequestMessageId: string,
    status: SupervisorTaskStatus,
    updateData?: { resultSummary?: string | null; lastErrorMessage?: string | null }
  ): Promise<boolean> {
    const db = await this.ensureDb().catch(() => null);
    if (!db) return false;

    const dataToSet: Partial<Omit<DelegatedSubTask, 'id'>> = {
      status,
      lastStatusUpdateAt: new Date().toISOString(),
    };
    if (updateData?.resultSummary !== undefined) dataToSet.resultSummary = updateData.resultSummary;
    if (updateData?.lastErrorMessage !== undefined) dataToSet.lastErrorMessage = updateData.lastErrorMessage;

    try {
      const result = await db.update(delegatedSubTasksTable)
        .set(dataToSet)
        .where(eq(delegatedSubTasksTable.a2aRequestMessageId, a2aRequestMessageId))
        .execute();
      // D1 execute for update returns D1Result, check result.meta.changes
      // For other drivers, it might be different. Assuming a property like `changes` or `rowCount`.
      const changes = (result as any)?.meta?.changes ?? (result as any)?.rowCount ?? 0;
      if (changes > 0) {
        logger.debug(`[${SupervisorTaskDBService.serviceType}] Updated task status for A2A ID ${a2aRequestMessageId} to ${status}.`);
        return true;
      } else {
        logger.warn(`[${SupervisorTaskDBService.serviceType}] No task found with A2A ID ${a2aRequestMessageId} to update status to ${status}.`);
        return false;
      }
    } catch (error: any) {
      logger.error(`[${SupervisorTaskDBService.serviceType}] Error updating task status for A2A ID ${a2aRequestMessageId}: ${error.message}`);
      return false;
    }
  }

  async getTaskByA2ARequestId(a2aRequestMessageId: string): Promise<DelegatedSubTask | null> {
    const db = await this.ensureDb().catch(() => null);
    if (!db) return null;
    try {
      const results = await db.select()
        .from(delegatedSubTasksTable)
        .where(eq(delegatedSubTasksTable.a2aRequestMessageId, a2aRequestMessageId))
        .limit(1)
        .execute();
      return (results[0] as DelegatedSubTask) || null;
    } catch (error: any) {
      logger.error(`[${SupervisorTaskDBService.serviceType}] Error fetching task by A2A ID ${a2aRequestMessageId}: ${error.message}`);
      return null;
    }
  }

  async getTasksByProjectAndStatus(projectConversationId: string, status: SupervisorTaskStatus): Promise<DelegatedSubTask[]> {
    const db = await this.ensureDb().catch(() => []);
    if (!db) return [];
    try {
      const results = await db.select()
        .from(delegatedSubTasksTable)
        .where(and(
          eq(delegatedSubTasksTable.projectConversationId, projectConversationId),
          eq(delegatedSubTasksTable.status, status)
        ))
        .execute();
      return results as DelegatedSubTask[];
    } catch (error: any) {
      logger.error(`[${SupervisorTaskDBService.serviceType}] Error fetching tasks for project ${projectConversationId} with status ${status}: ${error.message}`);
      return [];
    }
  }

  async getTasksByProjectAndNames(projectConversationId: string, taskNames: string[]): Promise<DelegatedSubTask[]> {
    const db = await this.ensureDb().catch(() => []);
    if (!db || taskNames.length === 0) return [];
    try {
      const results = await db.select()
        .from(delegatedSubTasksTable)
        .where(and(
          eq(delegatedSubTasksTable.projectConversationId, projectConversationId),
          inArray(delegatedSubTasksTable.subTaskName, taskNames)
        ))
        .execute();
      return results as DelegatedSubTask[];
    } catch (error: any) {
      logger.error(`[${SupervisorTaskDBService.serviceType}] Error fetching tasks for project ${projectConversationId} by names [${taskNames.join(', ')}]: ${error.message}`);
      return [];
    }
  }
}

// Also need an index.ts for the plugin-supervisor-utils package
// export { SupervisorTaskDBService };
// export * from './db/schema'; // To make schema available for other parts of Eliza if needed
// For now, service and schema will be imported directly by path in plugin-a2a-communication.
// A proper plugin structure would have an index.ts exporting these.
