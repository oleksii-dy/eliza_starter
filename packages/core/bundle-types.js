#!/usr/bin/env node

/**
 * Script to bundle all TypeScript declaration files into a single index.d.ts
 * This solves the issue where relative imports in .d.ts files can't be resolved by Node.js
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configure paths
const distDir = path.join(__dirname, 'dist');
const typesDir = path.join(distDir, 'types');
const outputFile = path.join(distDir, 'index.d.ts');

// Get all .d.ts files in the types directory
function getAllTypeFiles(dir) {
    const files = [];
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    
    for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        if (entry.isDirectory()) {
            files.push(...getAllTypeFiles(fullPath));
        } else if (entry.isFile() && entry.name.endsWith('.d.ts')) {
            files.push(fullPath);
        }
    }
    
    return files;
}

// Read and process a .d.ts file
function processTypeFile(filePath) {
    const content = fs.readFileSync(filePath, 'utf8');
    const relativePath = path.relative(typesDir, filePath);
    
    console.log(`Processing ${relativePath}...`);
    
    // Remove import statements and export * from statements
    // Keep only actual type definitions and direct exports
    const lines = content.split('\n');
    const processedLines = [];
    const deferredExports = [];
    
    let hasContentAfterImports = false;
    
    for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        
        // Skip empty lines at the start
        if (!line && !hasContentAfterImports) continue;
        
        // Skip import statements
        if (line.startsWith('import ')) {
            continue;
        }
        
        // Skip export * from statements
        if (line.startsWith('export * from ')) {
            continue;
        }
        
        // Handle standalone export statements (like export { WalletCapability })
        if (line.startsWith('export {') && line.includes('}')) {
            // Extract the export items and defer them
            const exportMatch = line.match(/export\s*{([^}]+)}/);
            if (exportMatch) {
                deferredExports.push(line);
                continue;
            }
        }
        
        // We've found actual content
        if (line) {
            hasContentAfterImports = true;
        }
        
        // Keep everything else
        processedLines.push(lines[i]);
    }
    
    // Add a comment to identify the source file
    if (processedLines.some(line => line.trim()) || deferredExports.length > 0) {
        const result = [
            `// Types from ${relativePath}`,
            ...processedLines,
            ''
        ];
        
        // Add deferred exports at the end
        if (deferredExports.length > 0) {
            result.push('// Deferred exports from ' + relativePath);
            result.push(...deferredExports);
            result.push('');
        }
        
        return result.join('\n');
    }
    
    return '';
}

// Get all the other .d.ts files that need to be included
function getOtherTypeFiles(distDir) {
    const files = [];
    const entries = fs.readdirSync(distDir, { withFileTypes: true });
    
    const skipDirs = ['types', 'node_modules', '__tests__', 'test-utils', 'test_resources'];
    const includeFiles = [
        'actions.d.ts',
        'database.d.ts', 
        'entities.d.ts',
        'logger.d.ts',
        'prompts.d.ts',
        'roles.d.ts',
        'runtime.d.ts',
        'settings.d.ts',
        'services.d.ts',
        'utils.d.ts',
        'planning.d.ts',
        'search.d.ts'
    ];
    
    for (const entry of entries) {
        const fullPath = path.join(distDir, entry.name);
        
        if (entry.isDirectory() && !skipDirs.includes(entry.name)) {
            // Check for index.d.ts in subdirectories
            const indexPath = path.join(fullPath, 'index.d.ts');
            if (fs.existsSync(indexPath)) {
                files.push(indexPath);
            }
        } else if (entry.isFile() && includeFiles.includes(entry.name)) {
            files.push(fullPath);
        }
    }
    
    return files;
}

function main() {
    console.log('Bundling TypeScript declaration files...');
    
    // Collect all type files
    const typeFiles = getAllTypeFiles(typesDir);
    const otherFiles = getOtherTypeFiles(distDir);
    const allFiles = [...typeFiles, ...otherFiles];
    
    console.log(`Found ${allFiles.length} declaration files to process`);
    
    // Process each file
    const processedContents = [];
    
    // Add header
    processedContents.push([
        '// Auto-generated bundled type declarations for @elizaos/core',
        '// This file contains all type definitions to avoid Node.js module resolution issues',
        '// Generated at: ' + new Date().toISOString(),
        '',
    ].join('\n'));
    
    // Process all files
    const seenFiles = new Set();
    for (const file of allFiles) {
        // Avoid duplicates
        const normalizedPath = path.normalize(file);
        if (seenFiles.has(normalizedPath)) continue;
        seenFiles.add(normalizedPath);
        
        const content = processTypeFile(file);
        if (content.trim()) {
            processedContents.push(content);
        }
    }
    
    // Write the bundled file
    const bundledContent = processedContents.join('\n');
    fs.writeFileSync(outputFile, bundledContent, 'utf8');
    
    console.log(`Successfully created bundled types at ${outputFile}`);
    console.log(`Bundle size: ${bundledContent.length} characters`);
}

main();