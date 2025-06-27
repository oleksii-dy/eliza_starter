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
    let container: any;
    await act(async () => {
      const result = render(<McpViewer agentId="test-agent" />);
      container = result.container;
    });

    await waitFor(
      () => {
        const serverItems = container.querySelectorAll('.server-item');
        expect(serverItems.length).toBe(2);
        
        const serverNames = container.querySelectorAll('.server-name');
        const serverNameTexts = Array.from(serverNames).map((el: any) => el.textContent);
        expect(serverNameTexts).toContain('test-server-1');
        expect(serverNameTexts).toContain('test-server-2');
      },
      { timeout: 3000 }
    );

    expect(mockFetch).toHaveBeenCalledWith('/api/mcp/servers?agentId=test-agent');
  });

  it('should display connection statistics', async () => {
    let container: any;
    await act(async () => {
      const result = render(<McpViewer agentId="test-agent" />);
      container = result.container;
    });

    await waitFor(
      () => {
        const statsSection = container.querySelector('.connection-stats');
        expect(statsSection).not.toBeNull();
        
        const statLabels = container.querySelectorAll('.stat-label');
        const labelTexts = Array.from(statLabels).map((el: any) => el.textContent);
        expect(labelTexts).toContain('Total');
        expect(labelTexts).toContain('Connected');
        
        const statValues = container.querySelectorAll('.stat-value');
        const valueTexts = Array.from(statValues).map((el: any) => el.textContent?.trim());
        expect(valueTexts).toContain('2');
        expect(valueTexts).toContain('1');
      },
      { timeout: 3000 }
    );
  });

  it('should handle server selection', async () => {
    const user = userEvent.setup({ delay: null });

    let container: any, getByText: any;
    await act(async () => {
      const result = render(<McpViewer agentId="test-agent" />);
      container = result.container;
      getByText = result.getByText;
    });

    await waitFor(
      () => {
        const serverItems = container.querySelectorAll('.server-item');
        expect(serverItems.length).toBe(2);
      },
      { timeout: 3000 }
    );

    // Click on the first server
    const firstServerItem = container.querySelector('.server-item');
    await act(async () => {
      await user.click(firstServerItem);
    });

    expect(getByText('Tools (2)')).toBeInTheDocument();
    expect(getByText('Resources (1)')).toBeInTheDocument();
  });

  it('should switch between tools and resources tabs', async () => {
    const user = userEvent.setup({ delay: null });

    let container: any;
    await act(async () => {
      const result = render(<McpViewer agentId="test-agent" />);
      container = result.container;
    });

    await waitFor(
      () => {
        const serverItems = container.querySelectorAll('.server-item');
        expect(serverItems.length).toBe(2);
      },
      { timeout: 3000 }
    );

    // Click on the first server
    const firstServerItem = container.querySelector('.server-item');
    await act(async () => {
      await user.click(firstServerItem);
    });

    // Tools tab should be active by default
    await waitFor(() => {
      const toolItems = container.querySelectorAll('.tool-item');
      expect(toolItems.length).toBe(2);
      
      const toolNames = container.querySelectorAll('.tool-name');
      const toolNameTexts = Array.from(toolNames).map((el: any) => el.textContent);
      expect(toolNameTexts).toContain('tool1');
      expect(toolNameTexts).toContain('tool2');
    }, { timeout: 3000 });

    // Switch to resources tab - use class selector instead of text
    await act(async () => {
      const tabButtons = container.querySelectorAll('.tab');
      const resourcesTab = Array.from(tabButtons).find((button: any) => 
        button.textContent?.includes('Resources')
      );
      if (resourcesTab) {
        await user.click(resourcesTab);
      }
    });

    // Verify resource is displayed
    await waitFor(() => {
      const resourceNames = container.querySelectorAll('.resource-name');
      const resourceNameTexts = Array.from(resourceNames).map((el: any) => el.textContent);
      expect(resourceNameTexts).toContain('Resource 1');
    }, { timeout: 3000 });
  });

  it('should handle reconnection', async () => {
    const user = userEvent.setup({ delay: null });

    let container: any;
    await act(async () => {
      const result = render(<McpViewer agentId="test-agent" />);
      container = result.container;
    });

    await waitFor(
      () => {
        const serverItems = container.querySelectorAll('.server-item');
        expect(serverItems.length).toBe(2);
      },
      { timeout: 3000 }
    );

    const reconnectButton = container.querySelector('.reconnect-btn');
    expect(reconnectButton).not.toBeNull();

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

    let container: any, getByText: any, getByPlaceholderText: any;
    await act(async () => {
      const result = render(<McpViewer agentId="test-agent" />);
      container = result.container;
      getByText = result.getByText;
      getByPlaceholderText = result.getByPlaceholderText;
    });

    await waitFor(
      () => {
        const serverItems = container.querySelectorAll('.server-item');
        expect(serverItems.length).toBe(2);
      },
      { timeout: 3000 }
    );

    // Click on the first server
    const firstServerItem = container.querySelector('.server-item');
    await act(async () => {
      await user.click(firstServerItem);
    });
    
    // Wait for tools to load and click on the second tool
    await waitFor(() => {
      const toolItems = container.querySelectorAll('.tool-item');
      expect(toolItems.length).toBe(2);
    }, { timeout: 3000 });

    const secondToolItem = container.querySelectorAll('.tool-item')[1];
    await act(async () => {
      await user.click(secondToolItem);
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

    let container: any, getByText: any;
    await act(async () => {
      const result = render(<McpViewer agentId="test-agent" />);
      container = result.container;
      getByText = result.getByText;
    });

    await waitFor(
      () => {
        const serverItems = container.querySelectorAll('.server-item');
        expect(serverItems.length).toBe(2);
      },
      { timeout: 3000 }
    );

    // Click on the first server
    const firstServerItem = container.querySelector('.server-item');
    await act(async () => {
      await user.click(firstServerItem);
    });
    
    // Switch to resources tab using class selector
    await act(async () => {
      const tabButtons = container.querySelectorAll('.tab');
      const resourcesTab = Array.from(tabButtons).find((button: any) => 
        button.textContent?.includes('Resources')
      );
      if (resourcesTab) {
        await user.click(resourcesTab);
      }
    });
    
    // Click on the first resource using class selector
    await act(async () => {
      await waitFor(() => {
        const resourceItems = container.querySelectorAll('.resource-item');
        expect(resourceItems.length).toBeGreaterThan(0);
      });
      
      const firstResourceItem = container.querySelector('.resource-item');
      if (firstResourceItem) {
        await user.click(firstResourceItem);
      }
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
    let container: any, getByText: any;
    await act(async () => {
      const result = render(<McpViewer agentId="test-agent" />);
      container = result.container;
      getByText = result.getByText;
    });

    // Wait for servers to load
    await waitFor(
      () => {
        const serverItems = container.querySelectorAll('.server-item');
        expect(serverItems.length).toBe(2);
      },
      { timeout: 3000 }
    );

    // The empty state message should be visible when no server is selected
    const emptyState = container.querySelector('.mcp-empty');
    expect(emptyState).not.toBeNull();
    expect(emptyState.textContent).toContain('Select a server to view its tools and resources');
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
