import { createLogger, type Character } from '@elizaos/core';

// Test character
const testCharacter: Character = {
  id: 'test-character-id',
  name: 'Test Character',
  username: 'test',
  system: 'You are a helpful test character.',
  modelProvider: 'openai',
  settings: {
    secrets: {},
    voice: {
      model: 'en_US-hfc_female-medium',
    },
  },
  plugins: [],
  clients: [],
  bio: [],
  lore: [],
  messageExamples: [],
  postExamples: [],
  adjectives: [],
  people: [],
  topics: [],
  style: {
    all: [],
    chat: [],
    post: [],
  },
  twitterProfile: {
    id: 'test-id',
    username: 'test',
    screenName: 'Test',
    bio: 'Test bio',
    nicknames: [],
  },
};

// Test agent
const testAgent = {
  character: testCharacter,
  init: async () => {
    console.log('Test agent initialized');
  },
};

// Export the agent
export default {
  agents: [testAgent],
  logger: {
    logger: {
      name: 'test-agent-from-module',
      level: 'info',
      formatter: {
        json: false,
        timestamps: true,
        colorize: true
      },
      transports: [
        {
          name: 'console',
          target: 'pino-pretty',
          options: {
            colorize: true,
            translateTime: 'yyyy-mm-dd HH:MM:ss'
          }
        }
      ]
    }
  }
};