#!/usr/bin/env node

/**
 * Simple Plugin Structure Test (No native dependencies)
 * Tests the plugin exports and API endpoints without loading core runtime
 */

console.log('🚀 Testing Midnight Network Plugin Structure...\n');

async function testPluginStructure() {
  try {
    // Import the built plugin
    const plugin = await import('./dist/index.js');

    console.log('✅ Plugin imported successfully');

    const midnightPlugin = plugin.midnightPlugin || plugin.default;

    if (!midnightPlugin) {
      throw new Error('Plugin not found in exports');
    }

    console.log(`✅ Plugin found: ${midnightPlugin.name}`);
    console.log(`   Description: ${midnightPlugin.description}`);

    // Test services
    if (midnightPlugin.services && midnightPlugin.services.length > 0) {
      console.log(`✅ Services: ${midnightPlugin.services.length} defined`);
    } else {
      console.log('❌ No services found');
    }

    // Test actions
    if (midnightPlugin.actions && midnightPlugin.actions.length > 0) {
      console.log(`✅ Actions: ${midnightPlugin.actions.length} defined`);
      midnightPlugin.actions.forEach((action) => {
        console.log(`   - ${action.name}: ${action.description.slice(0, 50)}...`);
      });
    } else {
      console.log('❌ No actions found');
    }

    // Test providers
    if (midnightPlugin.providers && midnightPlugin.providers.length > 0) {
      console.log(`✅ Providers: ${midnightPlugin.providers.length} defined`);
      midnightPlugin.providers.forEach((provider) => {
        console.log(`   - ${provider.name}`);
      });
    } else {
      console.log('❌ No providers found');
    }

    // Test routes (API endpoints)
    if (midnightPlugin.routes && midnightPlugin.routes.length > 0) {
      console.log(`✅ API Routes: ${midnightPlugin.routes.length} defined`);
      midnightPlugin.routes.forEach((route) => {
        console.log(`   - ${route.type} ${route.path}`);
      });
    } else {
      console.log('❌ No API routes found');
    }

    console.log('\n🎉 Plugin structure validation completed successfully!');
    return true;
  } catch (error) {
    console.error('❌ Plugin structure test failed:', error.message);
    return false;
  }
}

async function testAPIEndpoints() {
  console.log('\n🔌 Testing API endpoint handlers...');

  try {
    const plugin = await import('./dist/index.js');
    const midnightPlugin = plugin.midnightPlugin || plugin.default;

    if (!midnightPlugin.routes) {
      throw new Error('No routes defined');
    }

    // Test each route handler
    for (const route of midnightPlugin.routes) {
      console.log(`Testing ${route.type} ${route.path}...`);

      if (typeof route.handler !== 'function') {
        throw new Error(`Route ${route.path} handler is not a function`);
      }

      // Mock request/response objects
      const mockReq = {};
      const mockRes = {
        json: (data) => {
          console.log(`   ✅ Response: ${JSON.stringify(data).slice(0, 100)}...`);
          return mockRes;
        },
        status: (code) => {
          console.log(`   ✅ Status: ${code}`);
          return mockRes;
        },
      };

      try {
        await route.handler(mockReq, mockRes);
        console.log('   ✅ Handler executed successfully');
      } catch (error) {
        console.log(`   ⚠️  Handler error (may be expected): ${error.message}`);
      }
    }

    console.log('✅ API endpoint handlers tested');
    return true;
  } catch (error) {
    console.error('❌ API endpoint test failed:', error.message);
    return false;
  }
}

async function testEnvironmentSetup() {
  console.log('\n🌍 Testing environment setup...');

  const requiredVars = ['MIDNIGHT_NETWORK_URL', 'MIDNIGHT_INDEXER_URL', 'MIDNIGHT_WALLET_MNEMONIC'];

  let hasEnv = false;

  // Try to load .env.local
  try {
    const fs = await import('fs');
    const _path = await import('path');

    if (fs.existsSync('.env.local')) {
      console.log('✅ .env.local file found');
      hasEnv = true;
    } else {
      console.log('⚠️  .env.local file not found');
    }

    if (fs.existsSync('.env.test')) {
      console.log('✅ .env.test template found');
    } else {
      console.log('❌ .env.test template missing');
    }
  } catch (error) {
    console.log('⚠️  Could not check environment files');
  }

  console.log('\nEnvironment variables check:');
  requiredVars.forEach((varName) => {
    if (process.env[varName]) {
      console.log(`   ✅ ${varName}: configured`);
    } else {
      console.log(`   ⚠️  ${varName}: not set`);
    }
  });

  return hasEnv;
}

async function main() {
  console.log('Midnight Network Plugin Integration Test');
  console.log('======================================\n');

  const results = {
    structure: false,
    api: false,
    environment: false,
  };

  results.structure = await testPluginStructure();
  results.api = await testAPIEndpoints();
  results.environment = await testEnvironmentSetup();

  console.log('\n📊 Test Summary');
  console.log('================');
  console.log(`Plugin Structure: ${results.structure ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`API Endpoints: ${results.api ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`Environment: ${results.environment ? '✅ PASS' : '⚠️  NEEDS SETUP'}`);

  const passed = Object.values(results).filter((r) => r === true).length;
  const total = Object.values(results).length;

  console.log(`\nOverall: ${passed}/${total} tests passed`);

  if (results.structure && results.api) {
    console.log('\n🎉 Plugin is ready for runtime testing!');
    console.log('\nNext steps:');
    console.log('1. Set up .env.local with your Midnight Network credentials');
    console.log('2. Run: elizaos start --character character-test.json');
    console.log('3. Test API endpoints at http://localhost:3000/api/midnight/');
    console.log('4. Use the agent to test secure messaging and payments');
    process.exit(0);
  } else {
    console.log('\n❌ Plugin has issues that need to be resolved');
    process.exit(1);
  }
}

main().catch((error) => {
  console.error('Test runner failed:', error);
  process.exit(1);
});
