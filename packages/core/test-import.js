#!/usr/bin/env node

// Test importing from the core package to see exact error
import { createRequire } from 'module';
import { fileURLToPath } from 'url';
import path from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const require = createRequire(import.meta.url);

try {
    console.log('Testing TypeScript module resolution...');
    
    // Try to load the package using Node's resolution
    console.log('Attempting to import the dist/index.d.ts...');
    
    // Test direct import
    console.log('Testing direct path resolution...');
    const indexPath = path.join(__dirname, 'dist', 'index.d.ts');
    console.log('Index path:', indexPath);
    
    import(indexPath).then(() => {
        console.log('Success: Direct import worked');
    }).catch(err => {
        console.log('Direct import failed:', err.message);
        
        // Try using require
        console.log('Trying with require...');
        try {
            require('./dist/index.d.ts');
            console.log('Success: require worked');
        } catch (reqErr) {
            console.log('Require failed:', reqErr.message);
        }
    });
    
} catch (error) {
    console.log('Import error:', error.message);
    console.log('Stack:', error.stack);
}