'use client';

import { Suspense, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { EmbeddedEditor } from '@/components/embedded-editor';

interface UserSession {
  userId: string;
  email: string;
  organizationId: string;
}

interface EditorConfig {
  user: UserSession & { id: string; name: string };
  apiKey: string;
  organizationId: string;
  requiredPlugins: string[];
}

export default function AgentEditorPage() {
  const [config, setConfig] = useState<EditorConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    async function loadEditorConfig() {
      try {
        setLoading(true);
        
        // Fetch session and configuration data from API
        const [sessionResponse, configResponse] = await Promise.all([
          fetch('/api/auth/session'),
          fetch('/api/v1/organizations/config')
        ]);

        if (!sessionResponse.ok) {
          router.push('/auth/login');
          return;
        }

        const sessionData = await sessionResponse.json();
        if (!sessionData.success) {
          router.push('/auth/login');
          return;
        }

        const session = sessionData.data;

        // Generate API key for this session
        const apiKeyResponse = await fetch('/api/api-keys', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            scope: ['agents:*', 'messaging:*', 'inference:*'],
            expiresIn: '24h',
          }),
        });

        if (!apiKeyResponse.ok) {
          throw new Error('Failed to generate API key');
        }

        const apiKeyData = await apiKeyResponse.json();
        const apiKey = apiKeyData.success ? apiKeyData.data.key : '';

        // Get required plugins from organization config
        let requiredPlugins = ['@elizaos/plugin-web-search', '@elizaos/plugin-memory', '@elizaos/plugin-sql'];
        
        if (configResponse.ok) {
          const configData = await configResponse.json();
          if (configData.requiredPlugins) {
            requiredPlugins = configData.requiredPlugins;
          }
        }

        setConfig({
          user: {
            id: session.userId,
            userId: session.userId,
            email: session.email,
            name: session.email.split('@')[0], // Extract name from email
            organizationId: session.organizationId,
          },
          apiKey,
          organizationId: session.organizationId,
          requiredPlugins,
        });
      } catch (error) {
        console.error('Failed to load editor config:', error);
        setError(error instanceof Error ? error.message : 'Failed to load editor configuration');
      } finally {
        setLoading(false);
      }
    }

    loadEditorConfig();
  }, [router]);

  if (loading) {
    return <AgentEditorSkeleton />;
  }

  if (error) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600 mb-4">Failed to load agent editor</p>
          <p className="text-gray-600 text-sm">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (!config) {
    return <AgentEditorSkeleton />;
  }

  return (
    <div className="h-full">
      <Suspense fallback={<AgentEditorSkeleton />}>
        <EmbeddedEditor
          user={config.user}
          apiKey={config.apiKey}
          organizationId={config.organizationId}
          requiredPlugins={config.requiredPlugins}
        />
      </Suspense>
    </div>
  );
}

function AgentEditorSkeleton() {
  return (
    <div className="w-full h-full border border-gray-200 rounded-lg bg-gray-50 animate-pulse flex items-center justify-center">
      <div className="text-center">
        <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-current border-r-transparent align-[-0.125em] motion-reduce:animate-[spin_1.5s_linear_infinite]" />
        <p className="mt-2 text-gray-600">Loading agent editor...</p>
      </div>
    </div>
  );
}
