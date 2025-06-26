#!/usr/bin/env node

/**
 * Simple Plugin Structure Test (No Service Loading)
 * Tests only the plugin exports and structure without instantiating services
 */

console.log('🚀 Testing Midnight Network Plugin Structure Only...\n');

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
      midnightPlugin.services.forEach((service, index) => {
        console.log(
          `   - Service ${index + 1}: ${service.name || service.serviceName || 'Unknown'}`
        );
      });
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

    // Test configuration
    if (midnightPlugin.config) {
      console.log(
        `✅ Configuration defined with ${Object.keys(midnightPlugin.config).length} settings`
      );
    } else {
      console.log('❌ No configuration found');
    }

    // Test init function
    if (midnightPlugin.init) {
      console.log('✅ Init function defined');
    } else {
      console.log('❌ No init function found');
    }

    console.log('\n🎉 Plugin structure validation completed successfully!');
    return true;
  } catch (error) {
    console.error('❌ Plugin structure test failed:', error.message);
    return false;
  }
}

async function testEnvironmentConfig() {
  console.log('\n🌍 Testing environment configuration...');

  const requiredVars = ['MIDNIGHT_NETWORK_URL', 'MIDNIGHT_INDEXER_URL', 'MIDNIGHT_WALLET_MNEMONIC'];

  let hasEnv = false;

  // Try to load .env.local
  try {
    const fs = await import('fs');

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
  console.log('Midnight Network Plugin Structure Test');
  console.log('====================================\n');

  const results = {
    structure: false,
    environment: false,
  };

  results.structure = await testPluginStructure();
  results.environment = await testEnvironmentConfig();

  console.log('\n📊 Test Summary');
  console.log('================');
  console.log(`Plugin Structure: ${results.structure ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`Environment: ${results.environment ? '✅ PASS' : '⚠️  NEEDS SETUP'}`);

  const passed = Object.values(results).filter((r) => r === true).length;
  const total = Object.values(results).length;

  console.log(`\nOverall: ${passed}/${total} tests passed`);

  if (results.structure) {
    console.log('\n🎉 Plugin structure is valid!');
    console.log('\nNext steps for end-to-end testing:');
    console.log('1. Set up .env.local with your Midnight Network credentials');
    console.log('2. Build the main project: npm run build');
    console.log('3. Start an agent: elizaos start --character character-test.json');
    console.log('4. Test API endpoints at http://localhost:3000/api/midnight/');
    console.log('5. Use the agent to test secure messaging and payments');
    process.exit(0);
  } else {
    console.log('\n❌ Plugin structure has issues that need to be resolved');
    process.exit(1);
  }
}

main().catch((error) => {
  console.error('Test runner failed:', error);
  process.exit(1);
});
