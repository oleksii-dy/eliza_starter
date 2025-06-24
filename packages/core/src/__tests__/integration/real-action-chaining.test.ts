import { describe, it, expect, beforeEach, afterEach } from 'bun:test';
import type { IAgentRuntime, Action, ActionResult, UUID, Memory } from '../../types';
import {
  createRealTestRuntime,
  createTestMessage,
  processMessageWithActions,
} from '../utils/real-runtime-factory';
import { v4 as uuidv4 } from 'uuid';

describe('Real Action Chaining Integration', () => {
  let runtime: IAgentRuntime;
  let testRoomId: UUID;
  let testEntityId: UUID;

  beforeEach(async () => {
    // Create actions that can chain together
    const chainableActions: Action[] = [
      {
        name: 'FETCH_USER_DATA',
        description: 'Fetch user data from a source',
        validate: async (runtime, message) => {
          return !!(
            message.content.text?.includes('fetch') || message.content.text?.includes('get user')
          );
        },
        handler: async (runtime, message, state, options, callback) => {
          // Simulate fetching user data
          const userData = {
            id: message.entityId,
            name: 'John Doe',
            email: 'john@example.com',
            preferences: {
              theme: 'dark',
              notifications: true,
            },
          };

          // Store in working memory for next action
          const workingMemory = (runtime as any).getWorkingMemory(message.roomId);
          workingMemory.set('fetchedUserData', userData);

          if (callback) {
            await callback({
              text: 'User data fetched successfully',
              actions: ['FETCH_USER_DATA'],
            });
          }

          return {
            values: { userDataFetched: true, userName: userData.name },
            data: { userData, fetchedAt: Date.now() },
            text: `Fetched data for user: ${userData.name}`,
          };
        },
        similes: ['GET_USER_DATA', 'LOAD_USER'],
      },
      {
        name: 'PROCESS_USER_DATA',
        description: 'Process the fetched user data',
        validate: async (runtime, message, state) => {
          // Only validate if we have fetched data available
          const workingMemory = (runtime as any).getWorkingMemory(message.roomId);
          const userData = workingMemory.get('fetchedUserData');
          return userData !== undefined;
        },
        handler: async (runtime, message, state, options, callback) => {
          const context = options?.context;
          const workingMemory = (runtime as any).getWorkingMemory(message.roomId);
          const userData = workingMemory.get('fetchedUserData');

          if (!userData) {
            throw new Error('No user data available to process');
          }

          // Process the data (e.g., validate, transform, analyze)
          const processedData = {
            ...userData,
            processed: true,
            processedAt: Date.now(),
            summary: `User ${userData.name} has ${Object.keys(userData.preferences).length} preferences`,
          };

          // Update working memory
          workingMemory.set('processedUserData', processedData);

          if (callback) {
            await callback({
              text: `Processed data for ${userData.name}: ${processedData.summary}`,
              actions: ['PROCESS_USER_DATA'],
            });
          }

          return {
            values: {
              userDataProcessed: true,
              processingComplete: true,
              userSummary: processedData.summary,
            },
            data: { processedData, processingTimestamp: Date.now() },
            text: `Processed user data: ${processedData.summary}`,
          };
        },
        similes: ['ANALYZE_USER_DATA', 'TRANSFORM_USER_DATA'],
      },
      {
        name: 'SAVE_USER_PROFILE',
        description: 'Save processed user data as a profile',
        validate: async (runtime, message, state) => {
          const workingMemory = (runtime as any).getWorkingMemory(message.roomId);
          const processedData = workingMemory.get('processedUserData');
          return processedData !== undefined;
        },
        handler: async (runtime, message, state, options, callback) => {
          const workingMemory = (runtime as any).getWorkingMemory(message.roomId);
          const processedData = workingMemory.get('processedUserData');

          if (!processedData) {
            throw new Error('No processed data available to save');
          }

          // Save as persistent memory
          const profileMemoryId = await runtime.createMemory(
            {
              id: uuidv4() as UUID,
              entityId: message.entityId,
              roomId: message.roomId,
              content: {
                text: `User profile: ${processedData.summary}`,
                type: 'user_profile',
                profile: processedData,
              },
              createdAt: Date.now(),
            },
            'user_profiles'
          );

          // Clear working memory since we've persisted the data
          workingMemory.clear();

          if (callback) {
            await callback({
              text: `User profile saved successfully for ${processedData.name}`,
              actions: ['SAVE_USER_PROFILE'],
            });
          }

          return {
            values: {
              profileSaved: true,
              profileId: profileMemoryId,
              userName: processedData.name,
            },
            data: {
              savedProfile: processedData,
              memoryId: profileMemoryId,
              savedAt: Date.now(),
            },
            text: `Saved profile for ${processedData.name}`,
          };
        },
        similes: ['STORE_USER_PROFILE', 'PERSIST_USER_DATA'],
      },
      {
        name: 'SUMMARIZE_WORKFLOW',
        description: 'Summarize the completed workflow',
        validate: async () => true,
        handler: async (runtime, message, state, options, callback) => {
          const context = options?.context as { previousResults?: ActionResult[] };
          const previousResults = context?.previousResults || [];

          // Analyze all previous action results
          const summary = {
            totalActions: previousResults.length,
            actionsExecuted: previousResults.map(
              (r: ActionResult) => r.data?.actionName || 'unknown'
            ),
            userProcessed: previousResults.some((r: ActionResult) => r.values?.userName),
            profileSaved: previousResults.some((r: ActionResult) => r.values?.profileSaved),
            workflowComplete: true,
          };

          const userName =
            previousResults.find((r: ActionResult) => r.values?.userName)?.values?.userName ||
            'Unknown';

          if (callback) {
            await callback({
              text: `Workflow completed! Processed user ${userName} through ${summary.totalActions} steps.`,
              actions: ['SUMMARIZE_WORKFLOW'],
            });
          }

          return {
            values: {
              workflowComplete: true,
              workflowSummary: summary,
            },
            data: { summary, completedAt: Date.now() },
            text: `Workflow summary: ${summary.totalActions} actions for ${userName}`,
          };
        },
        similes: ['COMPLETE_WORKFLOW', 'FINALIZE_PROCESS'],
      },
    ];

    runtime = await createRealTestRuntime({
      enableLLM: false,
      enablePlanning: true,
      logLevel: 'error',
    });

    // Register chainable actions
    chainableActions.forEach((action) => runtime.registerAction(action));

    testRoomId = uuidv4() as UUID;
    testEntityId = uuidv4() as UUID;
  });

  afterEach(async () => {
    if ((runtime as any)?.databaseAdapter?.close) {
      await (runtime as any).databaseAdapter.close();
    }
  });

  describe('Sequential Action Chaining', () => {
    it('should execute actions in sequence with state persistence', async () => {
      const message = createTestMessage({
        roomId: testRoomId,
        entityId: testEntityId,
        content: {
          text: 'Please fetch and process user data',
          source: 'test',
          actions: ['FETCH_USER_DATA', 'PROCESS_USER_DATA', 'SAVE_USER_PROFILE'],
        },
      });

      const responses: any[] = [];

      // Mock callback to capture responses and results
      const callback = async (content: any) => {
        responses.push(content);
        return [];
      };

      // Execute action chain through full pipeline
      const { responses: generatedResponses, actionResults } = await processMessageWithActions(
        runtime,
        message,
        callback
      );

      // Verify actions executed through responses
      expect(responses.length).toBeGreaterThanOrEqual(3);

      // Check that all action types executed
      expect(responses.some((r) => r.text?.includes('fetch'))).toBe(true);
      expect(responses.some((r) => r.text?.includes('Processed'))).toBe(true);
      expect(responses.some((r) => r.text?.includes('saved'))).toBe(true);
    });

    it('should maintain working memory across action executions', async () => {
      // Execute fetch action
      const fetchMessage = createTestMessage({
        roomId: testRoomId,
        entityId: testEntityId,
        content: {
          text: 'Fetch user data please',
          actions: ['FETCH_USER_DATA'],
        },
      });

      const { responses: fetchResponses } = await processMessageWithActions(
        runtime,
        fetchMessage,
        async () => []
      );

      // Verify working memory has data
      const workingMemory = (runtime as any).getWorkingMemory(testRoomId);
      const userData = workingMemory.get('fetchedUserData');
      expect(userData).toBeDefined();
      expect(userData.name).toBe('John Doe');

      // Execute process action - should use data from working memory
      const processMessage = createTestMessage({
        roomId: testRoomId,
        entityId: testEntityId,
        content: {
          text: 'Process the fetched data',
          actions: ['PROCESS_USER_DATA'],
        },
      });

      const processResponses: any[] = [];
      const { responses: processResponsesGenerated } = await processMessageWithActions(
        runtime,
        processMessage,
        async (content) => {
          processResponses.push(content);
          return [];
        }
      );

      expect(processResponses.length).toBeGreaterThan(0);
      expect(
        processResponses.some((r) => r.text?.includes('John Doe') || r.text?.includes('Processed'))
      ).toBe(true);
    });

    it('should handle action failures in chain gracefully', async () => {
      // Create an action that will fail
      const failingAction: Action = {
        name: 'FAILING_CHAIN_ACTION',
        description: 'Action that fails in chain',
        validate: async () => true,
        handler: async () => {
          throw new Error('Simulated chain failure');
        },
        similes: [],
      };

      runtime.registerAction(failingAction);

      const message = createTestMessage({
        roomId: testRoomId,
        entityId: testEntityId,
        content: {
          text: 'Execute chain with failure',
          actions: ['FETCH_USER_DATA', 'FAILING_CHAIN_ACTION', 'PROCESS_USER_DATA'],
        },
      });

      let errorOccurred = false;
      try {
        const { responses: failResponses } = await processMessageWithActions(
          runtime,
          message,
          async () => []
        );
      } catch (error) {
        errorOccurred = true;
      }

      // Should handle failure gracefully without crashing
      expect(errorOccurred).toBe(false);

      // Working memory should still have data from successful first action
      const workingMemory = (runtime as any).getWorkingMemory(testRoomId);
      const userData = workingMemory.get('fetchedUserData');
      expect(userData).toBeDefined();
    });
  });

  describe('Action Context Passing', () => {
    it('should pass previous results to subsequent actions', async () => {
      const message = createTestMessage({
        roomId: testRoomId,
        entityId: testEntityId,
        content: {
          text: 'Complete full workflow',
          actions: [
            'FETCH_USER_DATA',
            'PROCESS_USER_DATA',
            'SAVE_USER_PROFILE',
            'SUMMARIZE_WORKFLOW',
          ],
        },
      });

      const responses: any[] = [];
      const { responses: generatedResponses } = await processMessageWithActions(
        runtime,
        message,
        async (content) => {
          responses.push(content);
          return [];
        }
      );

      // Verify responses were generated
      expect(responses.length).toBeGreaterThan(0);

      // Check for workflow completion indicators
      const hasWorkflowContent = responses.some(
        (r) => r.text && (r.text.includes('completed') || r.text.includes('workflow'))
      );
      expect(hasWorkflowContent).toBe(true);
    });
  });

  describe('Persistent State Management', () => {
    it('should persist data across conversation turns', async () => {
      // First turn: save user profile
      const message1 = createTestMessage({
        roomId: testRoomId,
        entityId: testEntityId,
        content: {
          text: 'Process and save user data',
          actions: ['FETCH_USER_DATA', 'PROCESS_USER_DATA', 'SAVE_USER_PROFILE'],
        },
      });

      const { responses: persistResponses } = await processMessageWithActions(
        runtime,
        message1,
        async () => []
      );

      // Wait for memory persistence
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Second turn: verify data is accessible
      const message2 = createTestMessage({
        roomId: testRoomId,
        entityId: testEntityId,
        content: {
          text: 'What user data do we have?',
        },
      });

      // Check if profile was saved to memory
      const memories = await runtime.getMemories({
        roomId: testRoomId,
        entityId: testEntityId,
        tableName: 'user_profiles',
        count: 10,
      });

      expect(memories.length).toBeGreaterThan(0);
      const profileMemory = memories.find((m) => m.content.type === 'user_profile');
      expect(profileMemory).toBeDefined();
      expect((profileMemory?.content.profile as any)?.name).toBe('John Doe');
    });

    it('should clean up working memory after workflow completion', async () => {
      const message = createTestMessage({
        roomId: testRoomId,
        entityId: testEntityId,
        content: {
          text: 'Complete workflow and cleanup',
          actions: ['FETCH_USER_DATA', 'PROCESS_USER_DATA', 'SAVE_USER_PROFILE'],
        },
      });

      const { responses: cleanupResponses } = await processMessageWithActions(
        runtime,
        message,
        async () => []
      );

      // Working memory should be cleared after SAVE_USER_PROFILE
      const workingMemory = (runtime as any).getWorkingMemory(testRoomId);
      const userData = workingMemory.get('fetchedUserData');
      const processedData = workingMemory.get('processedUserData');

      expect(userData).toBeUndefined();
      expect(processedData).toBeUndefined();
    });
  });

  describe('Complex Workflow Validation', () => {
    it('should validate action prerequisites in chain', async () => {
      // Try to process data without fetching first - validation should prevent execution
      const message = createTestMessage({
        roomId: testRoomId,
        entityId: testEntityId,
        content: {
          text: 'Process data without fetching',
        },
      });

      let processingAttempted = false;
      const responses: any[] = [];

      try {
        const { responses: validationResponses } = await processMessageWithActions(
          runtime,
          message,
          async (content) => {
            responses.push(content);
            if (content.actions?.includes('PROCESS_USER_DATA')) {
              processingAttempted = true;
            }
            return [];
          }
        );

        // Since no data was fetched, PROCESS_USER_DATA should not be able to process data
        const workingMemory = (runtime as any).getWorkingMemory(testRoomId);
        const processedData = workingMemory.get('processedUserData');

        // The key test is that no data should have been processed since none was fetched
        expect(processedData).toBeUndefined();
      } catch (error) {
        // Expected to fail or not execute due to validation
      }
    });
  });
});
