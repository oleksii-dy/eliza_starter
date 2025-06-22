// Simple validation script to check plugin basics without vitest
import { plugin, createDatabaseAdapter } from './src/index.ts';

console.log('🔍 Testing plugin exports...');

// Test plugin metadata
console.log('Plugin name:', plugin?.name);
console.log('Plugin description:', plugin?.description);
console.log('Plugin priority:', plugin?.priority);
console.log('Plugin has init:', typeof plugin?.init === 'function');

// Test adapter creation
const agentId = '00000000-0000-0000-0000-000000000000';

try {
  console.log('\n🔍 Testing PGLite adapter creation...');
  const pgliteAdapter = createDatabaseAdapter({ dataDir: ':memory:' }, agentId);
  console.log('PGLite adapter created:', pgliteAdapter?.constructor?.name);
} catch (error) {
  console.error('❌ PGLite adapter creation failed:', error.message);
}

try {
  console.log('\n🔍 Testing Postgres adapter creation...');
  const pgAdapter = createDatabaseAdapter({ postgresUrl: 'postgresql://localhost:5432/test' }, agentId);
  console.log('Postgres adapter created:', pgAdapter?.constructor?.name);
} catch (error) {
  console.error('❌ Postgres adapter creation failed:', error.message);
}

try {
  console.log('\n🔍 Testing default adapter creation...');
  const defaultAdapter = createDatabaseAdapter({}, agentId);
  console.log('Default adapter created:', defaultAdapter?.constructor?.name);
} catch (error) {
  console.error('❌ Default adapter creation failed:', error.message);
}

console.log('\n✅ Basic plugin validation complete');