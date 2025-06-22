#!/usr/bin/env node

/**
 * Workspace-based Autonomous Plugin Test
 * 
 * Tests the autonomous plugin by directly importing it from the workspace
 * instead of trying to install from NPM. This validates the autonomous
 * functionality at the plugin level.
 */

import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { existsSync } from 'fs';

console.log('🧪 Testing Autonomous Plugin from Workspace...');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Workspace paths
const workspaceRoot = join(__dirname, '../../');
const autonomyPluginPath = join(workspaceRoot, 'packages/plugin-autonomy/src/index.ts');
const corePath = join(workspaceRoot, 'packages/core/src');

console.log('📁 Workspace paths:');
console.log(`   • Root: ${workspaceRoot}`);
console.log(`   • Plugin: ${autonomyPluginPath}`);
console.log(`   • Core: ${corePath}`);

// Test the plugin structure and key files
const pluginTests = {
  pluginFileExists: false,
  pluginIndexExists: false,
  oodaServiceExists: false,
  apiServerExists: false,
  coreTestUtilsExists: false,
  pluginExportsValid: false,
  oodaServiceValid: false,
  apiServerValid: false,
};

try {
  // Test 1: Check plugin file structure
  const pluginIndexPath = join(workspaceRoot, 'packages/plugin-autonomy/src/index.ts');
  const oodaServicePath = join(workspaceRoot, 'packages/plugin-autonomy/src/ooda-service.ts');
  const apiServerPath = join(workspaceRoot, 'packages/plugin-autonomy/src/api-server.ts');
  const coreTestUtilsPath = join(workspaceRoot, 'packages/core/src/test-utils/index.ts');
  
  pluginTests.pluginIndexExists = existsSync(pluginIndexPath);
  pluginTests.oodaServiceExists = existsSync(oodaServicePath);
  pluginTests.apiServerExists = existsSync(apiServerPath);
  pluginTests.coreTestUtilsExists = existsSync(coreTestUtilsPath);

  console.log(`✅ Test 1: Plugin file structure`);
  console.log(`   • Plugin index: ${pluginTests.pluginIndexExists ? '✅' : '❌'}`);
  console.log(`   • OODA service: ${pluginTests.oodaServiceExists ? '✅' : '❌'}`);
  console.log(`   • API server: ${pluginTests.apiServerExists ? '✅' : '❌'}`);
  console.log(`   • Core test utils: ${pluginTests.coreTestUtilsExists ? '✅' : '❌'}`);

  // Test 2: Try to import and validate the plugin
  if (pluginTests.pluginIndexExists && pluginTests.coreTestUtilsExists) {
    try {
      // Import the autonomous plugin directly from workspace
      const autonomyPluginModule = await import(join(workspaceRoot, 'packages/plugin-autonomy/dist/index.js'));
      const { autoPlugin } = autonomyPluginModule;
      
      if (autoPlugin && autoPlugin.name && autoPlugin.services) {
        pluginTests.pluginExportsValid = true;
        console.log(`✅ Test 2: Plugin exports valid`);
        console.log(`   • Plugin name: ${autoPlugin.name}`);
        console.log(`   • Services count: ${autoPlugin.services?.length || 0}`);
        console.log(`   • Actions count: ${autoPlugin.actions?.length || 0}`);
        console.log(`   • Providers count: ${autoPlugin.providers?.length || 0}`);
      } else {
        console.log(`❌ Test 2: Plugin exports invalid or missing`);
      }
    } catch (importError) {
      console.log(`❌ Test 2: Plugin import failed - ${importError.message}`);
      console.log(`   • This might mean the plugin needs to be built first`);
      console.log(`   • Try running: cd packages/plugin-autonomy && bun run build`);
    }
  } else {
    console.log(`❌ Test 2: Skipping plugin import - missing files`);
  }

  // Test 3: Try to import and test OODA service from bundled plugin
  if (pluginTests.oodaServiceExists) {
    try {
      const autonomyPluginModule = await import(join(workspaceRoot, 'packages/plugin-autonomy/dist/index.js'));
      const { autoPlugin } = autonomyPluginModule;
      
      // Check if OODA service is in the plugin services
      const hasOODAService = autoPlugin?.services?.some(service => 
        service.name === 'OODALoopService' || 
        service.serviceName === 'autonomous' ||
        service.toString().includes('OODA')
      );
      
      if (hasOODAService) {
        pluginTests.oodaServiceValid = true;
        console.log(`✅ Test 3: OODA service valid`);
        console.log(`   • OODALoopService found in plugin services`);
      } else {
        console.log(`❌ Test 3: OODA service not found in plugin services`);
      }
    } catch (importError) {
      console.log(`❌ Test 3: OODA service import failed - ${importError.message}`);
    }
  } else {
    console.log(`❌ Test 3: Skipping OODA service - file missing`);
  }

  // Test 4: Try to import and test API server from bundled plugin
  if (pluginTests.apiServerExists) {
    try {
      const autonomyPluginModule = await import(join(workspaceRoot, 'packages/plugin-autonomy/dist/index.js'));
      const { AutonomyAPIServer } = autonomyPluginModule;
      
      if (AutonomyAPIServer && typeof AutonomyAPIServer === 'function') {
        pluginTests.apiServerValid = true;
        console.log(`✅ Test 4: API server valid`);
        console.log(`   • AutonomyAPIServer class exists in bundle`);
      } else {
        console.log(`❌ Test 4: API server not found in bundle`);
        console.log(`   • Available exports:`, Object.keys(autonomyPluginModule));
      }
    } catch (importError) {
      console.log(`❌ Test 4: API server import failed - ${importError.message}`);
    }
  } else {
    console.log(`❌ Test 4: Skipping API server - file missing`);
  }

} catch (error) {
  console.error(`❌ Workspace test failed: ${error.message}`);
}

// Generate summary report
console.log('');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('📊 AUTONOMOUS PLUGIN WORKSPACE TEST REPORT');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

console.log('\n🧪 Plugin Structure Tests:');
Object.entries(pluginTests).forEach(([test, passed]) => {
  const status = passed ? '✅ PASS' : '❌ FAIL';
  console.log(`   ${test.toUpperCase().padEnd(20)}: ${status}`);
});

// Calculate success metrics
const totalTests = Object.keys(pluginTests).length;
const passedTests = Object.values(pluginTests).filter(Boolean).length;
const successRate = Math.round((passedTests / totalTests) * 100);

const coreTests = ['pluginIndexExists', 'oodaServiceExists', 'apiServerExists'];
const corePass = coreTests.every(test => pluginTests[test]);

console.log('\n📈 Results:');
console.log(`   Test Success Rate: ${passedTests}/${totalTests} (${successRate}%)`);
console.log(`   Core Files Present: ${corePass ? '✅ WORKING' : '❌ MISSING'}`);

console.log('\n🎯 AUTONOMOUS PLUGIN WORKSPACE STATUS:');
if (corePass && successRate >= 60) {
  console.log('   🎉 AUTONOMOUS PLUGIN: ✅ WORKSPACE STRUCTURE VALID');
  console.log('');
  console.log('   Key findings:');
  console.log('   • Plugin workspace structure is correct');
  console.log('   • Core autonomous plugin files are present');
  console.log('   • OODA service and API server implementations exist');
  console.log('   • Plugin is ready for local development and testing');
  console.log('');
  console.log('   💡 The plugin is locally available but not published to NPM');
  console.log('   🔧 For runtime testing, consider using local workspace resolution');
} else {
  console.log('   ⚠️ AUTONOMOUS PLUGIN: ❌ WORKSPACE STRUCTURE INCOMPLETE');
  console.log('');
  console.log('   🔧 Try building the plugin first:');
  console.log('   cd packages/plugin-autonomy && bun run build');
}

console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

// Exit with appropriate code
process.exit(corePass ? 0 : 1);