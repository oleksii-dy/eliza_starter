import { instrument, logger } from '@elizaos/core';
import { TwitterClientInstance } from './index';

/**
 * Mock implementation for @elizaos/core instrumentation
 */
let mockedEvents: any[] = [];

// Declare jest as a global variable
declare const jest: any;
declare const process: any;

jest.mock('@elizaos/core', () => {
  const actual = jest.requireActual('@elizaos/core');
  return {
    ...actual,
    instrument: {
      logEvent: (event: any) => {
        console.log(`Event logged: ${event.stage}:${event.subStage}:${event.event}`);
        mockedEvents.push(event);
        return Promise.resolve();
      },
    },
  };
});

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
};

/**
 * Helper function to reset the mocked events array
 */
function resetMockedEvents() {
  mockedEvents = [];
}

/**
 * Log the distribution of events by type (subStage + event)
 */
function printEventDistribution() {
  const eventCounts = mockedEvents.reduce(
    (acc, event) => {
      const key = `${event.stage}:${event.subStage}:${event.event}`;
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    },
    {} as Record<string, number>
  );

  console.log('\nEvent distribution:');
  Object.entries(eventCounts)
    .sort(([, a], [, b]) => b - a)
    .forEach(([key, count]) => {
      console.log(`${key}: ${count}`);
    });
}

/**
 * Test initialization instrumentation
 */
async function testInitialization() {
  console.log('\n=== Testing client initialization ===');
  resetMockedEvents();

  try {
    // Create client instance (should trigger init events)
    const client = new TwitterClientInstance(mockRuntime as any, {});

    // Check initialization events
    console.log(`Total events: ${mockedEvents.length}`);
    if (mockedEvents.some((e) => e.subStage === 'init' && e.event === 'init_start')) {
      console.log('✅ Found init_start event');
    } else {
      console.log('❌ Missing init_start event');
    }

    // Print event distribution
    printEventDistribution();

    return true;
  } catch (error) {
    console.error('Error in testInitialization:', error);
    return false;
  }
}

/**
 * Mock tweet for testing post functionality
 */
const mockTweet = {
  id: 'mock-tweet-id',
  text: 'This is a test tweet',
  conversationId: 'mock-conversation-id',
  timestamp: Date.now(),
  userId: 'mock-user-id',
  username: 'test_user',
  name: 'Test User',
  inReplyToStatusId: null,
  permanentUrl: 'https://twitter.com/test_user/status/mock-tweet-id',
  photos: [],
  hashtags: [],
  mentions: [],
  urls: [],
  videos: [],
  thread: [],
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
              },
            },
          },
        },
      }),
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
};

/**
 * Test tweet posting instrumentation
 */
async function testTweetPosting() {
  console.log('\n=== Testing tweet posting ===');
  resetMockedEvents();

  try {
    const client = new TwitterClientInstance(mockRuntime as any, {});

    // Monkey patch the client to avoid actual API calls
    client.client = mockClientBase as any;
    client.post.client = mockClientBase as any;

    // Create the callback function
    const tweetText = 'This is a test tweet from the instrumentation test';

    // Call the method directly
    await client.post.postTweet(
      mockRuntime as any,
      mockClientBase as any,
      tweetText,
      'mock-room-id' as any,
      tweetText,
      'test_user'
    );

    // Check tweet posting events
    console.log(`Total events: ${mockedEvents.length}`);

    if (mockedEvents.some((e) => e.subStage === 'post_tweet' && e.event === 'post_tweet_start')) {
      console.log('✅ Found post_tweet_start event');
    } else {
      console.log('❌ Missing post_tweet_start event');
    }

    if (
      mockedEvents.some((e) => e.subStage === 'post_tweet' && e.event === 'post_tweet_complete')
    ) {
      console.log('✅ Found post_tweet_complete event');
    } else {
      console.log('❌ Missing post_tweet_complete event');
    }

    if (mockedEvents.some((e) => e.subStage === 'api_post_tweet')) {
      console.log('✅ Found api_post_tweet events');
    } else {
      console.log('❌ Missing api_post_tweet events');
    }

    // Print event distribution
    printEventDistribution();

    return true;
  } catch (error) {
    console.error('Error in testTweetPosting:', error);
    return false;
  }
}

/**
 * Main function to run tests
 */
async function main() {
  console.log('Starting Twitter instrumentation tests...');

  let success = true;

  // Test client initialization
  success = (await testInitialization()) && success;

  // Test tweet posting
  success = (await testTweetPosting()) && success;

  // Print final results
  console.log('\n=== Test Results ===');
  console.log(`Total instrumentation events captured: ${mockedEvents.length}`);
  console.log(`Tests ${success ? 'PASSED' : 'FAILED'}`);

  return success;
}

// Run the tests
main()
  .then((success) => {
    process.exit(success ? 0 : 1);
  })
  .catch((error) => {
    console.error('Unhandled error in tests:', error);
    process.exit(1);
  });
