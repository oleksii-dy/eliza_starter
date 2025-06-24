import { describe, it, expect, vi, beforeEach } from 'vitest';
import { SupervisorTaskDBService } from '../supervisor-task-db.service';
import { delegatedSubTasksTable, SupervisorTaskStatus, type NewDelegatedSubTask, type DelegatedSubTask } from '../db/schema';
import { type IAgentRuntime, logger } from '@elizaos/core';
import { eq, and, inArray } from 'drizzle-orm'; // For verifying where clauses

// Mock core logger
vi.mock('@elizaos/core', async (importOriginal) => {
    const original = await importOriginal<typeof import('@elizaos/core')>();
    return {
        ...original,
        logger: { info: vi.fn(), debug: vi.fn(), warn: vi.fn(), error: vi.fn() },
    };
});

// Mock Drizzle DB instance and its methods
const mockDbInstance = {
  insert: vi.fn().mockReturnThis(),
  values: vi.fn().mockReturnThis(),
  update: vi.fn().mockReturnThis(),
  set: vi.fn().mockReturnThis(),
  where: vi.fn().mockReturnThis(),
  select: vi.fn().mockReturnThis(),
  from: vi.fn().mockReturnThis(),
  limit: vi.fn().mockReturnThis(),
  execute: vi.fn(),
  returning: vi.fn().mockReturnThis(), // Added for insert returning
};

// Mock the @elizaos/plugin-sql service getter
const mockSqlPluginService = {
  getDb: vi.fn(() => mockDbInstance),
};

describe('SupervisorTaskDBService', () => {
  let mockRuntime: IAgentRuntime;
  let dbService: SupervisorTaskDBService;

  beforeEach(() => {
    vi.resetAllMocks();
    // Reset chained mock implementations
    mockDbInstance.insert.mockReturnThis();
    mockDbInstance.values.mockReturnThis();
    mockDbInstance.update.mockReturnThis();
    mockDbInstance.set.mockReturnThis();
    mockDbInstance.where.mockReturnThis();
    mockDbInstance.select.mockReturnThis();
    mockDbInstance.from.mockReturnThis();
    mockDbInstance.limit.mockReturnThis();
    mockDbInstance.returning.mockReturnThis();


    mockRuntime = {
      agentId: 'supervisor-test-agent',
      getService: vi.fn().mockImplementation((serviceName: string) => {
        if (serviceName === '@elizaos/plugin-sql') {
          return mockSqlPluginService;
        }
        return undefined;
      }),
    } as unknown as IAgentRuntime;

    dbService = new SupervisorTaskDBService(mockRuntime);
  });

  it('constructor should get DB instance from @elizaos/plugin-sql', () => {
    expect(mockRuntime.getService).toHaveBeenCalledWith('@elizaos/plugin-sql');
    expect(mockSqlPluginService.getDb).toHaveBeenCalled();
    // Test successful instantiation (db is not null)
    // To do this properly, the constructor would need to expose db or a status
    // For now, we assume if no error, it tried.
  });

  it('constructor should warn if SQL service or getDb method is unavailable', () => {
    (mockRuntime.getService as vi.Mock).mockImplementationOnce(() => undefined);
    new SupervisorTaskDBService(mockRuntime);
    expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining('@elizaos/plugin-sql service not found'));

    (mockRuntime.getService as vi.Mock).mockImplementationOnce(() => ({ /* no getDb method */ }));
    new SupervisorTaskDBService(mockRuntime);
    expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining('lacks getDb() method'));
  });

  describe('recordNewSubTask', () => {
    it('should insert a new task and return it', async () => {
      const taskData: Omit<NewDelegatedSubTask, 'id' | 'delegatedAt' | 'lastStatusUpdateAt'> = {
        projectConversationId: 'proj-conv-1', a2aRequestMessageId: 'a2a-req-1',
        subTaskName: 'DEV_TASK_1', assignedAgentId: 'dev-agent-1',
        status: SupervisorTaskStatus.DELEGATION_SENT,
      };
      mockDbInstance.execute.mockResolvedValueOnce({ changes: 1 }); // D1-like response

      const result = await dbService.recordNewSubTask(taskData);

      expect(mockDbInstance.insert).toHaveBeenCalledWith(delegatedSubTasksTable);
      expect(mockDbInstance.values).toHaveBeenCalledWith(expect.objectContaining({
        ...taskData,
        id: expect.any(String),
        delegatedAt: expect.any(String),
        lastStatusUpdateAt: expect.any(String),
      }));
      expect(mockDbInstance.execute).toHaveBeenCalled();
      expect(result).toEqual(expect.objectContaining(taskData));
    });

    it('should return null if DB is not available for recordNewSubTask', async () => {
      (dbService as any).db = null; // Simulate DB not available
      const result = await dbService.recordNewSubTask({} as any);
      expect(result).toBeNull();
      expect(logger.error).toHaveBeenCalledWith(expect.stringContaining('Database not available'), expect.any(Error));
    });
  });

  describe('updateTaskStatusByA2ARequestId', () => {
    it('should update task status, resultSummary, and lastErrorMessage', async () => {
      mockDbInstance.execute.mockResolvedValueOnce({ meta: { changes: 1 } }); // D1-like success
      const a2aId = 'a2a-req-for-update';
      const status = SupervisorTaskStatus.SUCCESS;
      const updates = { resultSummary: 'Task done!', lastErrorMessage: null };

      const success = await dbService.updateTaskStatusByA2ARequestId(a2aId, status, updates);

      expect(mockDbInstance.update).toHaveBeenCalledWith(delegatedSubTasksTable);
      expect(mockDbInstance.set).toHaveBeenCalledWith(expect.objectContaining({
        status: status,
        resultSummary: updates.resultSummary,
        lastErrorMessage: updates.lastErrorMessage,
        lastStatusUpdateAt: expect.any(String),
      }));
      expect(mockDbInstance.where).toHaveBeenCalledWith(eq(delegatedSubTasksTable.a2aRequestMessageId, a2aId));
      expect(mockDbInstance.execute).toHaveBeenCalled();
      expect(success).toBe(true);
    });
     it('should return false if no rows affected by update', async () => {
      mockDbInstance.execute.mockResolvedValueOnce({ meta: { changes: 0 } }); // No rows changed
      const success = await dbService.updateTaskStatusByA2ARequestId('non-existent-id', SupervisorTaskStatus.ACKNOWLEDGED);
      expect(success).toBe(false);
      expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining('No task found with A2A ID non-existent-id'));
    });
  });

  describe('getTaskByA2ARequestId', () => {
    it('should retrieve a task by its a2aRequestMessageId', async () => {
      const mockTask: DelegatedSubTask = { id: 'db-id-1', a2aRequestMessageId: 'a2a-get-1' } as DelegatedSubTask;
      mockDbInstance.execute.mockResolvedValueOnce([mockTask]);

      const result = await dbService.getTaskByA2ARequestId('a2a-get-1');

      expect(mockDbInstance.select).toHaveBeenCalled();
      expect(mockDbInstance.from).toHaveBeenCalledWith(delegatedSubTasksTable);
      expect(mockDbInstance.where).toHaveBeenCalledWith(eq(delegatedSubTasksTable.a2aRequestMessageId, 'a2a-get-1'));
      expect(mockDbInstance.limit).toHaveBeenCalledWith(1);
      expect(result).toEqual(mockTask);
    });
  });

  describe('getTasksByProjectAndStatus', () => {
    it('should retrieve tasks matching projectConversationId and status', async () => {
      const mockTasks: DelegatedSubTask[] = [{ id: 'db-id-2' } as DelegatedSubTask];
      mockDbInstance.execute.mockResolvedValueOnce(mockTasks);

      const result = await dbService.getTasksByProjectAndStatus('proj-conv-filter', SupervisorTaskStatus.WAITING_FOR_DEPENDENCY);

      expect(mockDbInstance.where).toHaveBeenCalledWith(and(
        eq(delegatedSubTasksTable.projectConversationId, 'proj-conv-filter'),
        eq(delegatedSubTasksTable.status, SupervisorTaskStatus.WAITING_FOR_DEPENDENCY)
      ));
      expect(result).toEqual(mockTasks);
    });
  });

  describe('getTasksByProjectAndNames', () => {
    it('should retrieve tasks matching projectConversationId and multiple names', async () => {
      const mockTasks: DelegatedSubTask[] = [{ id: 'db-id-3' } as DelegatedSubTask];
      mockDbInstance.execute.mockResolvedValueOnce(mockTasks);
      const taskNames = ['TASK_A', 'TASK_B'];

      const result = await dbService.getTasksByProjectAndNames('proj-conv-names', taskNames);

      expect(mockDbInstance.where).toHaveBeenCalledWith(and(
        eq(delegatedSubTasksTable.projectConversationId, 'proj-conv-names'),
        inArray(delegatedSubTasksTable.subTaskName, taskNames)
      ));
      expect(result).toEqual(mockTasks);
    });

    it('should return empty array if taskNames is empty', async () => {
        const result = await dbService.getTasksByProjectAndNames('proj-conv-empty', []);
        expect(result).toEqual([]);
        expect(mockDbInstance.select).not.toHaveBeenCalled();
    });
  });

});
