import type { AgentStatus } from '../types/gameTypes';

interface AgentMonitorProps {
  orchestrator?: any;
  coderAgents: any[];
  agentStatuses: AgentStatus[];
}

export function AgentMonitor({ orchestrator, coderAgents, agentStatuses }: AgentMonitorProps) {
  const getAgentStatus = (agentId: string): AgentStatus | undefined => {
    return agentStatuses.find(status => status.id === agentId);
  };

  const formatLastActivity = (timestamp: number): string => {
    const diff = Date.now() - timestamp;
    const seconds = Math.floor(diff / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);

    if (hours > 0) return `${hours}h ago`;
    if (minutes > 0) return `${minutes}m ago`;
    return `${seconds}s ago`;
  };

  const getStatusIcon = (status: AgentStatus['status']): string => {
    switch (status) {
      case 'idle': return '😴';
      case 'working': return '⚡';
      case 'communicating': return '💬';
      case 'sleeping': return '😪';
      case 'error': return '❌';
      case 'offline': return '⚫';
      default: return '❓';
    }
  };

  const getStatusColor = (status: AgentStatus['status']): string => {
    switch (status) {
      case 'idle': return 'idle';
      case 'working': return 'working';
      case 'communicating': return 'communicating';
      case 'sleeping': return 'sleeping';
      case 'error': return 'error';
      case 'offline': return 'offline';
      default: return 'unknown';
    }
  };

  return (
    <div className="agent-monitor">
      {/* Orchestrator Agent */}
      {orchestrator && (
        <div className="agent-section orchestrator-section">
          <h3>🎭 Orchestrator</h3>
          <div className="agent-card orchestrator">
            <div className="agent-header">
              <div className="agent-info">
                <span className="agent-name">{orchestrator.name}</span>
                <span className="agent-id">ID: {orchestrator.id}</span>
              </div>
              <div className="agent-status">
                {(() => {
                  const status = getAgentStatus(orchestrator.id);
                  return (
                    <div className={`status-indicator ${getStatusColor(status?.status || 'offline')}`}>
                      <span className="status-icon">{getStatusIcon(status?.status || 'offline')}</span>
                      <span className="status-text">{(status?.status || 'offline').toUpperCase()}</span>
                    </div>
                  );
                })()}
              </div>
            </div>
            
            {(() => {
              const status = getAgentStatus(orchestrator.id);
              return status && (
                <div className="agent-details">
                  {status.currentTask && (
                    <div className="current-task">
                      <label>Current Task:</label>
                      <span>{status.currentTask}</span>
                    </div>
                  )}
                  
                  <div className="activity-info">
                    <div className="last-activity">
                      <label>Last Activity:</label>
                      <span>{formatLastActivity(status.lastActivity)}</span>
                    </div>
                  </div>

                  <div className="resource-usage">
                    <div className="resource-item">
                      <label>CPU:</label>
                      <div className="resource-bar">
                        <div 
                          className="resource-fill" 
                          style={{ width: `${status.resourceUsage.cpu}%` }}
                        ></div>
                      </div>
                      <span>{status.resourceUsage.cpu}%</span>
                    </div>
                    <div className="resource-item">
                      <label>Memory:</label>
                      <div className="resource-bar">
                        <div 
                          className="resource-fill" 
                          style={{ width: `${(status.resourceUsage.memory / 512) * 100}%` }}
                        ></div>
                      </div>
                      <span>{status.resourceUsage.memory}MB</span>
                    </div>
                  </div>
                </div>
              );
            })()}
          </div>
        </div>
      )}

      {/* Coder Agents */}
      <div className="agent-section coder-section">
        <h3>👨‍💻 Coder Agents</h3>
        {coderAgents.length === 0 ? (
          <div className="no-agents">
            <span className="icon">📭</span>
            <p>No coder agents spawned yet</p>
            <small>Agents will be created when projects are assigned</small>
          </div>
        ) : (
          <div className="coder-agents" data-testid="coder-agents">
            {coderAgents.map(agent => {
              const status = getAgentStatus(agent.id);
              return (
                <div key={agent.id} className="agent-card coder">
                  <div className="agent-header">
                    <div className="agent-info">
                      <span className="agent-name">{agent.name}</span>
                      <span className="agent-specialization">
                        {agent.settings?.specialization || 'General'}
                      </span>
                    </div>
                    <div className="agent-status">
                      <div className={`status-indicator ${getStatusColor(status?.status || 'offline')}`}>
                        <span className="status-icon">{getStatusIcon(status?.status || 'offline')}</span>
                        <span className="status-text">{(status?.status || 'offline').toUpperCase()}</span>
                      </div>
                    </div>
                  </div>

                  {status && (
                    <div className="agent-details">
                      {status.assignedProject && (
                        <div className="assigned-project">
                          <label>Project:</label>
                          <span>{status.assignedProject}</span>
                        </div>
                      )}

                      {status.currentTask && (
                        <div className="current-task">
                          <label>Current Task:</label>
                          <span>{status.currentTask}</span>
                        </div>
                      )}

                      {status.progress !== undefined && (
                        <div className="task-progress">
                          <label>Progress:</label>
                          <div className="progress-bar">
                            <div 
                              className="progress-fill" 
                              style={{ width: `${status.progress}%` }}
                            ></div>
                          </div>
                          <span>{status.progress}%</span>
                        </div>
                      )}

                      <div className="activity-info">
                        <div className="last-activity">
                          <label>Last Activity:</label>
                          <span>{formatLastActivity(status.lastActivity)}</span>
                        </div>
                      </div>

                      <div className="resource-usage">
                        <div className="resource-item">
                          <label>CPU:</label>
                          <div className="resource-bar">
                            <div 
                              className="resource-fill" 
                              style={{ width: `${status.resourceUsage.cpu}%` }}
                            ></div>
                          </div>
                          <span>{status.resourceUsage.cpu}%</span>
                        </div>
                        <div className="resource-item">
                          <label>Memory:</label>
                          <div className="resource-bar">
                            <div 
                              className="resource-fill" 
                              style={{ width: `${(status.resourceUsage.memory / 256) * 100}%` }}
                            ></div>
                          </div>
                          <span>{status.resourceUsage.memory}MB</span>
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="agent-actions">
                    <button 
                      className="action-btn view-logs"
                      onClick={() => console.log('View logs for', agent.name)}
                      title="View agent logs"
                    >
                      📋 Logs
                    </button>
                    <button 
                      className="action-btn restart"
                      onClick={() => console.log('Restart', agent.name)}
                      title="Restart agent"
                    >
                      🔄 Restart
                    </button>
                    <button 
                      className="action-btn stop"
                      onClick={() => console.log('Stop', agent.name)}
                      title="Stop agent"
                    >
                      🛑 Stop
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Summary Statistics */}
      <div className="agent-stats">
        <div className="stat-item">
          <label>Total Agents:</label>
          <span>{(orchestrator ? 1 : 0) + coderAgents.length}</span>
        </div>
        <div className="stat-item">
          <label>Active:</label>
          <span>{agentStatuses.filter(s => s.status === 'working' || s.status === 'communicating').length}</span>
        </div>
        <div className="stat-item">
          <label>Idle:</label>
          <span>{agentStatuses.filter(s => s.status === 'idle').length}</span>
        </div>
        <div className="stat-item">
          <label>Errors:</label>
          <span className={agentStatuses.filter(s => s.status === 'error').length > 0 ? 'error' : ''}>
            {agentStatuses.filter(s => s.status === 'error').length}
          </span>
        </div>
      </div>
    </div>
  );
}