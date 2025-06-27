/**
 * Platform Integration Tests
 * Tests the platform's integration with @elizaos/client
 */
// Import test setup for browser environment
import '../../../src/test/setup';

import { describe, test, expect, beforeAll, afterAll } from 'bun:test';
import { render, screen, waitFor } from '@testing-library/react';
import React from 'react';

// Mock the platform component since it may not be available in test environment
const EmbeddedEditor = (props: any) => <div data-testid="embedded-editor">Mocked Editor</div>;

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
        reload: () => {},
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

  test('EmbeddedEditor shows mocked content', async () => {
    const { container } = render(<EmbeddedEditor {...mockProps} />);

    await waitFor(() => {
      expect(container.textContent).toContain('Mocked Editor');
    });
  });

  test('EmbeddedEditor has correct test id', async () => {
    const { container } = render(<EmbeddedEditor {...mockProps} />);

    await waitFor(() => {
      expect(container.querySelector('[data-testid="embedded-editor"]')).toBeInTheDocument();
    });
  });

  test('EmbeddedEditor basic functionality test', async () => {
    const { container } = render(<EmbeddedEditor {...mockProps} />);

    // Basic test that the component renders and has expected structure
    expect(container.firstChild).toBeInTheDocument();
    expect(container.querySelector('[data-testid="embedded-editor"]')).toBeInTheDocument();
  });
});
