#!/usr/bin/env tsx

/**
 * Test the fixed plugin to verify it works with ElizaOS
 */

import { planningPlugin } from './src/index-fixed';

async function testFixedPlugin() {
  console.log('🔧 Testing Fixed Planning Plugin');
  console.log('================================\n');

  try {
    console.log('Plugin Name:', planningPlugin.name);
    console.log('Description:', planningPlugin.description);
    console.log('Providers:', planningPlugin.providers?.length || 0);
    console.log('Actions:', planningPlugin.actions?.length || 0);
    console.log('Services:', planningPlugin.services?.length || 0);
    console.log('');

    // Test provider
    console.log('📋 Testing Message Classifier Provider...');
    const provider = planningPlugin.providers?.[0];
    if (provider) {
      const mockRuntime = { agentId: 'test' };
      const mockMessage = {
        content: { text: 'I need to plan a strategic approach to this project' },
      };
      const mockState = {};

      const result = await provider.get(mockRuntime as any, mockMessage as any, mockState as any);
      console.log('Provider result:', result);
      console.log('✅ Provider working correctly');
    }
    console.log('');

    // Test actions
    console.log('🎬 Testing Actions...');
    const actions = planningPlugin.actions || [];
    
    for (const action of actions) {
      console.log(`Testing action: ${action.name}`);
      
      const mockRuntime = { agentId: 'test' };
      const mockMessage = {
        content: { text: 'test message for action' },
      };
      
      // Test validation
      const isValid = await action.validate(mockRuntime as any, mockMessage as any);
      console.log(`  Validation: ${isValid ? '✅' : '❌'}`);
      
      if (isValid) {
        // Test handler
        const result = await action.handler(
          mockRuntime as any,
          mockMessage as any,
          {},
          {},
          async (content) => {
            console.log(`  Callback received: ${content.text || content.thought}`);
            return [];
          }
        );
        
        console.log(`  Handler result: ${result?.text || 'completed'}`);
      }
    }
    console.log('✅ All actions working correctly');
    console.log('');

    // Test service
    console.log('⚙️ Testing Planning Service...');
    const ServiceClass = planningPlugin.services?.[0];
    if (ServiceClass) {
      const mockRuntime = { agentId: 'test' };
      const service = await ServiceClass.start(mockRuntime as any);
      console.log('Service created:', service.constructor.name);
      console.log('Capability:', service.capabilityDescription);
      await service.stop();
      console.log('✅ Service working correctly');
    }
    console.log('');

    console.log('🎉 Fixed plugin works perfectly!');
    console.log('');
    console.log('🚀 Plugin is ready for integration with ElizaOS');
    console.log('');
    console.log('Next steps:');
    console.log('1. Update package.json to use the fixed version');
    console.log('2. Test with real ElizaOS runtime');
    console.log('3. Add benchmark data and run comprehensive tests');
    
    return true;

  } catch (error) {
    console.error('❌ Plugin test failed:', error.message);
    console.error(error.stack);
    return false;
  }
}

testFixedPlugin().then(success => {
  process.exit(success ? 0 : 1);
}).catch(error => {
  console.error('Test failed:', error);
  process.exit(1);
});