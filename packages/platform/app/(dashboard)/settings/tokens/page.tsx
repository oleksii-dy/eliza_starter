'use client';

import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { Trash2, Copy, Plus, Key } from 'lucide-react';

interface ApiKey {
  id: string;
  name: string;
  key: string;
  lastUsed?: string;
  createdAt: string;
  expiresAt?: string;
}

export default function TokensPage() {
  const [apiKeys, setApiKeys] = useState<ApiKey[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [showNewKey, setShowNewKey] = useState(false);
  const [newKey, setNewKey] = useState('');
  const [newKeyName, setNewKeyName] = useState('');
  const [expiresIn, setExpiresIn] = useState<'30d' | '90d' | '1y' | 'never'>('never');

  useEffect(() => {
    fetchApiKeys();
  }, []);

  const fetchApiKeys = async () => {
    try {
      const response = await fetch('/api/v1/api-keys', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token') || ''}`
        }
      });
      const data = await response.json();
      if (data.success) {
        setApiKeys(data.data.apiKeys);
      }
    } catch (error) {
      toast.error('Failed to load API keys');
    } finally {
      setLoading(false);
    }
  };

  const createApiKey = async () => {
    if (!newKeyName.trim()) {
      toast.error('Please enter a name for the API key');
      return;
    }

    setCreating(true);
    try {
      const response = await fetch('/api/v1/api-keys', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token') || ''}`
        },
        body: JSON.stringify({
          name: newKeyName,
          expiresIn
        })
      });
      
      const data = await response.json();
      if (data.success) {
        setNewKey(data.data.apiKey.key);
        setShowNewKey(true);
        setNewKeyName('');
        fetchApiKeys();
        toast.success('API key created successfully');
      } else {
        toast.error(data.error || 'Failed to create API key');
      }
    } catch (error) {
      toast.error('Failed to create API key');
    } finally {
      setCreating(false);
    }
  };

  const deleteApiKey = async (id: string) => {
    if (!confirm('Are you sure you want to delete this API key? This action cannot be undone.')) {
      return;
    }

    try {
      const response = await fetch(`/api/v1/api-keys/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token') || ''}`
        }
      });
      
      if (response.ok) {
        toast.success('API key deleted successfully');
        fetchApiKeys();
      } else {
        toast.error('Failed to delete API key');
      }
    } catch (error) {
      toast.error('Failed to delete API key');
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success('Copied to clipboard');
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl">
      <div className="mb-8">
        <h1 className="text-2xl font-bold mb-2">API Keys</h1>
        <p className="text-gray-600">
          Manage your API keys for programmatic access to the ElizaOS platform.
        </p>
      </div>

      {/* New Key Alert */}
      {showNewKey && (
        <div className="mb-8 p-6 bg-green-50 border border-green-200 rounded-lg">
          <div className="flex items-start gap-3">
            <Key className="w-5 h-5 text-green-600 mt-0.5" />
            <div className="flex-1">
              <h3 className="font-semibold text-green-900 mb-2">
                Your new API key has been created
              </h3>
              <p className="text-sm text-green-800 mb-3">
                Make sure to copy your API key now. You won't be able to see it again!
              </p>
              <div className="flex items-center gap-2 mb-3">
                <code className="flex-1 px-3 py-2 bg-white rounded border border-green-300 font-mono text-sm">
                  {newKey}
                </code>
                <button
                  onClick={() => copyToClipboard(newKey)}
                  className="p-2 hover:bg-green-100 rounded-md transition-colors"
                >
                  <Copy className="w-4 h-4" />
                </button>
              </div>
              <button
                onClick={() => {
                  setShowNewKey(false);
                  setNewKey('');
                }}
                className="px-4 py-2 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Create New Key Form */}
      <div className="mb-8 p-6 bg-gray-50 rounded-lg">
        <h2 className="text-lg font-semibold mb-4">Create New API Key</h2>
        <div className="space-y-4">
          <div>
            <label htmlFor="keyName" className="block text-sm font-medium text-gray-700 mb-1">
              Key Name
            </label>
            <input
              id="keyName"
              type="text"
              value={newKeyName}
              onChange={(e) => setNewKeyName(e.target.value)}
              placeholder="My API Key"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              data-testid="api-key-name-input"
            />
          </div>
          <div>
            <label htmlFor="expiresIn" className="block text-sm font-medium text-gray-700 mb-1">
              Expiration
            </label>
            <select
              id="expiresIn"
              value={expiresIn}
              onChange={(e) => setExpiresIn(e.target.value as any)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              data-testid="api-key-expiry-select"
            >
              <option value="30d">30 days</option>
              <option value="90d">90 days</option>
              <option value="1y">1 year</option>
              <option value="never">Never</option>
            </select>
          </div>
          <button
            onClick={createApiKey}
            disabled={creating || !newKeyName.trim()}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
            data-testid="create-api-key-button"
          >
            <Plus className="w-4 h-4 mr-2" />
            Create API Key
          </button>
        </div>
      </div>

      {/* API Keys List */}
      <div>
        <h2 className="text-lg font-semibold mb-4">Your API Keys</h2>
        {apiKeys.length === 0 ? (
          <div className="text-center py-12 bg-gray-50 rounded-lg">
            <Key className="w-12 h-12 text-gray-400 mx-auto mb-3" />
            <p className="text-gray-600">No API keys yet</p>
            <p className="text-sm text-gray-500 mt-1">
              Create your first API key to get started
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {apiKeys.map((key) => (
              <div
                key={key.id}
                className="p-4 bg-white border border-gray-200 rounded-lg hover:border-gray-300 transition-colors"
                data-testid={`api-key-${key.id}`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h3 className="font-medium text-gray-900">{key.name}</h3>
                    <div className="mt-1 space-y-1">
                      <p className="text-sm text-gray-600">
                        Key: <code className="px-2 py-0.5 bg-gray-100 rounded">{key.key}</code>
                        <button
                          onClick={() => copyToClipboard(key.key)}
                          className="ml-2 text-gray-500 hover:text-gray-700"
                          data-testid={`copy-key-${key.id}`}
                        >
                          <Copy className="w-3 h-3 inline" />
                        </button>
                      </p>
                      <p className="text-sm text-gray-500">
                        Created: {formatDate(key.createdAt)}
                      </p>
                      {key.lastUsed && (
                        <p className="text-sm text-gray-500">
                          Last used: {formatDate(key.lastUsed)}
                        </p>
                      )}
                      {key.expiresAt && (
                        <p className="text-sm text-gray-500">
                          Expires: {formatDate(key.expiresAt)}
                        </p>
                      )}
                    </div>
                  </div>
                  <button
                    onClick={() => deleteApiKey(key.id)}
                    className="ml-4 p-2 text-red-600 hover:bg-red-50 rounded-md transition-colors"
                    data-testid={`delete-key-${key.id}`}
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
