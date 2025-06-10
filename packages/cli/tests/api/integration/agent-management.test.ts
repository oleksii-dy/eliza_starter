import { describe, it, beforeAll, afterAll, expect } from 'vitest';
import type { UUID } from '@elizaos/core';
import {
  setupAPITestEnvironment,
  cleanupAPITestEnvironment,
  createTestAgent,
  startTestAgent,
  stopTestAgent,
  deleteTestAgent,
  apiAssertions,
  waitForCondition,
  type APITestContext,
} from '../api-test-utils';

describe('Agent Management Integration Tests', () => {
  let context: APITestContext;
  let createdAgentIds: UUID[] = [];

  beforeAll(async () => {
    context = await setupAPITestEnvironment();
  }, 120000);

  afterAll(async () => {
    // Clean up any created agents
    for (const agentId of createdAgentIds) {
      try {
        await deleteTestAgent(context.httpClient, agentId);
      } catch (error) {
        // Ignore cleanup errors
      }
    }
    
    if (context) {
      await cleanupAPITestEnvironment(context);
    }
  });

  describe('Agent CRUD Operations', () => {
    let testAgentId: UUID;

    it('should create a new agent', async () => {
      const { agentId, response } = await createTestAgent(context.httpClient, {
        name: 'TestAgent1',
      });

      testAgentId = agentId;
      createdAgentIds.push(agentId);

      apiAssertions.hasStatus(response, 200);
      apiAssertions.hasDataStructure(response, ['id', 'name']);
      expect(response.data.name).toBe('TestAgent1');
      expect(typeof response.data.id).toBe('string');
    });

    it('should list agents including the created agent', async () => {
      const response = await context.httpClient.get('/agents');

      apiAssertions.hasStatus(response, 200);
      expect(Array.isArray(response.data)).toBe(true);
      apiAssertions.agentListContains(response, testAgentId);
    });

    it('should get specific agent details', async () => {
      const response = await context.httpClient.get(`/agents/${testAgentId}`);

      apiAssertions.hasStatus(response, 200);
      apiAssertions.hasDataStructure(response, ['id', 'name']);
      expect(response.data.id).toBe(testAgentId);
    });

    it('should update agent configuration', async () => {
      const updateData = {
        name: 'UpdatedTestAgent1',
        bio: ['Updated bio for testing'],
      };

      const response = await context.httpClient.put(`/agents/${testAgentId}`, updateData);

      apiAssertions.isSuccessful(response);
      
      // Verify the update by getting the agent
      const getResponse = await context.httpClient.get(`/agents/${testAgentId}`);
      apiAssertions.hasStatus(getResponse, 200);
      expect(getResponse.data.name).toBe('UpdatedTestAgent1');
    });

    it('should delete an agent', async () => {
      // Create a temporary agent for deletion test
      const { agentId: tempAgentId } = await createTestAgent(context.httpClient, {
        name: 'TempAgent',
      });

      const deleteResponse = await deleteTestAgent(context.httpClient, tempAgentId);
      apiAssertions.isSuccessful(deleteResponse);

      // Verify agent is deleted
      const getResponse = await context.httpClient.get(`/agents/${tempAgentId}`);
      expect(getResponse.status).toBe(404);
    });
  });

  describe('Agent Lifecycle Management', () => {
    let lifecycleAgentId: UUID;

    beforeAll(async () => {
      const { agentId } = await createTestAgent(context.httpClient, {
        name: 'LifecycleTestAgent',
      });
      lifecycleAgentId = agentId;
      createdAgentIds.push(agentId);
    });

    it('should start an agent', async () => {
      const response = await startTestAgent(context.httpClient, lifecycleAgentId);

      apiAssertions.hasStatus(response, 200);
      
      // Wait for agent to be fully started
      await waitForCondition(async () => {
        const statusResponse = await context.httpClient.get(`/agents/${lifecycleAgentId}`);
        return statusResponse.data.status === 'running' || statusResponse.data.running === true;
      }, 15000);
    });

    it('should show agent as running in status', async () => {
      const response = await context.httpClient.get(`/agents/${lifecycleAgentId}`);

      apiAssertions.hasStatus(response, 200);
      // Agent should be in running state
      expect(
        response.data.status === 'running' || 
        response.data.running === true ||
        response.data.state === 'active'
      ).toBe(true);
    });

    it('should stop a running agent', async () => {
      const response = await stopTestAgent(context.httpClient, lifecycleAgentId);

      apiAssertions.hasStatus(response, 200);
      
      // Wait for agent to be fully stopped
      await waitForCondition(async () => {
        const statusResponse = await context.httpClient.get(`/agents/${lifecycleAgentId}`);
        return statusResponse.data.status === 'stopped' || statusResponse.data.running === false;
      }, 15000);
    });

    it('should show agent as stopped in status', async () => {
      const response = await context.httpClient.get(`/agents/${lifecycleAgentId}`);

      apiAssertions.hasStatus(response, 200);
      // Agent should be in stopped state
      expect(
        response.data.status === 'stopped' || 
        response.data.running === false ||
        response.data.state === 'inactive'
      ).toBe(true);
    });

    it('should restart a stopped agent', async () => {
      // Start the agent again
      const startResponse = await startTestAgent(context.httpClient, lifecycleAgentId);
      apiAssertions.hasStatus(startResponse, 200);

      // Verify it's running
      await waitForCondition(async () => {
        const statusResponse = await context.httpClient.get(`/agents/${lifecycleAgentId}`);
        return statusResponse.data.status === 'running' || statusResponse.data.running === true;
      }, 15000);
    });
  });

  describe('Agent Configuration and Character Management', () => {
    it('should create agent with custom character configuration', async () => {
      const customCharacter = {
        name: 'CustomTestAgent',
        system: 'You are a custom test agent with specific behaviors.',
        bio: ['Custom agent for testing specific scenarios'],
        messageExamples: [
          [
            { user: 'user', content: { text: 'Custom test' } },
            { user: 'assistant', content: { text: 'Custom response for testing' } }
          ]
        ],
        style: {
          all: ['precise', 'technical'],
          chat: ['focused'],
        },
        topics: ['testing', 'automation', 'validation'],
      };

      const { agentId, response } = await createTestAgent(context.httpClient, {
        name: 'CustomAgent',
        character: customCharacter,
      });

      createdAgentIds.push(agentId);

      apiAssertions.hasStatus(response, 200);
      expect(response.data.name).toBe('CustomAgent');

      // Verify the character configuration was applied
      const getResponse = await context.httpClient.get(`/agents/${agentId}`);
      apiAssertions.hasStatus(getResponse, 200);
      
      // Check that character data is preserved
      const agentData = getResponse.data;
      expect(agentData.character || agentData.config).toBeDefined();
    });

    it('should handle agent creation with invalid character data', async () => {
      const invalidCharacter = {
        // Missing required fields
        name: '', // Empty name
        invalidField: 'should be rejected',
      };

      const response = await context.httpClient.post('/agents', {
        name: 'InvalidAgent',
        character: invalidCharacter,
      });

      // Should reject invalid character data
      expect([400, 422]).toContain(response.status);
      expect(response.data.error).toBeDefined();
    });
  });

  describe('Multiple Agents Management', () => {
    let multipleAgentIds: UUID[] = [];

    beforeAll(async () => {
      // Create multiple agents for testing
      const agentPromises = Array(3).fill(null).map((_, index) => 
        createTestAgent(context.httpClient, {
          name: `MultiAgent${index + 1}`,
        })
      );

      const results = await Promise.all(agentPromises);
      multipleAgentIds = results.map(r => r.agentId);
      createdAgentIds.push(...multipleAgentIds);
    });

    it('should list all created agents', async () => {
      const response = await context.httpClient.get('/agents');

      apiAssertions.hasStatus(response, 200);
      expect(Array.isArray(response.data)).toBe(true);
      
      // All our test agents should be in the list
      multipleAgentIds.forEach(agentId => {
        apiAssertions.agentListContains(response, agentId);
      });
    });

    it('should start multiple agents concurrently', async () => {
      const startPromises = multipleAgentIds.map(agentId => 
        startTestAgent(context.httpClient, agentId)
      );

      const responses = await Promise.all(startPromises);
      
      responses.forEach(response => {
        apiAssertions.hasStatus(response, 200);
      });

      // Wait for all agents to be running
      await waitForCondition(async () => {
        const statusPromises = multipleAgentIds.map(agentId => 
          context.httpClient.get(`/agents/${agentId}`)
        );
        const statusResponses = await Promise.all(statusPromises);
        
        return statusResponses.every(resp => 
          resp.data.status === 'running' || resp.data.running === true
        );
      }, 30000);
    });

    it('should stop multiple agents concurrently', async () => {
      const stopPromises = multipleAgentIds.map(agentId => 
        stopTestAgent(context.httpClient, agentId)
      );

      const responses = await Promise.all(stopPromises);
      
      responses.forEach(response => {
        apiAssertions.hasStatus(response, 200);
      });

      // Wait for all agents to be stopped
      await waitForCondition(async () => {
        const statusPromises = multipleAgentIds.map(agentId => 
          context.httpClient.get(`/agents/${agentId}`)
        );
        const statusResponses = await Promise.all(statusPromises);
        
        return statusResponses.every(resp => 
          resp.data.status === 'stopped' || resp.data.running === false
        );
      }, 30000);
    });
  });

  describe('Agent Error Handling', () => {
    it('should handle requests for non-existent agents', async () => {
      const fakeAgentId = '00000000-0000-0000-0000-000000000000';
      
      const getResponse = await context.httpClient.get(`/agents/${fakeAgentId}`);
      expect(getResponse.status).toBe(404);

      const startResponse = await context.httpClient.post(`/agents/${fakeAgentId}/start`);
      expect(startResponse.status).toBe(404);

      const stopResponse = await context.httpClient.post(`/agents/${fakeAgentId}/stop`);
      expect(stopResponse.status).toBe(404);
    });

    it('should handle invalid agent IDs', async () => {
      const invalidId = 'not-a-valid-uuid';
      
      const response = await context.httpClient.get(`/agents/${invalidId}`);
      expect([400, 404]).toContain(response.status);
    });

    it('should handle starting an already running agent gracefully', async () => {
      // Create and start an agent
      const { agentId } = await createTestAgent(context.httpClient);
      createdAgentIds.push(agentId);
      
      await startTestAgent(context.httpClient, agentId);
      
      // Try to start it again
      const response = await context.httpClient.post(`/agents/${agentId}/start`);
      
      // Should either succeed (idempotent) or return appropriate status
      expect([200, 409]).toContain(response.status);
    });

    it('should handle stopping an already stopped agent gracefully', async () => {
      // Create an agent (should be stopped by default)
      const { agentId } = await createTestAgent(context.httpClient);
      createdAgentIds.push(agentId);
      
      // Try to stop it
      const response = await context.httpClient.post(`/agents/${agentId}/stop`);
      
      // Should either succeed (idempotent) or return appropriate status
      expect([200, 409]).toContain(response.status);
    });
  });
});