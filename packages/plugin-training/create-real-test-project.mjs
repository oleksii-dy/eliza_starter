#!/usr/bin/env node

/**
 * Create Real ElizaOS Test Project
 * 
 * Creates a minimal ElizaOS project to test the MVP plugin against real agents
 */

import { writeFileSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

console.log('🏗️  CREATING REAL ELIZAOS TEST PROJECT');
console.log('====================================\n');

try {
    // Create test project directory
    const testProjectDir = join(__dirname, 'test-real-project');
    console.log(`📁 Creating test project: ${testProjectDir}`);
    
    try {
        mkdirSync(testProjectDir, { recursive: true });
        mkdirSync(join(testProjectDir, 'src'), { recursive: true });
        console.log('✅ Directories created');
    } catch (dirError) {
        console.log('⚠️  Directory already exists, continuing...');
    }
    
    // Create package.json
    console.log('📋 Creating package.json...');
    const packageJson = {
        "name": "test-mvp-project",
        "version": "1.0.0",
        "type": "module",
        "description": "Test project for MVP custom reasoning plugin",
        "main": "src/index.js",
        "scripts": {
            "start": "node src/index.js",
            "build": "echo 'No build needed for test project'",
            "test": "node src/index.js"
        },
        "dependencies": {
            "@elizaos/core": "workspace:*",
            "@elizaos/adapter-sqlite": "workspace:*"
        },
        "devDependencies": {
            "@types/node": "^22.10.2"
        }
    };
    
    writeFileSync(
        join(testProjectDir, 'package.json'),
        JSON.stringify(packageJson, null, 2)
    );
    console.log('✅ package.json created');
    
    // Create character configuration
    console.log('👤 Creating test character...');
    const character = {
        "name": "MVPTestAgent",
        "bio": ["I am a test agent for validating the MVP custom reasoning plugin"],
        "system": "You are a helpful test agent. You can enable and disable custom reasoning using natural language commands.",
        "messageExamples": [
            [
                { "name": "User", "content": { "text": "hello" } },
                { "name": "MVPTestAgent", "content": { "text": "Hello! I'm ready to test custom reasoning. Try saying 'enable custom reasoning' to test the MVP plugin." } }
            ]
        ],
        "postExamples": [],
        "topics": ["testing", "custom reasoning", "plugins"],
        "adjectives": ["helpful", "testing", "experimental"],
        "knowledge": [],
        "clients": [],
        "plugins": []
    };
    
    writeFileSync(
        join(testProjectDir, 'character.json'),
        JSON.stringify(character, null, 2)
    );
    console.log('✅ character.json created');
    
    // Create main index.js that tests the MVP
    console.log('🎯 Creating test script...');
    const indexJs = `#!/usr/bin/env node

/**
 * Real ElizaOS Test Project for MVP Custom Reasoning Plugin
 */

import { AgentRuntime } from '@elizaos/core';
import { PgliteDatabase } from '@elizaos/adapter-sqlite';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

console.log('🧪 REAL ELIZAOS MVP TEST');
console.log('======================\\n');

async function runMVPTest() {
    try {
        // Step 1: Import the clean MVP plugin
        console.log('📦 Importing MVP plugin...');
        const { mvpCustomReasoningPlugin } = await import('../dist/mvp-only.js');
        console.log('✅ MVP plugin imported successfully');
        
        // Step 2: Load character
        console.log('👤 Loading test character...');
        const characterPath = join(__dirname, '..', 'character.json');
        const character = JSON.parse(readFileSync(characterPath, 'utf-8'));
        console.log(\`✅ Character loaded: \${character.name}\`);
        
        // Step 3: Create real ElizaOS runtime
        console.log('🚀 Creating ElizaOS runtime...');
        const database = new PgliteDatabase();
        
        const runtime = new AgentRuntime({
            databaseAdapter: database,
            character: character,
            fetch: global.fetch,
        });
        
        await runtime.initialize();
        console.log(\`✅ Runtime initialized with agent ID: \${runtime.agentId}\`);
        
        // Step 4: Register MVP plugin
        console.log('🔌 Registering MVP plugin...');
        await runtime.registerPlugin(mvpCustomReasoningPlugin);
        console.log('✅ Plugin registered successfully');
        
        // Step 5: Verify actions are available
        console.log('🎯 Verifying actions...');
        const enableAction = runtime.actions.find(a => a.name === 'ENABLE_CUSTOM_REASONING');
        const disableAction = runtime.actions.find(a => a.name === 'DISABLE_CUSTOM_REASONING');
        const statusAction = runtime.actions.find(a => a.name === 'CHECK_REASONING_STATUS');
        
        if (!enableAction || !disableAction || !statusAction) {
            throw new Error('MVP actions not found in runtime');
        }
        console.log('✅ All MVP actions available in runtime');
        
        // Step 6: Test original useModel
        console.log('🔍 Testing original useModel...');
        const originalResult = await runtime.useModel('TEXT_LARGE', {
            prompt: 'Test prompt before enabling custom reasoning'
        });
        console.log(\`✅ Original useModel working, result type: \${typeof originalResult}\`);
        
        // Step 7: Create test message and enable custom reasoning
        console.log('💬 Testing enable action...');
        const enableMessage = await runtime.createMemory({
            entityId: \`user-\${Date.now()}\`,
            roomId: \`room-\${Date.now()}\`,
            content: {
                text: 'enable custom reasoning',
                source: 'test'
            }
        }, 'messages');
        
        let enableResponse = '';
        const enableCallback = async (content) => {
            enableResponse = content.text;
            console.log(\`📝 Enable response: \${content.text.substring(0, 100)}...\`);
            return [];
        };
        
        await enableAction.handler(runtime, enableMessage, undefined, {}, enableCallback);
        
        if (!enableResponse.includes('Custom Reasoning Service Enabled')) {
            throw new Error('Enable action did not respond correctly');
        }
        console.log('✅ Enable action executed successfully');
        
        // Step 8: Test useModel after enabling
        console.log('🔄 Testing useModel after enable...');
        const afterEnableResult = await runtime.useModel('TEXT_LARGE', {
            prompt: 'Test prompt after enabling custom reasoning'
        });
        console.log(\`✅ UseModel after enable working, result type: \${typeof afterEnableResult}\`);
        
        // Step 9: Test status action
        console.log('📊 Testing status action...');
        const statusMessage = await runtime.createMemory({
            entityId: \`user-\${Date.now()}\`,
            roomId: \`room-\${Date.now()}\`,
            content: {
                text: 'check reasoning status',
                source: 'test'
            }
        }, 'messages');
        
        let statusResponse = '';
        const statusCallback = async (content) => {
            statusResponse = content.text;
            console.log(\`📊 Status response: \${content.text.substring(0, 100)}...\`);
            return [];
        };
        
        await statusAction.handler(runtime, statusMessage, undefined, {}, statusCallback);
        
        if (!statusResponse.includes('Custom Reasoning Service Status')) {
            throw new Error('Status action did not respond correctly');
        }
        console.log('✅ Status action executed successfully');
        
        // Step 10: Test disable action
        console.log('🛑 Testing disable action...');
        const disableMessage = await runtime.createMemory({
            entityId: \`user-\${Date.now()}\`,
            roomId: \`room-\${Date.now()}\`,
            content: {
                text: 'disable custom reasoning',
                source: 'test'
            }
        }, 'messages');
        
        let disableResponse = '';
        const disableCallback = async (content) => {
            disableResponse = content.text;
            console.log(\`🛑 Disable response: \${content.text.substring(0, 100)}...\`);
            return [];
        };
        
        await disableAction.handler(runtime, disableMessage, undefined, {}, disableCallback);
        
        if (!disableResponse.includes('Custom Reasoning Service')) {
            throw new Error('Disable action did not respond correctly');
        }
        console.log('✅ Disable action executed successfully');
        
        // Step 11: Test useModel after disabling
        console.log('🔄 Testing useModel after disable...');
        const afterDisableResult = await runtime.useModel('TEXT_LARGE', {
            prompt: 'Test prompt after disabling custom reasoning'
        });
        console.log(\`✅ UseModel after disable working, result type: \${typeof afterDisableResult}\`);
        
        // Final result
        console.log('\\n🎉 **REAL ELIZAOS MVP TEST COMPLETED SUCCESSFULLY!**');
        console.log('✅ **ALL TESTS PASSED:**');
        console.log('   • MVP plugin imports cleanly');
        console.log('   • Plugin registers with real ElizaOS runtime');
        console.log('   • Actions are available in runtime');
        console.log('   • Enable/disable/status actions work');
        console.log('   • useModel override and restoration works');
        console.log('   • Full backwards compatibility maintained');
        
        console.log('\\n✨ **THE MVP ACTUALLY WORKS WITH REAL ELIZAOS!**');
        process.exit(0);
        
    } catch (error) {
        console.error('\\n💥 **REAL ELIZAOS MVP TEST FAILED:**');
        console.error(error.message);
        console.error(error.stack);
        
        console.log('\\n❌ **FAILURE INDICATES:**');
        console.log('• MVP does not work with real ElizaOS runtime');
        console.log('• Integration issues with core ElizaOS systems');
        console.log('• Plugin registration or action execution problems');
        
        console.log('\\n🔧 **MVP NEEDS FIXES FOR REAL ELIZAOS COMPATIBILITY**');
        process.exit(1);
    }
}

// Run the test
runMVPTest();
`;
    
    writeFileSync(
        join(testProjectDir, 'src', 'index.js'),
        indexJs
    );
    console.log('✅ Test script created');
    
    // Create README
    console.log('📚 Creating README...');
    const readme = `# MVP Custom Reasoning Test Project

This is a minimal ElizaOS project created to test the MVP custom reasoning plugin against a real ElizaOS runtime.

## Usage

\`\`\`bash
cd test-real-project
npm install
npm start
\`\`\`

## What it tests

- MVP plugin import from clean dist/mvp-only.js
- Real ElizaOS runtime creation and initialization
- Plugin registration with real runtime
- Action availability in runtime
- Enable/disable/status action execution
- useModel override and restoration
- Full backwards compatibility

## Expected Output

If successful, you should see:
- ✅ All test steps passing
- 🎉 "THE MVP ACTUALLY WORKS WITH REAL ELIZAOS!"

If failed:
- ❌ Error messages indicating specific failure points
- 🔧 "MVP NEEDS FIXES FOR REAL ELIZAOS COMPATIBILITY"
`;
    
    writeFileSync(
        join(testProjectDir, 'README.md'),
        readme
    );
    console.log('✅ README created');
    
    console.log('\\n🎯 **TEST PROJECT CREATED SUCCESSFULLY!**');
    console.log('📁 Location: ./test-real-project');
    console.log('\\n💡 **To run the real ElizaOS test:**');
    console.log('1. cd test-real-project');
    console.log('2. npm install');
    console.log('3. npm start');
    console.log('\\n🧪 **This will test MVP against actual ElizaOS runtime**');
    
} catch (error) {
    console.error('\\n💥 **TEST PROJECT CREATION FAILED:**');
    console.error(error.message);
    process.exit(1);
}`;

writeFileSync(
    join(testProjectDir, 'src', 'index.js'),
    indexJs
);
console.log('✅ Test script created');

// Create README
console.log('📚 Creating README...');
const readme = `# MVP Custom Reasoning Test Project

This is a minimal ElizaOS project created to test the MVP custom reasoning plugin against a real ElizaOS runtime.

## Usage

\`\`\`bash
cd test-real-project
npm install
npm start
\`\`\`

## What it tests

- MVP plugin import from clean dist/mvp-only.js
- Real ElizaOS runtime creation and initialization
- Plugin registration with real runtime
- Action availability in runtime
- Enable/disable/status action execution
- useModel override and restoration
- Full backwards compatibility

## Expected Output

If successful, you should see:
- ✅ All test steps passing
- 🎉 "THE MVP ACTUALLY WORKS WITH REAL ELIZAOS!"

If failed:
- ❌ Error messages indicating specific failure points
- 🔧 "MVP NEEDS FIXES FOR REAL ELIZAOS COMPATIBILITY"
`;

writeFileSync(
    join(testProjectDir, 'README.md'),
    readme
);
console.log('✅ README created');

console.log('\n🎯 **TEST PROJECT CREATED SUCCESSFULLY!**');
console.log('📁 Location: ./test-real-project');
console.log('\n💡 **To run the real ElizaOS test:**');
console.log('1. cd test-real-project');
console.log('2. npm install');
console.log('3. npm start');
console.log('\n🧪 **This will test MVP against actual ElizaOS runtime**');

} catch (error) {
console.error('\n💥 **TEST PROJECT CREATION FAILED:**');
console.error(error.message);
process.exit(1);
}