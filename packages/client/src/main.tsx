import React, { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
// import App from './App.tsx';

// Platform configuration interface
interface PlatformConfig {
  apiKey: string;
  userId: string;
  organizationId: string;
  requiredPlugins: string[];
  apiUrl: string;
  embeddedMode: boolean;
  user: {
    id: string;
    email: string;
    name: string;
  };
  platformUrl: string;
}

// Handle platform configuration messages
function setupPlatformIntegration() {
  // Listen for configuration from platform
  window.addEventListener('message', (event) => {
    // In production, verify origin more strictly
    const allowedOrigins = [
      window.location.origin,
      'http://localhost:3000', // Platform dev server
      'https://platform.elizaos.ai', // Production platform
    ];

    if (!allowedOrigins.includes(event.origin)) {
      console.warn('Ignored platform message from unauthorized origin:', event.origin);
      return;
    }

    const { type, payload } = event.data;

    if (type === 'PLATFORM_CONFIG') {
      const config = payload as PlatformConfig;

      // Store API key for API client
      localStorage.setItem('api-key', config.apiKey);

      // Store user context
      localStorage.setItem('platform-user', JSON.stringify(config.user));
      localStorage.setItem('platform-org-id', config.organizationId);
      localStorage.setItem('platform-required-plugins', JSON.stringify(config.requiredPlugins));
      localStorage.setItem('embedded-mode', config.embeddedMode.toString());

      // Notify platform that configuration is received
      window.parent.postMessage(
        {
          type: 'CLIENT_CONFIGURED',
          data: { success: true },
        },
        '*'
      );
    }
  });

  // Notify parent that client is ready to receive configuration
  if (window.parent !== window) {
    window.parent.postMessage(
      {
        type: 'CLIENT_READY',
        data: { timestamp: Date.now() },
      },
      '*'
    );
  }
}

// Set up platform integration
setupPlatformIntegration();

const rootElement = document.getElementById('root');

if (!rootElement) {
  throw new Error('Root element not found');
}

createRoot(rootElement).render(
  <StrictMode>
    <div>Hello World</div>
    {/* <App /> */}
  </StrictMode>
);
