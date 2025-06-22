import React from 'react';
import type { McpServer } from '../McpViewer';

export interface ServerListProps {
  servers: McpServer[];
  selectedServer: McpServer | null;
  onSelectServer: (server: McpServer) => void;
  onReconnect: (serverName: string) => void;
}

export const ServerList: React.FC<ServerListProps> = ({
  servers,
  selectedServer,
  onSelectServer,
  onReconnect
}) => {
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'connected':
        return '🟢';
      case 'connecting':
        return '🟡';
      case 'disconnected':
        return '🔴';
      case 'error':
        return '❌';
      default:
        return '⚪';
    }
  };

  const getStatusClass = (status: string) => {
    switch (status) {
      case 'connected':
        return 'status-connected';
      case 'connecting':
        return 'status-connecting';
      case 'disconnected':
        return 'status-disconnected';
      case 'error':
        return 'status-error';
      default:
        return '';
    }
  };

  return (
    <div className="server-list">
      <h2>MCP Servers</h2>
      {servers.length === 0 ? (
        <div className="no-servers">
          <p>No MCP servers configured</p>
        </div>
      ) : (
        <ul className="servers">
          {servers.map((server) => (
            <li
              key={server.name}
              className={`server-item ${selectedServer?.name === server.name ? 'selected' : ''}`}
              onClick={() => onSelectServer(server)}
            >
              <div className="server-header">
                <span className={`server-status ${getStatusClass(server.status)}`}>
                  {getStatusIcon(server.status)}
                </span>
                <span className="server-name">{server.name}</span>
              </div>
              
              <div className="server-details">
                <div className="server-counts">
                  <span className="count">
                    <span className="count-icon">🔧</span>
                    {server.toolCount} tools
                  </span>
                  <span className="count">
                    <span className="count-icon">📄</span>
                    {server.resourceCount} resources
                  </span>
                </div>
                
                {server.status === 'error' && server.error && (
                  <div className="server-error">
                    <small>{server.error}</small>
                  </div>
                )}
                
                {(server.status === 'disconnected' || server.status === 'error') && (
                  <button
                    className="reconnect-btn"
                    onClick={(e) => {
                      e.stopPropagation();
                      onReconnect(server.name);
                    }}
                  >
                    Reconnect
                  </button>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}; 