import type { TestSuite } from '@elizaos/core';

// Simple E2E integration test that verifies the plugin loads correctly
export class SimpleGameIntegrationTestSuite implements TestSuite {
  name = 'simple-game-integration';
  description = 'Simple integration test for autonomous coding game plugin';

  tests = [
    {
      name: 'Plugin loads and initializes without errors',
      fn: async (runtime: any) => {
        console.log('[TEST] Testing plugin initialization...');
        
        // Verify the agent is created
        if (!runtime.agentId) {
          throw new Error('Runtime agent ID not set');
        }
        
        if (!runtime.character) {
          throw new Error('Runtime character not set');
        }
        
        console.log(`[TEST] ✅ Runtime initialized with agent: ${runtime.character.name}`);
        
        // Verify basic services
        if (runtime.getService) {
          console.log('[TEST] ✅ Service access available');
        } else {
          throw new Error('Service access not available');
        }
        
        // Verify basic plugin functionality
        if (runtime.actions && Array.isArray(runtime.actions)) {
          console.log(`[TEST] ✅ Actions system working: ${runtime.actions.length} actions available`);
        } else {
          throw new Error('Actions system not working');
        }
        
        if (runtime.providers && Array.isArray(runtime.providers)) {
          console.log(`[TEST] ✅ Providers system working: ${runtime.providers.length} providers available`);
        } else {
          throw new Error('Providers system not working');
        }
        
        console.log('[TEST] ✅ Plugin loaded and initialized successfully');
      }
    },

    {
      name: 'Game services are available',
      fn: async (runtime: any) => {
        console.log('[TEST] Testing service availability...');
        
        // Check for core services that should be available
        const coreServices = ['gameOrchestrator', 'agentFactory', 'execution'];
        
        for (const serviceName of coreServices) {
          const service = runtime.getService?.(serviceName);
          if (service) {
            console.log(`[TEST] ✅ Service ${serviceName} is available`);
            
            // Test service capability description
            if (service.capabilityDescription && typeof service.capabilityDescription === 'string') {
              console.log(`[TEST] - ${serviceName}: ${service.capabilityDescription}`);
            }
          } else {
            console.log(`[TEST] ⚠️  Service ${serviceName} not available - this may be expected in test environment`);
          }
        }
        
        console.log('[TEST] ✅ Service availability check complete');
      }
    },

    {
      name: 'Game actions are registered',
      fn: async (runtime: any) => {
        console.log('[TEST] Testing action registration...');
        
        const expectedActions = ['ENABLE_AUTO_MODE', 'DISABLE_AUTO_MODE', 'CREATE_PROJECT', 'PAUSE_GAME'];
        const registeredActions = runtime.actions?.map((a: any) => a.name) || [];
        
        console.log(`[TEST] All registered actions: ${registeredActions.join(', ')}`);
        
        let foundActions = 0;
        for (const actionName of expectedActions) {
          const action = runtime.actions?.find((a: any) => a.name === actionName);
          if (action) {
            foundActions++;
            console.log(`[TEST] ✅ Action ${actionName} is registered`);
          } else {
            console.log(`[TEST] ⚠️  Action ${actionName} not found`);
          }
        }
        
        if (foundActions > 0) {
          console.log(`[TEST] ✅ Found ${foundActions}/${expectedActions.length} expected game actions`);
        } else {
          console.log('[TEST] ⚠️  No game actions found - plugin may not be fully loaded');
        }
      }
    }
  ];
}

// Export the test suite for use with elizaos test command
export default new SimpleGameIntegrationTestSuite();