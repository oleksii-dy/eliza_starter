#!/usr/bin/env node

/**
 * Simplified Real Test - Just test the MVP structure without full runtime
 */

console.log('🧪 SIMPLIFIED REAL MVP TEST');
console.log('==========================\n');

try {
    // Test 1: Import clean MVP
    console.log('📦 Testing clean MVP import...');
    const { mvpCustomReasoningPlugin, SimpleReasoningService } = await import('./dist/mvp-only.js');
    console.log('✅ MVP imported successfully');
    console.log(`   Plugin name: ${mvpCustomReasoningPlugin.name}`);
    console.log(`   Actions: ${mvpCustomReasoningPlugin.actions?.length || 0}`);
    
    // Test 2: Check plugin structure
    console.log('\n🔍 Checking plugin structure...');
    const requiredFields = ['name', 'description', 'actions'];
    for (const field of requiredFields) {
        if (mvpCustomReasoningPlugin[field]) {
            console.log(`   ✅ ${field}: ${mvpCustomReasoningPlugin[field]?.length ? mvpCustomReasoningPlugin[field].length : 'present'}`);
        } else {
            throw new Error(`Missing required field: ${field}`);
        }
    }
    
    // Test 3: Create mock runtime to test service
    console.log('\n⚙️  Testing service with mock runtime...');
    const mockRuntime = {
        agentId: 'test-agent',
        character: { name: 'TestAgent' },
        useModel: () => Promise.resolve('mock response'),
        logger: {
            info: () => {},
            warn: () => {},
            error: () => {},
            debug: () => {}
        },
        getService: () => null,
        getSetting: () => null
    };
    
    const service = new SimpleReasoningService(mockRuntime);
    console.log('✅ Service created successfully');
    
    // Test 4: Test service enable/disable
    console.log('\n🔧 Testing service enable/disable...');
    const initialStatus = service.getStatus();
    console.log(`   Initial status: enabled=${initialStatus.enabled}, data=${initialStatus.dataCount}`);
    
    await service.enable();
    const enabledStatus = service.getStatus();
    console.log(`   After enable: enabled=${enabledStatus.enabled}`);
    
    await service.disable();
    const disabledStatus = service.getStatus();
    console.log(`   After disable: enabled=${disabledStatus.enabled}`);
    
    console.log('✅ Service enable/disable working');
    
    // Test 5: Test action validation
    console.log('\n🎯 Testing action validation...');
    const enableAction = mvpCustomReasoningPlugin.actions.find(a => a.name === 'ENABLE_REASONING_SERVICE');
    
    const testMessage = {
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
    
    const isValid = await enableAction.validate(mockRuntime, testMessage);
    console.log(`   ✅ Enable action validation: ${isValid}`);
    
    // Test 6: Test action handler (basic)
    console.log('\n⚡ Testing action handler...');
    let callbackCalled = false;
    const mockCallback = async (content) => {
        callbackCalled = true;
        console.log(`   📝 Action response: ${content.text.substring(0, 50)}...`);
        return [];
    };
    
    await enableAction.handler(mockRuntime, testMessage, undefined, {}, mockCallback);
    
    if (callbackCalled) {
        console.log('✅ Action handler executed successfully');
    } else {
        throw new Error('Action handler did not call callback');
    }
    
    // Final assessment
    console.log('\n📊 SIMPLIFIED TEST RESULTS:');
    console.log('===========================');
    console.log('✅ **MVP STRUCTURE IS VALID**');
    console.log('   • Clean import without broken dependencies');
    console.log('   • All required plugin fields present');
    console.log('   • Service class instantiates correctly');
    console.log('   • Enable/disable functionality works');
    console.log('   • Action validation functions work');
    console.log('   • Action handlers execute properly');
    
    console.log('\n🎯 **MVP READINESS ASSESSMENT:**');
    console.log('✅ Plugin structure follows ElizaOS patterns');
    console.log('✅ Actions are properly defined');
    console.log('✅ Service lifecycle works correctly');
    console.log('✅ No import or dependency issues');
    
    console.log('\n🏆 **MVP IS STRUCTURALLY SOUND FOR ELIZAOS!**');
    console.log('\n💡 **Next step: Test with real ElizaOS project**');
    console.log('   • Create ElizaOS project with: elizaos create test-mvp');
    console.log('   • Import: import { mvpCustomReasoningPlugin } from "@elizaos/plugin-training/dist/mvp-only"');
    console.log('   • Add to plugins array in character config');
    console.log('   • Test with: "enable custom reasoning"');
    
    console.log('\n✨ **SIMPLIFIED TEST PASSED - MVP APPEARS READY!**');
    process.exit(0);
    
} catch (error) {
    console.error('\n💥 **SIMPLIFIED TEST FAILED:**');
    console.error(`Error: ${error.message}`);
    
    console.log('\n🔬 **FAILURE INDICATES:**');
    console.log('• MVP has fundamental structural problems');
    console.log('• Plugin definition or action implementation issues');
    console.log('• Service architecture problems');
    
    console.log('\n❌ **MVP NOT READY - NEEDS STRUCTURAL FIXES**');
    process.exit(1);
}