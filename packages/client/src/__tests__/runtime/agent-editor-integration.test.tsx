/**
 * Runtime Integration Tests for AgentEditor
 * Tests the complete AgentEditor functionality using real ElizaOS runtime
 */
import { describe, test, expect, beforeAll, afterAll } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';
import { MemoryRouter } from 'react-router-dom';
import { AgentEditor, type AgentEditorConfig } from '../../components/AgentEditor';
import { apiClient } from '../../lib/api';
import type { IAgentRuntime, Character, UUID } from '@elizaos/core';
import { createTestRuntime } from '@elizaos/core/test-utils';

// Mock window.location for tests
Object.defineProperty(window, 'location', {
  value: {
    origin: 'http://localhost:3000',
    reload: jest.fn(),
  },
  writable: true,
});

// Test helper for creating AgentEditor with proper providers
function createAgentEditor(config: Partial<AgentEditorConfig> = {}) {
  const defaultConfig: AgentEditorConfig = {
    apiUrl: 'http://localhost:3000',
    embeddedMode: true,
    theme: 'dark',
    ...config,
  };

  return (
    <MemoryRouter>
      <AgentEditor {...defaultConfig} />
    </MemoryRouter>
  );
}

describe('AgentEditor Runtime Integration', () => {
  let runtime: IAgentRuntime;
  let testAgentId: UUID;
  let mockServer: any;

  beforeAll(async () => {
    // Create a real runtime instance for testing
    runtime = await createTestRuntime({
      character: {
        name: 'TestAgent',
        username: 'testagent',
        bio: ['Test agent for runtime integration tests'],
        messageExamples: [],
        plugins: [],
      } as Character,
    });

    // Start a mock API server for testing
    mockServer = setupMockApiServer();

    // Create a test agent
    const agentResponse = await apiClient.createAgent({
      characterJson: {
        name: 'TestAgent',
        username: 'testagent',
        bio: ['Test agent created during integration tests'],
        messageExamples: [],
        plugins: [],
      } as Character,
    });

    testAgentId = agentResponse.data.id;
  });

  afterAll(async () => {
    // Clean up test agent
    if (testAgentId) {
      try {
        await apiClient.deleteAgent(testAgentId);
      } catch (error) {
        console.warn('Failed to cleanup test agent:', error);
      }
    }

    // Stop mock server
    if (mockServer) {
      mockServer.close();
    }
  });

  test('AgentEditor renders without errors', async () => {
    const { container } = render(createAgentEditor());

    await waitFor(() => {
      expect(container.firstChild).toBeInTheDocument();
    });
  });

  test('AgentEditor shows agent list from real API', async () => {
    render(createAgentEditor());

    // Wait for agents to load
    await waitFor(
      () => {
        expect(screen.getByText(/TestAgent/i)).toBeInTheDocument();
      },
      { timeout: 5000 }
    );
  });

  test('AgentEditor can create a new agent', async () => {
    const onAgentCreated = jest.fn();

    render(
      createAgentEditor({
        onAgentCreated,
        embeddedMode: false,
      })
    );

    // Find and click create agent button
    const createButton = await screen.findByText(/create.*agent/i);
    fireEvent.click(createButton);

    // Fill in agent details
    const nameInput = await screen.findByLabelText(/name/i);
    fireEvent.change(nameInput, { target: { value: 'IntegrationTestAgent' } });

    const bioInput = await screen.findByLabelText(/bio/i);
    fireEvent.change(bioInput, { target: { value: 'Agent created during integration test' } });

    // Submit form
    const submitButton = await screen.findByText(/create/i);
    fireEvent.click(submitButton);

    // Wait for agent creation
    await waitFor(
      () => {
        expect(onAgentCreated).toHaveBeenCalled();
      },
      { timeout: 10000 }
    );

    // Verify agent appears in list
    await waitFor(() => {
      expect(screen.getByText(/IntegrationTestAgent/i)).toBeInTheDocument();
    });
  });

  test('AgentEditor can start and stop agents', async () => {
    render(createAgentEditor());

    // Find the test agent
    const agentCard = await screen.findByText(/TestAgent/i);
    expect(agentCard).toBeInTheDocument();

    // Find and click start button
    const startButton = await screen.findByText(/start/i);
    fireEvent.click(startButton);

    // Wait for agent to start
    await waitFor(
      () => {
        expect(screen.getByText(/running/i)).toBeInTheDocument();
      },
      { timeout: 10000 }
    );

    // Find and click stop button
    const stopButton = await screen.findByText(/stop/i);
    fireEvent.click(stopButton);

    // Wait for agent to stop
    await waitFor(
      () => {
        expect(screen.getByText(/stopped/i)).toBeInTheDocument();
      },
      { timeout: 5000 }
    );
  });

  test('AgentEditor handles API errors gracefully', async () => {
    const onError = jest.fn();

    // Mock API failure
    jest.spyOn(apiClient, 'getAgents').mockRejectedValueOnce(new Error('Network error'));

    render(createAgentEditor({ onError }));

    // Wait for error to be handled
    await waitFor(() => {
      expect(onError).toHaveBeenCalledWith(expect.any(Error));
    });

    // Verify error message is displayed
    expect(screen.getByText(/error/i)).toBeInTheDocument();
  });

  test('AgentEditor supports embedding mode', async () => {
    const { container } = render(
      createAgentEditor({
        embeddedMode: true,
        user: {
          id: 'test-user-123',
          email: 'test@example.com',
          name: 'Test User',
        },
      })
    );

    // Should not have browser router navigation
    expect(container.querySelector('[data-testid="navigation"]')).toBeNull();

    // Should have embedded-specific classes
    expect(container.querySelector('.embedded-mode')).toBeInTheDocument();
  });

  test('AgentEditor validates agent configuration', async () => {
    render(createAgentEditor());

    // Try to create agent with invalid data
    const createButton = await screen.findByText(/create.*agent/i);
    fireEvent.click(createButton);

    // Submit without required fields
    const submitButton = await screen.findByText(/create/i);
    fireEvent.click(submitButton);

    // Should show validation errors
    await waitFor(() => {
      expect(screen.getByText(/name.*required/i)).toBeInTheDocument();
    });
  });

  test('AgentEditor persists settings correctly', async () => {
    const config = {
      theme: 'light' as const,
      apiUrl: 'http://localhost:3001',
    };

    render(createAgentEditor(config));

    // Change settings
    const settingsButton = await screen.findByText(/settings/i);
    fireEvent.click(settingsButton);

    const themeSelect = await screen.findByLabelText(/theme/i);
    fireEvent.change(themeSelect, { target: { value: 'dark' } });

    const saveButton = await screen.findByText(/save/i);
    fireEvent.click(saveButton);

    // Verify settings are applied
    await waitFor(() => {
      expect(document.body.classList.contains('dark')).toBe(true);
    });
  });

  test('AgentEditor supports plugin configuration', async () => {
    render(createAgentEditor());

    // Navigate to agent settings
    const agentCard = await screen.findByText(/TestAgent/i);
    fireEvent.click(agentCard);

    const configButton = await screen.findByText(/configure/i);
    fireEvent.click(configButton);

    // Should show plugin configuration
    await waitFor(() => {
      expect(screen.getByText(/plugins/i)).toBeInTheDocument();
    });

    // Should be able to enable/disable plugins
    const pluginToggle = await screen.findByRole('switch');
    fireEvent.click(pluginToggle);

    // Verify plugin state changed
    await waitFor(() => {
      expect(pluginToggle).toHaveAttribute('aria-checked', 'true');
    });
  });

  test('AgentEditor handles real-time updates', async () => {
    render(createAgentEditor());

    // Simulate real-time agent status update
    const mockMessage = {
      type: 'agent_status_changed',
      agentId: testAgentId,
      status: 'running',
    };

    // Trigger WebSocket message
    window.dispatchEvent(
      new MessageEvent('message', {
        data: JSON.stringify(mockMessage),
      })
    );

    // Should update UI in real-time
    await waitFor(() => {
      expect(screen.getByText(/running/i)).toBeInTheDocument();
    });
  });

  test('AgentEditor memory management works correctly', async () => {
    render(createAgentEditor());

    // Navigate to memory viewer
    const agentCard = await screen.findByText(/TestAgent/i);
    fireEvent.click(agentCard);

    const memoryButton = await screen.findByText(/memory/i);
    fireEvent.click(memoryButton);

    // Should load agent memories
    await waitFor(() => {
      expect(screen.getByText(/memories/i)).toBeInTheDocument();
    });

    // Should be able to search memories
    const searchInput = await screen.findByPlaceholderText(/search/i);
    fireEvent.change(searchInput, { target: { value: 'test query' } });

    // Should show search results
    await waitFor(() => {
      expect(screen.getByText(/search results/i)).toBeInTheDocument();
    });
  });
});

/**
 * Sets up a mock API server for testing
 */
function setupMockApiServer() {
  // Mock implementation - in real test this would be a proper server
  return {
    close: () => {},
  };
}
