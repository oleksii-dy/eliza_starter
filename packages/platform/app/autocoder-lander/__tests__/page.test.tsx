import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import AutocoderLander from '../page';
import { useRouter } from 'next/navigation';
import { useUnifiedAuth } from '@/src/hooks/useUnifiedAuth';
import { useAutocoderWebSocket } from '@/lib/hooks/useAutocoderWebSocket';

// Mock Next.js navigation
vi.mock('next/navigation', () => ({
  useRouter: vi.fn(),
}));

// Mock auth hook
vi.mock('@/src/hooks/useUnifiedAuth', () => ({
  useUnifiedAuth: vi.fn(),
}));

// Mock WebSocket hook
vi.mock('@/lib/hooks/useAutocoderWebSocket', () => ({
  useAutocoderWebSocket: vi.fn(),
}));

// Mock ThemeToggle component
vi.mock('@/components/theme/theme-switcher', () => ({
  ThemeToggle: () => <div data-testid="theme-toggle">Theme Toggle</div>,
}));

describe('AutocoderLander', () => {
  const mockRouter = {
    push: vi.fn(),
    back: vi.fn(),
    forward: vi.fn(),
    refresh: vi.fn(),
    replace: vi.fn(),
    prefetch: vi.fn(),
  } as any;

  const mockAuth = {
    isAuthenticated: false,
    user: null,
    platform: 'web' as const,
    waitForInit: vi.fn().mockResolvedValue(undefined),
    signInWithOAuth: vi.fn(),
    signOut: vi.fn(),
    refreshToken: vi.fn(),
    getOAuthProviders: vi.fn(),
    isLoading: false,
    error: null,
  } as any;

  const mockWebSocket = {
    isConnected: true,
    messages: [],
    sendMessage: vi.fn(),
    subscribe: vi.fn(),
    unsubscribe: vi.fn(),
    projectUpdates: [],
    buildLogs: [],
    clearMessages: vi.fn(),
  } as any;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useRouter).mockReturnValue(mockRouter);
    vi.mocked(useUnifiedAuth).mockReturnValue(mockAuth);
    vi.mocked(useAutocoderWebSocket).mockReturnValue(null as any);
  });

  it('should render the landing page with main elements', async () => {
    await mockAuth.waitForInit();
    
    render(<AutocoderLander />);

    // Check for main heading - using regex to match text that may be broken up
    expect(screen.getByText('AI-Powered')).toBeInTheDocument();
    expect(screen.getByText(/autocoding/i)).toBeInTheDocument();
    expect(screen.getByText(/for defi/i)).toBeInTheDocument();

    // Check for input
    expect(screen.getByPlaceholderText('What do you want to build?')).toBeInTheDocument();

    // Check for start button
    expect(screen.getByText("LET'S COOK")).toBeInTheDocument();

    // Check for features
    expect(screen.getByText('Smart Workflows')).toBeInTheDocument();
    expect(screen.getByText('Natural Language')).toBeInTheDocument();
    expect(screen.getByText('Instant Deployment')).toBeInTheDocument();
  });

  it('should show example prompts', () => {
    render(<AutocoderLander />);

    expect(screen.getByText('I think interest rates are going to go up. How do I make money on that?')).toBeInTheDocument();
    expect(screen.getByText('Build me a trading bot that monitors crypto prices')).toBeInTheDocument();
    expect(screen.getByText('Create a DeFi yield farming strategy')).toBeInTheDocument();
  });

  it('should update input when example prompt is clicked', () => {
    render(<AutocoderLander />);

    const exampleButton = screen.getByText('Build me a trading bot that monitors crypto prices');
    fireEvent.click(exampleButton);

    const input = screen.getByPlaceholderText('What do you want to build?') as HTMLInputElement;
    expect(input.value).toBe('Build me a trading bot that monitors crypto prices');
  });

  it('should redirect to login when unauthenticated user tries to start chat', () => {
    render(<AutocoderLander />);

    const input = screen.getByPlaceholderText('What do you want to build?') as HTMLInputElement;
    fireEvent.change(input, { target: { value: 'Build me a DeFi app' } });

    const startButton = screen.getByText("LET'S COOK");
    fireEvent.click(startButton);

    expect(mockRouter.push).toHaveBeenCalledWith('/auth/login?returnTo=/autocoder-lander');
  });

  it('should save prompt to sessionStorage when redirecting to login', () => {
    render(<AutocoderLander />);

    const testPrompt = 'Build me a DeFi app';
    const input = screen.getByPlaceholderText('What do you want to build?') as HTMLInputElement;
    fireEvent.change(input, { target: { value: testPrompt } });

    const startButton = screen.getByText("LET'S COOK");
    fireEvent.click(startButton);

    expect(sessionStorage.getItem('autocoderPrompt')).toBe(testPrompt);
  });

  it('should start chat when authenticated user clicks start', async () => {
    // Mock authenticated user
    vi.mocked(useUnifiedAuth).mockReturnValue({
      ...mockAuth,
      isAuthenticated: true,
      user: { id: 'test-user-id', email: 'test@example.com' },
    });

    // Mock WebSocket connection
    vi.mocked(useAutocoderWebSocket).mockReturnValue(mockWebSocket);

    // Mock fetch response
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ projectId: 'test-project-id', status: 'created' }),
    }) as any;

    render(<AutocoderLander />);

    const input = screen.getByPlaceholderText('What do you want to build?') as HTMLInputElement;
    fireEvent.change(input, { target: { value: 'Build me a DeFi app' } });

    const startButton = screen.getByText("LET'S COOK");
    fireEvent.click(startButton);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith('/api/autocoder/eliza', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ prompt: 'Build me a DeFi app' }),
      });
    });
  });

  it('should show the demo conversation animation', async () => {
    await mockAuth.waitForInit();
    
    const { container } = render(<AutocoderLander />);

    // The demo shows the first user message immediately
    expect(screen.getByText(/I think interest rates/)).toBeInTheDocument();

    // Wait for the agent response to appear
    await waitFor(() => {
      const agentResponses = container.querySelectorAll('.bg-gray-100');
      expect(agentResponses.length).toBeGreaterThan(0);
    }, { timeout: 6000 });
  });

  it('should display features section', () => {
    render(<AutocoderLander />);

    expect(screen.getByText('Smart Workflows')).toBeInTheDocument();
    expect(screen.getByText('Natural Language')).toBeInTheDocument();
    expect(screen.getByText('Instant Deployment')).toBeInTheDocument();
  });

  it('should show login and signup buttons when not authenticated', () => {
    render(<AutocoderLander />);

    expect(screen.getByText('Sign in')).toBeInTheDocument();
    expect(screen.getByText('Get Started')).toBeInTheDocument();
  });

  it('should handle Enter key press to start chat', () => {
    render(<AutocoderLander />);

    const input = screen.getByPlaceholderText('What do you want to build?') as HTMLInputElement;
    fireEvent.change(input, { target: { value: 'Build me a DeFi app' } });
    fireEvent.keyPress(input, { key: 'Enter', code: 'Enter', charCode: 13 });

    expect(mockRouter.push).toHaveBeenCalledWith('/auth/login?returnTo=/autocoder-lander');
  });
});
