#!/usr/bin/env bun

// Set environment for testing
process.env.NODE_ENV = 'test';
process.env.USE_MOCK_ROBOT = 'true';
process.env.ELIZA_TEST = 'true';
process.env.PGLITE_DATA_DIR = ':memory:';

async function runSimpleRobotTest() {
  console.log('🤖 Running Simple Robot Plugin Test...\n');

  try {
    // Dynamic imports to avoid build issues
    const { AgentRuntime, asUUID } = await import('@elizaos/core');
    const { createDatabaseAdapter, plugin: sqlPlugin } = await import('@elizaos/plugin-sql');
    const fs = await import('fs');
    const path = await import('path');
    const { fileURLToPath } = await import('url');
    const { dirname } = await import('path');

    // Get current directory
    const __filename = fileURLToPath(import.meta.url);
    const __dirname = dirname(__filename);

    // Import our plugin from the built version
    const robotPlugin = (await import('../../../dist/index.js')).default;

    // Load test character
    const characterPath = path.join(__dirname, 'test-character.json');
    const characterData = JSON.parse(fs.readFileSync(characterPath, 'utf-8'));

    // Add robot plugin to character
    characterData.plugins = ['@elizaos/plugin-robot'];

    // Create runtime
    console.log('Creating test runtime...');
    // Generate a proper UUID v4
    const uuid = () => {
      return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
        const r = (Math.random() * 16) | 0;
        const v = c === 'x' ? r : (r & 0x3) | 0x8;
        return v.toString(16);
      });
    };
    const agentId = asUUID(uuid());
    const db = createDatabaseAdapter({ dataDir: ':memory:' }, agentId);

    const runtime = new AgentRuntime({
      character: characterData,
      adapter: db,
      plugins: [sqlPlugin, robotPlugin],
    });

    await runtime.initialize();
    console.log('✓ Runtime initialized\n');

    // Test 1: Check robot service
    console.log('Test 1: Robot Service Check');
    const robotService = runtime.getService('ROBOT');

    if (!robotService) {
      throw new Error('Robot service not found');
    }

    console.log('✓ Robot service found');

    // Get state (cast to any to access methods)
    const state = (robotService as any).getState();
    console.log(`✓ Robot state: Status=${state.status}, Mode=${state.mode}`);
    console.log(`  Joints: ${state.joints.length}`);
    console.log(`  Emergency Stop: ${state.isEmergencyStopped}\n`);

    // Test 2: Check actions
    console.log('Test 2: Robot Actions Check');
    const commandAction = runtime.actions.find((a) => a.name === 'ROBOT_COMMAND');

    if (!commandAction) {
      throw new Error('Robot command action not found');
    }

    console.log('✓ Robot command action found');
    console.log(`  Description: ${commandAction.description}\n`);

    // Test 3: Process a simple command
    console.log('Test 3: Process Robot Command');
    const message = {
      id: asUUID(`${uuid()}`),
      entityId: runtime.agentId,
      agentId: runtime.agentId,
      roomId: 'test-room',
      content: {
        text: 'Move your head to look left',
        source: 'test',
      },
      createdAt: Date.now(),
    };

    // Validate command
    const cmdState = { values: {}, data: {}, text: '' };
    const isValid = await commandAction.validate(runtime, message as any, cmdState);
    console.log(`✓ Command validation: ${isValid}`);

    if (isValid) {
      // Process message using runtime's internal method
      await (runtime as any).processMessage(message);

      // Wait for processing
      await new Promise((resolve) => setTimeout(resolve, 1000));

      // Check for response using runtime's internal methods
      const messages = await (runtime as any).messageManager.getMessages({
        roomId: 'test-room',
        limit: 5,
      });

      const response = messages.find(
        (m: any) => m.userId === runtime.agentId && m.id !== message.id
      );

      if (response) {
        console.log('✓ Response received');
        console.log(`  Text: ${response.content.text?.substring(0, 100)}...`);
      } else {
        console.log('⚠️  No response received');
      }
    }

    // Test 4: Check capabilities
    console.log('\nTest 4: Robot Capabilities');
    const capabilities = (robotService as any).getCapabilities();

    if (capabilities) {
      console.log(`✓ Robot: ${capabilities.name}`);
      console.log(`  Type: ${capabilities.type}`);
      console.log(`  DOF: ${capabilities.dof}`);
      console.log(`  Joints: ${capabilities.joints.length}`);
      console.log(`  Walking: ${capabilities.capabilities.walking}`);
      console.log(`  Manipulation: ${capabilities.capabilities.manipulation}`);
    } else {
      console.log('⚠️  No capabilities available');
    }

    console.log('\n✅ All tests completed successfully!');

    // Cleanup
    await runtime.stop();
  } catch (error) {
    console.error('❌ Test failed:', error);
    process.exit(1);
  }
}

// Run test
runSimpleRobotTest().catch(console.error);
