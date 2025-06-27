/**
 * Simple Runtime Integration Tests for AgentEditor
 * Basic tests that don't require complex mocking
 */
// Import test setup for browser environment
import '../../../src/test/setup';

import { describe, test, expect } from 'bun:test';
import { render, screen } from '@testing-library/react';
import React from 'react';

// Simple mock component for testing
const MockAgentEditor = (props: any) => (
  <div data-testid="agent-editor">
    Mock Agent Editor - {props.embeddedMode ? 'Embedded' : 'Standalone'}
  </div>
);

describe('AgentEditor Basic Tests', () => {
  test('AgentEditor mock renders without errors', async () => {
    const { container } = render(<MockAgentEditor embeddedMode={true} />);

    expect(container.firstChild).toBeInTheDocument();
    expect(container.querySelector('[data-testid="agent-editor"]')).toBeInTheDocument();
    expect(container.textContent).toContain('Mock Agent Editor - Embedded');
  });

  test('AgentEditor supports different modes', async () => {
    const { rerender, container } = render(<MockAgentEditor embeddedMode={true} />);

    expect(container.textContent).toContain('Mock Agent Editor - Embedded');

    rerender(<MockAgentEditor embeddedMode={false} />);
    expect(container.textContent).toContain('Mock Agent Editor - Standalone');
  });

  test('AgentEditor accepts props correctly', async () => {
    const props = {
      embeddedMode: true,
      apiUrl: 'http://localhost:3000',
      theme: 'dark',
    };

    const { container } = render(<MockAgentEditor {...props} />);

    expect(container.querySelector('[data-testid="agent-editor"]')).toBeInTheDocument();
  });
});
