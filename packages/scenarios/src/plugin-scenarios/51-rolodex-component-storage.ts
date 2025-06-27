import type { Scenario } from '../types.js';
import { v4 as uuidv4 } from 'uuid';

export const rolodexComponentStorageScenario: Scenario = {
  id: uuidv4() as any,
  name: 'Rolodex Component Storage with World/Room Creation',
  description: 'Test rolodex plugin creating entities with components in different worlds and rooms',
  category: 'integration',
  tags: ['rolodex', 'components', 'world', 'room', 'storage'],

  actors: [
    {
      id: uuidv4() as any,
      name: 'Rolodex Manager',
      role: 'subject',
      bio: 'A contact management specialist using the rolodex system',
      system:
        'You are a rolodex management specialist. When managing contacts, use these actions: 1) CREATE_ENTITY to add new contacts with their details, 2) UPDATE_ENTITY to modify contact information, 3) ADD_COMPONENT to attach additional data like preferences or notes, 4) LIST_ENTITIES to show stored contacts, 5) GET_ENTITY to retrieve specific contact details. Always organize contacts properly with complete information.',
      plugins: ['@elizaos/plugin-rolodex'],
      script: { steps: [] },
    },
    {
      id: uuidv4() as any,
      name: 'Sales Manager',
      role: 'assistant',
      script: {
        steps: [
          {
            type: 'message',
            content: 'Please add a new contact: Sarah Johnson from AI Innovations. She is a Senior Engineer who prefers email communication and is interested in our API products.',
          },
          {
            type: 'wait',
            waitTime: 6000,
          },
          {
            type: 'message',
            content: 'Also add Michael Brown from Tech Solutions. He is the VP of Engineering, prefers video calls, and is evaluating our enterprise solutions.',
          },
          {
            type: 'wait',
            waitTime: 6000,
          },
          {
            type: 'message',
            content: 'Add a note component to Sarah\'s profile that she attended our webinar last week and requested a follow-up demo.',
          },
          {
            type: 'wait',
            waitTime: 5000,
          },
          {
            type: 'message',
            content: 'Can you list all the contacts we have stored with their key details?',
          },
          {
            type: 'wait',
            waitTime: 5000,
          },
          {
            type: 'message',
            content: 'Update Sarah\'s communication preference to phone calls instead of email.',
          },
        ],
      },
    },
  ],

  setup: {
    roomType: 'dm',
    roomName: 'Contact Management',
    context: 'Professional contact and relationship management',
  },

  execution: {
    maxDuration: 120000,
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
        id: 'rule-1',
        type: 'llm',
        description: 'Agent must create first entity',
        config: {
          criteria: 'Check if the agent used CREATE_ENTITY to add Sarah Johnson',
          expectedValue: 'First entity was created',
        },
      },
      {
        id: 'rule-2',
        type: 'llm',
        description: 'Agent must create second entity',
        config: {
          criteria: 'Verify that the agent created Michael Brown as an entity',
          expectedValue: 'Second entity was created',
        },
      },
      {
        id: 'rule-3',
        type: 'llm',
        description: 'Agent must add component',
        config: {
          criteria: 'Confirm that the agent added a note component to Sarah\'s profile',
          expectedValue: 'Component was added',
        },
      },
      {
        id: 'rule-4',
        type: 'llm',
        description: 'Agent must list entities',
        config: {
          criteria: 'The agent should have listed all stored contacts',
          expectedValue: 'Entities were listed',
        },
      },
      {
        id: 'rule-5',
        type: 'llm',
        description: 'Agent must update entity',
        config: {
          criteria: 'The agent should have updated Sarah\'s communication preference',
          expectedValue: 'Entity was updated',
        },
      },
    ],
    expectedOutcomes: [
      {
        actorId: uuidv4() as any,
        outcome: 'Successfully managed contacts with components',
        verification: {
          id: 'outcome-1',
          type: 'llm',
          description: 'Complete rolodex workflow',
          config: {
            criteria: 'The agent successfully created multiple entities, added components, listed contacts, and updated entity information',
          },
        },
      },
    ],
  },
};

export default rolodexComponentStorageScenario;
