import { useState, useEffect, useCallback } from 'react';
import type { GameState, GameMode, ExecutionEnvironment, Project, AgentStatus } from '../types/gameTypes';

const initialGameState: GameState = {
  mode: 'manual',
  orchestratorAgent: undefined,
  coderAgents: [],
  activeProjects: [],
  executionEnvironment: 'local-sandbox',
  communicationRooms: [],
  completedTasks: [],
  activeGoals: [],
  isInitialized: false,
  lastActivity: Date.now()
};

export function useGameState() {
  const [gameState, setGameState] = useState<GameState>(initialGameState);
  const [agentStatuses, setAgentStatuses] = useState<Map<string, AgentStatus>>(new Map());
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Initialize game state by connecting to actual ElizaOS API
  const initializeGame = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      // Get list of agents from actual ElizaOS API server
      const response = await fetch('http://localhost:3000/api/agents');

      if (!response.ok) {
        throw new Error('Failed to connect to ElizaOS API server');
      }

      const { data } = await response.json();
      
      // Find the game orchestrator agent
      const orchestrator = data.agents?.find((agent: any) => 
        agent.name === 'GameOrchestrator' || agent.characterName === 'GameOrchestrator'
      );

      if (!orchestrator) {
        throw new Error('Game Orchestrator agent not found. Please ensure the autonomous coding game is running.');
      }

      setGameState(prev => ({
        ...prev,
        orchestratorAgent: orchestrator,
        isInitialized: true,
        lastActivity: Date.now()
      }));

      console.log('[GameState] Game initialized with orchestrator:', orchestrator.name);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to initialize game');
      console.error('[GameState] Initialization error:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Update game mode using real ElizaOS messaging
  const updateGameMode = useCallback(async (mode: GameMode) => {
    setIsLoading(true);
    setError(null);

    try {
      if (!gameState.orchestratorAgent) {
        throw new Error('Game orchestrator not available');
      }

      // Send message to orchestrator using ElizaOS API
      const messageText = mode === 'auto' ? 'enable autonomous mode' : 'disable autonomous mode';
      
      const response = await fetch('http://localhost:3000/api/messaging/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          channel_id: `room_${gameState.orchestratorAgent.id}`,
          server_id: 'game-server',
          author_id: 'user',
          content: messageText,
          source_type: 'user',
          raw_message: {
            text: messageText,
            type: 'game_command'
          },
          metadata: {
            gameCommand: mode === 'auto' ? 'ENABLE_AUTO_MODE' : 'DISABLE_AUTO_MODE',
            requestedMode: mode
          }
        })
      });

      if (!response.ok) {
        throw new Error(`Failed to change mode to ${mode}`);
      }

      setGameState(prev => ({
        ...prev,
        mode,
        lastActivity: Date.now()
      }));

      console.log(`[GameState] Mode changed to: ${mode}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update game mode');
      console.error('[GameState] Mode change error:', err);
    } finally {
      setIsLoading(false);
    }
  }, [gameState.orchestratorAgent]);

  // Update execution environment
  const updateExecutionEnvironment = useCallback((environment: ExecutionEnvironment) => {
    setGameState(prev => ({
      ...prev,
      executionEnvironment: environment,
      lastActivity: Date.now()
    }));
    console.log(`[GameState] Execution environment changed to: ${environment}`);
  }, []);

  // Add project by sending message to orchestrator
  const addProject = useCallback(async (projectData: {
    name: string;
    description: string;
    requirements: string[];
  }) => {
    setIsLoading(true);
    setError(null);

    try {
      if (!gameState.orchestratorAgent) {
        throw new Error('Game orchestrator not available');
      }

      // Send project creation message to orchestrator
      const messageText = `create project: ${projectData.name} - ${projectData.description}`;
      
      const response = await fetch('http://localhost:3000/api/messaging/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          channel_id: `room_${gameState.orchestratorAgent.id}`,
          server_id: 'game-server',
          author_id: 'user',
          content: messageText,
          source_type: 'user',
          raw_message: {
            text: messageText,
            type: 'project_creation',
            projectData
          },
          metadata: {
            gameCommand: 'CREATE_PROJECT',
            projectData
          }
        })
      });

      if (!response.ok) {
        throw new Error('Failed to create project');
      }

      // Create local project object for immediate UI update
      const project: Project = {
        id: `project_${Date.now()}`,
        name: projectData.name,
        description: projectData.description,
        requirements: projectData.requirements,
        status: 'planning',
        artifacts: [],
        createdAt: Date.now(),
        updatedAt: Date.now(),
        progress: 0
      };

      setGameState(prev => ({
        ...prev,
        activeProjects: [...prev.activeProjects, project],
        lastActivity: Date.now()
      }));

      console.log('[GameState] Project creation requested:', projectData.name);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create project');
      console.error('[GameState] Project creation error:', err);
    } finally {
      setIsLoading(false);
    }
  }, [gameState.orchestratorAgent]);

  // Update project (this would typically come from real-time updates)
  const updateProject = useCallback((projectId: string, updates: Partial<Project>) => {
    setGameState(prev => ({
      ...prev,
      activeProjects: prev.activeProjects.map(p => 
        p.id === projectId ? { ...p, ...updates, updatedAt: Date.now() } : p
      ),
      lastActivity: Date.now()
    }));
    console.log('[GameState] Project updated:', projectId, updates);
  }, []);

  // Add coder agent (typically would come from orchestrator notifications)
  const addCoderAgent = useCallback((agent: any) => {
    setGameState(prev => ({
      ...prev,
      coderAgents: [...prev.coderAgents, agent],
      lastActivity: Date.now()
    }));

    // Initialize agent status
    const status: AgentStatus = {
      id: agent.id,
      name: agent.name,
      status: 'idle',
      lastActivity: Date.now(),
      resourceUsage: { cpu: 0, memory: 0 }
    };

    setAgentStatuses(prev => new Map(prev).set(agent.id, status));
    console.log('[GameState] Coder agent added:', agent.name);
  }, []);

  // Update agent status
  const updateAgentStatus = useCallback((agentId: string, updates: Partial<AgentStatus>) => {
    setAgentStatuses(prev => {
      const newMap = new Map(prev);
      const current = newMap.get(agentId);
      if (current) {
        newMap.set(agentId, { ...current, ...updates, lastActivity: Date.now() });
      }
      return newMap;
    });
  }, []);

  // Emergency stop using real ElizaOS messaging
  const emergencyStop = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      if (!gameState.orchestratorAgent) {
        throw new Error('Game orchestrator not available');
      }

      // Send pause game message to orchestrator
      const response = await fetch('http://localhost:3000/api/messaging/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          channel_id: `room_${gameState.orchestratorAgent.id}`,
          server_id: 'game-server',
          author_id: 'user',
          content: 'pause game',
          source_type: 'user',
          raw_message: {
            text: 'pause game',
            type: 'emergency_stop'
          },
          metadata: {
            gameCommand: 'PAUSE_GAME',
            reason: 'emergency_stop'
          }
        })
      });

      if (!response.ok) {
        throw new Error('Failed to pause game');
      }

      setGameState(prev => ({
        ...prev,
        mode: 'paused',
        lastActivity: Date.now()
      }));

      // Update all agent statuses to offline
      setAgentStatuses(prev => {
        const newMap = new Map();
        prev.forEach((status, id) => {
          newMap.set(id, { ...status, status: 'offline', lastActivity: Date.now() });
        });
        return newMap;
      });

      console.log('[GameState] Emergency stop executed');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Emergency stop failed');
      console.error('[GameState] Emergency stop error:', err);
    } finally {
      setIsLoading(false);
    }
  }, [gameState.orchestratorAgent]);

  // Reset game state
  const resetGame = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      // First execute emergency stop
      await emergencyStop();
      
      // Reset local state
      setGameState(initialGameState);
      setAgentStatuses(new Map());

      console.log('[GameState] Game reset');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Reset failed');
      console.error('[GameState] Reset error:', err);
    } finally {
      setIsLoading(false);
    }
  }, [emergencyStop]);

  // Fetch current game state from ElizaOS API
  const refreshGameState = useCallback(async () => {
    if (!gameState.orchestratorAgent) return;

    try {
      // In a real implementation, this would query the orchestrator service
      // For now, we'll just update the last activity
      setGameState(prev => ({
        ...prev,
        lastActivity: Date.now()
      }));
    } catch (err) {
      console.error('[GameState] Failed to refresh game state:', err);
    }
  }, [gameState.orchestratorAgent]);

  // Auto-initialize on mount
  useEffect(() => {
    if (!gameState.isInitialized) {
      initializeGame();
    }
  }, [gameState.isInitialized, initializeGame]);

  // Periodic refresh of game state
  useEffect(() => {
    if (gameState.isInitialized) {
      const interval = setInterval(refreshGameState, 5000); // Refresh every 5 seconds
      return () => clearInterval(interval);
    }
  }, [gameState.isInitialized, refreshGameState]);

  return {
    gameState,
    agentStatuses: Array.from(agentStatuses.values()),
    isLoading,
    error,
    actions: {
      initializeGame,
      updateGameMode,
      updateExecutionEnvironment,
      addProject,
      updateProject,
      addCoderAgent,
      updateAgentStatus,
      emergencyStop,
      resetGame,
      refreshGameState
    }
  };
}