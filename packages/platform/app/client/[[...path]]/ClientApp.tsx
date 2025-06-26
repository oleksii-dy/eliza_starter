'use client';

/**
 * Client Application Component
 * Renders the ElizaOS client React application
 */

import { Suspense, lazy } from 'react';
import { App as ClientApp } from '@elizaos/client';

// Loading component
const LoadingSpinner = () => (
  <div className="flex items-center justify-center h-screen w-full bg-gray-50 dark:bg-gray-900">
    <div className="text-center p-8">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-6"></div>
      <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-2">Loading ElizaOS Client</h2>
      <p className="text-gray-600 dark:text-gray-400">Initializing application...</p>
    </div>
  </div>
);

export default function ClientPage() {
  return (
    <div className="h-screen w-full dark">
      {/* CSS styles are handled by the platform - client will inherit dark theme */}
      <Suspense fallback={<LoadingSpinner />}>
        <div style={{
          height: '100vh',
          width: '100%',
          colorScheme: 'dark',
          backgroundColor: 'var(--background)',
          color: 'var(--foreground)'
        }}>
          <ClientApp />
        </div>
      </Suspense>
    </div>
  );
}