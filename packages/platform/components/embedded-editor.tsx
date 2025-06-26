'use client';

import React, { Suspense, lazy } from 'react';
import { AgentEditor } from '@elizaos/client';

interface User {
  id: string;
  email: string;
  name: string;
  organizationId: string;
}

interface EmbeddedEditorProps {
  user: User;
  apiKey: string;
  organizationId: string;
  requiredPlugins: string[];
}

// Loading component
const LoadingSpinner = () => (
  <div className="flex items-center justify-center h-full bg-gray-50">
    <div className="text-center p-8">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
      <h3 className="text-lg font-semibold text-gray-900 mb-2">Loading Agent Editor</h3>
      <p className="text-gray-600">Initializing components...</p>
    </div>
  </div>
);

export function EmbeddedEditor({
  user,
  apiKey,
  organizationId,
  requiredPlugins
}: EmbeddedEditorProps) {
  const agentConfig = {
    apiUrl: process.env.NEXT_PUBLIC_PLATFORM_URL || 'http://localhost:3333',
    apiKey,
    embeddedMode: true,
    theme: 'light' as const,
    user: {
      id: user.id,
      email: user.email,
      name: user.name
    },
    organizationId,
    requiredPlugins,
    onAgentCreated: (agent: any) => {
      console.log('Agent created:', agent);
    },
    onAgentUpdated: (agent: any) => {
      console.log('Agent updated:', agent);
    },
    onError: (error: Error) => {
      console.error('Agent editor error:', error);
    }
  };

  return (
    <div className="h-full w-full">
      {/* CSS styles are handled by the platform's global CSS */}
      <Suspense fallback={<LoadingSpinner />}>
        <AgentEditor {...(agentConfig as any)} />
      </Suspense>
    </div>
  );
}