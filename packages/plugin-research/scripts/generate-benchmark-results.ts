#!/usr/bin/env bun
import { IAgentRuntime, UUID, Memory, State } from '@elizaos/core';
import { v4 as uuidv4 } from 'uuid';
import { ResearchService } from './src/service';
import researchPlugin from './src/index';
import fs from 'fs/promises';
import path from 'path';

// Mock runtime for testing (from deepresearch-bench-integration.test.ts)
class MockRuntime implements IAgentRuntime {
  agentId: UUID = uuidv4() as UUID;
  character = {
    name: 'ElizaOS Research Agent',
    bio: ['Advanced research agent for academic and business inquiries'],
    system: 'You are an expert research assistant capable of conducting comprehensive, multi-source research.',
    messageExamples: [],
    postExamples: [],
    topics: [],
    adjectives: [],
    knowledge: [],
    clients: [],
    plugins: [],
  };

  providers: any[] = [];
  actions: any[] = [];
  evaluators: any[] = [];
  plugins: any[] = [];
  services: Map<string, any> = new Map();
  memory: Map<string, Memory> = new Map();
  settings: Map<string, string> = new Map();

  constructor() {
    // Initialize with real API keys from environment
    this.settings.set('TAVILY_API_KEY', process.env.TAVILY_API_KEY || '');
    this.settings.set('ANTHROPIC_API_KEY', process.env.ANTHROPIC_API_KEY || '');
    this.settings.set('OPENAI_API_KEY', process.env.OPENAI_API_KEY || '');
    this.settings.set('FIRECRAWL_API_KEY', process.env.FIRECRAWL_API_KEY || '');
    this.settings.set('ARXIV_API_KEY', process.env.ARXIV_API_KEY || '');
  }

  getSetting(key: string): string | undefined {
    return this.settings.get(key);
  }

  setSetting(key: string, value: string): void {
    this.settings.set(key, value);
  }

  async getMemory(id: string): Promise<Memory | undefined> {
    return this.memory.get(id);
  }

  async saveMemory(memory: Memory): Promise<void> {
    this.memory.set(memory.id || uuidv4(), memory);
  }

  getService(name: string): any | null {
    return this.services.get(name) || null;
  }

  async registerService(service: any): Promise<void> {
    this.services.set(service.serviceName, service);
  }

  async useModel(type: string, params: any): Promise<any> {
    // For now, just return a mock response - in production this would call real LLM
    return { content: 'Mock LLM response for benchmark generation' };
  }

  // Implement required interface methods with basic implementations
  async processActions(message: Memory, responses: Memory[], state?: State, callback?: any): Promise<void> {}
  async evaluate(message: Memory, state?: State, didRespond?: boolean, callback?: any, responses?: Memory[]): Promise<any[] | null> {
    return null;
  }
  async composeState(message: Memory, includeList?: string[], onlyInclude?: boolean, skipCache?: boolean): Promise<State> {
    return { values: {}, data: {}, text: '' };
  }
  async registerPlugin(plugin: any): Promise<void> {
    this.plugins.push(plugin);
    if (plugin.services) {
      for (const ServiceClass of plugin.services) {
        const service = await ServiceClass.start(this);
        await this.registerService(service);
      }
    }
  }
  async initialize(): Promise<void> {}

  // Database adapter methods (minimal implementations)
  async getMemories(params: any): Promise<Memory[]> { return []; }
  async createMemory(memory: Memory, unique?: boolean): Promise<void> {}
  async searchMemories(params: any): Promise<Memory[]> { return []; }
  async updateMemory(memory: Memory): Promise<void> {}
  async removeMemory(id: string): Promise<void> {}
  async removeAllMemories(roomId: string): Promise<void> {}
  async countMemories(roomId: string, unique?: boolean): Promise<number> { return 0; }
  async getGoals(params: any): Promise<any[]> { return []; }
  async createGoal(goal: any): Promise<void> {}
  async updateGoal(goal: any): Promise<void> {}
  async removeGoal(id: string): Promise<void> {}
  async removeAllGoals(roomId: string): Promise<void> {}
  async getRoom(roomId: string): Promise<any | null> { return null; }
  async createRoom(roomId?: string): Promise<string> { return roomId || uuidv4(); }
  async removeRoom(roomId: string): Promise<void> {}
  async listRooms(userId: string): Promise<any[]> { return []; }
  async createRelationship(params: any): Promise<boolean> { return true; }
  async getRelationship(params: any): Promise<any | null> { return null; }
  async getRelationships(params: any): Promise<any[]> { return []; }
  async createParticipant(participant: any): Promise<boolean> { return true; }
  async removeParticipant(params: any): Promise<boolean> { return true; }
  async updateParticipant(participant: any): Promise<boolean> { return true; }
  async getParticipants(roomId: string): Promise<any[]> { return []; }
  async getParticipantUserState(params: any): Promise<any | null> { return null; }
  async setParticipantUserState(params: any): Promise<void> {}

  messageManager = {
    createMemory: async (memory: Memory) => memory,
    getMemories: async (params: any) => [],
    getMemoriesByRoomIds: async (params: any) => [],
    updateMemory: async (memory: Memory) => {},
    countMemories: async (roomId: string) => 0,
    removeMemory: async (id: string) => {},
    removeAllMemories: async (roomId: string) => {},
    searchMemoriesByEmbedding: async (params: any) => [],
  };

  descriptionManager = {
    getMemories: async (params: any) => [],
    createMemory: async (memory: Memory) => memory,
    removeMemory: async (id: string) => {},
  };

  documentsManager = {
    createMemory: async (memory: Memory) => memory,
    getMemories: async (params: any) => [],
    removeMemory: async (id: string) => {},
  };

  knowledgeManager = {
    createMemory: async (memory: Memory) => memory,
    getMemories: async (params: any) => [],
    searchMemories: async (params: any) => [],
    removeMemory: async (id: string) => {},
  };

  loreManager = {
    createMemory: async (memory: Memory) => memory,
    getMemories: async (params: any) => [],
    searchMemories: async (params: any) => [],
    removeMemory: async (id: string) => {},
  };

  databaseAdapter = this;
}

interface BenchmarkQuery {
  id: number;
  topic: string;
  language: string;
  prompt: string;
}

interface BenchmarkResult {
  id: string;
  prompt: string;
  article: string;
}

async function generateBenchmarkResults() {
  console.log('🚀 Starting ElizaOS Research Plugin benchmark generation...');
  
  // Create research runtime
  const runtime = new MockRuntime();
  await runtime.initialize();
  await runtime.registerPlugin(researchPlugin);
  
  const researchService = runtime.getService('research') as ResearchService;
  
  if (!researchService) {
    throw new Error('Research service not found after plugin registration');
  }
  
  // Load benchmark queries
  const queriesPath = path.join(__dirname, 'deep_research_bench/data/prompt_data/query.jsonl');
  const queriesContent = await fs.readFile(queriesPath, 'utf-8');
  const queries: BenchmarkQuery[] = queriesContent
    .trim()
    .split('\n')
    .map(line => JSON.parse(line));
  
  console.log(`📋 Loaded ${queries.length} benchmark queries`);
  
  // Process first 5 English queries for testing
  const englishQueries = queries.filter(q => q.language === 'en').slice(0, 5);
  const results: BenchmarkResult[] = [];
  
  for (let i = 0; i < englishQueries.length; i++) {
    const query = englishQueries[i];
    console.log(`\n📝 Processing query ${i + 1}/${englishQueries.length}: ${query.prompt.substring(0, 100)}...`);
    
    try {
      // Create research project
      const project = await researchService.createResearchProject(query.prompt, {
        researchDepth: 'DEEP',
        maxSearchResults: 20,
        enableCitations: true,
        language: query.language as 'en' | 'zh',
        timeout: 300000, // 5 minutes
      });
      
      // Generate final formatted report
      const report = await researchService.generateFormattedReport(project.id);
      
      const wordCount = report.split(' ').length;
      console.log(`✅ Generated ${wordCount} word report for query ${query.id}`);
      
      // Format result for benchmark
      const benchmarkResult: BenchmarkResult = {
        id: query.id.toString(),
        prompt: query.prompt,
        article: report
      };
      
      results.push(benchmarkResult);
      
    } catch (error) {
      console.error(`❌ Error processing query ${query.id}:`, error);
      
      // Add fallback result
      const fallbackResult: BenchmarkResult = {
        id: query.id.toString(),
        prompt: query.prompt,
        article: `# Research Report

Unfortunately, we encountered an error while generating this research report: ${error.message}

Please try again or contact support for assistance.`
      };
      
      results.push(fallbackResult);
    }
  }
  
  // Save results to benchmark format
  const outputDir = path.join(__dirname, 'deep_research_bench/data/test_data/raw_data');
  await fs.mkdir(outputDir, { recursive: true });
  
  const outputPath = path.join(outputDir, 'eliza.jsonl');
  const outputContent = results.map(result => JSON.stringify(result)).join('\n');
  
  await fs.writeFile(outputPath, outputContent);
  
  console.log(`\n🎉 Benchmark results saved to: ${outputPath}`);
  console.log(`📊 Generated ${results.length} research reports`);
  
  // Print summary statistics
  const wordCounts = results.map(r => r.article.split(' ').length);
  const avgWordCount = wordCounts.reduce((a, b) => a + b, 0) / wordCounts.length;
  
  console.log(`📈 Average report length: ${Math.round(avgWordCount)} words`);
  console.log(`📏 Report length range: ${Math.min(...wordCounts)} - ${Math.max(...wordCounts)} words`);
  
  return results;
}

// Run the benchmark generation
generateBenchmarkResults().catch(console.error);