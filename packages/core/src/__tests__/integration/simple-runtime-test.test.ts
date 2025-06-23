import { describe, it, expect, afterEach } from 'vitest';
import { createTestRuntime, RealRuntimeTestHarness } from '../../test-utils';
import { stringToUuid } from '../../utils';

/**
 * Simple Real Runtime Test - validates the core test infrastructure works
 */
describe('Simple Real Runtime Test', () => {
  let harness: RealRuntimeTestHarness | undefined;

  afterEach(async () => {
    if (harness) {
      await harness.cleanup();
      harness = undefined;
    }
  });

  it('should create a functional runtime instance', async () => {
    const { runtime, harness: testHarness } = await createTestRuntime({
      character: {
        name: 'SimpleTestAgent',
        system: 'You are a simple test agent.',
        bio: ['I am used for basic testing.'],
        messageExamples: [],
        postExamples: [],
        topics: [],
        knowledge: [],
        plugins: [],
      },
    });

    harness = testHarness;

    // Basic runtime validation
    expect(runtime).toBeDefined();
    expect(runtime.agentId).toBeDefined();
    expect(runtime.character.name).toBe('SimpleTestAgent');

    // Test basic database functionality
    const memory = await runtime.createMemory(
      {
        entityId: stringToUuid('test-user'),
        roomId: stringToUuid('test-room'),
        content: {
          text: 'Hello, world!',
          source: 'test',
        },
      },
      'messages'
    );

    expect(memory).toBeDefined();

    // Verify memory retrieval
    const memories = await runtime.getMemories({
      roomId: stringToUuid('test-room'),
      count: 5,
      tableName: 'messages',
    });

    expect(memories.length).toBeGreaterThan(0);
    expect(memories[0].content.text).toBe('Hello, world!');
  });

  it('should validate runtime health', async () => {
    harness = new RealRuntimeTestHarness();

    const runtime = await harness.createTestRuntime({
      character: {
        name: 'HealthCheckAgent',
        system: 'Health test agent',
        bio: ['Testing health'],
        messageExamples: [],
        postExamples: [],
        topics: [],
        knowledge: [],
        plugins: [],
      },
      plugins: [],
      apiKeys: { TEST_KEY: 'test-value' },
    });

    const health = await harness.validateRuntimeHealth(runtime);

    expect(health.healthy).toBe(true);
    expect(health.issues).toHaveLength(0);
    expect(runtime.agentId).toBeDefined();
  });
});
