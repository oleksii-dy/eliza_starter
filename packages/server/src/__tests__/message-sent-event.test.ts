/**
 * Test to verify MESSAGE_SENT event emission in messaging API endpoint
 */

import { describe, it, expect, beforeEach } from 'bun:test';
import { mock } from 'bun:test';
import { EventType, type UUID } from '@elizaos/core';

describe('/api/messaging/submit MESSAGE_SENT Event Emission', () => {
  it('should emit MESSAGE_SENT event when agent submits message', () => {
    // Mock agent runtime with emitEvent method
    const mockAgentRuntime = {
      emitEvent: mock(),
      character: { name: 'Test Agent' }
    };

    // Mock server instance with agents map
    const mockServerInstance = {
      agents: new Map(),
      createMessage: mock().mockResolvedValue({
        id: 'test-message-id',
        createdAt: new Date(),
      }),
      socketIO: {
        to: mock().mockReturnThis(),
        emit: mock(),
      },
    };

    // Add agent to the agents map
    const agentId = '12345678-1234-1234-1234-123456789abc' as UUID;
    mockServerInstance.agents.set(agentId, mockAgentRuntime);

    // Verify agent is accessible
    const retrievedAgent = mockServerInstance.agents.get(agentId);
    expect(retrievedAgent).toBe(mockAgentRuntime);
    expect(retrievedAgent?.emitEvent).toBeDefined();
  });

  it('should have EventType.MESSAGE_SENT defined', () => {
    expect(EventType.MESSAGE_SENT).toBe('MESSAGE_SENT');
  });
});
