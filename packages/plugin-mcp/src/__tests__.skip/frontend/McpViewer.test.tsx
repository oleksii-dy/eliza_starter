import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import { McpViewer } from '../../frontend/McpViewer';

// Mock fetch with proper typing
const mockFetch = vi.fn() as any;
global.fetch = mockFetch;

// Mock data
const mockServersResponse = {
  success: true,
  data: {
    servers: [
      {
        name: 'test-server-1',
        status: 'connected',
        toolCount: 2,
        resourceCount: 1,
        tools: [
          { name: 'tool1', description: 'Test tool 1' },
          { name: 'tool2', description: 'Test tool 2', inputSchema: { properties: { arg1: { type: 'string' } } } }
        ],
        resources: [
          { uri: 'test://resource1', name: 'Resource 1', mimeType: 'text/plain' }
        ]
      },
      {
        name: 'test-server-2',
        status: 'disconnected',
        error: 'Connection failed',
        toolCount: 0,
        resourceCount: 0,
        tools: [],
        resources: []
      }
    ],
    totalServers: 2,
    connectedServers: 1
  }
};

describe('McpViewer', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useRealTimers(); // Use real timers for these tests
    // Default successful response
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => mockServersResponse
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
    vi.useRealTimers();
  });

  it('should render loading state initially', () => {
    render(<McpViewer agentId="test-agent" />);
    expect(screen.getByText('Loading MCP servers...')).toBeInTheDocument();
  });

  it('should fetch and display servers', async () => {
    await act(async () => {
      render(<McpViewer agentId="test-agent" />);
    });

    await waitFor(() => {
      expect(screen.getByText('test-server-1')).toBeInTheDocument();
      expect(screen.getByText('test-server-2')).toBeInTheDocument();
    }, { timeout: 3000 });

    expect(mockFetch).toHaveBeenCalledWith('/api/mcp/servers?agentId=test-agent');
  });

  it('should display connection statistics', async () => {
    await act(async () => {
      render(<McpViewer agentId="test-agent" />);
    });

    await waitFor(() => {
      expect(screen.getByText('Total')).toBeInTheDocument();
      expect(screen.getByText('2')).toBeInTheDocument();
      expect(screen.getByText('Connected')).toBeInTheDocument();
      // Use getAllByText since '1' appears multiple times
      const ones = screen.getAllByText('1');
      expect(ones.length).toBeGreaterThan(0);
    }, { timeout: 3000 });
  });

  it('should handle server selection', async () => {
    const user = userEvent.setup({ delay: null });

    await act(async () => {
      render(<McpViewer agentId="test-agent" />);
    });

    await waitFor(() => {
      expect(screen.getByText('test-server-1')).toBeInTheDocument();
    }, { timeout: 3000 });

    await act(async () => {
      await user.click(screen.getByText('test-server-1'));
    });

    expect(screen.getByText('Tools (2)')).toBeInTheDocument();
    expect(screen.getByText('Resources (1)')).toBeInTheDocument();
  });

  it('should switch between tools and resources tabs', async () => {
    const user = userEvent.setup({ delay: null });

    await act(async () => {
      render(<McpViewer agentId="test-agent" />);
    });

    await waitFor(() => {
      expect(screen.getByText('test-server-1')).toBeInTheDocument();
    }, { timeout: 3000 });

    await act(async () => {
      await user.click(screen.getByText('test-server-1'));
    });

    // Tools tab should be active by default
    expect(screen.getByText('tool1')).toBeInTheDocument();
    expect(screen.getByText('tool2')).toBeInTheDocument();

    // Switch to resources tab
    await act(async () => {
      await user.click(screen.getByText('Resources (1)'));
    });

    expect(screen.getByText('Resource 1')).toBeInTheDocument();
  });

  it('should handle reconnection', async () => {
    const user = userEvent.setup({ delay: null });

    await act(async () => {
      render(<McpViewer agentId="test-agent" />);
    });

    await waitFor(() => {
      expect(screen.getByText('test-server-2')).toBeInTheDocument();
    }, { timeout: 3000 });

    const reconnectButton = screen.getAllByText('Reconnect')[0];

    await act(async () => {
      await user.click(reconnectButton);
    });

    expect(mockFetch).toHaveBeenCalledWith(
      '/api/mcp/servers/test-server-2/reconnect?agentId=test-agent',
      { method: 'POST' }
    );
  });

  it('should handle tool execution', async () => {
    const user = userEvent.setup({ delay: null });

    mockFetch.mockImplementation((url: string) => {
      if (url.includes('/mcp/tools/')) {
        return Promise.resolve({
          ok: true,
          json: async () => ({ success: true, data: { result: 'Tool executed successfully' } })
        });
      }
      return Promise.resolve({
        ok: true,
        json: async () => mockServersResponse
      });
    });

    await act(async () => {
      render(<McpViewer agentId="test-agent" />);
    });

    await waitFor(() => {
      expect(screen.getByText('test-server-1')).toBeInTheDocument();
    }, { timeout: 3000 });

    await act(async () => {
      await user.click(screen.getByText('test-server-1'));
      await user.click(screen.getByText('tool2'));
    });

    const input = screen.getByPlaceholderText('arg1');

    await act(async () => {
      await user.type(input, 'test value');
      await user.click(screen.getByText('Execute Tool'));
    });

    await waitFor(() => {
      expect(screen.getByText(/Tool executed successfully/)).toBeInTheDocument();
    }, { timeout: 3000 });
  });

  it('should handle resource reading', async () => {
    const user = userEvent.setup({ delay: null });

    mockFetch.mockImplementation((url: string) => {
      if (url.includes('/mcp/resources/')) {
        return Promise.resolve({
          ok: true,
          json: async () => ({
            success: true,
            data: {
              contents: [{ text: 'Resource content', mimeType: 'text/plain' }]
            }
          })
        });
      }
      return Promise.resolve({
        ok: true,
        json: async () => mockServersResponse
      });
    });

    await act(async () => {
      render(<McpViewer agentId="test-agent" />);
    });

    await waitFor(() => {
      expect(screen.getByText('test-server-1')).toBeInTheDocument();
    }, { timeout: 3000 });

    await act(async () => {
      await user.click(screen.getByText('test-server-1'));
      await user.click(screen.getByText('Resources (1)'));
      await user.click(screen.getByText('Resource 1'));
    });

    await waitFor(() => {
      expect(screen.getByText('Resource content')).toBeInTheDocument();
    }, { timeout: 3000 });
  });

  it('should handle errors gracefully', async () => {
    mockFetch.mockRejectedValue(new Error('Network error'));

    await act(async () => {
      render(<McpViewer agentId="test-agent" />);
    });

    await waitFor(() => {
      expect(screen.getByText('Error')).toBeInTheDocument();
      expect(screen.getByText('Network error')).toBeInTheDocument();
    }, { timeout: 3000 });

    expect(screen.getByText('Retry')).toBeInTheDocument();
  });

  it('should display empty state when no server is selected', async () => {
    await act(async () => {
      render(<McpViewer agentId="test-agent" />);
    });

    // Wait for servers to load
    await waitFor(() => {
      expect(screen.getByText('test-server-1')).toBeInTheDocument();
    }, { timeout: 3000 });

    // The empty state message should be visible when no server is selected
    expect(screen.getByText('Select a server to view its tools and resources')).toBeInTheDocument();
  });

  it('should handle empty servers list', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({
        success: true,
        data: {
          servers: [],
          totalServers: 0,
          connectedServers: 0
        }
      })
    });

    await act(async () => {
      render(<McpViewer agentId="test-agent" />);
    });

    await waitFor(() => {
      expect(screen.getByText('No MCP servers configured')).toBeInTheDocument();
    }, { timeout: 3000 });
  });
}); 