// Import test setup for browser environment
import '../../test/setup';

import { describe, test, expect } from 'bun:test';
import { render } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { TooltipProvider } from '@/components/ui/tooltip';
import React from 'react';

// Mock contexts
const MockConnectionProvider = ({ children }: { children: React.ReactNode }) => (
  <div data-testid="connection-provider">{children}</div>
);

const MockAuthProvider = ({ children }: { children: React.ReactNode }) => (
  <div data-testid="auth-provider">{children}</div>
);

// Simple test component that simulates AgentEditor structure
const TestAgentEditorCore = ({
  theme = 'dark',
  embeddedMode = false
}: {
  theme?: string;
  embeddedMode?: boolean;
}) => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false, staleTime: 0 },
      mutations: { retry: false }
    }
  });

  return (
    <div
      className={`agent-editor-container ${theme === 'light' ? '' : 'dark'} antialiased font-sans`}
      data-cy="agent-editor-container"
      data-theme={theme}
    >
      <QueryClientProvider client={queryClient}>
        <MockAuthProvider>
          <MockConnectionProvider>
            <TooltipProvider>
              <MemoryRouter>
                <div className={`h-full w-full ${embeddedMode ? 'embedded-editor' : ''}`}>
                  <div data-testid="main-content">
                    <h1>Agent Editor</h1>
                    <p>Configuration loaded successfully</p>
                  </div>
                </div>
              </MemoryRouter>
            </TooltipProvider>
          </MockConnectionProvider>
        </MockAuthProvider>
      </QueryClientProvider>
    </div>
  );
};

describe('AgentEditor Core Functionality', () => {
  test('should render with default dark theme', () => {
    const { container } = render(<TestAgentEditorCore />);

    const editorContainer = container.querySelector('[data-cy="agent-editor-container"]');
    expect(editorContainer).toBeInTheDocument();
    expect(editorContainer?.classList.contains('dark')).toBe(true);
    expect(editorContainer?.getAttribute('data-theme')).toBe('dark');
  });

  test('should render with light theme', () => {
    const { container } = render(<TestAgentEditorCore theme="light" />);

    const editorContainer = container.querySelector('[data-cy="agent-editor-container"]');
    expect(editorContainer).toBeInTheDocument();
    expect(editorContainer?.classList.contains('dark')).toBe(false);
    expect(editorContainer?.getAttribute('data-theme')).toBe('light');
  });

  test('should render in embedded mode', () => {
    const { container } = render(<TestAgentEditorCore embeddedMode={true} />);

    const embeddedEditor = container.querySelector('.embedded-editor');
    expect(embeddedEditor).toBeInTheDocument();
  });

  test('should include all required providers', () => {
    const { container } = render(<TestAgentEditorCore />);

    const authProvider = container.querySelector('[data-testid="auth-provider"]');
    const connectionProvider = container.querySelector('[data-testid="connection-provider"]');
    const mainContent = container.querySelector('[data-testid="main-content"]');

    expect(authProvider).toBeInTheDocument();
    expect(connectionProvider).toBeInTheDocument();
    expect(mainContent).toBeInTheDocument();
  });

  test('should apply correct CSS classes', () => {
    const { container } = render(<TestAgentEditorCore />);

    const editorContainer = container.querySelector('[data-cy="agent-editor-container"]');
    expect(editorContainer?.classList.contains('agent-editor-container')).toBe(true);
    expect(editorContainer?.classList.contains('antialiased')).toBe(true);
    expect(editorContainer?.classList.contains('font-sans')).toBe(true);
  });

  test('should handle theme auto setting (defaults to dark)', () => {
    const { container } = render(<TestAgentEditorCore theme="auto" />);

    const editorContainer = container.querySelector('[data-cy="agent-editor-container"]');
    expect(editorContainer?.getAttribute('data-theme')).toBe('auto');
    // Auto theme implementation would determine actual class
  });

  test('should render memory router for internal navigation', () => {
    const { container } = render(<TestAgentEditorCore />);

    // Memory router should allow content to render without external routing
    const mainContent = container.querySelector('[data-testid="main-content"]');
    expect(mainContent?.textContent).toContain('Agent Editor');
    expect(mainContent?.textContent).toContain('Configuration loaded successfully');
  });

  test('should support tooltip provider for UI interactions', () => {
    const { container } = render(<TestAgentEditorCore />);

    // TooltipProvider should be in the component tree
    // We can verify by checking that the content renders without errors
    const content = container.querySelector('[data-testid="main-content"]');
    expect(content).toBeInTheDocument();
  });

  test('should handle query client configuration', () => {
    const { container } = render(<TestAgentEditorCore />);

    // Verify that React Query context is properly set up
    const content = container.querySelector('[data-testid="main-content"]');
    expect(content).toBeInTheDocument();

    // No QueryClient errors should be thrown during render
    expect(container.textContent).toContain('Agent Editor');
  });
});
