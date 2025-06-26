import { type IAgentRuntime, Service, logger } from '@elizaos/core';
import { v4 as uuidv4 } from 'uuid';
// Use a generic Drizzle type if possible, or specific one if plugin-sql guarantees it.
// For PoC, 'any' can bypass strict type checking if the exact DB type from plugin-sql is unknown.
import type { SQLiteDatabase } from 'drizzle-orm/sqlite-core'; // Example for SQLite
import { eq, and, inArray } from 'drizzle-orm';

import {
    delegatedSubTasksTable,
    type DelegatedSubTask,
    type NewDelegatedSubTask, // This is an insert type, usually without id/timestamps
    SupervisorTaskStatus,
    type InsertableDelegatedSubTask // A potentially more refined insert type
} from './db/schema';

// Placeholder for the actual Drizzle DB type provided by @elizaos/plugin-sql
// This might be BetterSQLite3Database, PostgresJsDatabase, DrizzleD1Database, etc.
// Using a generic SQLiteDatabase for this PoC, assuming plugin-sql could provide that.
type DrizzleDBType = SQLiteDatabase<typeof import('./db/schema')>;


export class SupervisorTaskDBService extends Service {
  static readonly serviceType = 'SupervisorTaskDBService';
  public capabilityDescription = 'Service for persisting and managing supervisor-delegated sub-task states.';
  private db: DrizzleDBType | null = null;
  private agentId: string;

  constructor(runtime: IAgentRuntime) {
    super(runtime);
    this.agentId = runtime.agentId || 'unknownSupervisor'; // For logging context
    try {
      const sqlPluginService = runtime.getService<any>('@elizaos/plugin-sql');
      if (sqlPluginService && typeof sqlPluginService.getDb === 'function') {
        this.db = sqlPluginService.getDb() as DrizzleDBType;
        if (!this.db) {
            logger.warn(`[${SupervisorTaskDBService.serviceType} - ${this.agentId}] @elizaos/plugin-sql service found, but getDb() returned null/undefined. DB operations will be skipped.`);
        } else {
             logger.info(`[${SupervisorTaskDBService.serviceType} - ${this.agentId}] Successfully obtained DB instance via @elizaos/plugin-sql.`);
        }
      } else {
        logger.warn(`[${SupervisorTaskDBService.serviceType} - ${this.agentId}] @elizaos/plugin-sql service not found or lacks getDb() method. DB operations will be skipped.`);
      }
    } catch (e) {
      logger.warn(`[${SupervisorTaskDBService.serviceType} - ${this.agentId}] Error getting SQL service: ${(e as Error).message}. DB operations will be skipped.`);
      this.db = null;
    }
  }

  static async start(runtime: IAgentRuntime): Promise<SupervisorTaskDBService> {
    logger.info(`[${SupervisorTaskDBService.serviceType}] Starting for agent ${runtime.agentId}.`);
    return new SupervisorTaskDBService(runtime);
  }

  static async stop(_runtime: IAgentRuntime): Promise<void> {
    // No specific cleanup for this service itself, DB connection managed by plugin-sql
    logger.info(`[${SupervisorTaskDBService.serviceType}] Stopping.`);
  }

  private async ensureDb(): Promise<DrizzleDBType> {
    if (!this.db) {
      const errorMessage = `[${SupervisorTaskDBService.serviceType} - ${this.agentId}] Database not available. Operation cancelled.`;
      logger.error(errorMessage);
      throw new Error(errorMessage);
    }
    return this.db;
  }

  async recordNewSubTask(taskData: InsertableDelegatedSubTask): Promise<DelegatedSubTask | null> {
    const db = await this.ensureDb().catch(() => null);
    if (!db) return null;

    const now = new Date().toISOString();
    const fullTaskData: NewDelegatedSubTask = { // Drizzle's $inferInsert type
      id: taskData.id || uuidv4(), // Allow providing ID or generate new
      projectConversationId: taskData.projectConversationId,
      a2aRequestMessageId: taskData.a2aRequestMessageId,
      subTaskName: taskData.subTaskName,
      assignedAgentId: taskData.assignedAgentId,
      status: taskData.status || SupervisorTaskStatus.PENDING_DELEGATION,
      parametersJson: taskData.parametersJson,
      dependenciesJson: taskData.dependenciesJson,
      delegatedAt: now,
      lastStatusUpdateAt: now,
      resultSummary: taskData.resultSummary, // Allow setting these on creation if needed
      lastErrorMessage: taskData.lastErrorMessage,
    };

    try {
      // Drizzle's .values() expects a complete object or an array of them.
      // .returning() is the standard way to get back the inserted row(s).
      const insertedTasks = await db.insert(delegatedSubTasksTable).values(fullTaskData).returning().execute();
      if (insertedTasks && insertedTasks.length > 0) {
        logger.debug(`[${SupervisorTaskDBService.serviceType} - ${this.agentId}] Recorded new sub-task: ${fullTaskData.subTaskName} (DB ID: ${insertedTasks[0].id}, A2A ID: ${fullTaskData.a2aRequestMessageId})`);
        return insertedTasks[0];
      }
      logger.warn(`[${SupervisorTaskDBService.serviceType} - ${this.agentId}] Failed to record or retrieve new sub-task: ${taskData.subTaskName}`);
      return null;
    } catch (error: any) {
      logger.error(`[${SupervisorTaskDBService.serviceType} - ${this.agentId}] Error recording new sub-task ${taskData.subTaskName}: ${error.message}`, error);
      return null;
    }
  }

  async updateTaskByDbId(
    dbId: string,
    updates: Partial<Omit<DelegatedSubTask, 'id' | 'projectConversationId' | 'delegatedAt'>>
  ): Promise<boolean> {
    const db = await this.ensureDb().catch(() => null);
    if (!db) return false;

    const dataToSet = {
        ...updates,
        lastStatusUpdateAt: new Date().toISOString(),
    };

    try {
        const result = await db.update(delegatedSubTasksTable)
            .set(dataToSet)
            .where(eq(delegatedSubTasksTable.id, dbId))
            .execute();
        const changes = (result as any)?.meta?.changes ?? (result as any)?.rowCount ?? 0;
        if (changes > 0) {
            logger.debug(`[${SupervisorTaskDBService.serviceType} - ${this.agentId}] Updated task with DB ID ${dbId}. Status: ${updates.status}, A2A ID: ${updates.a2aRequestMessageId}`);
            return true;
        }
        logger.warn(`[${SupervisorTaskDBService.serviceType} - ${this.agentId}] No task found with DB ID ${dbId} to update.`);
        return false;
    } catch (error: any) {
        logger.error(`[${SupervisorTaskDBService.serviceType} - ${this.agentId}] Error updating task with DB ID ${dbId}: ${error.message}`, error);
        return false;
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
      const changes = (result as any)?.meta?.changes ?? (result as any)?.rowCount ?? 0;
      if (changes > 0) {
        logger.debug(`[${SupervisorTaskDBService.serviceType} - ${this.agentId}] Updated task status for A2A ID ${a2aRequestMessageId} to ${status}.`);
        return true;
      }
      logger.warn(`[${SupervisorTaskDBService.serviceType} - ${this.agentId}] No task found with A2A ID ${a2aRequestMessageId} to update status to ${status}.`);
      return false;
    } catch (error: any) {
      logger.error(`[${SupervisorTaskDBService.serviceType} - ${this.agentId}] Error updating task status for A2A ID ${a2aRequestMessageId}: ${error.message}`, error);
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
      logger.error(`[${SupervisorTaskDBService.serviceType} - ${this.agentId}] Error fetching task by A2A ID ${a2aRequestMessageId}: ${error.message}`, error);
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
      logger.error(`[${SupervisorTaskDBService.serviceType} - ${this.agentId}] Error fetching tasks for project ${projectConversationId} with status ${status}: ${error.message}`, error);
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
      logger.error(`[${SupervisorTaskDBService.serviceType} - ${this.agentId}] Error fetching tasks for project ${projectConversationId} by names [${taskNames.join(', ')}]: ${error.message}`, error);
      return [];
    }
  }
}
