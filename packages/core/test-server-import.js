#!/usr/bin/env node

/**
 * Test script to simulate how the server package imports from @elizaos/core
 */

import { createRequire } from 'module';

const require = createRequire(import.meta.url);

try {
    console.log('Testing server package style import...');
    
    // Simulate what the server package does
    console.log('1. Testing import with TypeScript module resolution...');
    
    // Try importing via TypeScript-style import
    const importPromise = import('@elizaos/core').then(coreModule => {
        console.log('✅ Success: @elizaos/core imported successfully');
        console.log('Available exports:', Object.keys(coreModule).slice(0, 10) + '...');
        
        // Test specific imports that server might need
        if (coreModule.Character) {
            console.log('✅ Character type available');
        } else {
            console.log('❌ Character type missing');
        }
        
        if (coreModule.createLogger) {
            console.log('✅ createLogger function available');
        } else {
            console.log('❌ createLogger function missing');
        }
        
        if (coreModule.IAgentRuntime) {
            console.log('✅ IAgentRuntime interface available');
        } else {
            console.log('❌ IAgentRuntime interface missing');
        }
        
    }).catch(err => {
        console.log('❌ Import failed:', err.message);
        
        // Try alternative import path
        console.log('2. Testing direct package path...');
        return import('./dist/index.js').then(coreModule => {
            console.log('✅ Success: Direct import worked');
            console.log('Available exports:', Object.keys(coreModule).slice(0, 10) + '...');
        }).catch(err2 => {
            console.log('❌ Direct import also failed:', err2.message);
        });
    });
    
    await importPromise;
    
} catch (error) {
    console.log('❌ Critical error:', error.message);
}