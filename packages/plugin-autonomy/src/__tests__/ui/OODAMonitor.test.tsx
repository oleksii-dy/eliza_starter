import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, cleanup, waitFor, fireEvent, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { io } from 'socket.io-client';
import OODAMonitor from '../../ui/OODAMonitor';
import { OODAPhase, type OODAContext, type LoopMetrics } from '../../types';
import { mockSocket } from '../setup';

// Mock the types module
vi.mock('../../types', async () => {
  const actual = await vi.importActual('../../types');
  return {
    ...actual,
    OODAPhase: {
      IDLE: 'idle',
      OBSERVING: 'observing',
      ORIENTING: 'orienting',
      DECIDING: 'deciding',
      ACTING: 'acting',
      REFLECTING: 'reflecting',
    },
  };
});

describe('OODAMonitor Component', () => {
  let user: ReturnType<typeof userEvent.setup>;

  beforeEach(() => {
    user = userEvent.setup();
    vi.clearAllMocks();
    // Reset mock socket state
    mockSocket.connected = false;
    (mockSocket.on as any).mockClear();
    (mockSocket.emit as any).mockClear();
    (mockSocket.close as any).mockClear();
  });

  afterEach(() => {
    cleanup();
  });

  // Helper function to connect socket and send context
  const connectAndSendContext = async (context: any) => {
    const connectHandler = (mockSocket.on as any).mock.calls.find(
      (call: any[]) => call[0] === 'connect'
    )[1];
    
    await act(async () => {
      connectHandler();
    });

    const contextHandler = (mockSocket.on as any).mock.calls.find(
      (call: any[]) => call[0] === 'ooda:context'
    )[1];
    
    await act(async () => {
      contextHandler(context);
    });
  };

  // Helper function to connect socket and send metrics
  const connectAndSendMetrics = async (metrics: any) => {
    const connectHandler = (mockSocket.on as any).mock.calls.find(
      (call: any[]) => call[0] === 'connect'
    )[1];
    
    await act(async () => {
      connectHandler();
    });

    // Send context first (metrics need context to be displayed)
    const contextHandler = (mockSocket.on as any).mock.calls.find(
      (call: any[]) => call[0] === 'ooda:context'
    )[1];
    
    await act(async () => {
      contextHandler({
        runId: 'test-metrics-run',
        phase: OODAPhase.ACTING,
        startTime: Date.now() - 10000,
        endTime: null,
        observations: [],
        orientation: { currentGoals: [], strategies: [], worldModel: {} },
        decisions: [],
        actions: [],
        reflections: [],
        errors: [],
      });
    });

    const metricsHandler = (mockSocket.on as any).mock.calls.find(
      (call: any[]) => call[0] === 'ooda:metrics'
    )[1];
    
    await act(async () => {
      metricsHandler(metrics);
    });
  };

  describe('Component Rendering', () => {
    it('should render the main heading', () => {
      render(<OODAMonitor />);
      expect(screen.getByText('OODA Loop Monitor')).toBeInTheDocument();
    });

    it('should render with custom API URL', () => {
      render(<OODAMonitor apiUrl="http://custom:3000" />);
      expect(io).toHaveBeenCalledWith('http://custom:3000', {
        reconnectionAttempts: 5,
        reconnectionDelay: 1000,
      });
    });

    it('should render with default API URL', () => {
      render(<OODAMonitor />);
      expect(io).toHaveBeenCalledWith('http://localhost:3001', {
        reconnectionAttempts: 5,
        reconnectionDelay: 1000,
      });
    });

    it('should show disconnected state initially', () => {
      render(<OODAMonitor />);
      expect(screen.getByText('Disconnected')).toBeInTheDocument();
      expect(screen.getByText('Connecting to server...')).toBeInTheDocument();
    });
  });

  describe('WebSocket Connection Management', () => {
    it('should set up socket event listeners on mount', () => {
      render(<OODAMonitor />);
      
      expect(mockSocket.on).toHaveBeenCalledWith('connect', expect.any(Function));
      expect(mockSocket.on).toHaveBeenCalledWith('disconnect', expect.any(Function));
      expect(mockSocket.on).toHaveBeenCalledWith('connect_error', expect.any(Function));
      expect(mockSocket.on).toHaveBeenCalledWith('ooda:context', expect.any(Function));
      expect(mockSocket.on).toHaveBeenCalledWith('ooda:metrics', expect.any(Function));
    });

    it('should emit initial requests on connection', async () => {
      render(<OODAMonitor />);
      
      // Simulate connection
      const connectHandler = (mockSocket.on as any).mock.calls.find(
        (call: any[]) => call[0] === 'connect'
      )[1];
      
      await act(async () => {
        connectHandler();
      });

      await waitFor(() => {
        expect(mockSocket.emit).toHaveBeenCalledWith('request:context');
        expect(mockSocket.emit).toHaveBeenCalledWith('request:metrics');
      });
    });

    it('should show connected state when socket connects', async () => {
      render(<OODAMonitor />);
      
      const connectHandler = (mockSocket.on as any).mock.calls.find(
        (call: any[]) => call[0] === 'connect'
      )[1];
      
      await act(async () => {
        connectHandler();
      });

      await waitFor(() => {
        expect(screen.getByText('Connected')).toBeInTheDocument();
      });
    });

    it('should handle connection errors', async () => {
      render(<OODAMonitor />);
      
      const errorHandler = (mockSocket.on as any).mock.calls.find(
        (call: any[]) => call[0] === 'connect_error'
      )[1];
      
      await act(async () => {
        errorHandler(new Error('Connection failed'));
      });

      await waitFor(() => {
        expect(screen.getByText('Connection error: Connection failed')).toBeInTheDocument();
      });
    });

    it('should handle disconnection', async () => {
      render(<OODAMonitor />);
      
      // First connect
      const connectHandler = (mockSocket.on as any).mock.calls.find(
        (call: any[]) => call[0] === 'connect'
      )[1];
      await act(async () => {
        connectHandler();
      });

      // Then disconnect
      const disconnectHandler = (mockSocket.on as any).mock.calls.find(
        (call: any[]) => call[0] === 'disconnect'
      )[1];
      
      await act(async () => {
        disconnectHandler();
      });

      await waitFor(() => {
        expect(screen.getByText('Disconnected')).toBeInTheDocument();
      });
    });

    it('should close socket on component unmount', () => {
      const { unmount } = render(<OODAMonitor />);
      unmount();
      expect(mockSocket.close).toHaveBeenCalled();
    });

    it('should clear error state on successful connection', async () => {
      render(<OODAMonitor />);
      
      // Simulate error
      const errorHandler = (mockSocket.on as any).mock.calls.find(
        (call: any[]) => call[0] === 'connect_error'
      )[1];
      
      await act(async () => {
        errorHandler(new Error('Connection failed'));
      });

      await waitFor(() => {
        expect(screen.getByText('Connection error: Connection failed')).toBeInTheDocument();
      });

      // Then connect successfully
      const connectHandler = (mockSocket.on as any).mock.calls.find(
        (call: any[]) => call[0] === 'connect'
      )[1];
      
      await act(async () => {
        connectHandler();
      });

      await waitFor(() => {
        expect(screen.queryByText('Connection error: Connection failed')).not.toBeInTheDocument();
      });
    });
  });

  describe('Basic Context Display', () => {
    const mockContext: OODAContext = {
      runId: 'test-run-123',
      phase: OODAPhase.ORIENTING,
      startTime: Date.now() - 10000,
      endTime: null,
      observations: [],
      orientation: {
        currentGoals: [],
        strategies: [],
        worldModel: {},
      },
      decisions: [],
      actions: [],
      reflections: [],
      errors: [],
    };

    it('should display run ID when context received', async () => {
      render(<OODAMonitor />);
      
      await connectAndSendContext(mockContext);

      await waitFor(() => {
        expect(screen.getByText('test-run-123')).toBeInTheDocument();
      });
    });

    it('should show waiting message when connected but no context', async () => {
      render(<OODAMonitor />);
      
      const connectHandler = (mockSocket.on as any).mock.calls.find(
        (call: any[]) => call[0] === 'connect'
      )[1];
      
      await act(async () => {
        connectHandler();
      });

      await waitFor(() => {
        expect(screen.getByText('Waiting for OODA data...')).toBeInTheDocument();
      });
    });
  });

  describe('Phase Display', () => {
    const phaseTests = [
      { phase: OODAPhase.IDLE, displayName: 'Idle' },
      { phase: OODAPhase.OBSERVING, displayName: 'Observing' },
      { phase: OODAPhase.ORIENTING, displayName: 'Orienting' },
      { phase: OODAPhase.DECIDING, displayName: 'Deciding' },
      { phase: OODAPhase.ACTING, displayName: 'Acting' },
      { phase: OODAPhase.REFLECTING, displayName: 'Reflecting' },
    ];

    phaseTests.forEach(({ phase, displayName }) => {
      it(`should display ${displayName} phase correctly`, async () => {
        const contextWithPhase = {
          runId: 'test-run',
          phase,
          startTime: Date.now(),
          endTime: null,
          observations: [],
          orientation: { currentGoals: [], strategies: [], worldModel: {} },
          decisions: [],
          actions: [],
          reflections: [],
          errors: [],
        };

        render(<OODAMonitor />);
        
        await connectAndSendContext(contextWithPhase);

        await waitFor(() => {
          expect(screen.getByText(displayName)).toBeInTheDocument();
        });
      });
    });
  });

  describe('Metrics Display', () => {
    const mockMetrics: LoopMetrics = {
      cycleTime: 5500, // 5.5 seconds
      actionSuccessRate: 0.85,
      errorRate: 0.1,
      decisionsPerCycle: 3,
      resourceEfficiency: 0.92,
      goalProgress: 0.67,
    };

    it('should display all metrics when received', async () => {
      render(<OODAMonitor />);
      
      await connectAndSendMetrics(mockMetrics);

      await waitFor(() => {
        expect(screen.getByText('5.5s')).toBeInTheDocument(); // Cycle time
        expect(screen.getByText('85.0%')).toBeInTheDocument(); // Success rate
        expect(screen.getByText('10.0%')).toBeInTheDocument(); // Error rate
        expect(screen.getByText('3')).toBeInTheDocument(); // Decisions per cycle
        expect(screen.getByText('92.0%')).toBeInTheDocument(); // Resource efficiency
        expect(screen.getByText('67.0%')).toBeInTheDocument(); // Goal progress
      });
    });

    it('should format duration correctly for milliseconds', async () => {
      render(<OODAMonitor />);
      
      await connectAndSendMetrics({ ...mockMetrics, cycleTime: 500 });

      await waitFor(() => {
        expect(screen.getByText('500ms')).toBeInTheDocument();
      });
    });

    it('should format duration correctly for minutes', async () => {
      render(<OODAMonitor />);
      
      await connectAndSendMetrics({ ...mockMetrics, cycleTime: 65000 });

      await waitFor(() => {
        expect(screen.getByText('1.1m')).toBeInTheDocument();
      });
    });
  });

  describe('Goals Display', () => {
    const mockContextWithGoals: OODAContext = {
      runId: 'test-run-with-goals',
      phase: OODAPhase.ORIENTING,
      startTime: Date.now() - 10000,
      endTime: null,
      observations: [],
      orientation: {
        currentGoals: [
          {
            id: 'goal-1',
            description: 'Test Goal One',
            priority: 1,
            progress: 0.5,
            type: 'system',
            status: 'active',
            createdAt: Date.now() - 10000,
          },
          {
            id: 'goal-2',
            description: 'Test Goal Two',
            priority: 2,
            progress: 0.75,
            type: 'user',
            status: 'active',
            createdAt: Date.now() - 5000,
          },
        ],
        strategies: [],
        worldModel: {},
      },
      decisions: [],
      actions: [],
      reflections: [],
      errors: [],
    };

    it('should display goals with descriptions and priorities', async () => {
      render(<OODAMonitor />);
      
      await connectAndSendContext(mockContextWithGoals);

      await waitFor(() => {
        expect(screen.getByText('Active Goals')).toBeInTheDocument();
        expect(screen.getByText('Test Goal One')).toBeInTheDocument();
        expect(screen.getByText('Priority: 1')).toBeInTheDocument();
        expect(screen.getByText('Test Goal Two')).toBeInTheDocument();
        expect(screen.getByText('Priority: 2')).toBeInTheDocument();
      });
    });
  });

  describe('Observations Display', () => {
    const mockContextWithObservations: OODAContext = {
      runId: 'test-run-with-observations',
      phase: OODAPhase.OBSERVING,
      startTime: Date.now() - 10000,
      endTime: null,
      observations: [
        {
          type: 'system',
          source: 'test-source',
          data: { test: 'observation' },
          timestamp: Date.now() - 5000,
          relevance: 0.8,
        },
      ],
      orientation: {
        currentGoals: [],
        strategies: [],
        worldModel: {},
      },
      decisions: [],
      actions: [],
      reflections: [],
      errors: [],
    };

    it('should display recent observations', async () => {
      render(<OODAMonitor />);
      
      await connectAndSendContext(mockContextWithObservations);

      await waitFor(() => {
        expect(screen.getByText('Recent Observations')).toBeInTheDocument();
        expect(screen.getByText('system')).toBeInTheDocument();
        expect(screen.getByText('Source: test-source | Relevance: 80%')).toBeInTheDocument();
      });
    });
  });

  describe('Actions Display', () => {
    const mockContextWithActions: OODAContext = {
      runId: 'test-run-with-actions',
      phase: OODAPhase.ACTING,
      startTime: Date.now() - 10000,
      endTime: null,
      observations: [],
      orientation: {
        currentGoals: [],
        strategies: [],
        worldModel: {},
      },
      decisions: [],
      actions: [
        {
          id: 'action-1',
          actionName: 'TEST_ACTION',
          parameters: {},
          status: 'succeeded',
          startTime: Date.now() - 3000,
          endTime: Date.now() - 2000,
          result: { success: true },
        },
      ],
      reflections: [],
      errors: [],
    };

    it('should display recent actions with status', async () => {
      render(<OODAMonitor />);
      
      await connectAndSendContext(mockContextWithActions);

      await waitFor(() => {
        expect(screen.getByText('Recent Actions')).toBeInTheDocument();
        expect(screen.getByText('TEST_ACTION')).toBeInTheDocument();
        expect(screen.getByText('succeeded')).toBeInTheDocument();
      });
    });
  });

  describe('Error Display', () => {
    const mockContextWithErrors: OODAContext = {
      runId: 'test-run-with-errors',
      phase: OODAPhase.ACTING,
      startTime: Date.now() - 10000,
      endTime: null,
      observations: [],
      orientation: {
        currentGoals: [],
        strategies: [],
        worldModel: {},
      },
      decisions: [],
      actions: [],
      reflections: [],
      errors: [
        {
          message: 'Test error occurred',
          stack: 'Error: Test error occurred\n    at test.js:1:1',
          timestamp: Date.now() - 1000,
        },
      ],
    };

    it('should display errors when present', async () => {
      render(<OODAMonitor />);
      
      await connectAndSendContext(mockContextWithErrors);

      await waitFor(() => {
        expect(screen.getByText('Recent Errors')).toBeInTheDocument();
        expect(screen.getByText('Test error occurred')).toBeInTheDocument();
      });
    });

    it('should not show error section when no errors', async () => {
      const contextWithoutErrors = {
        runId: 'test-run-no-errors',
        phase: OODAPhase.ACTING,
        startTime: Date.now() - 10000,
        endTime: null,
        observations: [],
        orientation: { currentGoals: [], strategies: [], worldModel: {} },
        decisions: [],
        actions: [],
        reflections: [],
        errors: [],
      };

      render(<OODAMonitor />);
      
      await connectAndSendContext(contextWithoutErrors);

      await waitFor(() => {
        expect(screen.queryByText('Recent Errors')).not.toBeInTheDocument();
      });
    });
  });

  describe('Component State Management', () => {
    it('should handle multiple rapid context updates', async () => {
      render(<OODAMonitor />);
      
      const contexts = [
        { runId: 'run-1', phase: OODAPhase.OBSERVING },
        { runId: 'run-2', phase: OODAPhase.ORIENTING },
        { runId: 'run-3', phase: OODAPhase.DECIDING },
      ].map(ctx => ({
        ...ctx,
        startTime: Date.now(),
        endTime: null,
        observations: [],
        orientation: { currentGoals: [], strategies: [], worldModel: {} },
        decisions: [],
        actions: [],
        reflections: [],
        errors: [],
      }));

      // Connect first
      const connectHandler = (mockSocket.on as any).mock.calls.find(
        (call: any[]) => call[0] === 'connect'
      )[1];
      
      await act(async () => {
        connectHandler();
      });

      // Send multiple contexts rapidly
      const contextHandler = (mockSocket.on as any).mock.calls.find(
        (call: any[]) => call[0] === 'ooda:context'
      )[1];

      for (const context of contexts) {
        await act(async () => {
          contextHandler(context);
        });
      }

      await waitFor(() => {
        expect(screen.getByText('run-3')).toBeInTheDocument();
        expect(screen.getByText('Deciding')).toBeInTheDocument();
      });
    });
  });

  describe('Accessibility', () => {
    it('should have proper heading structure', () => {
      render(<OODAMonitor />);
      
      expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('OODA Loop Monitor');
    });

    it('should show proper connection status', async () => {
      render(<OODAMonitor />);
      
      const connectHandler = (mockSocket.on as any).mock.calls.find(
        (call: any[]) => call[0] === 'connect'
      )[1];
      
      await act(async () => {
        connectHandler();
      });

      await waitFor(() => {
        const connectedIndicator = screen.getByText('Connected');
        expect(connectedIndicator).toHaveClass('text-green-700');
      });
    });
  });
});