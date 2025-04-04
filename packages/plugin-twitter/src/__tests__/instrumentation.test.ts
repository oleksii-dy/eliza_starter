import { test, expect, beforeEach, afterEach, afterAll } from 'bun:test';
import { TwitterClientInstance } from '../index';

// We'll use a simpler testing approach - instead of trying to intercept all instrumentation calls,
// we'll focus on verifying that the plugin's classes are properly initialized and usable

// Create mock runtime
const mockRuntime = {
  agentId: 'mock-agent-id',
  getSetting: (key: string) => {
    switch (key) {
      case 'TWITTER_USERNAME':
        return 'test_user';
      case 'TWITTER_PASSWORD':
        return 'test_password';
      case 'TWITTER_ENABLE_POST_GENERATION':
        return false;
      case 'TWITTER_DRY_RUN':
        return true;
      default:
        return null;
    }
  },
  setSetting: () => {},
  log: console.log,
  error: console.error,
  emitEvent: () => {},
  ensureRoomExists: async () => {},
  ensureWorldExists: async () => {},
  ensureParticipantInRoom: async () => {},
  ensureConnection: async () => {},
  getCache: async () => null,
  setCache: async () => {},
  createMemory: async () => {},
  getMemoryById: async () => null,
  getModel: () => null,
  composeState: async () => ({ values: {} }),
  character: {
    settings: {
      twitter: {
        spaces: {},
      },
    },
  },
};

/**
 * Mock the client base for the TwitterPostClient
 */
const mockClientBase = {
  profile: {
    id: 'mock-user-id',
    username: 'test_user',
    screenName: 'Test User',
  },
  twitterClient: {
    sendTweet: async () => ({
      json: async () => ({
        data: {
          create_tweet: {
            tweet_results: {
              result: {
                rest_id: 'mock-tweet-id',
                legacy: {
                  full_text: 'This is a test tweet',
                },
              },
            },
          },
        },
      }),
    }),
    getAudioSpaceById: async () => ({
      participants: {
        speakers: [],
        listeners: [],
      },
    }),
  },
  requestQueue: {
    add: async (fn: Function) => fn(),
  },
  cacheTweet: async () => {},
  cacheLatestCheckedTweetId: async () => {},
  getTweet: async () => null,
  saveRequestMessage: async () => {},
  fetchSearchTweets: async () => ({ tweets: [], previous: null, next: null }),
  runtime: mockRuntime,
};

// Helper function to check if a method includes instrumentation
function hasInstrumentation(methodFn: Function): boolean {
  if (!methodFn) return false;
  const src = methodFn.toString();
  return src.includes('instrument') || src.includes('logEvent');
}

// The test suite verifies that the Twitter client classes can be instantiated and their methods accessed
test('Twitter instrumentation setup validation', async () => {
  try {
    // Create the client instance
    const client = new TwitterClientInstance(mockRuntime as any, {});

    // Validate that the client is created successfully
    expect(client).toBeDefined();
    expect(client.client).toBeDefined();
    expect(client.post).toBeDefined();

    // Track instrumentation coverage
    const instrumentationResults: Record<string, boolean> = {};
    let totalMethods = 0;
    let instrumentedMethods = 0;

    // Check post client methods
    console.log('\n📊 TWITTER PLUGIN INSTRUMENTATION COVERAGE:');
    console.log('\n📝 Post Client Methods:');

    // Primary methods to check
    const postMethods = [
      'postTweet',
      'createTweetObject',
      'sendStandardTweet',
      'buildThread',
      'processAndCacheTweet',
    ];

    postMethods.forEach((methodName) => {
      if (typeof client.post[methodName] === 'function') {
        totalMethods++;
        const isInstrumented = hasInstrumentation(client.post[methodName]);
        instrumentationResults[`post.${methodName}`] = isInstrumented;
        if (isInstrumented) instrumentedMethods++;
        console.log(
          `  - ${methodName}: ${isInstrumented ? '✅ Instrumented' : '❌ Not instrumented'}`
        );
      }
    });

    // Check space client methods if available
    if (client.space) {
      console.log('\n🚀 Space Client Methods:');

      // Primary space methods to check
      const spaceMethods = [
        'startSpace',
        'stopSpace',
        'getSpaceById',
        'getParticipants',
        'startParticipant',
        'stopParticipant',
      ];

      spaceMethods.forEach((methodName) => {
        if (typeof client.space[methodName] === 'function') {
          totalMethods++;
          const isInstrumented = hasInstrumentation(client.space[methodName]);
          instrumentationResults[`space.${methodName}`] = isInstrumented;
          if (isInstrumented) instrumentedMethods++;
          console.log(
            `  - ${methodName}: ${isInstrumented ? '✅ Instrumented' : '❌ Not instrumented'}`
          );
        }
      });
    } else {
      console.log('\n🚀 Space Client: Not available in this environment');
    }

    // Check interaction client methods if available
    if (client.interaction) {
      console.log('\n👥 Interaction Client Methods:');

      const interactionMethods = [
        'fetchMentions',
        'fetchTweets',
        'processMentions',
        'processDirectMessages',
        'fetchDirectMessages',
      ];

      interactionMethods.forEach((methodName) => {
        if (typeof client.interaction[methodName] === 'function') {
          totalMethods++;
          const isInstrumented = hasInstrumentation(client.interaction[methodName]);
          instrumentationResults[`interaction.${methodName}`] = isInstrumented;
          if (isInstrumented) instrumentedMethods++;
          console.log(
            `  - ${methodName}: ${isInstrumented ? '✅ Instrumented' : '❌ Not instrumented'}`
          );
        }
      });
    }

    // Display summary
    const coverage = totalMethods ? Math.round((instrumentedMethods / totalMethods) * 100) : 0;
    console.log(
      `\n📈 OVERALL INSTRUMENTATION COVERAGE: ${coverage}% (${instrumentedMethods}/${totalMethods} methods)`
    );

    // Validate post client method directly
    expect(hasInstrumentation(client.post.postTweet)).toBe(true);

    // Validate space client if available
    if (client.space) {
      expect(hasInstrumentation(client.space.startSpace)).toBe(true);
      expect(hasInstrumentation(client.space.stopSpace)).toBe(true);
    }

    console.log('\n✅ Twitter instrumentation validation completed successfully');
  } catch (error) {
    console.error('Test failed:', error);
    throw error;
  }
});
