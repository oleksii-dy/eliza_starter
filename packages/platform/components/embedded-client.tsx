'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { ExternalLinkIcon, ReloadIcon, ExclamationTriangleIcon } from '@radix-ui/react-icons';
import Button from '@/components/ui/button';

interface User {
  id: string;
  email: string;
  name: string;
  organizationId: string;
}

interface EmbeddedClientGuiProps {
  user: User;
  apiKey: string;
  organizationId: string;
  requiredPlugins: string[];
}

interface ClientState {
  isLoaded: boolean;
  isReady: boolean;
  error: string | null;
  hasConfigured: boolean;
}

export function EmbeddedClientGui({
  user,
  apiKey,
  organizationId,
  requiredPlugins
}: EmbeddedClientGuiProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [clientState, setClientState] = useState<ClientState>({
    isLoaded: false,
    isReady: false,
    error: null,
    hasConfigured: false,
  });

  const configureClient = useCallback(() => {
    if (!iframeRef.current || !clientState.isReady) { return; }

    // Send configuration to the embedded client
    iframeRef.current.contentWindow?.postMessage({
      type: 'PLATFORM_CONFIG',
      payload: {
        apiKey,
        userId: user.id,
        organizationId,
        requiredPlugins,
        apiUrl: '/api', // Client will use the compatibility layer
        embeddedMode: true,
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
        },
        platformUrl: window.location.origin,
      }
    }, '*');
  }, [apiKey, user.id, user.email, user.name, organizationId, requiredPlugins, clientState.isReady]);

  // Set up iframe communication
  useEffect(() => {
    function handleMessage(event: MessageEvent) {
      // For development/local testing, allow localhost
      const allowedOrigins = [
        window.location.origin, // Same origin (client served from platform)
        'http://localhost:5173', // Vite dev server
        'http://localhost:3000', // Platform dev server
      ];

      if (!allowedOrigins.includes(event.origin)) {
        console.warn('Ignored message from unauthorized origin:', event.origin);
        return;
      }

      const { type, data } = event.data;

      switch (type) {
        case 'CLIENT_READY':
          console.log('Client iframe is ready');
          setClientState(prev => ({ ...prev, isReady: true }));
          configureClient();
          break;

        case 'CLIENT_CONFIGURED':
          console.log('Client has been configured');
          setClientState(prev => ({ ...prev, hasConfigured: true }));
          break;

        case 'CLIENT_ERROR':
          console.error('Client error:', data);
          setClientState(prev => ({ ...prev, error: data.message || 'Client error occurred' }));
          break;

        case 'AGENT_CREATED':
          console.log('Agent created:', data);
          // Handle agent creation success
          break;

        case 'AGENT_UPDATED':
          console.log('Agent updated:', data);
          // Handle agent update success
          break;

        default:
          console.log('Unknown client message type:', type);
      }
    }

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [configureClient]);

  const handleIframeLoad = () => {
    console.log('Client iframe loaded');
    setClientState(prev => ({ ...prev, isLoaded: true }));

    // The iframe will send CLIENT_READY when it's ready to receive config
    // We'll configure it in the message handler
  };

  const handleIframeError = () => {
    console.error('Failed to load client iframe');
    setClientState(prev => ({
      ...prev,
      error: 'Failed to load agent management interface. Please refresh the page.',
    }));
  };

  const reloadClient = () => {
    if (iframeRef.current) {
      iframeRef.current.src = iframeRef.current.src;
      setClientState({
        isLoaded: false,
        isReady: false,
        error: null,
        hasConfigured: false,
      });
    }
  };

  const openInNewTab = () => {
    const clientUrl = `${window.location.origin}/client?embedded=false&apiKey=${encodeURIComponent(apiKey)}`;
    window.open(clientUrl, '_blank');
  };

  return (
    <div className="h-full flex flex-col" data-cy="embedded-client">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-white">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Agent Editor</h2>
          <p className="text-sm text-gray-600">
            Create and manage your AI agents with the ElizaOS client interface
          </p>
        </div>

        <div className="flex items-center space-x-2">
          {/* Status indicator */}
          {clientState.hasConfigured ? (
            <span
              className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800"
              data-cy="client-status"
            >
              Ready
            </span>
          ) : clientState.isReady ? (
            <span
              className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800"
              data-cy="client-status"
            >
              Configuring...
            </span>
          ) : clientState.isLoaded ? (
            <span
              className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800"
              data-cy="client-status"
            >
              Loading...
            </span>
          ) : (
            <span
              className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800"
              data-cy="client-status"
            >
              Connecting...
            </span>
          )}

          <button
            onClick={reloadClient}
            className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100"
            title="Reload Client"
            data-cy="reload-client-button"
          >
            <ReloadIcon className="h-4 w-4" />
          </button>

          <button
            onClick={openInNewTab}
            className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100"
            title="Open in New Tab"
            data-cy="open-external-button"
          >
            <ExternalLinkIcon className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Error Banner */}
      {clientState.error && (
        <div className="bg-red-50 border-l-4 border-red-400 p-4">
          <div className="flex items-center">
            <ExclamationTriangleIcon className="h-5 w-5 text-red-400" />
            <div className="ml-3">
              <p className="text-sm text-red-700">{clientState.error}</p>
            </div>
            <button
              onClick={() => setClientState(prev => ({ ...prev, error: null }))}
              className="ml-auto text-red-400 hover:text-red-600"
            >
              ×
            </button>
          </div>
        </div>
      )}

      {/* Required Plugins Info */}
      <div className="bg-blue-50 border-l-4 border-blue-400 p-4">
        <div className="flex items-start">
          <div className="ml-3">
            <p className="text-sm text-blue-700">
              <span className="font-medium">Required plugins:</span> {requiredPlugins.join(', ')}
            </p>
            <p className="text-xs text-blue-600 mt-1">
              These plugins are automatically included in all agents and cannot be removed.
            </p>
          </div>
        </div>
      </div>

      {/* Client Iframe */}
      <div className="flex-1 bg-gray-50">
        <iframe
          ref={iframeRef}
          src="/client-static/index.html"
          className="w-full h-full border-0"
          title="ElizaOS Agent Management Interface"
          sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-modals"
          onLoad={handleIframeLoad}
          onError={handleIframeError}
        />
      </div>

      {/* Loading Overlay */}
      {!clientState.isLoaded && (
        <div className="absolute inset-0 bg-white bg-opacity-75 flex items-center justify-center">
          <div className="text-center">
            <ReloadIcon className="h-8 w-8 text-blue-600 mx-auto mb-4 animate-spin" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">Loading Agent Editor</h3>
            <p className="text-gray-600">Preparing the ElizaOS client interface...</p>
          </div>
        </div>
      )}

      {/* Debug Info (development only) */}
      {process.env.NODE_ENV === 'development' && (
        <div className="absolute bottom-4 left-4 bg-white rounded-lg shadow-lg border border-gray-200 p-3 text-xs text-gray-600">
          <div className="font-medium mb-1">Debug Info:</div>
          <div>Loaded: {clientState.isLoaded ? 'Yes' : 'No'}</div>
          <div>Ready: {clientState.isReady ? 'Yes' : 'No'}</div>
          <div>Configured: {clientState.hasConfigured ? 'Yes' : 'No'}</div>
          <div>API Key: {apiKey.substring(0, 12)}...</div>
          <div>Org ID: {organizationId}</div>
        </div>
      )}
    </div>
  );
}
