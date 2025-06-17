import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const actionsDir = path.join(__dirname, 'src/actions');
const actionsToUpdate = [
  'ignore.ts',
  'muteRoom.ts',
  'none.ts',
  'settings.ts',
  'unfollowRoom.ts',
  'unmuteRoom.ts'
];

// Pattern to check if handler returns ActionResult
const hasActionResultPattern = /\): Promise<ActionResult>/;
const handlerPattern = /handler:\s*async\s*\([^)]+\)\s*:\s*Promise<([^>]+)>/;

console.log('Checking actions that need ActionResult update...\n');

actionsToUpdate.forEach(file => {
  const filePath = path.join(actionsDir, file);
  const content = fs.readFileSync(filePath, 'utf8');
  
  if (!hasActionResultPattern.test(content)) {
    console.log(`❌ ${file} - needs update`);
    
    // Check current return type
    const match = content.match(handlerPattern);
    if (match) {
      console.log(`   Current return type: Promise<${match[1]}>`);
    }
  } else {
    console.log(`✅ ${file} - already returns ActionResult`);
  }
});

console.log('\nTo update these files, they need:');
console.log('1. Import ActionResult from @elizaos/core');
console.log('2. Change handler return type to Promise<ActionResult>');
console.log('3. Return an ActionResult object with success, data, and optional state');
console.log('4. Wrap handler body in try-catch');
console.log('5. Add effects property (optional)'); 