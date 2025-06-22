import { type Scenario } from '../types';

export const runtimeTestScenario: Scenario = {
  name: 'Rolodex Runtime Test',
  description: 'Tests the rolodex plugin functionality with real runtime',
  
  messages: [
    {
      role: 'user',
      content: 'I just met Sarah Chen from TechCorp. She\'s the VP of Engineering and seems very interested in our AI platform.',
    },
    {
      role: 'assistant',
      expectedActions: ['TRACK_ENTITY'],
      expectedContent: ['Sarah Chen', 'TechCorp', 'VP of Engineering'],
    },
    {
      role: 'user', 
      content: 'Sarah introduced me to her colleague Mike Johnson who leads their blockchain team.',
    },
    {
      role: 'assistant',
      expectedActions: ['TRACK_ENTITY'],
      expectedContent: ['Mike Johnson', 'blockchain'],
    },
    {
      role: 'user',
      content: 'I should follow up with both of them next week about the partnership proposal.',
    },
    {
      role: 'assistant',
      expectedActions: ['SCHEDULE_FOLLOW_UP'],
      expectedContent: ['follow-up', 'Sarah', 'Mike', 'partnership'],
    },
    {
      role: 'user',
      content: 'Can you show me everyone I\'ve met from TechCorp?',
    },
    {
      role: 'assistant',
      expectedActions: ['SEARCH_ENTITIES'],
      expectedContent: ['Sarah Chen', 'Mike Johnson', 'TechCorp'],
    },
  ],

  validate: async (runtime: any) => {
    // Validate entities were created
    const entityGraphService = runtime.getService('entityGraph');
    if (!entityGraphService) {
      throw new Error('EntityGraphService not available');
    }

    // Search for Sarah
    const sarahResults = await entityGraphService.searchEntities('Sarah Chen');
    if (sarahResults.length === 0) {
      throw new Error('Sarah Chen entity not found');
    }

    // Search for Mike
    const mikeResults = await entityGraphService.searchEntities('Mike Johnson');
    if (mikeResults.length === 0) {
      throw new Error('Mike Johnson entity not found');
    }

    // Check relationships
    const relationships = await entityGraphService.getEntityRelationships(
      sarahResults[0].entity.entityId
    );
    console.log(`Found ${relationships.length} relationships for Sarah`);

    // Check follow-ups
    const followUps = await entityGraphService.getUpcomingFollowUps({
      includePast: false,
    });
    console.log(`Found ${followUps.length} scheduled follow-ups`);

    return {
      success: true,
      entities: sarahResults.length + mikeResults.length,
      relationships: relationships.length,
      followUps: followUps.length,
    };
  },
}; 