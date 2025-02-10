// src/index.ts
import { AgentRuntime, ModelProviderName } from '@elizaos/core';
import BluefinPlugin from './plugin-bluefin';
import { DatabaseManager } from './utils/databaseAdapter';
import { CacheAdapter } from './utils/cacheManager';

const cacheManager = new CacheAdapter()
const databaseAdapter = new DatabaseManager()
// Create an AgentRuntime instance with the required options.
const runtime = new AgentRuntime({
  modelProvider: 'openai' as ModelProviderName,
  serverUrl: process.env.SERVER_URL || 'http://localhost:3000',
  plugins: [BluefinPlugin],
  token: process.env.AGENT_TOKEN || 'default-token',
  character: require('./character/bluefinTrader.json'),
  databaseAdapter,
  cacheManager,
});

// Run the agent.
runtime.initialize().then(() => {
  console.log('Agent is running...');
});
