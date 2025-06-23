/**
 * Example: Using N8n to Plugin Conversion
 * 
 * This example shows how users can create ElizaOS plugins
 * using natural language descriptions. The system automatically
 * generates n8n workflows and converts them to plugin components.
 */

import type { IAgentRuntime, Memory, UUID, State } from '@elizaos/core';
import { createPluginAction, checkPluginStatusAction } from '../src/actions/n8n-to-plugin-action';

// Create a default state object
const defaultState: State = {
  values: {},
  data: {},
  text: ''
};

// Example 1: Creating a Weather Plugin
async function createWeatherPlugin(runtime: IAgentRuntime) {
  console.log('🌤️ Creating a weather plugin from natural language...\n');
  
  const message: Memory = {
    id: '123e4567-e89b-12d3-a456-426614174001' as UUID,
    entityId: '123e4567-e89b-12d3-a456-426614174002' as UUID,
    roomId: '123e4567-e89b-12d3-a456-426614174003' as UUID,
    agentId: runtime.agentId,
    content: {
      text: 'Create a plugin that provides weather information for cities and sends alerts for severe weather conditions'
    },
    createdAt: Date.now()
  };

  const callback = async (response: any) => {
    console.log('Agent Response:', response.text);
    if (response.content?.projectId) {
      console.log('Project ID:', response.content.projectId);
      console.log('\nYou can check status with: "check plugin status ' + response.content.projectId + '"');
    }
  };

  await createPluginAction.handler(runtime, message, defaultState, {}, callback);
}

// Example 2: Creating a Social Media Analytics Plugin
async function createSocialMediaPlugin(runtime: IAgentRuntime) {
  console.log('\n📊 Creating a social media analytics plugin...\n');
  
  const message: Memory = {
    id: '123e4567-e89b-12d3-a456-426614174004' as UUID,
    entityId: '123e4567-e89b-12d3-a456-426614174002' as UUID,
    roomId: '123e4567-e89b-12d3-a456-426614174003' as UUID,
    agentId: runtime.agentId,
    content: {
      text: 'I need a plugin to analyze Twitter sentiment, track hashtags, and generate daily reports'
    },
    createdAt: Date.now()
  };

  const callback = async (response: any) => {
    console.log('Agent Response:', response.text);
    console.log('\nGenerated Components:');
    console.log('- TwitterSentimentProvider: Analyzes tweet sentiment');
    console.log('- HashtagTrackerService: Monitors trending hashtags');
    console.log('- GenerateReportAction: Creates daily analytics reports');
  };

  await createPluginAction.handler(runtime, message, {}, {}, callback);
}

// Example 3: Checking Plugin Generation Status
async function checkPluginStatus(runtime: IAgentRuntime, projectId: string) {
  console.log('\n🔍 Checking plugin generation status...\n');
  
  const message: Memory = {
    id: '123e4567-e89b-12d3-a456-426614174005' as UUID,
    entityId: '123e4567-e89b-12d3-a456-426614174002' as UUID,
    roomId: '123e4567-e89b-12d3-a456-426614174003' as UUID,
    agentId: runtime.agentId,
    content: {
      text: `Check status of project ${projectId}`
    },
    createdAt: Date.now()
  };

  const callback = async (response: any) => {
    console.log('Status Update:', response.text);
    
    if (response.content?.status === 'completed') {
      console.log('\n✅ Plugin generation completed!');
      console.log('Plugin Path:', response.content.result?.pluginPath);
      console.log('Components Created:');
      console.log('- Actions:', response.content.result?.components.actions);
      console.log('- Providers:', response.content.result?.components.providers);
      console.log('- Services:', response.content.result?.components.services);
    }
  };

  await checkPluginStatusAction.handler(runtime, message, {}, {}, callback);
}

// Example 4: Advanced - Creating Plugin with Custom Workflows
async function createCustomPlugin(runtime: IAgentRuntime) {
  console.log('\n⚙️ Creating plugin with custom workflow specifications...\n');
  
  const customWorkflows = [
    {
      name: 'Data Fetcher Workflow',
      nodes: [
        { 
          type: 'n8n-nodes-base.httpRequest',
          name: 'Fetch API Data',
          parameters: {
            url: 'https://api.example.com/data',
            method: 'GET'
          }
        },
        {
          type: 'n8n-nodes-base.function',
          name: 'Process Data',
          parameters: {
            functionCode: 'return items.map(item => ({ ...item, processed: true }));'
          }
        }
      ],
      connections: {
        'Fetch API Data': {
          main: [['Process Data']]
        }
      }
    }
  ];

  const message: Memory = {
    id: '123e4567-e89b-12d3-a456-426614174006' as UUID,
    entityId: '123e4567-e89b-12d3-a456-426614174002' as UUID,
    roomId: '123e4567-e89b-12d3-a456-426614174003' as UUID,
    agentId: runtime.agentId,
    content: {
      text: 'Create a data processing plugin with custom workflows',
      workflows: customWorkflows
    } as any,
    createdAt: Date.now()
  };

  const callback = async (response: any) => {
    console.log('Agent Response:', response.text);
    console.log('\nCustom workflows will be converted to:');
    console.log('- DataFetcherProvider: Cached data fetching from API');
    console.log('- ProcessDataAction: User-triggered data processing');
    console.log('- DataProcessingService: Background data sync');
  };

  await createPluginAction.handler(runtime, message, {}, {}, callback);
}

// Example Usage
async function runExamples(runtime: IAgentRuntime) {
  console.log('=== N8n to Plugin Conversion Examples ===\n');
  
  // Create weather plugin
  await createWeatherPlugin(runtime);
  
  // Simulate waiting for user input
  await new Promise(resolve => setTimeout(resolve, 2000));
  
  // Create social media plugin
  await createSocialMediaPlugin(runtime);
  
  // Simulate checking status
  await new Promise(resolve => setTimeout(resolve, 2000));
  const exampleProjectId = '123e4567-e89b-12d3-a456-426614174000';
  await checkPluginStatus(runtime, exampleProjectId);
  
  // Advanced example
  await new Promise(resolve => setTimeout(resolve, 2000));
  await createCustomPlugin(runtime);
}

// What Gets Generated
console.log('\n📦 Generated Plugin Structure:');
console.log(`
weather-plugin/
├── src/
│   ├── index.ts              # Plugin definition
│   ├── actions/
│   │   ├── getWeatherAction.ts      # "What's the weather in Paris?"
│   │   └── setAlertAction.ts        # "Alert me if it rains"
│   ├── providers/
│   │   └── weatherProvider.ts       # Cached weather data (5-min TTL)
│   ├── services/
│   │   └── weatherAlertService.ts   # Background monitoring
│   └── utils/
│       ├── weatherApi.ts            # API integration
│       └── cache.ts                 # Caching utilities
├── __tests__/
│   ├── actions/                     # Action unit tests
│   ├── providers/                   # Provider tests
│   └── e2e/                        # End-to-end tests
├── package.json
├── tsconfig.json
├── README.md                        # Auto-generated docs
└── .env.example                    # Required API keys
`);

export { runExamples }; 