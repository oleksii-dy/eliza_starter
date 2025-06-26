/**
 * Mock Providers for Testing
 * Provides isolated test environment without external API dependencies
 */

import { SearchProvider, SearchResult, ContentExtractor } from '../types';
import { IAgentRuntime, UUID } from '@elizaos/core';

export class MockSearchProvider implements SearchProvider {
  name = 'mock-search';
  supportedDomains = ['test', 'general'];

  async search(query: string, options?: any): Promise<SearchResult[]> {
    // Simulate API delay
    await new Promise((resolve) => setTimeout(resolve, 100));

    return [
      {
        title: `Mock Result for: ${query}`,
        url: `https://example.com/search/${encodeURIComponent(query)}`,
        snippet: `This is a mock search result for the query: ${query}. It contains relevant information that would be found in a real search.`,
        score: 0.95,
        provider: 'mock-search',
        metadata: {
          type: 'mock',
          provider: 'mock-search',
          language: 'en',
        },
      },
      {
        title: `Secondary Mock Result for: ${query}`,
        url: `https://example.org/article/${encodeURIComponent(query)}`,
        snippet: `Additional mock content related to: ${query}. This provides more depth and context for testing purposes.`,
        score: 0.87,
        provider: 'mock-search',
        metadata: {
          type: 'mock',
          provider: 'mock-search',
          language: 'en',
        },
      },
    ];
  }

  async isAvailable(): Promise<boolean> {
    return true;
  }
}

export class MockContentExtractor implements ContentExtractor {
  name = 'mock-extractor';
  supportedTypes = ['text', 'html', 'markdown'];

  async extractContent(
    url: string
  ): Promise<{ content: string; metadata: any }> {
    // Simulate extraction delay
    await new Promise((resolve) => setTimeout(resolve, 200));

    return {
      content: `
# Mock Content for ${url}

This is comprehensive mock extracted content from the URL: ${url}. This content provides detailed analysis and extensive coverage of the research topic with substantial depth and breadth.

## Introduction
The research topic presented here represents a significant area of investigation with multiple dimensions and important implications for understanding the subject matter. This comprehensive analysis examines various perspectives and synthesizes information from diverse sources to provide valuable insights.

## Key Points and Findings
- Mock bullet point 1 about the topic provides detailed explanation of fundamental concepts and theoretical frameworks that underpin the research area
- Mock bullet point 2 with additional details examines practical applications and real-world implementations of key principles
- Mock bullet point 3 providing context discusses methodological approaches and their implications for research outcomes
- Additional analysis point exploring the significance of recent developments and emerging trends in the field
- Comprehensive examination of best practices and their application across different contexts and scenarios

## Detailed Analysis
The mock content provides comprehensive coverage of the topic with detailed explanations and extensive examples. This analysis incorporates multiple perspectives and demonstrates thorough understanding of the complex relationships between different aspects of the research domain.

The investigation reveals several important patterns and trends that have significant implications for both theoretical understanding and practical application. These findings suggest opportunities for continued research and development in this important area.

## Methodology and Approach
The research methodology employed ensures systematic examination of available evidence while maintaining rigorous standards for analysis and synthesis. This comprehensive approach provides reliable foundations for understanding current knowledge and identifying future research directions.

## Implications and Future Directions
The findings presented here have important implications for understanding the broader context of the research area. They suggest several avenues for continued investigation and highlight the need for sustained scholarly attention to these critical questions.

## Conclusion
This comprehensive mock content serves as a representative example of substantial research material that would be extracted from a real webpage. The analysis demonstrates the depth and breadth of investigation required for thorough understanding of complex research topics.
      `.trim(),
      metadata: {
        title: `Mock Page Title for ${url}`,
        author: 'Mock Author',
        wordCount: 350,
        extractedBy: 'mock-extractor',
      },
    };
  }

  async extract(content: string, type: string): Promise<any> {
    // Implement the extract method required by ContentExtractor interface
    return {
      content: `Extracted content from ${type}: ${content.substring(0, 100)}...`,
      metadata: {
        type,
        extractedBy: 'mock-extractor',
        timestamp: new Date().toISOString(),
      },
    };
  }

  async isAvailable(): Promise<boolean> {
    return true;
  }
}

export class RateLimitedMockProvider extends MockSearchProvider {
  private requestCount = 0;
  private readonly maxRequests = 5;
  private readonly resetTime = 60000; // 1 minute

  constructor() {
    super();
    this.name = 'rate-limited-mock';

    // Reset counter every minute
    setInterval(() => {
      this.requestCount = 0;
    }, this.resetTime);
  }

  async search(query: string, options?: any): Promise<SearchResult[]> {
    this.requestCount++;

    if (this.requestCount > this.maxRequests) {
      throw new Error(
        `Rate limit exceeded. Max ${this.maxRequests} requests per minute.`
      );
    }

    return super.search(query, options);
  }
}

export class FailingMockProvider extends MockSearchProvider {
  private failureRate: number;

  constructor(failureRate = 0.3) {
    super();
    this.name = 'failing-mock';
    this.failureRate = failureRate;
  }

  async search(query: string, options?: any): Promise<SearchResult[]> {
    if (Math.random() < this.failureRate) {
      throw new Error(`Mock provider failure for query: ${query}`);
    }

    return super.search(query, options);
  }
}

// Factory function to create test-specific providers
export function createTestProviders(
  config: {
    enableRateLimit?: boolean;
    failureRate?: number;
    delay?: number;
  } = {}
) {
  const providers: SearchProvider[] = [];

  if (config.enableRateLimit) {
    providers.push(new RateLimitedMockProvider());
  }

  if (config.failureRate && config.failureRate > 0) {
    providers.push(new FailingMockProvider(config.failureRate));
  }

  // Always include at least one reliable provider
  providers.push(new MockSearchProvider());

  return {
    searchProviders: providers,
    contentExtractors: [new MockContentExtractor()],
  };
}

// Mock runtime with proper API key simulation
export function createTestRuntime(
  overrides: Record<string, any> = {}
): IAgentRuntime {
  const baseRuntime = {
    // Required properties
    agentId: 'test-agent-123' as UUID,
    character: {
      name: 'Test Agent',
      bio: ['Test bio'],
    },
    providers: [] as any[],
    actions: [] as any[],
    evaluators: [] as any[],
    plugins: [] as any[],
    services: new Map(),

    // Methods
    getSetting: (key: string) => {
      const settings: Record<string, string> = {
        // Mock API keys to satisfy validation
        TAVILY_API_KEY: 'mock-tavily-key',
        EXA_API_KEY: 'mock-exa-key',
        SERPER_API_KEY: 'mock-serper-key',
        SERPAPI_API_KEY: 'mock-serpapi-key',
        FIRECRAWL_API_KEY: 'mock-firecrawl-key',
        OPENAI_API_KEY: 'mock-openai-key',

        // Research configuration
        RESEARCH_MAX_RESULTS: '10',
        RESEARCH_TIMEOUT: '300000',
        RESEARCH_ENABLE_CITATIONS: 'true',
        RESEARCH_ENABLE_IMAGES: 'true',
        RESEARCH_LANGUAGE: 'en',

        ...overrides,
      };
      return settings[key] || null;
    },

    useModel: async (type: any, params: any) => {
      // Mock LLM responses for different use cases
      const content =
        params.messages?.[1]?.content || params.messages?.[0]?.content || '';

      // Handle sub-query generation
      if (
        content.includes('Generate sub-queries') ||
        content.includes('Generate 3-7 specific sub-queries')
      ) {
        return `PURPOSE: Research recent developments
QUERY: mock query 1
TYPE: factual
PRIORITY: high

---

PURPOSE: Analyze technical aspects
QUERY: mock query 2  
TYPE: analytical
PRIORITY: medium

---

PURPOSE: Explore applications
QUERY: mock query 3
TYPE: exploratory
PRIORITY: medium`;
      }

      // Handle task type extraction
      if (
        content.includes('task type') ||
        content.includes('classify this research query')
      ) {
        return 'comprehensive';
      }

      // Handle content analysis
      if (
        content.includes('analyze') ||
        content.includes('extract key insights')
      ) {
        return 'Key insights: Mock analysis result with relevant findings and important details about the research topic. This analysis provides comprehensive coverage of the subject matter with detailed explanations and supporting evidence from multiple sources. The findings demonstrate significant depth and breadth of understanding across various aspects of the research question.';
      }

      // Handle executive summary generation
      if (
        content.includes('executive summary') ||
        content.includes('comprehensive summary')
      ) {
        return `This comprehensive research investigation provides an in-depth analysis of the specified topic, examining multiple perspectives and synthesizing information from diverse sources. The study explores key concepts, methodologies, and findings that contribute to our understanding of the subject matter.

The research reveals several important insights and trends that have significant implications for the field. Through systematic analysis of available literature and evidence, this investigation identifies core principles and best practices that inform current understanding and future directions.

Key findings include detailed examination of theoretical frameworks, practical applications, and emerging developments in the area of study. The analysis demonstrates the complexity and interconnected nature of the research domain while highlighting areas for continued investigation and development.

The methodology employed ensures comprehensive coverage while maintaining rigorous standards for evidence evaluation and synthesis. This approach provides a reliable foundation for understanding the current state of knowledge and identifying opportunities for advancement in the field.`;
      }

      // Handle section content generation
      if (
        content.includes('detailed section') ||
        content.includes('comprehensive analysis')
      ) {
        return `This section provides detailed analysis and comprehensive examination of the research topic. The investigation reveals multiple dimensions and perspectives that contribute to our understanding of the subject matter.

Through systematic review of available evidence, several key themes emerge that demonstrate the complexity and significance of this area of study. The analysis incorporates both theoretical frameworks and practical considerations to provide a balanced perspective.

Current research indicates significant developments in methodology and application that have implications for future work in this domain. These findings suggest opportunities for continued investigation and refinement of understanding.

The evidence supports conclusions about the importance of comprehensive approaches that consider multiple factors and perspectives. This multi-faceted analysis contributes to a more complete understanding of the research question and its broader implications.

Furthermore, the investigation identifies areas where additional research would be beneficial and highlights the importance of continued scholarly attention to these important questions.`;
      }

      // Default comprehensive response for other cases
      return 'This comprehensive analysis examines the research topic from multiple perspectives, synthesizing information from diverse sources to provide detailed insights. The investigation reveals important patterns and trends that contribute significantly to our understanding of the subject matter. Through systematic examination of available evidence, this analysis identifies key principles and best practices that inform current knowledge and future research directions in this important area of study.';
    },

    // Add minimal implementations for other required methods
    initialize: async () => {},
    getService: (name: string) => {
      return baseRuntime.services.get(name) || null;
    },
    composeState: async () => ({}),
    processActions: async () => {},
    createMemory: async () => {},
    getMemories: async () => [],
    searchMemories: async () => [],
    createEntity: async () => 'test-entity-id' as UUID,
    getEntityById: async () => null,
    registerTaskWorker: () => {},
    createTask: async () => 'test-task-id' as UUID,
    getTasks: async () => [],

    // Database adapter methods (simplified)
    db: null as any,
    isReady: true,
    close: async () => {},
    getMemoryById: async () => null,
    updateMemory: async () => {},
    removeMemory: async () => {},
    removeAllMemories: async () => {},
    countMemories: async () => 0,
    getGoals: async () => [],
    updateGoal: async () => {},
    createGoal: async () => {},
    removeGoal: async () => {},
    removeAllGoals: async () => {},
    createRoom: async () => 'test-room-id' as UUID,
    removeRoom: async () => {},
    getRoomsForParticipant: async () => [],
    getRoomsForParticipants: async () => [],
    addParticipant: async () => true,
    removeParticipant: async () => true,
    getParticipantsForAccount: async () => [],
    getParticipantUserState: async () => null,
    setParticipantUserState: async () => {},
    createRelationship: async () => true,
    getRelationship: async () => null,
    getRelationships: async () => [],
    getAccountById: async () => null,
    createAccount: async () => true,
    getActorDetails: async () => [],
    getCachedEmbeddings: async () => [],
    log: async () => {},
    getActorById: async () => null,

    // Plugin management methods
    registerPlugin: async (plugin: any) => {
      // Mock plugin registration - start services
      if (plugin.services) {
        for (const ServiceClass of plugin.services) {
          const service = await ServiceClass.start(baseRuntime as any);
          baseRuntime.services.set(ServiceClass.serviceName, service);
        }
      }
      // Add actions and providers
      if (plugin.actions) {
        (baseRuntime.actions as any[]).push(...plugin.actions);
      }
      if (plugin.providers) {
        (baseRuntime.providers as any[]).push(...plugin.providers);
      }
    },

    ...overrides,
  };

  return baseRuntime as any as IAgentRuntime;
}
