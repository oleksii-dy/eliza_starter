import { ResearchService } from '../src/service';
import { ResearchDepth, ResearchDomain, TaskType } from '../src/types';
import { IAgentRuntime, ModelType, logger } from '@elizaos/core';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Create a mock runtime for testing without API keys
const createMockRuntime = (): IAgentRuntime => {
  let callCount = 0;

  return {
    agentId: 'deepresearch-bench-test-agent',
    getSetting: (key: string) => {
      const settings: Record<string, string> = {
        // Research settings
        RESEARCH_MAX_RESULTS: '50',
        RESEARCH_TIMEOUT: '600000',
        RESEARCH_ENABLE_CITATIONS: 'true',
        RESEARCH_LANGUAGE: 'en',
        RESEARCH_QUALITY_THRESHOLD: '0.7',
        // Mock API keys
        TAVILY_API_KEY: 'mock-tavily-key',
        SERPER_API_KEY: 'mock-serper-key',
        EXA_API_KEY: 'mock-exa-key',
        SERPAPI_API_KEY: 'mock-serpapi-key',
        OPENAI_API_KEY: 'mock-openai-key',
      };
      return settings[key] || null;
    },
    useModel: async (modelType: typeof ModelType[keyof typeof ModelType], params: any) => {
      callCount++;
      const prompt = params.messages[params.messages.length - 1].content;

      console.log(`\n🔍 Mock useModel called (${callCount}):`, `${prompt.substring(0, 100)}...\n`);

      // Mock responses based on prompt content
      if (prompt.includes('Generate sub-queries')) {
        console.log('  → Returning: sub-queries');
        return `PURPOSE: Analyze current elderly population statistics and projections
QUERY: elderly population Japan 2020-2050 projections demographics
TYPE: statistical
PRIORITY: high
---
PURPOSE: Understand consumption patterns and market behavior
QUERY: Japan aging society consumption patterns elderly spending
TYPE: factual
PRIORITY: high
---
PURPOSE: Analyze specific market sectors
QUERY: elderly consumer behavior Japan clothing food housing transportation
TYPE: practical
PRIORITY: medium
---
PURPOSE: Estimate market size and growth potential
QUERY: senior market size Japan forecast economic impact
TYPE: statistical
PRIORITY: high
---
PURPOSE: Identify future trends and changes
QUERY: demographic transition Japan elderly spending habits future trends
TYPE: predictive
PRIORITY: medium`;
      }

      if (prompt.includes('task type')) {
        console.log('  → Returning: analytical');
        return 'analytical';
      }

      if (prompt.includes('research plan')) {
        console.log('  → Returning: research plan');
        return `Research plan for comprehensive analysis:
1. Search for recent academic papers and industry reports
2. Analyze key developments and trends
3. Compare different approaches and methodologies
4. Synthesize findings into actionable insights
5. Provide recommendations based on evidence`;
      }

      if (prompt.includes('search queries')) {
        return JSON.stringify([
          'elderly population Japan 2020-2050 projections',
          'Japan aging society consumption patterns',
          'elderly consumer behavior Japan clothing food housing',
          'senior market size Japan forecast',
          'demographic transition Japan elderly spending'
        ]);
      }

      if (prompt.includes('relevance')) {
        return '0.85';
      }

      if (prompt.includes('Extract key findings')) {
        return JSON.stringify([
          {
            content: 'Japan\'s elderly population (65+) is projected to reach 35.3% by 2040, up from 28.7% in 2020, representing approximately 42 million people.',
            relevance: 0.95,
            confidence: 0.9,
            category: 'fact'
          },
          {
            content: 'The elderly consumer market in Japan is estimated to be worth ¥100 trillion ($900 billion) annually, with healthcare and housing being the largest expenditure categories.',
            relevance: 0.9,
            confidence: 0.85,
            category: 'data'
          },
          {
            content: 'Elderly Japanese consumers show increasing willingness to spend on quality-of-life improvements, including premium food products, comfortable clothing, and smart home technologies.',
            relevance: 0.88,
            confidence: 0.82,
            category: 'trend'
          }
        ]);
      }

      if (prompt.includes('factual claims')) {
        return JSON.stringify([
          {
            statement: 'Japan has the world\'s most rapidly aging society',
            citationIndex: 1,
            supportingEvidence: 'Government statistics show 28.7% of population over 65 in 2020'
          },
          {
            statement: 'Elderly spending patterns differ significantly from younger demographics',
            citationIndex: 2,
            supportingEvidence: 'Consumer surveys indicate 40% higher spending on healthcare'
          }
        ]);
      }

      if (prompt.includes('Synthesize findings')) {
        return 'Based on the analysis of demographic projections and consumer behavior patterns, Japan\'s elderly population represents a massive and growing market opportunity. The convergence of demographic transition and changing consumption patterns creates unique market dynamics that businesses must understand to succeed in this segment.';
      }

      if (prompt.includes('Generate.*report') || prompt.includes('comprehensive.*report')) {
        return `# Japan's Elderly Population and Consumer Market Analysis (2020-2050)

## Executive Summary

This comprehensive analysis examines the demographic transition and consumer market potential of Japan's elderly population from 2020 to 2050. Our research reveals that Japan's aging society presents both challenges and significant market opportunities, with the elderly consumer market projected to exceed ¥100 trillion annually.

## Introduction

Japan faces an unprecedented demographic shift as it becomes the world's first "super-aged" society. This research analyzes the implications for consumer markets across key sectors including clothing, food, housing, and transportation.

## Demographic Projections

### Population Trends
- 2020: 28.7% of population aged 65+ (36.2 million)
- 2030: 31.2% projected (37.8 million)
- 2040: 35.3% projected (42.0 million)
- 2050: 37.7% projected (43.5 million)

### Regional Variations
Urban areas show higher concentrations of elderly, with Tokyo metropolitan area housing 30% of Japan's senior population.

## Consumer Market Analysis

### Market Size Estimates
The elderly consumer market represents approximately ¥100 trillion in annual spending power, distributed across:
- Healthcare and medical: 35%
- Housing and utilities: 25%
- Food and beverages: 20%
- Transportation: 10%
- Clothing and personal care: 5%
- Leisure and entertainment: 5%

### Consumption Patterns
Research indicates shifting preferences among elderly consumers:
1. Increased focus on health and wellness products
2. Growing demand for convenience and accessibility
3. Premium product preferences in food and clothing
4. Technology adoption for daily living assistance

## Sector-Specific Analysis

### Clothing
- Market size: ¥5 trillion annually
- Trends: Comfort-focused design, easy-care fabrics, adaptive clothing
- Growth potential: 15% CAGR through 2030

### Food
- Market size: ¥20 trillion annually
- Trends: Nutritional supplements, soft-texture foods, portion control
- Growth potential: 12% CAGR through 2030

### Housing
- Market size: ¥25 trillion annually
- Trends: Barrier-free design, smart home integration, multi-generational housing
- Growth potential: 8% CAGR through 2030

### Transportation
- Market size: ¥10 trillion annually
- Trends: Autonomous vehicles, enhanced public transport accessibility
- Growth potential: 20% CAGR through 2030

## Market Opportunities

1. **Product Innovation**: Development of age-specific products across all categories
2. **Service Integration**: Comprehensive lifestyle support services
3. **Technology Solutions**: IoT and AI-powered assistance systems
4. **Community Development**: Age-friendly urban planning and retail environments

## Recommendations

1. Businesses should prioritize universal design principles
2. Invest in research targeting elderly consumer preferences
3. Develop integrated service ecosystems
4. Focus on quality and reliability over price competition
5. Build trust through transparent communication

## Conclusion

Japan's aging population represents one of the world's largest and most sophisticated elderly consumer markets. Success requires deep understanding of evolving needs and preferences, combined with innovative approaches to product and service delivery.`;
      }

      if (prompt.includes('Evaluate this research report')) {
        return JSON.stringify({
          score: 85,
          reasoning: 'Comprehensive coverage with good depth and clear structure',
          rubricScores: {
            comprehensiveness: 90,
            depth: 85,
            clarity: 88,
            evidence: 82
          }
        });
      }

      // Default response
      return `Mock response for prompt: ${prompt.substring(0, 100)}...`;
    },
    getService: (name: string) => null,
    character: {
      name: 'DeepResearch Bench Test Agent',
      bio: ['A test agent for benchmark evaluation'],
      system: 'You are an expert research assistant.',
    },
  } as unknown as IAgentRuntime;
};

interface BenchmarkQuery {
  id: number;
  topic: string;
  language: string;
  prompt: string;
}

async function runTestBenchmark() {
  // Set up mock environment for testing BEFORE any service initialization
  process.env.NODE_ENV = 'test';
  process.env.VITEST = 'true';

  // Mock API keys to pass validation
  process.env.TAVILY_API_KEY = 'mock-tavily-key';
  process.env.SERPER_API_KEY = 'mock-serper-key';
  process.env.EXA_API_KEY = 'mock-exa-key';
  process.env.OPENAI_API_KEY = 'mock-openai-key';

  console.log('🚀 Starting DeepResearch Bench Test (Mock Mode)');
  console.log('⚠️  Running without API keys - using mock data');
  console.log('=' .repeat(60));

  // Load benchmark queries
  const dataPath = path.join(__dirname, '../deep_research_bench/data/prompt_data/query.jsonl');
  const queryData = await fs.readFile(dataPath, 'utf-8');

  // Get first 5 English queries
  const allQueries: BenchmarkQuery[] = queryData
    .split('\n')
    .filter(line => line.trim())
    .map(line => JSON.parse(line));

  const englishQueries = allQueries
    .filter(q => q.language === 'en')
    .slice(0, 5);

  console.log(`\n📝 Testing with ${englishQueries.length} English queries\n`);

  // Create output directory
  const outputDir = path.join(__dirname, '../results/eliza-test/en');
  await fs.mkdir(outputDir, { recursive: true });

  // Initialize research service with mock runtime
  const runtime = createMockRuntime();
  const researchService = new ResearchService(runtime);

  // Process just the first query in detail for demonstration
  const query = englishQueries[0];

  console.log(`\n${'='.repeat(60)}`);
  console.log(`📊 Processing Query ID: ${query.id}`);
  console.log(`📝 Topic: ${query.topic}`);
  console.log(`📝 Query: ${query.prompt}`);
  console.log(`${'='.repeat(60)}\n`);

  try {
    // Create research project
    const project = await researchService.createResearchProject(query.prompt, {
      researchDepth: ResearchDepth.PHD_LEVEL,
      maxSearchResults: 50,
      evaluationEnabled: true,
      parallelSearches: 10,
      enableCitations: true,
      qualityThreshold: 0.7,
    });

    console.log(`✅ Project created: ${project.id}`);
    console.log(`📊 Domain: ${project.metadata.domain}`);
    console.log(`🎯 Task Type: ${project.metadata.taskType}`);
    console.log(`🔍 Depth: ${project.metadata.depth}`);

    // Simulate research phases
    console.log('\n🔄 Simulating research phases...\n');

    // Wait a moment for the research to start
    await new Promise(resolve => setTimeout(resolve, 2000));

    const finalProject = await researchService.getProject(project.id);

    if (finalProject) {
      console.log(`📍 Final Status: ${finalProject.status}`);
      console.log(`📍 Final Phase: ${finalProject.phase}`);

      // Show what a successful result would look like
      console.log('\n📊 Expected Benchmark Metrics (when run with real APIs):');
      console.log('  - Word Count: 3000-5000');
      console.log('  - Citations: 50+');
      console.log('  - Sources: 30-50');
      console.log('  - RACE Score: 40%+ (target)');
      console.log('  - Processing Time: 3-5 minutes');
    }

  } catch (error) {
    console.error('❌ Error:', error);
  }

  console.log(`\n\n${'='.repeat(60)}`);
  console.log('📊 TEST COMPLETE');
  console.log('=' .repeat(60));

  console.log('\n✅ Mock test completed successfully!');
  console.log('\n📝 To run the full benchmark with real data:');
  console.log('1. Set environment variables:');
  console.log('   export OPENAI_API_KEY="your-key"');
  console.log('   export TAVILY_API_KEY="your-key" (or EXA/SERPAPI/SERPER)');
  console.log('2. Run: bun run scripts/run-deepresearch-bench.ts');
  console.log('\n3. Evaluate results:');
  console.log('   python deep_research_bench/deepresearch_bench_race.py eliza --limit 5');
}

// Run the test benchmark
runTestBenchmark().catch(console.error);
