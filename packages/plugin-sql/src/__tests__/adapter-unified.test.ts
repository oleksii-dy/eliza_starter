import { describe, it, expect } from 'bun:test';
import { BunSqliteAdapter } from '../bun-sqlite/adapter';
import { v4 as uuidv4 } from 'uuid';
import { asUUID } from '@elizaos/core';

describe('Unified Database Adapter Interface', () => {
  describe('BunSqliteAdapter Table Creation', () => {
    it('should create all tables without syntax errors', async () => {
      const agentId = asUUID(uuidv4());
      const adapter = new BunSqliteAdapter(agentId, { inMemory: true });

      // This should not throw any SQL syntax errors
      await adapter.init();

      // Verify adapter is ready
      expect(await adapter.isReady()).toBe(true);

      // Clean up
      await adapter.close();
    });

    it('should create task table specifically', async () => {
      const agentId = asUUID(uuidv4());
      const adapter = new BunSqliteAdapter(agentId, { inMemory: true });

      await adapter.init();

      // The tasks table should exist (this was the main issue we fixed)
      const result = await adapter.db.execute(
        "SELECT name FROM sqlite_master WHERE type='table' AND name='tasks'"
      );

      // Check if result has rows property or if it's a direct array
      const rows = result.rows || result;
      expect(Array.isArray(rows) ? rows.length : result.rowCount || 0).toBeGreaterThan(0);

      await adapter.close();
    });

    it('should support basic CRUD operations on tasks table', async () => {
      const agentId = asUUID(uuidv4());
      const adapter = new BunSqliteAdapter(agentId, { inMemory: true });

      await adapter.init();

      const taskId = uuidv4();
      const taskName = 'test-task';
      const description = 'Test task description';

      // Create - using the correct format with required fields
      await adapter.db.execute({
        sql: `INSERT INTO tasks (id, name, description, agent_id, tags, metadata, created_at, updated_at) 
              VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        params: [taskId, taskName, description, agentId, '[]', '{}', Date.now(), Date.now()],
      });

      // Read
      const tasksResult = await adapter.db.execute({
        sql: 'SELECT * FROM tasks WHERE id = ?',
        params: [taskId],
      });

      const tasks = tasksResult.rows || tasksResult;
      expect(Array.isArray(tasks) ? tasks.length : tasksResult.rowCount || 0).toBe(1);
      const task = Array.isArray(tasks) ? tasks[0] : tasks;
      expect(task.name).toBe(taskName);
      expect(task.description).toBe(description);

      // Update
      const newDescription = 'Updated task description';
      await adapter.db.execute({
        sql: 'UPDATE tasks SET description = ?, updated_at = ? WHERE id = ?',
        params: [newDescription, Date.now(), taskId],
      });

      const updatedTasksResult = await adapter.db.execute({
        sql: 'SELECT * FROM tasks WHERE id = ?',
        params: [taskId],
      });

      const updatedTasks = updatedTasksResult.rows || updatedTasksResult;
      const updatedTask = Array.isArray(updatedTasks) ? updatedTasks[0] : updatedTasks;
      expect(updatedTask.description).toBe(newDescription);

      // Delete
      await adapter.db.execute({
        sql: 'DELETE FROM tasks WHERE id = ?',
        params: [taskId],
      });

      const deletedTasksResult = await adapter.db.execute({
        sql: 'SELECT * FROM tasks WHERE id = ?',
        params: [taskId],
      });

      const deletedTasks = deletedTasksResult.rows || deletedTasksResult;
      expect(
        Array.isArray(deletedTasks) ? deletedTasks.length : deletedTasksResult.rowCount || 0
      ).toBe(0);

      await adapter.close();
    });
  });

  describe('Schema Compatibility', () => {
    it('should have all required core tables', async () => {
      const agentId = asUUID(uuidv4());
      const adapter = new BunSqliteAdapter(agentId, { inMemory: true });

      await adapter.init();

      const expectedTables = [
        'agents',
        'cache',
        'entities',
        'rooms',
        'memories',
        'embeddings',
        'relationships',
        'participants',
        'worlds',
        'tasks',
        'components',
        'logs',
      ];

      for (const tableName of expectedTables) {
        const result = await adapter.db.execute(
          `SELECT name FROM sqlite_master WHERE type='table' AND name='${tableName}'`
        );
        const rows = result.rows || result;
        expect(Array.isArray(rows) ? rows.length : result.rowCount || 0).toBeGreaterThan(0);
      }

      await adapter.close();
    });
  });
});
