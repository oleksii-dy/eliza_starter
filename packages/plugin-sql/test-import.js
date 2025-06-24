// Test plugin import
import { plugin, createDatabaseAdapter } from './dist/index.js';

console.log('Plugin name:', plugin?.name);
console.log('Plugin description:', plugin?.description);
console.log('Plugin init exists:', typeof plugin?.init === 'function');
console.log('createDatabaseAdapter exists:', typeof createDatabaseAdapter === 'function');

// Test adapter creation
try {
  const agentId = '00000000-0000-0000-0000-000000000000';
  const adapter = createDatabaseAdapter({}, agentId);
  console.log('Default adapter created:', adapter?.constructor?.name);
} catch (error) {
  console.error('Error creating adapter:', error.message);
}

console.log('✅ Plugin import test complete');
