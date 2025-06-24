/**
 * @vitest-environment jsdom
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { describe, it, expect, mock, beforeEach } from 'bun:test';
import { HyperfyDashboard } from '../HyperfyDashboard';

// Mock fetch with proper typing
const mockFetch = mock() as any;
global.fetch = mockFetch;

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
    },
  });

  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
};

describe('HyperfyDashboard', () => {
  beforeEach(() => {
    mock.restore();
  });

  it('should render loading state initially', () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ connected: false }),
    });

    render(<HyperfyDashboard />, { wrapper: createWrapper() });

    expect(screen.getByText(/loading/i)).toBeDefined();
  });

  it('should display world status when connected', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        connected: true,
        worldId: 'test-world-123',
        worldName: 'Test World',
        agentCount: 1,
      }),
    });

    render(<HyperfyDashboard />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByText('Connected')).toBeDefined();
      expect(screen.getByText('Test World')).toBeDefined();
    });
  });

  it('should display disconnected status', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        connected: false,
      }),
    });

    render(<HyperfyDashboard />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByText('Disconnected')).toBeDefined();
    });
  });

  it('should handle join world form submission', async () => {
    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ connected: false }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true }),
      });

    render(<HyperfyDashboard />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByText('Join World')).toBeDefined();
    });

    const input = screen.getByPlaceholderText(/enter hyperfy world url/i);
    const button = screen.getByRole('button', { name: /join/i });

    fireEvent.change(input, { target: { value: 'https://hyperfy.xyz/test' } });
    fireEvent.click(button);

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith(
        '/api/hyperfy/join',
        expect.objectContaining({
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ worldUrl: 'https://hyperfy.xyz/test' }),
        })
      );
    });
  });

  it('should display error message on API failure', async () => {
    mockFetch.mockRejectedValueOnce(new Error('Network error'));

    render(<HyperfyDashboard />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByText(/error loading world status/i)).toBeDefined();
    });
  });

  it('should show multi-agent controls when enabled', async () => {
    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          connected: true,
          worldId: 'test-world-123',
          worldName: 'Test World',
          agentCount: 10,
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          enabled: true,
          running: true,
          agents: [
            { id: 'agent-1', name: 'Agent 1', position: { x: 0, y: 0, z: 0 }, status: 'active' },
            { id: 'agent-2', name: 'Agent 2', position: { x: 5, y: 0, z: 5 }, status: 'active' },
          ],
        }),
      });

    render(<HyperfyDashboard />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByText('Multi-Agent Mode')).toBeDefined();
      expect(screen.getByText('Running')).toBeDefined();
      expect(screen.getByText('2 agents active')).toBeDefined();
    });
  });
});
