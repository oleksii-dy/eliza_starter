#!/usr/bin/env bun

import { readFileSync, writeFileSync } from 'fs';
import { glob } from 'glob';

console.log('🔧 Refactoring THREE.* syntax to named imports...');

const sourceFiles = glob.sync('src/**/*.{ts,tsx}', { 
  cwd: process.cwd(),
  ignore: ['src/node_modules/**', 'src/**/*.d.ts']
});

// Common Three.js types that need to be imported
const threeTypes = new Set();

// First pass: collect all THREE.* usage
for (const file of sourceFiles) {
  console.log(`📊 Analyzing ${file}...`);
  
  const content = readFileSync(file, 'utf8');
  const threeMatches = content.match(/THREE\.(\w+)/g);
  
  if (threeMatches) {
    threeMatches.forEach(match => {
      const type = match.replace('THREE.', '');
      threeTypes.add(type);
    });
  }
}

console.log(`Found ${threeTypes.size} unique THREE.* types:`, Array.from(threeTypes).sort().join(', '));

// Second pass: replace imports and usage
for (const file of sourceFiles) {
  let content = readFileSync(file, 'utf8');
  let hasChanges = false;
  
  // Skip if no THREE usage
  if (!content.includes('THREE.')) {
    continue;
  }
  
  console.log(`🔄 Processing ${file}...`);
  
  // Find existing three imports
  const existingImportMatch = content.match(/import\s+.*?from\s+['"]three['"];?/);
  const starImportMatch = content.match(/import\s+\*\s+as\s+THREE\s+from\s+['"]three['"];?/);
  
  // Collect used THREE types in this file
  const usedTypes = new Set();
  const threeMatches = content.match(/THREE\.(\w+)/g);
  if (threeMatches) {
    threeMatches.forEach(match => {
      const type = match.replace('THREE.', '');
      usedTypes.add(type);
    });
  }
  
  if (usedTypes.size === 0) {
    continue;
  }
  
  // Replace THREE.* usage with direct names
  for (const type of usedTypes) {
    const regex = new RegExp(`THREE\\.${type}`, 'g');
    content = content.replace(regex, type);
    hasChanges = true;
  }
  
  // Update imports
  if (starImportMatch) {
    // Replace star import with named imports
    const newImport = `import { ${Array.from(usedTypes).sort().join(', ')} } from 'three';`;
    content = content.replace(starImportMatch[0], newImport);
    hasChanges = true;
  } else if (existingImportMatch) {
    // Merge with existing import
    const importMatch = existingImportMatch[0];
    const existingTypesMatch = importMatch.match(/\{([^}]+)\}/);
    
    if (existingTypesMatch) {
      const existingTypes = existingTypesMatch[1]
        .split(',')
        .map(t => t.trim())
        .filter(t => t && !t.startsWith('type '));
      
      const allTypes = new Set([...existingTypes, ...usedTypes]);
      const newImport = `import { ${Array.from(allTypes).sort().join(', ')} } from 'three';`;
      content = content.replace(importMatch, newImport);
      hasChanges = true;
    }
  } else {
    // Add new import at the top
    const newImport = `import { ${Array.from(usedTypes).sort().join(', ')} } from 'three';\n`;
    
    // Find the best place to insert the import
    const lines = content.split('\n');
    let insertIndex = 0;
    
    // Skip comments and find first import or code
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      if (line.startsWith('import ') || (!line.startsWith('//') && !line.startsWith('/*') && line.length > 0)) {
        insertIndex = i;
        break;
      }
    }
    
    lines.splice(insertIndex, 0, newImport.trimEnd());
    content = lines.join('\n');
    hasChanges = true;
  }
  
  if (hasChanges) {
    writeFileSync(file, content);
    console.log(`✅ Updated ${file}`);
  }
}

console.log('🎉 THREE.* refactoring completed!');