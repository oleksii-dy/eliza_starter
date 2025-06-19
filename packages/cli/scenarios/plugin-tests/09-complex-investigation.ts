import type { Scenario } from '../../src/scenario-runner/types.js';

export const complexInvestigationScenario: Scenario = {
  id: 'd2aac6ba-d819-413d-ad72-9aa68fbd1c4a',
  name: 'Open Source Intelligence Investigation',
  description: 'Test multiple plugins working together to conduct a comprehensive investigation',
  category: 'integration',
  tags: ['investigation', 'osint', 'multi-plugin', 'complex-workflow'],

  actors: [
    {
      id: 'a0106f2c-cca3-429a-8305-d997d7848957',
      name: 'Investigation Agent',
      role: 'subject',
      script: { steps: [] },
    },
    {
      id: '99dda3ee-d41b-4102-9740-352efc4db860',
      name: 'OSINT Investigator',
      role: 'tester',
      script: {
        steps: [
          {
            type: 'message',
            content:
              'I need to investigate the contributors to the ElizaOS project. Start by analyzing the GitHub repository to find the top contributors and their commit patterns.',
      },
          {
            type: 'wait',
            waitTime: 10000,
      },
          {
            type: 'message',
            content:
              'For the top 5 contributors, use web research to find their professional backgrounds and other open source contributions',
      },
          {
            type: 'wait',
            waitTime: 15000,
      },
          {
            type: 'message',
            content:
              'Create entity profiles for each contributor and map their relationships based on co-authored commits and pull request interactions',
      },
          {
            type: 'wait',
            waitTime: 10000,
      },
          {
            type: 'message',
            content:
              'Research the technical evolution of the project - what major features were added by whom and when',
      },
          {
            type: 'wait',
            waitTime: 10000,
      },
          {
            type: 'message',
            content:
              'Store all findings in your knowledge base and create a comprehensive report with a relationship graph',
          },
        ],
        personality: 'investigative, thorough, analytical',
        goals: [
          'uncover contributor patterns',
          'map relationships',
          'understand project evolution',
        ],
      },
    },
  ],

  setup: {
    roomType: 'dm',
    roomName: 'Investigation Room',
    context: 'Conducting open source intelligence gathering on a software project',
    environment: {
      plugins: ['github', 'research', 'knowledge', 'rolodex', 'stagehand'],
      investigationDepth: 'comprehensive',
    },
  },

  execution: {
    maxDuration: 420000, // 7 minutes
    maxSteps: 30,
    stopConditions: [
      {
        type: 'keyword',
        value: 'investigation complete',
        description: 'Stop when investigation is complete',
      },
    ],
  },

  verification: {
    rules: [
      {
        id: '6b066e65-82f9-4d78-bfc6-6c3bdd378920',
        type: 'llm',
        description: 'GitHub repository was analyzed',
        config: {
          expectedValue: 'ANALYZE_GITHUB_CONTRIBUTORS',
        },
        weight: 3,
      },
      {
        id: 'c5d3f84c-3b8c-4966-be27-1c1123cdbc4b',
        type: 'llm',
        description: 'Web research was conducted',
        config: {
          expectedValue: 'LAUNCH_BROWSER',
        },
        weight: 2,
      },
      {
        id: '6acbb2a9-1269-4ef0-afb2-97186c8e265a',
        type: 'llm',
        description: 'Entity profiles were created',
        config: {
          expectedValue: 'CREATE_ENTITY',
        },
        weight: 3,
      },
      {
        id: '97082be0-754f-40be-9c58-56edd2f20ce1',
        type: 'llm',
        description: 'Relationships were mapped',
        config: {
          expectedValue: 'CREATE_RELATIONSHIP',
        },
        weight: 3,
      },
      {
        id: '3f773c12-a35e-4f57-9519-7d3feb7ef424',
        type: 'llm',
        description: 'Findings stored in knowledge base',
        config: {
          expectedValue: 'PROCESS_KNOWLEDGE',
        },
        weight: 2,
      },
      {
        id: 'e78a1056-cf85-4b3a-834a-5302c484870a',
        type: 'llm',
        description: 'Investigation was comprehensive',
        config: {
          criteria:
            'The agent conducted a thorough investigation using GitHub analysis, web research, entity tracking, and relationship mapping',
        },
        weight: 4,
      }
    ],
    expectedOutcomes: [
      {
        actorId: '99dda3ee-d41b-4102-9740-352efc4db860',
        outcome: 'Successfully conducted comprehensive OSINT investigation',
        verification: {
          id: '79050cda-5704-4130-ae21-d46fee92d28b',
          type: 'llm',
          description: 'Investigation completed with actionable intelligence',
          config: {
            criteria:
              'Agent gathered data from multiple sources, created entity profiles, mapped relationships, and produced comprehensive report',
          },
        },
      },
    ],
    groundTruth: {
      expectedBehavior: 'Agent conducts multi-source investigation with relationship analysis',
      successCriteria: [
        'GitHub contributors analyzed',
        'Web research conducted',
        'Entity profiles created',
        'Relationships mapped',
        'Technical evolution tracked',
        'Comprehensive report generated',
      ],
    },
  },

  benchmarks: {
    maxDuration: 420000,
    maxSteps: 30,
    maxTokens: 20000,
    targetAccuracy: 0.85,
    customMetrics: [{ name: 'investigation_depth' }, { name: 'relationship_accuracy' }, { name: 'report_quality' }],
  },
};

export default complexInvestigationScenario;
