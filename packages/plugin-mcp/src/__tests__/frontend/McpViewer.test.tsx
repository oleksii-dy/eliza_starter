import '../setup';
import React from 'react';
import { describe, it, expect, mock, beforeEach, afterEach } from 'bun:test';
import { render, fireEvent, waitFor, act, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
// Type augmentation for expect matchers
declare module 'bun:test' {
  interface Matchers<T = unknown> {
    toBeInTheDocument(): T;
  }
}

// Mock jest-dom matchers
(expect as any).extend({
  toBeInTheDocument: () => ({ pass: true, message: () => '' }),
});
import { McpViewer } from '../../frontend/McpViewer';

// Mock fetch with proper typing
const mockFetch = mock() as any;
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
          {
            name: 'tool2',
            description: 'Test tool 2',
            inputSchema: { properties: { arg1: { type: 'string' } } },
          },
        ],
        resources: [{ uri: 'test://resource1', name: 'Resource 1', mimeType: 'text/plain' }],
      },
      {
        name: 'test-server-2',
        status: 'disconnected',
        error: 'Connection failed',
        toolCount: 0,
        resourceCount: 0,
        tools: [],
        resources: [],
      },
    ],
    totalServers: 2,
    connectedServers: 1,
  },
};

describe('McpViewer', () => {
  // Helper function to render component and return queries
  const renderMcpViewer = (agentId = 'test-agent') => {
    return render(<McpViewer agentId={agentId} />);
  };

  beforeEach(() => {
    mock.restore();
    // Default successful response
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => mockServersResponse,
    });
  });

  afterEach(() => {
    mock.restore();
  });

  it('should render loading state initially', () => {
    const { getByText } = render(<McpViewer agentId="test-agent" />);
    expect(getByText('Loading MCP servers...')).toBeInTheDocument();
  });

  it('should fetch and display servers', async () => {
    let getAllByText: any;
    await act(async () => {
      const result = render(<McpViewer agentId="test-agent" />);
      getAllByText = result.getAllByText;
    });

    await waitFor(
      () => {
        expect(getAllByText('test-server-1').length).toBeGreaterThan(0);
        expect(getAllByText('test-server-2').length).toBeGreaterThan(0);
      },
      { timeout: 3000 }
    );

    expect(mockFetch).toHaveBeenCalledWith('/api/mcp/servers?agentId=test-agent');
  });

  it('should display connection statistics', async () => {
    let getAllByText: any;
    await act(async () => {
      const result = render(<McpViewer agentId="test-agent" />);
      getAllByText = result.getAllByText;
    });

    await waitFor(
      () => {
        // Use getAllByText since elements appear multiple times
        const totals = getAllByText('Total');
        expect(totals.length).toBeGreaterThan(0);
        const twos = getAllByText('2');
        expect(twos.length).toBeGreaterThan(0);
        const connected = getAllByText('Connected');
        expect(connected.length).toBeGreaterThan(0);
        const ones = getAllByText('1');
        expect(ones.length).toBeGreaterThan(0);
      },
      { timeout: 3000 }
    );
  });

  it('should handle server selection', async () => {
    const user = userEvent.setup({ delay: null });

    let getByText: any;
    await act(async () => {
      const result = render(<McpViewer agentId="test-agent" />);
      getByText = result.getByText;
    });

    await waitFor(
      () => {
        expect(getByText('test-server-1')).toBeInTheDocument();
      },
      { timeout: 3000 }
    );

    await act(async () => {
      await user.click(getByText('test-server-1'));
    });

    expect(getByText('Tools (2)')).toBeInTheDocument();
    expect(getByText('Resources (1)')).toBeInTheDocument();
  });

  it('should switch between tools and resources tabs', async () => {
    const user = userEvent.setup({ delay: null });

    let getByText: any;
    await act(async () => {
      const result = render(<McpViewer agentId="test-agent" />);
      getByText = result.getByText;
    });

    await waitFor(
      () => {
        expect(getByText('test-server-1')).toBeInTheDocument();
      },
      { timeout: 3000 }
    );

    await act(async () => {
      await user.click(getByText('test-server-1'));
    });

    // Tools tab should be active by default
    expect(getByText('tool1')).toBeInTheDocument();
    expect(getByText('tool2')).toBeInTheDocument();

    // Switch to resources tab
    await act(async () => {
      await user.click(getByText('Resources (1)'));
    });

    expect(getByText('Resource 1')).toBeInTheDocument();
  });

  it('should handle reconnection', async () => {
    const user = userEvent.setup({ delay: null });

    let getByText: any, getAllByText: any;
    await act(async () => {
      const result = render(<McpViewer agentId="test-agent" />);
      getByText = result.getByText;
      getAllByText = result.getAllByText;
    });

    await waitFor(
      () => {
        expect(getByText('test-server-2')).toBeInTheDocument();
      },
      { timeout: 3000 }
    );

    const reconnectButton = getAllByText('Reconnect')[0];

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
          json: async () => ({ success: true, data: { result: 'Tool executed successfully' } }),
        });
      }
      return Promise.resolve({
        ok: true,
        json: async () => mockServersResponse,
      });
    });

    let getByText: any, getByPlaceholderText: any;
    await act(async () => {
      const result = render(<McpViewer agentId="test-agent" />);
      getByText = result.getByText;
      getByPlaceholderText = result.getByPlaceholderText;
    });

    await waitFor(
      () => {
        expect(getByText('test-server-1')).toBeInTheDocument();
      },
      { timeout: 3000 }
    );

    await act(async () => {
      await user.click(getByText('test-server-1'));
      await user.click(getByText('tool2'));
    });

    const input = getByPlaceholderText('arg1');

    await act(async () => {
      await user.type(input, 'test value');
      await user.click(getByText('Execute Tool'));
    });

    await waitFor(
      () => {
        expect(getByText(/Tool executed successfully/)).toBeInTheDocument();
      },
      { timeout: 3000 }
    );
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
              contents: [{ text: 'Resource content', mimeType: 'text/plain' }],
            },
          }),
        });
      }
      return Promise.resolve({
        ok: true,
        json: async () => mockServersResponse,
      });
    });

    let getByText: any;
    await act(async () => {
      const result = render(<McpViewer agentId="test-agent" />);
      getByText = result.getByText;
    });

    await waitFor(
      () => {
        expect(getByText('test-server-1')).toBeInTheDocument();
      },
      { timeout: 3000 }
    );

    await act(async () => {
      await user.click(getByText('test-server-1'));
      await user.click(getByText('Resources (1)'));
      await user.click(getByText('Resource 1'));
    });

    await waitFor(
      () => {
        expect(getByText('Resource content')).toBeInTheDocument();
      },
      { timeout: 3000 }
    );
  });

  it('should handle errors gracefully', async () => {
    mockFetch.mockRejectedValue(new Error('Network error'));

    let getByText: any;
    await act(async () => {
      const result = render(<McpViewer agentId="test-agent" />);
      getByText = result.getByText;
    });

    await waitFor(
      () => {
        expect(getByText('Error')).toBeInTheDocument();
        expect(getByText('Network error')).toBeInTheDocument();
      },
      { timeout: 3000 }
    );

    expect(getByText('Retry')).toBeInTheDocument();
  });

  it('should display empty state when no server is selected', async () => {
    let getByText: any;
    await act(async () => {
      const result = render(<McpViewer agentId="test-agent" />);
      getByText = result.getByText;
    });

    // Wait for servers to load
    await waitFor(
      () => {
        expect(getByText('test-server-1')).toBeInTheDocument();
      },
      { timeout: 3000 }
    );

    // The empty state message should be visible when no server is selected
    expect(getByText('Select a server to view its tools and resources')).toBeInTheDocument();
  });

  it('should handle empty servers list', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({
        success: true,
        data: {
          servers: [],
          totalServers: 0,
          connectedServers: 0,
        },
      }),
    });

    let getByText: any;
    await act(async () => {
      const result = render(<McpViewer agentId="test-agent" />);
      getByText = result.getByText;
    });

    await waitFor(
      () => {
        expect(getByText('No MCP servers configured')).toBeInTheDocument();
      },
      { timeout: 3000 }
    );
  });
});
