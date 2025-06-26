'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/lib/auth/useAuth';

interface UserData {
  messages: Array<{
    id: string;
    content: any;
    role: string;
    agentId: string;
    createdAt: string;
  }>;
  memories: Array<{
    id: string;
    content: any;
    type: string;
    importance: number;
    agentId: string;
    createdAt: string;
  }>;
  agents: Array<{
    id: string;
    name: string;
    description: string;
    totalInteractions: number;
    createdAt: string;
  }>;
}

interface ApiKeyInfo {
  id: string;
  name: string;
  keyPrefix: string;
  permissions: string[];
  lastUsedAt: string | null;
  usageCount: number;
  isActive: boolean;
}

export default function UserDataPanel() {
  const { user, session } = useAuth();
  const [userData, setUserData] = useState<UserData | null>(null);
  const [apiKeys, setApiKeys] = useState<ApiKeyInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedAgent, setSelectedAgent] = useState<string>('');

  const fetchUserData = useCallback(async () => {
    try {
      // Fetch user's agents
      const agentsResponse = await fetch('/api/v1/agents', {
        credentials: 'include',
      });
      const agentsData = await agentsResponse.json();

      if (!agentsData.success) {
        throw new Error('Failed to fetch agents');
      }

      const agents = agentsData.data.agents;
      setUserData(prev => ({ ...prev, agents } as UserData));

      // If we have agents, fetch data for the first one
      if (agents.length > 0 && !selectedAgent) {
        setSelectedAgent(agents[0].id);
        await fetchAgentData(agents[0].id);
      }
    } catch (error) {
      console.error('Error fetching user data:', error);
    } finally {
      setLoading(false);
    }
  }, [selectedAgent]);

  const fetchAgentData = async (agentId: string) => {
    try {
      setLoading(true);

      // Fetch messages for this agent and user
      const messagesResponse = await fetch(
        `/api/v1/messages?agentId=${agentId}&limit=10`,
        { credentials: 'include' }
      );
      const messagesData = await messagesResponse.json();

      // Fetch memories for this agent and user
      const memoriesResponse = await fetch(
        `/api/v1/memories?agentId=${agentId}&limit=10`,
        { credentials: 'include' }
      );
      const memoriesData = await memoriesResponse.json();

      setUserData(prev => ({
        ...prev,
        messages: messagesData.success ? messagesData.data.messages : [],
        memories: memoriesData.success ? memoriesData.data.memories : [],
        agents: prev?.agents || [],
      }));

    } catch (error) {
      console.error('Error fetching agent data:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchApiKeys = async () => {
    try {
      const response = await fetch('/api/v1/api-keys', {
        credentials: 'include',
      });
      const data = await response.json();

      if (data.success) {
        setApiKeys(data.data.apiKeys);
      }
    } catch (error) {
      console.error('Error fetching API keys:', error);
    }
  };

  useEffect(() => {
    if (user && session) {
      fetchUserData();
      fetchApiKeys();
    }
  }, [user, session, fetchUserData]);

  const handleAgentChange = async (agentId: string) => {
    setSelectedAgent(agentId);
    await fetchAgentData(agentId);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!user || !userData) {
    return (
      <div className="p-6 bg-red-50 rounded-lg">
        <p className="text-red-600">Unable to load user data. Please try logging in again.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* User Info Header */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">Your ElizaOS Dashboard</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-blue-50 p-4 rounded-lg">
            <h3 className="font-medium text-blue-900">User ID</h3>
            <p className="text-sm text-blue-700 font-mono">{user.id}</p>
          </div>
          <div className="bg-green-50 p-4 rounded-lg">
            <h3 className="font-medium text-green-900">Organization</h3>
            <p className="text-sm text-green-700">{user.organization?.name}</p>
          </div>
          <div className="bg-purple-50 p-4 rounded-lg">
            <h3 className="font-medium text-purple-900">Role</h3>
            <p className="text-sm text-purple-700 capitalize">{user.role}</p>
          </div>
        </div>
      </div>

      {/* Agent Selection */}
      {userData.agents.length > 0 && (
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Select Agent</h3>
          <select
            value={selectedAgent}
            onChange={(e) => handleAgentChange(e.target.value)}
            className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="">Select an agent...</option>
            {userData.agents.map((agent) => (
              <option key={agent.id} value={agent.id}>
                {agent.name} - {agent.totalInteractions} interactions
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Data Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Messages Panel */}
        <div className="bg-white rounded-lg shadow">
          <div className="p-4 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900">
              Recent Messages
              {selectedAgent && (
                <span className="text-sm text-gray-500 ml-2">
                  (Agent: {userData.agents.find(a => a.id === selectedAgent)?.name})
                </span>
              )}
            </h3>
            <p className="text-sm text-gray-600">
              Messages scoped to User ID: <code className="bg-gray-100 px-1 rounded">{user.id}</code>
            </p>
          </div>
          <div className="p-4 max-h-80 overflow-y-auto">
            {userData.messages.length > 0 ? (
              <div className="space-y-3">
                {userData.messages.map((message) => (
                  <div key={message.id} className="border-l-4 border-blue-500 pl-4 py-2">
                    <div className="flex justify-between items-start mb-1">
                      <span className={`text-xs px-2 py-1 rounded ${
                        message.role === 'user' ? 'bg-blue-100 text-blue-800' :
                          message.role === 'agent' ? 'bg-green-100 text-green-800' :
                            'bg-gray-100 text-gray-800'
                      }`}>
                        {message.role}
                      </span>
                      <span className="text-xs text-gray-500">
                        {new Date(message.createdAt).toLocaleString()}
                      </span>
                    </div>
                    <p className="text-sm text-gray-700">
                      {message.content?.text || 'No text content'}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      Message ID: {message.id}
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500 text-center py-8">
                No messages found for this user and agent combination.
              </p>
            )}
          </div>
        </div>

        {/* Memories Panel */}
        <div className="bg-white rounded-lg shadow">
          <div className="p-4 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900">
              Agent Memories
              {selectedAgent && (
                <span className="text-sm text-gray-500 ml-2">
                  (Agent: {userData.agents.find(a => a.id === selectedAgent)?.name})
                </span>
              )}
            </h3>
            <p className="text-sm text-gray-600">
              Memories scoped to User ID: <code className="bg-gray-100 px-1 rounded">{user.id}</code>
              + Agent ID: <code className="bg-gray-100 px-1 rounded">{selectedAgent}</code>
            </p>
          </div>
          <div className="p-4 max-h-80 overflow-y-auto">
            {userData.memories.length > 0 ? (
              <div className="space-y-3">
                {userData.memories.map((memory) => (
                  <div key={memory.id} className="border-l-4 border-purple-500 pl-4 py-2">
                    <div className="flex justify-between items-start mb-1">
                      <span className="text-xs px-2 py-1 rounded bg-purple-100 text-purple-800">
                        {memory.type}
                      </span>
                      <div className="text-right">
                        <span className="text-xs text-yellow-600 font-medium">
                          Importance: {memory.importance}/10
                        </span>
                        <br />
                        <span className="text-xs text-gray-500">
                          {new Date(memory.createdAt).toLocaleString()}
                        </span>
                      </div>
                    </div>
                    <p className="text-sm text-gray-700">
                      {memory.content?.text || 'No text content'}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      Memory ID: {memory.id}
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500 text-center py-8">
                No memories found for this user and agent combination.
              </p>
            )}
          </div>
        </div>
      </div>

      {/* API Keys Panel */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Your API Keys</h3>
        <p className="text-sm text-gray-600 mb-4">
          API keys for accessing your data programmatically. All API calls are automatically scoped to your user ID.
        </p>
        {apiKeys.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Name
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Key Prefix
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Usage
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {apiKeys.map((key) => (
                  <tr key={key.id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {key.name}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 font-mono">
                      {key.keyPrefix}•••
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {key.usageCount} calls
                      {key.lastUsedAt && (
                        <div className="text-xs text-gray-400">
                          Last used: {new Date(key.lastUsedAt).toLocaleDateString()}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                        key.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                      }`}>
                        {key.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-8">
            <p className="text-gray-500 mb-4">No API keys found.</p>
            <button
              className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"
              onClick={() => window.location.href = '/api-keys'}
            >
              Create Your First API Key
            </button>
          </div>
        )}
      </div>

      {/* Isolation Info Panel */}
      <div className="bg-blue-50 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-blue-900 mb-3">🔒 Data Isolation</h3>
        <div className="space-y-2 text-sm text-blue-800">
          <p><strong>Organization Level:</strong> All your data is isolated within your organization ({user.organization?.name})</p>
          <p><strong>User Level:</strong> Your messages, conversations, and personal data are isolated to your user ID ({user.id})</p>
          <p><strong>Agent Level:</strong> Memories and agent-specific data are further isolated by agent ID</p>
          <p><strong>API Access:</strong> All API endpoints automatically enforce these isolation rules</p>
        </div>
      </div>
    </div>
  );
}
