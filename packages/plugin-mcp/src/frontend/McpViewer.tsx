import React, { useState, useEffect, useCallback } from 'react';
import { ServerList } from './components/ServerList';
import { ToolExplorer } from './components/ToolExplorer';
import { ResourceViewer } from './components/ResourceViewer';
import { ConnectionStats } from './components/ConnectionStats';
import './styles/mcp-viewer.css';

export interface McpViewerProps {
  agentId: string;
}

export interface McpServer {
  name: string;
  status: 'connected' | 'connecting' | 'disconnected' | 'error';
  error?: string;
  toolCount: number;
  resourceCount: number;
  tools: McpTool[];
  resources: McpResource[];
}

export interface McpTool {
  name: string;
  description?: string;
  inputSchema?: any;
}

export interface McpResource {
  uri: string;
  name?: string;
  description?: string;
  mimeType?: string;
}

export interface McpServersResponse {
  success: boolean;
  data?: {
    servers: McpServer[];
    totalServers: number;
    connectedServers: number;
  };
  error?: string;
}

export const McpViewer: React.FC<McpViewerProps> = ({ agentId }) => {
  const [servers, setServers] = useState<McpServer[]>([]);
  const [selectedServer, setSelectedServer] = useState<McpServer | null>(null);
  const [activeTab, setActiveTab] = useState<'tools' | 'resources'>('tools');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [totalServers, setTotalServers] = useState(0);
  const [connectedServers, setConnectedServers] = useState(0);

  const fetchServers = useCallback(async () => {
    try {
      const response = await fetch(`/api/mcp/servers?agentId=${agentId}`);
      const data: McpServersResponse = await response.json();

      if (data.success && data.data) {
        setServers(data.data.servers);
        setTotalServers(data.data.totalServers);
        setConnectedServers(data.data.connectedServers);
        setError(null);

        // Update selected server if it exists in new data
        if (selectedServer) {
          const updatedServer = data.data.servers.find((s) => s.name === selectedServer.name);
          if (updatedServer) {
            setSelectedServer(updatedServer);
          }
        }
      } else {
        setError(data.error || 'Failed to fetch servers');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch servers');
    } finally {
      setLoading(false);
    }
  }, [agentId, selectedServer]);

  // Initial fetch and setup auto-refresh
  useEffect(() => {
    fetchServers();

    // Set up auto-refresh every 5 seconds
    const interval = setInterval(fetchServers, 5000);

    return () => {
      clearInterval(interval);
    };
  }, [fetchServers]);

  const handleReconnect = async (serverName: string) => {
    try {
      const response = await fetch(`/api/mcp/servers/${serverName}/reconnect?agentId=${agentId}`, {
        method: 'POST',
      });

      if (!response.ok) {
        throw new Error('Failed to reconnect');
      }

      // Refresh servers after reconnection attempt
      setTimeout(fetchServers, 1000);
    } catch (err) {
      console.error('Reconnection failed:', err);
    }
  };

  const handleToolExecute = async (serverName: string, toolName: string, args: any) => {
    try {
      const response = await fetch(`/api/mcp/tools/${serverName}/${toolName}?agentId=${agentId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ arguments: args }),
      });

      const data = await response.json();
      return data;
    } catch (err) {
      console.error('Tool execution failed:', err);
      throw err;
    }
  };

  const handleResourceRead = async (serverName: string, uri: string) => {
    try {
      const response = await fetch(`/api/mcp/resources/${serverName}?agentId=${agentId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ uri }),
      });

      const data = await response.json();
      return data;
    } catch (err) {
      console.error('Resource read failed:', err);
      throw err;
    }
  };

  if (loading) {
    return (
      <div className="mcp-viewer">
        <div className="mcp-loading">
          <div className="spinner"></div>
          <p>Loading MCP servers...</p>
        </div>
      </div>
    );
  }

  if (error && servers.length === 0) {
    return (
      <div className="mcp-viewer">
        <div className="mcp-error">
          <h3>Error</h3>
          <p>{error}</p>
          <button onClick={fetchServers}>Retry</button>
        </div>
      </div>
    );
  }

  return (
    <div className="mcp-viewer">
      <div className="mcp-header">
        <h1>MCP Viewer</h1>
        <ConnectionStats total={totalServers} connected={connectedServers} />
      </div>

      <div className="mcp-content">
        <div className="mcp-sidebar">
          <ServerList
            servers={servers}
            selectedServer={selectedServer}
            onSelectServer={setSelectedServer}
            onReconnect={handleReconnect}
          />
        </div>

        <div className="mcp-main">
          {selectedServer ? (
            <>
              <div className="mcp-tabs">
                <button
                  className={`tab ${activeTab === 'tools' ? 'active' : ''}`}
                  onClick={() => setActiveTab('tools')}
                >
                  Tools ({selectedServer.toolCount})
                </button>
                <button
                  className={`tab ${activeTab === 'resources' ? 'active' : ''}`}
                  onClick={() => setActiveTab('resources')}
                >
                  Resources ({selectedServer.resourceCount})
                </button>
              </div>

              <div className="mcp-tab-content">
                {activeTab === 'tools' ? (
                  <ToolExplorer server={selectedServer} onExecute={handleToolExecute} />
                ) : (
                  <ResourceViewer server={selectedServer} onRead={handleResourceRead} />
                )}
              </div>
            </>
          ) : (
            <div className="mcp-empty">
              <p>Select a server to view its tools and resources</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
