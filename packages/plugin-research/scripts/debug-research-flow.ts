#!/usr/bin/env bun

import { ResearchService } from './src/service';
import { logger, IAgentRuntime, ModelType, Service } from '@elizaos/core';
import { ResearchDepth } from './src/types';

// Create minimal runtime
const createRuntime = (researchService?: ResearchService): IAgentRuntime => {
  const runtime = {
    agentId: 'debug-agent',
    character: {
      name: 'DebugAgent',
      bio: ['Debug agent for testing'],
      system: 'You are a research assistant.',
      plugins: ['research'],
    },

    getSetting: (key: string) => {
      return process.env[key] || '';
    },

    getService <T extends Service>(name: string): T | null {
      if (name === 'research' && researchService) {
        return researchService as any as T;
      }
      return null;
    },

    useModel: async (modelType: string, params: any) => {
      console.log('\n[DEBUG] Model call:', {
        modelType,
        promptLength: params.messages?.[0]?.content?.length || params.text?.length || 0,
        temperature: params.temperature,
      });

      // Simple mock responses for testing
      if (modelType === ModelType.TEXT_EMBEDDING) {
        return new Array(1536).fill(0).map(() => Math.random());
      }

      const { default: OpenAI } = await import('openai');
      const openai = new OpenAI({
        apiKey: process.env.OPENAI_API_KEY,
      });

      const messages = params.messages || [];
      const completion = await openai.chat.completions.create({
        model: 'gpt-4-turbo-preview',
        messages,
        temperature: params.temperature || 0.7,
        max_tokens: params.max_tokens || 4000,
      });

      return completion.choices[0].message.content;
    },

    messageManager: {
      createMemory: async () => true,
      getMemories: async () => [],
      updateMemory: async () => true,
      deleteMemory: async () => true,
      searchMemories: async () => [],
      getLastMessages: async () => [],
    },

    composeState: async () => ({
      values: {},
      data: {},
      text: '',
    }),

    actions: [],
    providers: [],
    evaluators: [],
    plugins: [],

    logger: logger,
  } as any;

  return runtime;
};

async function debugResearchFlow() {
  console.log('🔍 Testing Research Flow for Contamination\n');

  // Query 1: Japan Elderly
  console.log('=== Query 1: Japan Elderly Population ===');
  const runtime1 = createRuntime();
  const service1 = await ResearchService.start(runtime1);
  runtime1.getService = function <T extends Service> (name: string): T | null {
    if (name === 'research') {
      return service1 as any as T;
    }
    return null;
  };

  const project1 = await service1.createResearchProject(
    'From 2020 to 2050, how many elderly people will there be in Japan?',
    {
      researchDepth: 'quick' as ResearchDepth,
      maxSearchResults: 5,
      evaluationEnabled: false,
    }
  );

  console.log(`Project 1 created: ${project1.id}`);

  // Wait a bit for it to start
  await new Promise((resolve) => setTimeout(resolve, 30000));

  const updated1 = await service1.getProject(project1.id);
  console.log(`Project 1 status: ${updated1?.status}, Sources: ${updated1?.sources.length}`);
  if (updated1?.sources.length) {
    console.log('Project 1 source URLs:');
    updated1.sources.forEach((s, i) => console.log(`  ${i + 1}. ${s.url}`));
  }

  // Stop service 1
  await service1.stop();
  console.log('\n✅ Service 1 stopped\n');

  // Query 2: Investment Philosophy - with FRESH service
  console.log('=== Query 2: Investment Philosophies (Fresh Service) ===');
  const runtime2 = createRuntime();
  const service2 = await ResearchService.start(runtime2);
  runtime2.getService = function <T extends Service> (name: string): T | null {
    if (name === 'research') {
      return service2 as any as T;
    }
    return null;
  };

  const project2 = await service2.createResearchProject(
    'What are the investment philosophies of Warren Buffett and Charlie Munger?',
    {
      researchDepth: 'quick' as ResearchDepth,
      maxSearchResults: 5,
      evaluationEnabled: false,
    }
  );

  console.log(`Project 2 created: ${project2.id}`);

  // Wait for search phase
  await new Promise((resolve) => setTimeout(resolve, 30000));

  const updated2 = await service2.getProject(project2.id);
  console.log(`Project 2 status: ${updated2?.status}, Sources: ${updated2?.sources.length}`);
  if (updated2?.sources.length) {
    console.log('Project 2 source URLs:');
    updated2.sources.forEach((s, i) => console.log(`  ${i + 1}. ${s.url}`));
  }

  // Check for contamination
  console.log('\n🔍 Checking for contamination...');
  if (updated2?.sources.length) {
    const japanUrls = updated2.sources.filter(
      (s) =>
        s.url.toLowerCase().includes('japan') ||
        s.url.toLowerCase().includes('elderly') ||
        s.title.toLowerCase().includes('japan') ||
        s.title.toLowerCase().includes('elderly')
    );

    if (japanUrls.length > 0) {
      console.error('❌ CONTAMINATION DETECTED! Found Japan-related URLs in investment query:');
      japanUrls.forEach((s) => console.error(`   - ${s.title} (${s.url})`));
    } else {
      console.log('✅ No contamination detected in URLs');
    }
  }

  await service2.stop();
}

debugResearchFlow().catch(console.error);
