#!/usr/bin/env node

/**
 * Real Integration Test Runner
 * 
 * Tests the MVP against actual ElizaOS runtime to prove it works
 */

const { execSync } = require('child_process');
const path = require('path');

console.log('🧪 REAL ELIZAOS INTEGRATION TEST RUNNER');
console.log('=======================================\n');

console.log('📋 This test validates MVP against REAL ElizaOS runtime...\n');

try {
    // First build the project to ensure TypeScript compiles
    console.log('🔨 Building project...');
    execSync('npm run build', { 
        encoding: 'utf-8', 
        stdio: 'pipe',
        cwd: process.cwd()
    });
    console.log('✅ Build successful\n');
    
    // Run the real integration test
    console.log('🚀 Running real integration test...');
    
    const testCode = `
        import { runRealIntegrationTest } from './dist/real-test/real-eliza-test.js';
        
        runRealIntegrationTest()
            .then(() => {
                console.log('\\n✨ Real integration test completed');
                process.exit(0);
            })
            .catch((error) => {
                console.error('\\n💥 Real integration test failed:', error);
                process.exit(1);
            });
    `;
    
    // Write test script
    require('fs').writeFileSync('temp-real-test.mjs', testCode);
    
    // Execute the test
    const output = execSync('node temp-real-test.mjs', {
        encoding: 'utf-8',
        stdio: 'pipe',
        cwd: process.cwd(),
        timeout: 60000 // 1 minute timeout
    });
    
    console.log(output);
    
    // Clean up
    try {
        require('fs').unlinkSync('temp-real-test.mjs');
    } catch (e) {
        // Ignore cleanup errors
    }
    
    if (output.includes('MVP SUCCESSFULLY INTEGRATES')) {
        console.log('\n🎉 **REAL INTEGRATION SUCCESS!**');
        console.log('The MVP actually works with real ElizaOS!');
        process.exit(0);
    } else {
        console.log('\n💥 **REAL INTEGRATION FAILED!**');
        console.log('The MVP does not work with real ElizaOS.');
        process.exit(1);
    }
    
} catch (error) {
    console.error('\n❌ **REAL INTEGRATION TEST ERROR:**');
    console.error(error.stdout || error.message);
    
    // Clean up on error
    try {
        require('fs').unlinkSync('temp-real-test.mjs');
    } catch (e) {
        // Ignore cleanup errors
    }
    
    console.log('\n📊 **DIAGNOSIS:**');
    if (error.message.includes('Cannot find module')) {
        console.log('• Import/export issues - files not properly built or exported');
    }
    if (error.message.includes('AgentRuntime')) {
        console.log('• ElizaOS core integration issue - runtime creation failed');  
    }
    if (error.message.includes('timeout')) {
        console.log('• Test took too long - possible infinite loop or deadlock');
    }
    
    console.log('\n💡 **NEXT STEPS:**');
    console.log('1. Fix the identified issues');
    console.log('2. Ensure proper ElizaOS core integration');
    console.log('3. Test individual components in isolation');
    console.log('4. Verify all imports and exports work correctly');
    
    process.exit(1);
}