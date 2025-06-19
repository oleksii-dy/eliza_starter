import type { Scenario } from '../../src/scenario-runner/types.js';

export const rolodexRelationshipScenario: Scenario = {
  id: '2ffd1591-6fe6-4fd7-b5d7-c66c005a2e6c',
  name: 'Complex Entity and Relationship Management',
  description:
    'Test Rolodex plugin tracking entities, relationships, and interactions across multiple contexts',
  category: 'integration',
  tags: ['rolodex', 'entities', 'relationships', 'social-graph'],

  actors: [
    {
      id: '3df32928-c921-4704-a860-7dc78d997080',
      name: 'Relationship Manager Agent',
      role: 'subject',
      script: { steps: [] },
    },
    {
      id: 'b35ef4c1-3aeb-4c98-a715-d00b682568c7',
      name: 'Business Networker',
      role: 'tester',
      script: {
        steps: [
          {
            type: 'message',
            content:
              'I just met Alice Chen at the AI conference. She is the CTO of TechCorp and is interested in quantum computing. She mentioned her colleague Bob Martinez who leads their research team.',
          },
          {
            type: 'wait',
            waitTime: 3000,
          },
          {
            type: 'message',
            content:
              'Can you also note that Alice and Bob work together on the quantum encryption project? Alice reports to the CEO, Carol Davis.',
          },
          {
            type: 'wait',
            waitTime: 3000,
          },
          {
            type: 'message',
            content:
              'I also learned that Bob collaborates with Dr. David Kim from University of Tech on theoretical aspects. They co-authored several papers.',
          },
          {
            type: 'wait',
            waitTime: 3000,
          },
          {
            type: 'message',
            content: 'Please show me the complete relationship network around Alice Chen',
          },
          {
            type: 'wait',
            waitTime: 5000,
          },
          {
            type: 'message',
            content: 'What connections exist between TechCorp and University of Tech?',
          },
        ],
        personality: 'detail-oriented, relationship-focused, strategic networker',
        goals: [
          'track professional relationships',
          'understand organizational structures',
          'identify collaboration opportunities',
        ],
      },
    },
  ],

  setup: {
    roomType: 'dm',
    roomName: 'Professional Networking',
    context: 'Managing professional relationships and organizational connections',
    environment: {
      plugins: ['rolodex', 'message-handling'],
      entityTracking: true,
      relationshipDepth: 'comprehensive',
    },
  },

  execution: {
    maxDuration: 120000, // 2 minutes
    maxSteps: 15,
    stopConditions: [
      {
        type: 'keyword',
        value: 'network mapped',
        description: 'Stop when relationship network is mapped',
      },
    ],
  },

  verification: {
    rules: [
      {
        id: '6acbb2a9-1269-4ef0-afb2-97186c8e265a',
        type: 'llm' as const,
        description: 'Entities were created for each person',
        config: {
          successCriteria: `
Verify that the agent created entities for each person mentioned in the conversation.

Expected entities:
- Alice Chen (CTO of TechCorp)
- Bob Martinez (Research Team Lead at TechCorp)
- Carol Davis (CEO of TechCorp)
- Dr. David Kim (University of Tech)

The agent should execute CREATE_ENTITY action for each person.
          `.trim(),
          priority: 'high',
          category: 'action_execution',
          context: {
            expectedAction: 'CREATE_ENTITY',
          },
        },
        weight: 3,
      },
      {
        id: '805c4307-97d4-4842-8644-da35ea2a256c',
        type: 'llm' as const,
        description: 'Relationships were established between entities',
        config: {
          successCriteria: `
Verify that the agent created relationships between the entities.

Expected relationships:
- Alice Chen → Bob Martinez (colleague relationship)
- Alice Chen → Carol Davis (reports-to relationship)
- Bob Martinez → Dr. David Kim (collaborates-with relationship)
- Bob Martinez → Dr. David Kim (co-author relationship)

The agent should execute CREATE_RELATIONSHIP action for each relationship.
          `.trim(),
          priority: 'high',
          category: 'action_execution',
          context: {
            expectedAction: 'CREATE_RELATIONSHIP',
          },
        },
        weight: 3,
      },
      {
        id: '838d89f5-54b8-417f-ade2-43bc7a3d8aec',
        type: 'llm' as const,
        description: 'Entity details were properly captured',
        config: {
          successCriteria: `
Verify that the agent captured key details about each person including:
- Alice Chen: CTO of TechCorp, interested in quantum computing
- Bob Martinez: Leads research team at TechCorp, works on quantum encryption project
- Carol Davis: CEO of TechCorp
- Dr. David Kim: From University of Tech, works on theoretical aspects

The stored entity information should include roles, organizations, and interests.
          `.trim(),
          priority: 'medium',
          category: 'data_quality',
        },
        weight: 2,
      },
      {
        id: 'd67fb025-59c3-426f-918f-cb2915256bf2',
        type: 'llm' as const,
        description: 'Different relationship types were properly identified',
        config: {
          successCriteria: `
Verify that the agent identified and recorded different types of relationships:
- Colleague relationship: Alice and Bob work together
- Reports-to relationship: Alice reports to Carol (CEO)
- Collaborates-with relationship: Bob collaborates with David
- Co-author relationship: Bob and David co-authored papers

Each relationship type should be properly categorized.
          `.trim(),
          priority: 'high',
          category: 'relationship_classification',
        },
        weight: 3,
      },
      {
        id: '258aa27e-896b-41aa-aa81-11576c38e87a',
        type: 'llm' as const,
        description: 'Network queries were executed',
        config: {
          successCriteria: `
Verify that the agent successfully executed queries about the relationship network:
- Query for complete relationship network around Alice Chen
- Query for connections between TechCorp and University of Tech

The agent should execute QUERY_RELATIONSHIPS or similar actions to retrieve network information.
          `.trim(),
          priority: 'medium',
          category: 'action_execution',
          context: {
            expectedAction: 'QUERY_RELATIONSHIPS',
          },
        },
        weight: 2,
      },
      {
        id: 'd5d98598-2b2f-4ddb-adf1-3068488f8a3f',
        type: 'llm' as const,
        description: 'Complete relationship network was mapped',
        config: {
          successCriteria: `
Verify that the agent successfully mapped the complete network:

Alice Chen (CTO, TechCorp):
- Works with Bob Martinez (colleague)
- Reports to Carol Davis (CEO)
- Interested in quantum computing

Bob Martinez (Research Lead, TechCorp):
- Works with Alice Chen (colleague)
- Collaborates with Dr. David Kim
- Co-authored papers with Dr. David Kim
- Works on quantum encryption project

The network should show organizational connections between TechCorp and University of Tech through Bob and David's collaboration.
          `.trim(),
          priority: 'high',
          category: 'network_completeness',
        },
        weight: 4,
      },
    ],
    expectedOutcomes: [
      {
        actorId: 'b35ef4c1-3aeb-4c98-a715-d00b682568c7',
        outcome: 'Successfully tracked entities and their relationships',
        verification: {
          id: '3fd8e3ac-50a6-4808-bd38-be447f2550d1',
          type: 'llm',
          description: 'Entity and relationship tracking was successful',
          config: {
            criteria:
              'Agent created entities for all mentioned people and properly tracked their various relationships',
          },
        },
      },
    ],
    groundTruth: {
      expectedBehavior:
        'Agent creates a comprehensive relationship graph from conversational information',
      successCriteria: [
        'All mentioned entities created',
        'Relationships properly categorized',
        'Organizational hierarchy captured',
        'Collaboration relationships tracked',
        'Network queries answered accurately',
      ],
    },
  },

  benchmarks: {
    maxDuration: 120000,
    maxSteps: 15,
    maxTokens: 6000,
    targetAccuracy: 0.9,
    customMetrics: [
      { name: 'entity_accuracy' },
      { name: 'relationship_completeness' },
      { name: 'query_correctness' },
    ],
  },
};

export default rolodexRelationshipScenario;
