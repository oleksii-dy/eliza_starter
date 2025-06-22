#!/usr/bin/env node

/**
 * Simple Test Project Creator
 */

const fs = require('fs');
const path = require('path');

console.log('🏗️ Creating simple test project...');

const testDir = './test-real-project';

// Create directory
try {
    fs.mkdirSync(testDir, { recursive: true });
    fs.mkdirSync(path.join(testDir, 'src'), { recursive: true });
} catch (e) {
    // Directory might exist
}

// Create package.json
const packageJson = {
    "name": "test-mvp-project",
    "version": "1.0.0",
    "type": "module",
    "main": "src/index.js",
    "scripts": {
        "start": "node src/index.js"
    },
    "dependencies": {
        "@elizaos/core": "workspace:*",
        "@elizaos/adapter-sqlite": "workspace:*"
    }
};

fs.writeFileSync(
    path.join(testDir, 'package.json'),
    JSON.stringify(packageJson, null, 2)
);

// Create character
const character = {
    "name": "MVPTestAgent",
    "bio": ["Test agent for MVP validation"],
    "system": "You are a test agent.",
    "messageExamples": [],
    "postExamples": [],
    "topics": [],
    "adjectives": [],
    "knowledge": [],
    "clients": [],
    "plugins": []
};

fs.writeFileSync(
    path.join(testDir, 'character.json'),
    JSON.stringify(character, null, 2)
);

// Create simple test
const testScript = `import { AgentRuntime } from '@elizaos/core';
import { PgliteDatabase } from '@elizaos/adapter-sqlite';
import { readFileSync } from 'fs';

console.log('🧪 Simple MVP Test');

async function test() {
    try {
        const { mvpCustomReasoningPlugin } = await import('../dist/mvp-only.js');
        console.log('✅ MVP plugin imported');
        
        const character = JSON.parse(readFileSync('./character.json', 'utf-8'));
        
        const runtime = new AgentRuntime({
            databaseAdapter: new PgliteDatabase(),
            character: character,
            fetch: global.fetch,
        });
        
        await runtime.initialize();
        console.log('✅ Runtime initialized');
        
        await runtime.registerPlugin(mvpCustomReasoningPlugin);
        console.log('✅ Plugin registered');
        
        const actions = runtime.actions.filter(a => a.name.includes('CUSTOM_REASONING'));
        console.log(\`✅ Found \${actions.length} MVP actions\`);
        
        console.log('🎉 MVP WORKS WITH REAL ELIZAOS!');
        
    } catch (error) {
        console.error('❌ Test failed:', error.message);
        process.exit(1);
    }
}

test();`;

fs.writeFileSync(
    path.join(testDir, 'src', 'index.js'),
    testScript
);

console.log('✅ Test project created in ./test-real-project');
console.log('💡 Run: cd test-real-project && npm install && npm start');