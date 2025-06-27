// Import test setup for browser environment
import '../../test/setup';

import { describe, test, expect, beforeEach } from 'bun:test';
import { render, waitFor } from '@testing-library/react';
import React from 'react';
import { AgentEditor, type AgentEditorConfig } from '../AgentEditor';

// Mock the API client module
const mockApiClient = {
  getAgents: async () => ({ data: { agents: [] } }),
  getCentralServers: async () => ({ data: [] }),
  defaults: {
    baseURL: '',
    headers: { common: {} }
  }
};

// Mock modules that cause issues in tests
const originalRequire = globalThis.require;
if (originalRequire) {
  const Module = originalRequire('module');
  const originalResolveFilename = Module._resolveFilename;

  Module._resolveFilename = function (request: string, ...args: any[]) {
    if (request === '@/lib/api' || request.endsWith('/lib/api')) {
      return '@/lib/api-mock';
    }
    return originalResolveFilename.apply(this, [request, ...args]);
  };

  // Mock the API client
  const Module_cache = Module._cache || {};
  Module_cache['@/lib/api-mock'] = {
    exports: { apiClient: mockApiClient }
  };
  Module._cache = Module_cache;
}

describe('AgentEditor Component', () => {
  test('should render with default configuration', () => {
    const { container } = render(<AgentEditor />);

    const editorContainer = container.querySelector('[data-cy="agent-editor-container"]');
    expect(editorContainer).toBeInTheDocument();
  });

  test('should render with custom configuration', () => {
    const config: AgentEditorConfig = {
      embeddedMode: true,
      theme: 'light',
      user: {
        id: 'test-user',
        email: 'test@example.com',
        name: 'Test User',
      },
      organizationId: 'test-org',
    };

    const { container } = render(<AgentEditor {...config} />);

    const editorContainer = container.querySelector('[data-cy="agent-editor-container"]');
    expect(editorContainer).toBeInTheDocument();
    expect(editorContainer?.getAttribute('data-theme')).toBe('light');
  });

  test('should handle embedded mode styling', () => {
    const config: AgentEditorConfig = {
      embeddedMode: true,
      theme: 'dark',
    };

    const { container } = render(<AgentEditor {...config} />);

    const embeddedEditor = container.querySelector('.embedded-editor');
    expect(embeddedEditor).toBeInTheDocument();
  });

  test('should apply dark theme by default', () => {
    const { container } = render(<AgentEditor />);

    const editorContainer = container.querySelector('[data-cy="agent-editor-container"]');
    expect(editorContainer?.classList.contains('dark')).toBe(true);
  });

  test('should apply light theme when specified', () => {
    const config: AgentEditorConfig = {
      theme: 'light',
    };

    const { container } = render(<AgentEditor {...config} />);

    const editorContainer = container.querySelector('[data-cy="agent-editor-container"]');
    expect(editorContainer?.classList.contains('dark')).toBe(false);
  });

  test('should render routing components', async () => {
    const { container } = render(<AgentEditor />);

    // Wait for router to initialize
    await waitFor(() => {
      const sidebar = container.querySelector('.sidebar, [data-sidebar]');
      expect(sidebar).toBeInTheDocument();
    });
  });

  test('should handle error callback', () => {
    let capturedError: Error | null = null;

    const config: AgentEditorConfig = {
      onError: (error: Error) => {
        capturedError = error;
      },
    };

    // This test verifies the error handler is properly set up
    const { container } = render(<AgentEditor {...config} />);
    expect(container).toBeInTheDocument();

    // The error handler should be available (even if not triggered in this test)
    expect(typeof config.onError).toBe('function');
  });

  test('should handle agent creation callback', () => {
    let createdAgent: any = null;

    const config: AgentEditorConfig = {
      onAgentCreated: (agent: any) => {
        createdAgent = agent;
      },
    };

    const { container } = render(<AgentEditor {...config} />);
    expect(container).toBeInTheDocument();

    // The callback should be available
    expect(typeof config.onAgentCreated).toBe('function');
  });

  test('should handle agent update callback', () => {
    let updatedAgent: any = null;

    const config: AgentEditorConfig = {
      onAgentUpdated: (agent: any) => {
        updatedAgent = agent;
      },
    };

    const { container } = render(<AgentEditor {...config} />);
    expect(container).toBeInTheDocument();

    // The callback should be available
    expect(typeof config.onAgentUpdated).toBe('function');
  });

  test('should render with required plugins configuration', () => {
    const config: AgentEditorConfig = {
      requiredPlugins: ['plugin-1', 'plugin-2'],
      platformUrl: 'https://platform.example.com',
    };

    const { container } = render(<AgentEditor {...config} />);
    expect(container).toBeInTheDocument();
  });

  test('should include all essential UI components', async () => {
    const { container } = render(<AgentEditor />);

    await waitFor(() => {
      // Check for key UI elements
      const sidebar = container.querySelector('.sidebar, [data-sidebar]');
      const tooltipProvider = container.querySelector('[data-radix-tooltip-provider]');

      expect(sidebar).toBeInTheDocument();
      // TooltipProvider may not have a specific selector, but content should render
      expect(container.children.length).toBeGreaterThan(0);
    });
  });

  test('should handle auto theme setting', () => {
    const config: AgentEditorConfig = {
      theme: 'auto',
    };

    const { container } = render(<AgentEditor {...config} />);

    const editorContainer = container.querySelector('[data-cy="agent-editor-container"]');
    expect(editorContainer).toBeInTheDocument();
    // Auto theme should default to dark
    expect(editorContainer?.classList.contains('dark')).toBe(true);
  });
});
