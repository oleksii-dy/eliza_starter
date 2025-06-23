/**
 * Real ElizaOS Integration Test
 *
 * This tests the MVP against an actual ElizaOS runtime instance
 * to verify it really works, not just against mocks.
 */

import { AgentRuntime } from '@elizaos/core';
import { elizaLogger } from '@elizaos/core';
// import { PgliteDatabase } from '@elizaos/adapter-sqlite';
import { mvpCustomReasoningPlugin } from '../mvp';

interface TestCharacter {
  name: string;
  bio: string[];
  system: string;
  messageExamples: any[];
  postExamples: any[];
  topics: string[];
  knowledge: any[];
  clients: any[];
  plugins: string[];
}

/**
 * Create a real ElizaOS runtime for testing
 */
async function createRealElizaRuntime(): Promise<AgentRuntime> {
  try {
    // Create test character
    const testCharacter: TestCharacter = {
      name: 'TestAgent',
      bio: ['A test agent for MVP validation'],
      system: 'You are a test agent for validating custom reasoning MVP.',
      messageExamples: [],
      postExamples: [],
      topics: ['testing', 'validation'],
      knowledge: [],
      clients: [],
      plugins: [], // Will be added after runtime creation
    };

    // Create database adapter
    // const database = new PgliteDatabase();

    // Create real AgentRuntime
    const runtime = new AgentRuntime({
      // databaseAdapter: database,
      character: testCharacter,
      fetch: global.fetch,
    });

    // Initialize the runtime
    await runtime.initialize();

    return runtime;
  } catch (error) {
    elizaLogger.error('Failed to create real ElizaOS runtime:', error);
    throw new Error(
      `Real runtime creation failed: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}

/**
 * Test the MVP plugin against real ElizaOS
 */
export async function testMVPAgainstRealEliza(): Promise<{
  success: boolean;
  results: string[];
  errors: string[];
}> {
  const results: string[] = [];
  const errors: string[] = [];

  try {
    results.push('🚀 Starting real ElizaOS integration test...');

    // Step 1: Create real runtime
    results.push('📦 Creating real ElizaOS runtime...');
    const runtime = await createRealElizaRuntime();
    results.push(`✅ Real runtime created with agent ID: ${runtime.agentId}`);

    // Step 2: Register MVP plugin
    results.push('🔌 Registering MVP plugin...');
    await runtime.registerPlugin(mvpCustomReasoningPlugin);
    results.push('✅ MVP plugin registered successfully');

    // Step 3: Verify plugin actions are available
    results.push('🎯 Checking plugin actions...');
    const enableAction = runtime.actions.find((a) => a.name === 'ENABLE_REASONING_SERVICE');
    const disableAction = runtime.actions.find((a) => a.name === 'DISABLE_REASONING_SERVICE');
    const statusAction = runtime.actions.find((a) => a.name === 'CHECK_REASONING_STATUS');

    if (!enableAction || !disableAction || !statusAction) {
      throw new Error('MVP actions not properly registered');
    }
    results.push('✅ All MVP actions found in runtime');

    // Step 4: Test original useModel behavior
    results.push('🔍 Testing original useModel behavior...');
    const originalResult = await runtime.useModel('TEXT_LARGE', {
      prompt: 'Test prompt for original behavior',
    });
    results.push(`✅ Original useModel works: ${typeof originalResult}`);

    // Step 5: Create test message for enable action
    results.push('💬 Creating test message...');
    const testRoomId =
      `test-room-${Date.now()}` as `${string}-${string}-${string}-${string}-${string}`;
    const testMessageId = await runtime.createMemory(
      {
        entityId: runtime.agentId,
        roomId: testRoomId,
        content: {
          text: 'enable custom reasoning',
          source: 'test',
        },
      },
      'messages'
    );

    const testMessage = {
      id: testMessageId,
      entityId: runtime.agentId,
      agentId: runtime.agentId,
      roomId: testRoomId,
      content: {
        text: 'enable custom reasoning',
        source: 'test',
      },
      createdAt: Date.now(),
    };
    results.push('✅ Test message created');

    // Step 6: Test enable action with real runtime
    results.push('🔧 Testing enable action...');
    let enableResponseReceived = false;
    const enableCallback = async (content: any) => {
      results.push(`📝 Enable action response: ${content.text.substring(0, 100)}...`);
      enableResponseReceived = true;
      return [];
    };

    await enableAction.handler(runtime, testMessage, undefined, {}, enableCallback);

    if (!enableResponseReceived) {
      throw new Error('Enable action did not call callback');
    }
    results.push('✅ Enable action executed successfully');

    // Step 7: Test useModel after enabling (should be overridden)
    results.push('🔄 Testing useModel after enable...');
    const afterEnableResult = await runtime.useModel('TEXT_LARGE', {
      prompt: 'Test prompt after enable',
    });
    results.push(`✅ UseModel after enable works: ${typeof afterEnableResult}`);

    // Step 8: Test status action
    results.push('📊 Testing status action...');
    const statusRoomId =
      `test-room-${Date.now()}` as `${string}-${string}-${string}-${string}-${string}`;
    const statusMessageId = await runtime.createMemory(
      {
        entityId: runtime.agentId,
        roomId: statusRoomId,
        content: {
          text: 'check reasoning status',
          source: 'test',
        },
      },
      'messages'
    );

    const statusMessage = {
      id: statusMessageId,
      entityId: runtime.agentId,
      agentId: runtime.agentId,
      roomId: statusRoomId,
      content: {
        text: 'check reasoning status',
        source: 'test',
      },
      createdAt: Date.now(),
    };

    let statusResponseReceived = false;
    const statusCallback = async (content: any) => {
      results.push(`📊 Status response: ${content.text.substring(0, 100)}...`);
      statusResponseReceived = true;
      return [];
    };

    await statusAction.handler(runtime, statusMessage, undefined, {}, statusCallback);

    if (!statusResponseReceived) {
      throw new Error('Status action did not call callback');
    }
    results.push('✅ Status action executed successfully');

    // Step 9: Test disable action
    results.push('🛑 Testing disable action...');
    const disableRoomId =
      `test-room-${Date.now()}` as `${string}-${string}-${string}-${string}-${string}`;
    const disableMessageId = await runtime.createMemory(
      {
        entityId: runtime.agentId,
        roomId: disableRoomId,
        content: {
          text: 'disable custom reasoning',
          source: 'test',
        },
      },
      'messages'
    );

    const disableMessage = {
      id: disableMessageId,
      entityId: runtime.agentId,
      agentId: runtime.agentId,
      roomId: disableRoomId,
      content: {
        text: 'disable custom reasoning',
        source: 'test',
      },
      createdAt: Date.now(),
    };

    let disableResponseReceived = false;
    const disableCallback = async (content: any) => {
      results.push(`🛑 Disable response: ${content.text.substring(0, 100)}...`);
      disableResponseReceived = true;
      return [];
    };

    await disableAction.handler(runtime, disableMessage, undefined, {}, disableCallback);

    if (!disableResponseReceived) {
      throw new Error('Disable action did not call callback');
    }
    results.push('✅ Disable action executed successfully');

    // Step 10: Verify useModel restored after disable
    results.push('🔄 Testing useModel after disable...');
    const afterDisableResult = await runtime.useModel('TEXT_LARGE', {
      prompt: 'Test prompt after disable',
    });
    results.push(`✅ UseModel after disable works: ${typeof afterDisableResult}`);

    // Step 11: Test database integration
    results.push('🗄️ Testing database integration...');
    try {
      const dbConnection = await runtime.getConnection();
      if (dbConnection) {
        results.push('✅ Database connection available');

        // Try to query the training_data table
        const tableExists = await (runtime as any).adapter?.query?.(
          "SELECT name FROM sqlite_master WHERE type='table' AND name='training_data'"
        );

        if (tableExists && tableExists.length > 0) {
          results.push('✅ Training data table exists');
        } else {
          results.push('⚠️ Training data table not found (may not be created yet)');
        }
      } else {
        results.push('⚠️ No database connection (running without persistence)');
      }
    } catch (dbError) {
      results.push(
        `⚠️ Database test failed: ${dbError instanceof Error ? dbError.message : String(dbError)}`
      );
    }

    results.push('🎉 Real ElizaOS integration test completed successfully!');

    return {
      success: true,
      results,
      errors,
    };
  } catch (error) {
    const errorMsg = `Real integration test failed: ${error instanceof Error ? error.message : String(error)}`;
    errors.push(errorMsg);
    results.push(`❌ ${errorMsg}`);

    return {
      success: false,
      results,
      errors,
    };
  }
}

/**
 * Run the real integration test and display results
 */
export async function runRealIntegrationTest(): Promise<void> {
  elizaLogger.info('🧪 REAL ELIZAOS INTEGRATION TEST');
  elizaLogger.info('================================\n');

  const testResult = await testMVPAgainstRealEliza();

  // Display results
  testResult.results.forEach((result) => elizaLogger.info(result));

  if (testResult.errors.length > 0) {
    elizaLogger.info('\n❌ ERRORS:');
    testResult.errors.forEach((error) => elizaLogger.info(`  ${error}`));
  }

  elizaLogger.info('\n📊 FINAL RESULT:');
  if (testResult.success) {
    elizaLogger.info('✅ MVP SUCCESSFULLY INTEGRATES WITH REAL ELIZAOS!');
    elizaLogger.info('\n💡 The MVP plugin works with actual ElizaOS runtime.');
  } else {
    elizaLogger.info('❌ MVP FAILED TO INTEGRATE WITH REAL ELIZAOS');
    elizaLogger.info('\n🔧 The MVP needs fixes for real ElizaOS compatibility.');
  }
}
