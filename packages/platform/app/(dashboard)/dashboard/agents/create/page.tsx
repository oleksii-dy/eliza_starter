'use client';

import { useEffect } from 'react';

/**
 * Create Agent Page - Redirects to Client GUI
 * This redirects the dashboard route to the embedded React client
 */
export default function CreateAgentPage() {
  useEffect(() => {
    // Redirect to the client GUI for agent creation
    window.location.href = '/client-static/#/agents/new';
  }, []);

  return (
    <div className="flex h-screen w-full items-center justify-center">
      <div className="text-center">
        <h2 className="text-lg font-semibold mb-2">Loading Agent Creator...</h2>
        <p className="text-gray-600">Redirecting to ElizaOS Client interface...</p>
        <div className="mt-4">
          <div className="h-4 w-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
        </div>
      </div>
    </div>
  );
}
