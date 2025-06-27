import { useGameState } from '../hooks/useGameState';
import { useAgentCommunication } from '../hooks/useAgentCommunication';
import { AdminControls } from './AdminControls';
import { AgentMonitor } from './AgentMonitor';
import { ChatRoom } from './ChatRoom';
import { TaskProgress } from './TaskProgress';
import { CodeViewer } from './CodeViewer';
import { ProjectCreator } from './ProjectCreator';

export function GameDashboard() {
  const { gameState, agentStatuses, isLoading, error, actions } = useGameState();
  const { 
    isConnected, 
    messages, 
    activeRequests, 
    actions: commActions 
  } = useAgentCommunication(gameState.communicationRooms.map(room => room.id));

  const handleCreateProject = async (projectData: {
    name: string;
    description: string;
    requirements: string[];
  }) => {
    try {
      // Create project via orchestrator
      if (gameState.orchestratorAgent) {
        await commActions.sendMessage(
          'orchestrator_room',
          `Create new project: ${projectData.name}. Description: ${projectData.description}. Requirements: ${projectData.requirements.join(', ')}`,
          gameState.orchestratorAgent.id
        );
      }
    } catch (error) {
      console.error('[GameDashboard] Failed to create project:', error);
    }
  };

  const handleModeChange = async (mode: 'auto' | 'manual' | 'paused') => {
    await actions.updateGameMode(mode);
  };

  const handleEmergencyStop = async () => {
    await actions.emergencyStop();
  };

  if (isLoading && !gameState.isInitialized) {
    return (
      <div className="game-dashboard loading">
        <div className="loading-spinner">
          <div className="spinner"></div>
          <p>Initializing Autonomous Coding Game...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="game-dashboard error">
        <div className="error-container">
          <h2>Error</h2>
          <p>{error}</p>
          <button onClick={() => actions.initializeGame()}>
            Retry Initialization
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="game-dashboard" data-testid="game-dashboard">
      <header className="dashboard-header">
        <div className="header-title">
          <h1>🎮 Autonomous Coding Game</h1>
          <div className="connection-indicator">
            <span className={`status-dot ${isConnected ? 'connected' : 'disconnected'}`}></span>
            <span>{isConnected ? 'Connected' : 'Disconnected'}</span>
          </div>
        </div>
        
        <AdminControls 
          mode={gameState.mode}
          onModeChange={handleModeChange}
          onEmergencyStop={handleEmergencyStop}
          isLoading={isLoading}
          data-testid="admin-controls"
        />
      </header>

      <div className="dashboard-grid">
        {/* Agent Monitor Panel */}
        <section className="panel agent-monitor" data-testid="agent-monitor">
          <div className="panel-header">
            <h2>🤖 Agent Monitor</h2>
            <div className="agent-count">
              {agentStatuses.length} Active Agents
            </div>
          </div>
          <AgentMonitor 
            orchestrator={gameState.orchestratorAgent}
            coderAgents={gameState.coderAgents}
            agentStatuses={agentStatuses}
          />
        </section>

        {/* Communication Panel */}
        <section className="panel communication-panel" data-testid="communication-panel">
          <div className="panel-header">
            <h2>💬 Agent Communication</h2>
            <div className="room-count">
              {gameState.communicationRooms.length} Active Rooms
            </div>
          </div>
          <ChatRoom 
            rooms={messages}
            activeRequests={activeRequests}
            onSendMessage={commActions.sendMessage}
            onRespondToRequest={commActions.respondToRequest}
            onBroadcast={commActions.broadcastToRoom}
            allowUserParticipation={gameState.mode !== 'auto'}
            isConnected={isConnected}
          />
        </section>

        {/* Project Management Panel */}
        <section className="panel project-panel">
          <div className="panel-header">
            <h2>📁 Project Management</h2>
            <div className="project-count">
              {gameState.activeProjects.length} Active Projects
            </div>
          </div>
          <div className="project-content">
            <ProjectCreator 
              onCreateProject={handleCreateProject}
              disabled={gameState.mode === 'paused' || isLoading}
            />
            <div className="active-projects">
              {gameState.activeProjects.map(project => (
                <div key={project.id} className="project-card">
                  <div className="project-header">
                    <h3>{project.name}</h3>
                    <span className={`status-badge ${project.status}`}>
                      {project.status}
                    </span>
                  </div>
                  <p className="project-description">{project.description}</p>
                  <div className="project-progress">
                    <div className="progress-bar">
                      <div 
                        className="progress-fill" 
                        style={{ width: `${project.progress}%` }}
                      ></div>
                    </div>
                    <span className="progress-text">{project.progress}%</span>
                  </div>
                  {project.assignedAgent && (
                    <div className="assigned-agent">
                      Assigned to: {project.assignedAgent}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Progress Tracking Panel */}
        <section className="panel progress-tracking" data-testid="progress-tracking">
          <div className="panel-header">
            <h2>📊 Task & Goal Progress</h2>
          </div>
          <TaskProgress 
            tasks={gameState.completedTasks}
            goals={gameState.activeGoals}
            projects={gameState.activeProjects}
          />
        </section>

        {/* Code Artifacts Panel */}
        <section className="panel code-artifacts" data-testid="code-artifacts">
          <div className="panel-header">
            <h2>📝 Generated Code</h2>
          </div>
          <CodeViewer 
            projects={gameState.activeProjects}
            executionEnvironment={gameState.executionEnvironment}
          />
        </section>

        {/* System Status Panel */}
        <section className="panel system-status">
          <div className="panel-header">
            <h2>⚙️ System Status</h2>
          </div>
          <div className="system-info">
            <div className="status-item">
              <label>Game Mode:</label>
              <span className={`mode-indicator ${gameState.mode}`} data-testid="game-mode">
                {gameState.mode.toUpperCase()}
              </span>
            </div>
            <div className="status-item">
              <label>Execution Environment:</label>
              <span>{gameState.executionEnvironment}</span>
            </div>
            <div className="status-item">
              <label>Last Activity:</label>
              <span>{new Date(gameState.lastActivity).toLocaleTimeString()}</span>
            </div>
            <div className="status-item">
              <label>Uptime:</label>
              <span>{Math.floor((Date.now() - gameState.lastActivity) / 1000)}s</span>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}