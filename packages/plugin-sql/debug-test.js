// Quick debug test for entity retrieval
const { createIsolatedTestDatabase } = require('./src/__tests__/test-helpers.ts');

async function debug() {
  console.log('Creating test database...');
  const { adapter, cleanup } = await createIsolatedTestDatabase('debug-test');

  try {
    console.log('Creating test entity...');
    const testEntity = {
      id: '12345678-1234-1234-1234-123456789012',
      names: ['Debug Entity'],
      metadata: { test: true },
      agentId: adapter.agentId
    };

    const created = await adapter.createEntities([testEntity]);
    console.log('Create result:', created);

    console.log('Retrieving entity...');
    const retrieved = await adapter.getEntitiesByIds([testEntity.id]);
    console.log('Retrieved result:', retrieved);
    console.log('Retrieved length:', retrieved?.length);

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await cleanup();
  }
}

debug();
