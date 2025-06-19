import type { Scenario } from '../../src/scenario-runner/types.js';

export const stagehandWebResearchScenario: Scenario = {
  id: 'ae6718a5-f328-4a97-b4ba-92082956d243',
  name: 'Advanced Web Research with Browser Automation',
  description:
    'Test Stagehand browser plugin conducting automated web research and extracting structured data',
  category: 'integration',
  tags: ['stagehand', 'research', 'web-scraping', 'browser-automation'],

  actors: [
    {
      id: 'd1fc9739-0b12-47b0-85c7-37e9df5bd79e',
      name: 'Web Research Agent',
      role: 'subject',
      script: { steps: [] },
    },
    {
      id: '9a1d7e9c-4951-4678-93b5-220cfc36becc',
      name: 'Market Analyst',
      role: 'tester',
      script: {
        steps: [
          {
            type: 'message',
            content:
              'I need you to research the current AI startup landscape. Please visit TechCrunch, find recent articles about AI startups that raised funding in the last month, and compile a report with company names, funding amounts, and their focus areas.',
      },
          {
            type: 'wait',
            waitTime: 20000,
      },
          {
            type: 'message',
            content:
              'Great! Now visit the websites of the top 3 funded startups and extract their mission statements and key team members.',
      },
          {
            type: 'wait',
            waitTime: 15000,
      },
          {
            type: 'message',
            content:
              'Please also check LinkedIn to find the backgrounds of the founders of these startups.',
      },
          {
            type: 'wait',
            waitTime: 15000,
      },
          {
            type: 'message',
            content:
              'Now store all this research in your knowledge base and create a summary report comparing these startups.',
      },
          {
            type: 'wait',
            waitTime: 10000,
          },
        ],
        personality: 'analytical, thorough, data-driven',
        goals: [
          'gather comprehensive market intelligence',
          'extract structured data from websites',
          'create actionable insights',
        ],
      },
    },
  ],

  setup: {
    roomType: 'dm',
    roomName: 'Market Research',
    context: 'Conducting deep web research using browser automation for market analysis',
    environment: {
      plugins: ['stagehand', 'research', 'knowledge'],
      browserEnabled: true,
      webScraping: true,
    },
  },

  execution: {
    maxDuration: 420000, // 7 minutes
    maxSteps: 25,
    stopConditions: [
      {
        type: 'keyword',
        value: 'research complete',
        description: 'Stop when web research is complete',
      },
    ],
  },

  verification: {
    rules: [
      {
        id: '0b48f225-8a55-488a-b7cc-da8965397e4e',
        type: 'llm',
        description: 'Browser was launched for research',
        config: {
          expectedValue: 'LAUNCH_BROWSER',
        },
        weight: 2,
      },
      {
        id: '5f011bb6-bc1d-4ade-a21a-1b70db923d1b',
        type: 'llm',
        description: 'Navigated to multiple websites',
        config: {
          expectedValue: 'NAVIGATE_TO_URL',
        },
        weight: 2,
      },
      {
        id: 'b47c1125-098a-4f1f-8009-5295f91a590f',
        type: 'llm',
        description: 'Data was extracted from web pages',
        config: {
          expectedValue: 'EXTRACT_PAGE_DATA',
        },
        weight: 3,
      },
      {
        id: 'c782dc44-3914-400a-96f5-790d808a6697',
        type: 'llm',
        description: 'Research project was created',
        config: {
          expectedValue: 'start_research',
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
        weight: 2,
      },
      {
        id: '67869a29-242e-4b81-a39b-85289d307400',
        type: 'llm',
        description: 'Structured data was properly extracted',
        config: {
          criteria:
            'The agent extracted structured information including company names, funding amounts, focus areas, mission statements, and team members from various websites',
        },
        weight: 3,
      },
      {
        id: 'e7d1567d-1680-4761-be53-c01ce00af0c8',
        type: 'llm',
        description: 'Research covered multiple sources',
        config: {
          criteria:
            'The agent successfully visited and extracted data from TechCrunch, startup websites, and LinkedIn, showing ability to navigate different site structures',
        },
        weight: 3,
      },
      {
        id: '477e2687-d7db-4b1a-929b-6ac0ae6c7656',
        type: 'llm',
        description: 'Comparative analysis was created',
        config: {
          criteria:
            'The agent created a meaningful comparison of the startups based on the collected data, showing analytical capabilities',
        },
        weight: 3,
      }
    ],
    expectedOutcomes: [
      {
        actorId: '9a1d7e9c-4951-4678-93b5-220cfc36becc',
        outcome: 'Successfully conducted automated web research',
        verification: {
          id: '7005042b-b078-476f-beb8-5da6f035cdfa',
          type: 'llm',
          description: 'Web research was comprehensive and accurate',
          config: {
            criteria:
              'Agent successfully automated browser navigation, extracted structured data, and created a comprehensive research report',
          },
        },
      },
    ],
    groundTruth: {
      expectedBehavior:
        'Agent uses browser automation to conduct comprehensive web research across multiple sites',
      successCriteria: [
        'Browser automation successful',
        'Multiple websites visited',
        'Structured data extracted',
        'Cross-site research conducted',
        'Findings stored in knowledge base',
        'Comparative analysis created',
      ],
    },
  },

  benchmarks: {
    maxDuration: 420000,
    maxSteps: 25,
    maxTokens: 15000,
    targetAccuracy: 0.8,
    customMetrics: [{ name: 'extraction_accuracy' }, { name: 'navigation_efficiency' }, { name: 'data_completeness' }],
  },
};

export default stagehandWebResearchScenario;
