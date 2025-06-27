import type { Scenario } from '../types.js';
import { v4 as uuidv4 } from 'uuid';

export const researchKnowledgeIntegrationScenario: Scenario = {
  id: uuidv4() as any,
  name: 'Academic Paper Research and Knowledge Storage',
  description:
    'Test research plugin conducting deep research, then storing findings in knowledge base for future retrieval',
  category: 'integration',
  tags: ['research', 'knowledge', 'multi-plugin', 'action-chaining'],

  actors: [
    {
      id: uuidv4() as any,
      name: 'Research Agent',
      role: 'subject',
      bio: 'A specialized research assistant with academic expertise',
      system:
        'You are a research assistant with access to powerful research tools. When asked to research topics, ALWAYS use the RESEARCH action to find information from web and academic sources. After finding information, use the CREATE_KNOWLEDGE action to store important findings in your knowledge base. Be thorough and cite your sources.',
      plugins: ['@elizaos/plugin-research', '@elizaos/plugin-knowledge'],
      script: { steps: [] },
    },
    {
      id: uuidv4() as any,
      name: 'Research Tester',
      role: 'assistant',
      script: {
        steps: [
          {
            type: 'message',
            content:
              'Please research the impact of artificial intelligence on modern education. I need comprehensive information from academic sources.',
          },
          {
            type: 'wait',
            waitTime: 8000, // Wait 8 seconds for research
          },
          {
            type: 'message',
            content: 'Now please save the key findings about AI in education to your knowledge base so we can reference them later.',
          },
          {
            type: 'wait',
            waitTime: 5000, // Wait 5 seconds for knowledge storage
          },
          {
            type: 'message',
            content: 'Can you retrieve and summarize what you stored in the knowledge base about AI in education?',
          },
        ],
      },
    },
  ],

  setup: {
    roomType: 'dm',
    roomName: 'Research Test Room',
    context: 'Academic research environment',
  },

  execution: {
    maxDuration: 90000, // 1.5 minutes
    maxSteps: 30,
    stopConditions: [
      {
        type: 'message_count',
        value: 6, // 3 messages from user, 3 responses from agent
        description: 'Stop after 6 messages exchanged',
      },
    ],
  },

  verification: {
    rules: [
      {
        id: 'rule-1',
        type: 'llm',
        description: 'Agent must use the RESEARCH action',
        config: {
          criteria: 'Check if the agent used the RESEARCH action to find information about AI in education',
          expectedValue: 'RESEARCH action was used',
        },
      },
      {
        id: 'rule-2',
        type: 'llm',
        description: 'Agent must use CREATE_KNOWLEDGE action',
        config: {
          criteria: 'Verify that the agent used CREATE_KNOWLEDGE action to store findings in the knowledge base',
          expectedValue: 'CREATE_KNOWLEDGE action was used',
        },
      },
      {
        id: 'rule-3',
        type: 'llm',
        description: 'Agent must retrieve from knowledge base',
        config: {
          criteria:
            'Confirm that the agent successfully retrieved and summarized information from the knowledge base',
          expectedValue: 'Knowledge was retrieved and summarized',
        },
      },
    ],
    expectedOutcomes: [
      {
        actorId: uuidv4() as any,
        outcome: 'Researched, stored, and retrieved AI education information',
        verification: {
          id: 'outcome-1',
          type: 'llm',
          description: 'Complete research workflow executed',
          config: {
            criteria: 'The agent successfully researched AI in education, stored findings in knowledge base, and retrieved the information when asked',
          },
        },
      },
    ],
  },
};

export default researchKnowledgeIntegrationScenario;
