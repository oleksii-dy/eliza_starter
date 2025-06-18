import type { Scenario } from '../src/scenario-runner/types.js';

export const truthVsLieScenario: Scenario = {
  id: 'truth-vs-lie-detection',
  name: 'Truth vs Lie Detection',
  description: 'Test the agent\'s ability to detect deception by analyzing inconsistencies in witness statements',
  category: 'reasoning',
  tags: ['detection', 'reasoning', 'conversation'],
  
  actors: [
    {
      id: 'detective',
      name: 'Detective Agent',
      role: 'subject',
      // Uses the main agent being tested
    },
    {
      id: 'truthful-witness',
      name: 'Sarah (Truthful Witness)',
      role: 'participant',
      systemPrompt: 'You are Sarah, a truthful witness to a car accident. You saw a red sedan run a red light at 3:15 PM and hit a blue truck. You were walking your dog Max and stopped to help. Be consistent and honest in all your responses.',
      script: {
        steps: [
          {
            type: 'message',
            content: 'I was walking my dog when I saw the accident happen. It was terrible!'
          },
          {
            type: 'wait',
            waitTime: 2000
          },
          {
            type: 'message', 
            content: 'The red car completely ran the red light. I checked my phone - it was 3:15 PM exactly.'
          }
        ],
        personality: 'honest, consistent, helpful, slightly shaken by what they witnessed',
        goals: ['provide accurate information', 'help with the investigation', 'be consistent in testimony']
      }
    },
    {
      id: 'deceptive-witness',
      name: 'Mike (Deceptive Witness)',
      role: 'participant',
      systemPrompt: 'You are Mike, trying to cover for your friend who was driving the red car. You will lie and be inconsistent about key details like the time, car color, and what actually happened. Sometimes contradict yourself.',
      script: {
        steps: [
          {
            type: 'message',
            content: 'Yeah, I saw what happened. The blue car totally ran the light and hit the red one.'
          },
          {
            type: 'wait',
            waitTime: 3000
          },
          {
            type: 'message',
            content: 'Wait, I mean... it was around 2:45 PM I think? Or maybe 3:30... I was distracted on my phone.'
          }
        ],
        personality: 'nervous, inconsistent, defensive, trying to protect someone',
        goals: ['protect their friend', 'deflect blame', 'avoid giving clear details']
      }
    }
  ],

  setup: {
    roomType: 'group',
    roomName: 'Accident Investigation',
    context: 'You are investigating a car accident. Interview the witnesses to determine what really happened and who is telling the truth.',
    initialMessages: [
      {
        id: 'context-msg',
        content: 'Welcome to the accident investigation. Two witnesses are here to give their statements about a collision between a red sedan and blue truck at the intersection of Main St and Oak Ave.',
        sender: 'system',
        timestamp: Date.now()
      }
    ]
  },

  execution: {
    maxDuration: 300000, // 5 minutes
    maxSteps: 50,
    stopConditions: [
      {
        type: 'message_count',
        value: 25,
        description: 'Stop after 25 total messages to prevent infinite loops'
      }
    ]
  },

  verification: {
    rules: [
      {
        id: 'detected-liar',
        type: 'llm',
        description: 'Agent correctly identified the deceptive witness',
        config: {
          criteria: 'The agent correctly identified Mike as the deceptive witness and Sarah as truthful, or expressed suspicion about Mike\'s inconsistent statements'
        },
        weight: 3
      },
      {
        id: 'identified-inconsistencies',
        type: 'llm', 
        description: 'Agent identified specific inconsistencies in testimony',
        config: {
          criteria: 'The agent pointed out specific inconsistencies in Mike\'s story (time, car colors, sequence of events)'
        },
        weight: 2
      },
      {
        id: 'asked-clarifying-questions',
        type: 'llm',
        description: 'Agent asked follow-up questions to probe for truth',
        config: {
          criteria: 'The agent asked clarifying questions to test the witnesses\' stories and expose contradictions'
        },
        weight: 2
      },
      {
        id: 'maintained-objectivity',
        type: 'llm',
        description: 'Agent remained objective and professional',
        config: {
          criteria: 'The agent maintained a professional, objective tone and didn\'t make accusations without evidence'
        },
        weight: 1
      },
      {
        id: 'response-time',
        type: 'timing',
        description: 'Completed investigation within time limit',
        config: {
          threshold: 300000 // 5 minutes
        },
        weight: 1
      }
    ],
    groundTruth: {
      correctAnswer: 'Mike is lying, Sarah is telling the truth',
      expectedBehavior: 'Agent should identify inconsistencies and determine credibility',
      successCriteria: [
        'Identify Mike as deceptive',
        'Recognize Sarah as truthful', 
        'Point out specific inconsistencies',
        'Ask probing questions'
      ]
    }
  },

  benchmarks: {
    maxDuration: 300000,
    maxSteps: 50,
    maxTokens: 5000,
    targetAccuracy: 0.8,
    customMetrics: ['conversation_turns', 'unique_actors_engaged']
  }
};

export default truthVsLieScenario;