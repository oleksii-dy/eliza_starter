// Simple test to verify PGLite fixes
import { createDatabaseAdapter } from './dist/index.js';
import { v4 as uuid } from 'uuid';

async function testPGLiteWithEmbeddings() {
  console.log('Starting PGLite test...');
  
  const agentId = uuid();
  const adapter = await createDatabaseAdapter({
    dataDir: ':memory:'
  }, agentId);
  
  try {
    // Initialize the adapter
    console.log('Initializing adapter...');
    await adapter.init();
    
    // Wait for ready
    console.log('Waiting for adapter to be ready...');
    await adapter.waitForReady();
    
    console.log('✅ PGLite adapter initialized successfully!');
    
    // Try to create an agent
    console.log('Creating test agent...');
    const created = await adapter.createAgent({
      id: agentId,
      name: 'Test Agent',
      status: 'active',
      createdAt: Date.now(),
      updatedAt: Date.now()
    });
    
    console.log('✅ Agent created:', created);
    
    // Try to create a memory
    console.log('Creating test memory...');
    const memoryId = await adapter.createMemory({
      id: uuid(),
      entityId: agentId,
      agentId: agentId,
      roomId: uuid(),
      content: {
        text: 'Test memory content'
      }
    }, 'messages');
    
    console.log('✅ Memory created with ID:', memoryId);
    
    // Try to ensure embedding dimension
    console.log('Testing embedding dimension...');
    await adapter.ensureEmbeddingDimension(1536);
    console.log('✅ Embedding dimension set successfully');
    
    // Clean up
    await adapter.close();
    console.log('✅ Adapter closed successfully');
    
    console.log('\n🎉 All PGLite tests passed!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Test failed:', error);
    await adapter.close();
    process.exit(1);
  }
}

testPGLiteWithEmbeddings();