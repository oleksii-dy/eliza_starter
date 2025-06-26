/**
 * REAL Research Benchmark - Tests actual research capabilities
 * 
 * This benchmark:
 * - Uses real research plugin with real API calls
 * - Measures actual research quality and accuracy  
 * - Verifies real knowledge storage and retrieval
 * - Tests real-world research scenarios
 */

import type { Scenario } from '../types.js';
import { v4 as uuidv4 } from 'uuid';

export const realResearchBenchmark: Scenario = {
  id: 'real-research-benchmark-001',
  name: 'Real-World Research Capability Benchmark',
  description: 'Test agent\'s ability to conduct actual research using real APIs and produce accurate, verifiable results',
  category: 'research-benchmark',
  tags: ['real-research', 'api-integration', 'accuracy-measurement', 'knowledge-verification'],
  
  actors: [
    {
      id: 'research-agent-real',
      name: 'Research Agent',
      role: 'subject',
      bio: 'A research agent that conducts real web research and knowledge analysis',
      system: `You are a professional research assistant. When asked to research a topic:
1. Use your research tools to find current, accurate information
2. Cite your sources and verify facts
3. Provide structured, comprehensive summaries
4. Store important findings for future reference
You have access to real research APIs and should use them actively.`,
      plugins: [
        '@elizaos/plugin-research',
        '@elizaos/plugin-knowledge'
      ],
      script: {
        steps: [
          {
            type: 'message',
            content: 'Please research the current status of quantum computing error correction, specifically the latest developments in surface codes and logical qubit implementations from 2024.',
            waitTime: 3000,
          },
          {
            type: 'message', 
            content: 'Now search for recent papers or announcements about quantum error correction breakthroughs. What are the key companies and researchers making progress?',
            waitTime: 5000,
          },
          {
            type: 'message',
            content: 'Based on your research, what are the main technical challenges still remaining for fault-tolerant quantum computing? Please provide specific citations.',
            waitTime: 2000,
          }
        ]
      }
    },
    {
      id: 'research-evaluator',
      name: 'Research Evaluator',
      role: 'evaluator',
      bio: 'Evaluates research quality and accuracy',
      system: 'You evaluate research quality by checking accuracy, sources, and comprehensiveness.',
      plugins: ['@elizaos/plugin-knowledge'],
      script: {
        steps: [
          {
            type: 'message',
            content: 'Please summarize the key findings from the research and rate the quality of sources cited.',
            waitTime: 2000,
          }
        ]
      }
    }
  ],

  setup: {
    roomType: 'dm',
    roomName: 'Real Research Test Environment',
    context: 'Research capability evaluation with real APIs',
    environment: {
      RESEARCH_ENABLED: 'true',
      KNOWLEDGE_STORAGE: 'true',
      REAL_API_CALLS: 'true'
    }
  },

  execution: {
    maxDuration: 300000, // 5 minutes for real research
    maxSteps: 50,
    realApiCallsExpected: true,
    measuredMetrics: [
      'research_quality',
      'source_accuracy', 
      'response_time',
      'api_calls_made',
      'knowledge_stored',
      'citation_quality'
    ]
  },

  verification: {
    type: 'real-world-measurement',
    rules: [
      {
        id: 'real-research-conducted',
        type: 'api-verification',
        description: 'Verify that real research API calls were made',
        config: {
          requiredApiCalls: ['search', 'content-extraction', 'knowledge-storage'],
          minimumCalls: 3,
          verifyResponseData: true
        }
      },
      {
        id: 'accuracy-verification', 
        type: 'fact-checking',
        description: 'Verify factual accuracy of research findings',
        config: {
          factCheckSources: ['semantic-scholar', 'arxiv', 'google-scholar'],
          accuracyThreshold: 0.8,
          requireCitations: true
        }
      },
      {
        id: 'research-quality',
        type: 'llm-evaluation',
        description: 'Evaluate overall research quality and comprehensiveness',
        config: {
          evaluationModel: 'gpt-4',
          criteria: [
            'Information is current and relevant to 2024',
            'Sources are authoritative and properly cited',
            'Analysis demonstrates understanding of quantum computing concepts',
            'Findings are specific and detailed, not generic',
            'Technical accuracy of quantum error correction details'
          ],
          minimumScore: 0.7
        }
      },
      {
        id: 'knowledge-persistence',
        type: 'storage-verification', 
        description: 'Verify that research findings were properly stored',
        config: {
          checkStoredKnowledge: true,
          verifyRetrieval: true,
          requiredFields: ['sources', 'findings', 'timestamp']
        }
      }
    ],
    realWorldMetrics: {
      measureLatency: true,
      measureAccuracy: true,
      measureCompleteness: true,
      compareWithBaseline: true
    }
  },

  benchmarks: {
    maxDuration: 240000, // 4 minutes
    maxApiCalls: 20,
    minAccuracyScore: 0.8,
    minCompletenessScore: 0.7,
    maxTokensUsed: 50000,
    requiredCapabilities: [
      'web-search',
      'content-extraction', 
      'fact-verification',
      'knowledge-storage',
      'citation-generation'
    ]
  },

  expectedOutcomes: [
    {
      actorId: 'research-agent-real',
      outcome: 'Conducted thorough research on quantum error correction with real API calls',
      measurableSuccess: {
        apiCallsMade: { min: 5, max: 20 },
        sourcesFound: { min: 3, max: 15 },
        citationsProvided: { min: 2, max: 10 },
        factualAccuracy: { min: 0.8, max: 1.0 },
        responseTime: { max: 240000 } // 4 minutes
      }
    }
  ]
};

export default realResearchBenchmark;