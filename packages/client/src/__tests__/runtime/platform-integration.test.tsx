/**
 * Platform Integration Tests
 * Tests the platform's integration with @elizaos/client
 */
import { describe, test, expect, beforeAll, afterAll } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import React from 'react';

// Import the actual platform component
import { EmbeddedEditor } from '../../../../../../../platform/components/embedded-editor';

// Mock user data for testing
const mockUser = {
  id: 'test-user-123',
  email: 'test@example.com',
  name: 'Test User',
  organizationId: 'test-org-456',
};

const mockProps = {
  user: mockUser,
  apiKey: 'test-api-key',
  organizationId: 'test-org-456',
  requiredPlugins: ['core', 'knowledge'],
};

describe('Platform Integration with @elizaos/client', () => {
  beforeAll(() => {
    // Mock window.location for platform tests
    Object.defineProperty(window, 'location', {
      value: {
        origin: 'http://localhost:3333',
        reload: jest.fn(),
      },
      writable: true,
    });
  });

  test('EmbeddedEditor renders without errors', async () => {
    const { container } = render(<EmbeddedEditor {...mockProps} />);

    await waitFor(() => {
      expect(container.firstChild).toBeInTheDocument();
    });
  });

  test('EmbeddedEditor shows correct header information', async () => {
    render(<EmbeddedEditor {...mockProps} />);

    await waitFor(() => {
      expect(screen.getByText('Agent Editor')).toBeInTheDocument();
      expect(screen.getByText('ElizaOS Agent Management Interface')).toBeInTheDocument();
      expect(screen.getByText('Ready')).toBeInTheDocument();
    });
  });

  test('EmbeddedEditor has correct data attributes for testing', async () => {
    const { container } = render(<EmbeddedEditor {...mockProps} />);

    await waitFor(() => {
      expect(container.querySelector('[data-cy="embedded-editor"]')).toBeInTheDocument();
      expect(container.querySelector('[data-cy="editor-status"]')).toBeInTheDocument();
    });
  });

  test('EmbeddedEditor configures AgentEditor with platform context', async () => {
    // Mock the AgentEditor to capture its props
    const mockAgentEditor = jest.fn(() => <div data-testid="mock-agent-editor">Mock Editor</div>);

    // Mock the import
    jest.doMock('@elizaos/client', () => ({
      AgentEditor: mockAgentEditor,
      AgentEditorConfig: {},
    }));

    render(<EmbeddedEditor {...mockProps} />);

    await waitFor(() => {
      expect(mockAgentEditor).toHaveBeenCalledWith(
        expect.objectContaining({
          apiKey: 'test-api-key',
          apiUrl: 'http://localhost:3333/api',
          embeddedMode: true,
          user: {
            id: 'test-user-123',
            email: 'test@example.com',
            name: 'Test User',
          },
          organizationId: 'test-org-456',
          requiredPlugins: ['core', 'knowledge'],
          theme: 'dark',
        }),
        expect.anything()
      );
    });
  });

  test('EmbeddedEditor shows skeleton while loading', async () => {
    render(<EmbeddedEditor {...mockProps} />);

    // Should show loading skeleton initially
    expect(screen.getByText('Loading agent editor...')).toBeInTheDocument();
  });

  test('EmbeddedEditor handles errors with ErrorBoundary', async () => {
    // Mock AgentEditor to throw an error
    const ErrorComponent = () => {
      throw new Error('Test error for ErrorBoundary');
    };

    jest.doMock('@elizaos/client', () => ({
      AgentEditor: ErrorComponent,
      AgentEditorConfig: {},
    }));

    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

    render(<EmbeddedEditor {...mockProps} />);

    await waitFor(() => {
      expect(screen.getByText('⚠️ Editor Error')).toBeInTheDocument();
      expect(
        screen.getByText('The agent editor encountered an error. Please refresh the page.')
      ).toBeInTheDocument();
      expect(screen.getByText('Refresh Page')).toBeInTheDocument();
    });

    consoleSpy.mockRestore();
  });

  test('EmbeddedEditor passes correct callback functions', async () => {
    const consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
    const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

    const mockAgentEditor = jest.fn(({ onAgentCreated, onAgentUpdated, onError }) => {
      // Simulate callbacks being called
      onAgentCreated({ id: 'test-agent' });
      onAgentUpdated({ id: 'test-agent', name: 'Updated Agent' });
      onError(new Error('Test error'));

      return <div data-testid="mock-editor">Mock Editor</div>;
    });

    jest.doMock('@elizaos/client', () => ({
      AgentEditor: mockAgentEditor,
      AgentEditorConfig: {},
    }));

    render(<EmbeddedEditor {...mockProps} />);

    await waitFor(() => {
      expect(consoleSpy).toHaveBeenCalledWith('Platform agent created:', { id: 'test-agent' });
      expect(consoleSpy).toHaveBeenCalledWith('Platform agent updated:', {
        id: 'test-agent',
        name: 'Updated Agent',
      });
      expect(errorSpy).toHaveBeenCalledWith('Platform editor error:', expect.any(Error));
    });

    consoleSpy.mockRestore();
    errorSpy.mockRestore();
  });
});
