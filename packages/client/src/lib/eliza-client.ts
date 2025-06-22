import { ElizaClient } from '@elizaos/api-client';

// Get API key from localStorage if available
const getApiKey = () => {
  if (typeof window !== 'undefined') {
    return localStorage.getItem('elizaApiKey') || undefined;
  }
  return undefined;
};

// Create the ElizaClient instance with configuration
export const elizaClient = ElizaClient.create({
  baseUrl: '', // Empty string means use relative URLs (same origin)
  apiKey: getApiKey(),
  timeout: 30000, // 30 seconds
});

// Helper to update API key dynamically
export const updateApiKey = (apiKey: string | null) => {
  if (apiKey) {
    localStorage.setItem('elizaApiKey', apiKey);
  } else {
    localStorage.removeItem('elizaApiKey');
  }
  
  // Recreate client with new API key
  Object.assign(elizaClient, ElizaClient.create({
    baseUrl: '',
    apiKey: apiKey || undefined,
    timeout: 30000,
  }));
};