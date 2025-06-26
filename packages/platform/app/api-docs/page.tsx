'use client';

import SwaggerUI from 'swagger-ui-react';
import 'swagger-ui-react/swagger-ui.css';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function ApiDocsPage() {
  const [spec, setSpec] = useState(null);
  const [apiKey, setApiKey] = useState('');
  const [bearerToken, setBearerToken] = useState('');
  const router = useRouter();

  useEffect(() => {
    // Load the OpenAPI spec
    fetch('/api/swagger')
      .then(res => res.json())
      .then(data => setSpec(data))
      .catch(err => console.error('Failed to load API spec:', err));

    // Load saved tokens from localStorage
    const savedApiKey = localStorage.getItem('api-test-key');
    const savedToken = localStorage.getItem('api-test-token');
    if (savedApiKey) setApiKey(savedApiKey);
    if (savedToken) setBearerToken(savedToken);
  }, []);

  const handleApiKeyChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setApiKey(value);
    localStorage.setItem('api-test-key', value);
  };

  const handleTokenChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setBearerToken(value);
    localStorage.setItem('api-test-token', value);
  };

  const handleLogin = async () => {
    try {
      const response = await fetch('/api/v1/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'test@elizaos.ai',
          password: 'TestPassword123!'
        })
      });
      const data = await response.json();
      if (data.success) {
        setBearerToken(data.data.token);
        localStorage.setItem('api-test-token', data.data.token);
        alert('Login successful! Token saved.');
      } else {
        alert('Login failed: ' + data.error);
      }
    } catch (error) {
      alert('Login error: ' + (error instanceof Error ? error.message : 'Unknown error'));
    }
  };

  const requestInterceptor = (req: any) => {
    if (apiKey) {
      req.headers['X-API-Key'] = apiKey;
    }
    if (bearerToken && req.headers.Authorization === 'Bearer undefined') {
      req.headers.Authorization = `Bearer ${bearerToken}`;
    }
    return req;
  };

  if (!spec) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading API documentation...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="py-4">
            <h1 className="text-2xl font-bold text-gray-900">ElizaOS API Documentation</h1>
            <p className="mt-2 text-gray-600">
              Interactive API documentation with testing capabilities
            </p>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white rounded-lg shadow-sm p-6 mb-8">
          <h2 className="text-lg font-semibold mb-4">Authentication Setup</h2>
          <p className="text-sm text-gray-600 mb-4">
            Configure your authentication credentials to test protected endpoints
          </p>
          
          <div className="space-y-4">
            <div>
              <label htmlFor="apiKey" className="block text-sm font-medium text-gray-700 mb-1">
                API Key (X-API-Key header)
              </label>
              <input
                id="apiKey"
                type="text"
                value={apiKey}
                onChange={handleApiKeyChange}
                placeholder="Enter your API key"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label htmlFor="bearerToken" className="block text-sm font-medium text-gray-700 mb-1">
                Bearer Token (JWT)
              </label>
              <div className="flex gap-2">
                <input
                  id="bearerToken"
                  type="text"
                  value={bearerToken}
                  onChange={handleTokenChange}
                  placeholder="Enter your bearer token"
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <button
                  onClick={handleLogin}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                >
                  Get Token (Test Login)
                </button>
              </div>
              <p className="text-xs text-gray-500 mt-1">
                Click "Get Token" to login with test credentials and get a JWT token
              </p>
            </div>
          </div>

          <div className="mt-6 p-4 bg-gray-50 rounded-md">
            <h3 className="text-sm font-semibold text-gray-700 mb-2">Quick Start:</h3>
            <ol className="text-sm text-gray-600 space-y-1 list-decimal list-inside">
              <li>Click "Get Token" to obtain a JWT token using test credentials</li>
              <li>For API Key authentication, create one using the /api-keys endpoint</li>
              <li>Use the "Try it out" button on any endpoint to test it</li>
              <li>The authentication headers will be automatically included</li>
            </ol>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm">
          <SwaggerUI
            spec={spec}
            requestInterceptor={requestInterceptor}
            tryItOutEnabled={true}
            persistAuthorization={true}
            displayRequestDuration={true}
            filter={true}
            showExtensions={true}
            showCommonExtensions={true}
          />
        </div>
      </div>
    </div>
  );
} 