import type { Scenario } from '../types.js';
import { v4 as uuidv4 } from 'uuid';

export const complexInvestigationScenario: Scenario = {
  id: uuidv4() as any,
  name: 'Multi-Plugin OSINT Investigation',
  description: 'Test complex investigation using research, SQL, rolodex, and knowledge plugins',
  category: 'integration',
  tags: ['research', 'sql', 'rolodex', 'knowledge', 'investigation'],

  actors: [
    {
      id: uuidv4() as any,
      name: 'Investigation Agent',
      role: 'subject',
      bio: 'An OSINT investigator with access to multiple data sources',
      system:
        'You are an OSINT (Open Source Intelligence) investigator. When investigating companies or people, use these tools: 1) RESEARCH action to find public information, 2) CREATE_ENTITY and UPDATE_ENTITY to track people/companies in your rolodex, 3) CREATE_KNOWLEDGE to store important findings, 4) SQL_QUERY to analyze data. Always be thorough and cross-reference information.',
      plugins: ['@elizaos/plugin-sql', '@elizaos/plugin-research', '@elizaos/plugin-rolodex', '@elizaos/plugin-knowledge'],
      script: { steps: [] },
    },
    {
      id: uuidv4() as any,
      name: 'Investigator',
      role: 'assistant',
      script: {
        steps: [
          {
            type: 'message',
            content: 'I need you to investigate a startup called "TechInnovate AI". Find information about the company, its founders, and recent activities.',
          },
          {
            type: 'wait',
            waitTime: 10000,
          },
          {
            type: 'message',
            content: 'Please create profiles in your rolodex for the company and its key people. Track their relationships and roles.',
          },
          {
            type: 'wait',
            waitTime: 8000,
          },
          {
            type: 'message',
            content: 'Store the most important findings in your knowledge base. Focus on their technology claims and funding information.',
          },
          {
            type: 'wait',
            waitTime: 6000,
          },
          {
            type: 'message',
            content: 'Can you analyze the data you collected and provide a summary report with key insights and any red flags?',
          },
        ],
      },
    },
  ],

  setup: {
    roomType: 'dm',
    roomName: 'Investigation Room',
    context: 'OSINT investigation environment',
  },

  execution: {
    maxDuration: 120000,
    maxSteps: 40,
    stopConditions: [
      {
        type: 'message_count',
        value: 8,
        description: 'Stop after 8 messages exchanged',
      },
    ],
  },

  verification: {
    rules: [
      {
        id: 'rule-1',
        type: 'llm',
        description: 'Agent must use RESEARCH action',
        config: {
          criteria: 'Check if the agent used RESEARCH action to find information about TechInnovate AI',
          expectedValue: 'RESEARCH action was used',
        },
      },
      {
        id: 'rule-2',
        type: 'llm',
        description: 'Agent must create rolodex entities',
        config: {
          criteria: 'Verify that the agent used CREATE_ENTITY to add company and people to rolodex',
          expectedValue: 'Rolodex entities were created',
        },
      },
      {
        id: 'rule-3',
        type: 'llm',
        description: 'Agent must store in knowledge base',
        config: {
          criteria: 'Confirm that the agent used CREATE_KNOWLEDGE to store important findings',
          expectedValue: 'Knowledge was stored',
        },
      },
      {
        id: 'rule-4',
        type: 'llm',
        description: 'Agent must provide analysis',
        config: {
          criteria: 'The agent should provide a summary report with insights from the investigation',
          expectedValue: 'Analysis report was provided',
        },
      },
    ],
    expectedOutcomes: [
      {
        actorId: uuidv4() as any,
        outcome: 'Completed comprehensive OSINT investigation',
        verification: {
          id: 'outcome-1',
          type: 'llm',
          description: 'Full investigation workflow executed',
          config: {
            criteria: 'The agent successfully researched the company, created rolodex entries, stored findings in knowledge base, and provided analytical insights',
          },
        },
      },
    ],
  },
};

export default complexInvestigationScenario;
