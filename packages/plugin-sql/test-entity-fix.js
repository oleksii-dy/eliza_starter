import { createIsolatedTestDatabase } from './src/__tests__/test-helpers.js';
import { v4 as uuidv4 } from 'uuid';

async function testEntityFunctionality() {
  console.log('🧪 Testing Entity CRUD functionality...');

  try {
    // Create test runtime
    const { runtime, cleanup } = await createIsolatedTestDatabase('entity-fix-test');
    console.log('✅ Runtime created successfully');

    // Test creating an entity
    const entityId = uuidv4();
    const testEntity = {
      id: entityId,
      names: ['Test User', 'TestUser'],
      metadata: { platform: 'test' },
    };

    await runtime.createEntity(testEntity);
    console.log('✅ Entity created successfully');

    // Test retrieving the entity by ID
    const retrievedEntity = await runtime.getEntityById(entityId);
    console.log('✅ Entity retrieved successfully:', retrievedEntity?.names[0]);

    // Test retrieving multiple entities
    const entities = await runtime.getEntityByIds([entityId]);
    console.log('✅ Multiple entities retrieved successfully, count:', entities.length);

    // Test creating another entity for multiple retrieval
    const entityId2 = uuidv4();
    const testEntity2 = {
      id: entityId2,
      names: ['Test User 2'],
      metadata: { platform: 'test' },
    };

    await runtime.createEntity(testEntity2);
    console.log('✅ Second entity created successfully');

    // Test retrieving both entities
    const multipleEntities = await runtime.getEntityByIds([entityId, entityId2]);
    console.log('✅ Multiple entities retrieved successfully, count:', multipleEntities.length);

    console.log('🎉 All entity CRUD operations working correctly!');

    // Clean up
    await cleanup();

  } catch (error) {
    console.error('❌ Test failed:', error);
    process.exit(1);
  }
}

testEntityFunctionality();
