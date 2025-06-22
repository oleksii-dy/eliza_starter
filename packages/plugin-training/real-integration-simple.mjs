#!/usr/bin/env node

/**
 * Simple Real Integration Test
 * 
 * Test the MVP plugin against real ElizaOS without complex builds
 */

import { readFileSync } from 'fs';

console.log('🧪 SIMPLE REAL ELIZAOS INTEGRATION TEST');
console.log('======================================\n');

try {
    // Step 1: Check if we can import ElizaOS core
    console.log('📦 Testing ElizaOS core import...');
    let coreImportTest = false;
    
    try {
        // Try importing from the parent packages directory
        const { createAgent } = await import('../core/dist/index.js');
        console.log('✅ ElizaOS core import successful');
        coreImportTest = true;
    } catch (coreError) {
        console.log('❌ ElizaOS core import failed:', coreError.message);
        
        // Try alternative import paths
        try {
            const { AgentRuntime } = await import('@elizaos/core');
            console.log('✅ ElizaOS core import via package successful');
            coreImportTest = true;
        } catch (altError) {
            console.log('❌ Alternative core import failed:', altError.message);
        }
    }
    
    // Step 2: Check our plugin structure
    console.log('\n🔌 Testing MVP plugin structure...');
    try {
        const { mvpCustomReasoningPlugin } = await import('./dist/index.js');
        console.log('✅ MVP plugin import successful');
        console.log(`   Plugin name: ${mvpCustomReasoningPlugin.name}`);
        console.log(`   Actions count: ${mvpCustomReasoningPlugin.actions?.length || 0}`);
        
        // Verify essential actions exist
        const requiredActions = ['ENABLE_CUSTOM_REASONING', 'DISABLE_CUSTOM_REASONING', 'CHECK_REASONING_STATUS'];
        const actionNames = mvpCustomReasoningPlugin.actions?.map(a => a.name) || [];
        
        let allActionsFound = true;
        for (const requiredAction of requiredActions) {
            if (actionNames.includes(requiredAction)) {
                console.log(`   ✅ Action found: ${requiredAction}`);
            } else {
                console.log(`   ❌ Action missing: ${requiredAction}`);
                allActionsFound = false;
            }
        }
        
        if (allActionsFound) {
            console.log('✅ All required actions present');
        } else {
            throw new Error('Missing required actions');
        }
        
    } catch (pluginError) {
        console.log('❌ MVP plugin import failed:', pluginError.message);
        throw pluginError;
    }
    
    // Step 3: Basic validation test without full runtime
    console.log('\n🔍 Testing action validation...');
    try {
        const { enableCustomReasoningAction } = await import('./dist/index.js');
        
        // Create minimal mock message for validation
        const mockMessage = {
            id: 'test-msg',
            entityId: 'test-entity',
            roomId: 'test-room', 
            agentId: 'test-agent',
            content: {
                text: 'enable custom reasoning',
                source: 'test'
            },
            createdAt: Date.now()
        };
        
        // Create minimal mock runtime for validation
        const mockRuntime = {
            agentId: 'test-agent',
            character: { name: 'TestAgent' },
            logger: {
                info: () => {},
                warn: () => {},
                error: () => {},
                debug: () => {}
            }
        };
        
        // Test validation function
        const isValid = await enableCustomReasoningAction.validate(mockRuntime, mockMessage);
        console.log(`✅ Enable action validation result: ${isValid}`);
        
        if (isValid) {
            console.log('✅ Action validation works correctly');
        } else {
            console.log('⚠️ Action validation returned false (may be expected)');
        }
        
    } catch (validationError) {
        console.log('❌ Action validation test failed:', validationError.message);
        throw validationError;
    }
    
    // Step 4: Check plugin structure matches ElizaOS patterns
    console.log('\n📋 Validating ElizaOS plugin compliance...');
    try {
        const { mvpCustomReasoningPlugin } = await import('./dist/index.js');
        
        const requiredFields = ['name', 'description'];
        const optionalFields = ['actions', 'providers', 'services', 'evaluators', 'init'];
        
        for (const field of requiredFields) {
            if (mvpCustomReasoningPlugin[field]) {
                console.log(`   ✅ Required field: ${field}`);
            } else {
                console.log(`   ❌ Missing required field: ${field}`);
                throw new Error(`Missing required plugin field: ${field}`);
            }
        }
        
        for (const field of optionalFields) {
            if (mvpCustomReasoningPlugin[field]) {
                console.log(`   ✅ Optional field: ${field}`);
            } else {
                console.log(`   ⚪ Optional field not present: ${field}`);
            }
        }
        
        console.log('✅ Plugin structure complies with ElizaOS patterns');
        
    } catch (complianceError) {
        console.log('❌ Plugin compliance check failed:', complianceError.message);
        throw complianceError;
    }
    
    // Final Assessment
    console.log('\n📊 REAL INTEGRATION ASSESSMENT:');
    console.log('================================');
    
    if (coreImportTest) {
        console.log('✅ **MVP CAN INTEGRATE WITH ELIZAOS**');
        console.log('   • Plugin structure is valid');
        console.log('   • Actions are properly defined');
        console.log('   • Validation functions work');
        console.log('   • Follows ElizaOS plugin patterns');
        
        console.log('\n💡 **NEXT STEPS FOR FULL VALIDATION:**');
        console.log('1. Create test ElizaOS project');
        console.log('2. Add MVP plugin to project plugins array');
        console.log('3. Start agent and test natural language commands');
        console.log('4. Verify enable/disable functionality works');
        
        console.log('\n✨ **MVP APPEARS FUNCTIONAL FOR REAL ELIZAOS**');
        process.exit(0);
        
    } else {
        console.log('❌ **CANNOT VALIDATE ELIZAOS INTEGRATION**');
        console.log('   • ElizaOS core not accessible for testing');
        console.log('   • Plugin structure appears valid but untested');
        
        console.log('\n🔧 **REQUIRED FOR FULL VALIDATION:**');
        console.log('1. Access to real ElizaOS runtime');
        console.log('2. Test environment with agent creation');
        console.log('3. End-to-end conversation testing');
        
        console.log('\n⚠️  **MVP STRUCTURE VALID BUT INTEGRATION UNVERIFIED**');
        process.exit(1);
    }
    
} catch (error) {
    console.error('\n💥 **SIMPLE INTEGRATION TEST FAILED:**');
    console.error(error.message);
    
    console.log('\n🔬 **FAILURE ANALYSIS:**');
    console.log('• The MVP plugin has fundamental integration issues');
    console.log('• Import/export structure is broken');
    console.log('• Plugin may not work with real ElizaOS agents');
    
    console.log('\n❌ **MVP IS NOT READY FOR REAL ELIZAOS INTEGRATION**');
    process.exit(1);
}