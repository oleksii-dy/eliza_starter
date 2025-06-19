import type { Scenario } from '../../src/scenario-runner/types.js';

export const researchKnowledgeIntegrationScenario: Scenario = {
  id: '6fbc1f01-8e44-42bf-afa0-57b619012067',
  name: 'Academic Paper Research and Knowledge Storage',
  description:
    'Test research plugin conducting deep research, then storing findings in knowledge base for future retrieval',
  category: 'integration',
  tags: ['research', 'knowledge', 'multi-plugin', 'action-chaining'],

  actors: [
    {
      id: '57783c5e-6b70-4e3b-899c-1412cfb55cbd',
      name: 'Research Agent',
      role: 'subject',
      script: { steps: [] },
    },
    {
      id: 'fa6642de-2afd-4d97-a510-8df1b01eab6a',
      name: 'Academic Researcher',
      role: 'tester',
      script: {
        steps: [
          {
            type: 'message',
            content:
              'I need you to research recent advances in quantum error correction for quantum computing, focusing on topological codes. Create a comprehensive research project and store all findings in your knowledge base for my thesis work.',
          },
          {
            type: 'wait',
            waitTime: 5000,
          },
          {
            type: 'message',
            content:
              'Please check the status of the research and refine it to focus more on surface codes and their practical implementations',
          },
          {
            type: 'wait',
            waitTime: 10000,
          },
          {
            type: 'message',
            content:
              'Great! Now please process all the research findings and store them in your knowledge base as separate documents',
          },
          {
            type: 'wait',
            waitTime: 5000,
          },
          {
            type: 'message',
            content:
              'Search your knowledge base for information about "surface code threshold rates"',
          },
          {
            type: 'wait',
            waitTime: 3000,
          },
          {
            type: 'message',
            content: 'Export the research findings and create a bibliography',
          },
        ],
        personality: 'academic, thorough, detail-oriented',
        goals: [
          'conduct comprehensive research',
          'store findings systematically',
          'enable knowledge retrieval',
        ],
      },
    },
  ],

  setup: {
    roomType: 'dm',
    roomName: 'Research Consultation',
    context: 'Academic research environment focused on quantum computing advances',
    environment: {
      plugins: ['research', 'knowledge', 'todo'],
      researchDepth: 'deep',
      knowledgeRetention: true,
    },
  },

  execution: {
    maxDuration: 300000, // 5 minutes
    maxSteps: 30,
    stopConditions: [
      {
        type: 'message_count',
        value: 10,
        description: 'Stop after 10 messages exchanged',
      },
    ],
  },

  verification: {
    rules: [
      {
        id: 'c782dc44-3914-400a-96f5-790d808a6697',
        type: 'llm',
        description: 'Research project was initiated',
        config: {
          expectedValue: 'start_research',
        },
        weight: 3,
      },
      {
        id: '4863dbb4-9448-476d-a3d0-8dbd8c328be2',
        type: 'llm',
        description: 'Research query was refined',
        config: {
          expectedValue: 'refine_research_query',
        },
        weight: 2,
      },
      {
        id: '3f773c12-a35e-4f57-9519-7d3feb7ef424',
        type: 'llm',
        description: 'Research findings stored in knowledge base',
        config: {
          expectedValue: 'PROCESS_KNOWLEDGE',
        },
        weight: 3,
      },
      {
        id: 'ef6f5750-abc3-493c-97e0-59a817791e75',
        type: 'llm',
        description: 'Knowledge base was searched',
        config: {
          expectedValue: 'SEARCH_KNOWLEDGE',
        },
        weight: 2,
      },
      {
        id: '3ec69720-4be1-4474-8788-ba38930953c5',
        type: 'llm',
        description: 'Response includes project ID and details',
        config: {
          criteria:
            "The response should include a Project ID and project details in the agent's messages",
        },
        weight: 2,
      },
      {
        id: '0151ff4a-469a-4192-b6bb-6440268400e7',
        type: 'llm',
        description: 'Research focused on quantum error correction',
        config: {
          criteria:
            'The research content includes detailed information about quantum error correction, topological codes, and surface codes',
        },
        weight: 3,
      },
      {
        id: 'ce35bf49-b1ee-4dd9-b2d1-0a41040accdf',
        type: 'llm',
        description: 'Actions were properly chained together',
        config: {
          criteria:
            'The agent successfully chained multiple actions: initiated research, refined query, retrieved report, stored in knowledge base, and searched knowledge',
        },
        weight: 4,
      },
    ],
    expectedOutcomes: [
      {
        actorId: 'fa6642de-2afd-4d97-a510-8df1b01eab6a',
        outcome: 'Successfully initiated and managed a deep research project',
        verification: {
          id: '29dc5e5b-ba1e-4684-bbb8-ec38665b1985',
          type: 'llm',
          description: 'Research was successfully completed',
          config: {
            criteria: 'Research project was initiated, refined, and completed with findings stored',
          },
        },
      },
    ],
    groundTruth: {
      expectedBehavior:
        'Agent chains research and knowledge actions to create a comprehensive knowledge repository',
      successCriteria: [
        'Research project created with proper parameters',
        'Query refined based on user feedback',
        'Findings stored in knowledge base',
        'Knowledge successfully retrieved through search',
        'Multiple plugins working together seamlessly',
      ],
    },
  },

  benchmarks: {
    maxDuration: 300000,
    maxSteps: 30,
    maxTokens: 10000,
    targetAccuracy: 0.85,
    customMetrics: [
      { name: 'research_quality' },
      { name: 'knowledge_retention' },
      { name: 'action_chaining_success' },
    ],
  },
};

export default researchKnowledgeIntegrationScenario;
