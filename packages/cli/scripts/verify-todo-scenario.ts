#!/usr/bin/env tsx

import { logger } from '@elizaos/core';
import { createDatabaseAdapter } from '@elizaos/plugin-sql';
import * as path from 'path';
import * as fs from 'fs';

async function verifyTodoScenario() {
  logger.info('🔍 Verifying Todo Scenario Results...\n');

  try {
    // Connect to the test database
    const dbPath = path.join(process.cwd(), '.scenario-test-db');

    if (!fs.existsSync(dbPath)) {
      logger.error('❌ Test database not found at:', dbPath);
      logger.info('💡 Run a scenario test first to create the database');
      return;
    }

    logger.info('📁 Found test database at:', dbPath);

    // Create database adapter
    const adapter = createDatabaseAdapter({ dataDir: dbPath }, 'verification-agent' as any);

    logger.info('✅ Connected to test database\n');

    // Access the database directly
    const db = (adapter as any).db;
    if (!db) {
      logger.error('❌ Could not access database handle');
      return;
    }

    // Check for todos
    logger.info('📋 Checking for TODO items...');

    try {
      // Query todos using the adapter's methods
      const memories = await adapter.getMemories({
        tableName: 'todos',
        count: 10,
      });

      if (memories && memories.length > 0) {
        logger.info(`✅ Found ${memories.length} TODO items:\n`);

        memories.forEach((memory: any, index: number) => {
          const content = memory.content;
          logger.info(`${index + 1}. ${content.text || content.title || 'Untitled'}`);
          logger.info(`   ID: ${memory.id}`);
          logger.info(`   Created: ${new Date(memory.createdAt || 0).toLocaleString()}`);
          logger.info('');
        });
      } else {
        logger.warn('⚠️  No TODO items found in todos table');
      }
    } catch (error) {
      logger.warn('⚠️  Could not query todos table directly:', error);

      // Try alternative approach - look for todo-related memories
      logger.info('\n📋 Checking memories for todo-related entries...');

      try {
        const allMemories = await adapter.getMemories({
          count: 100,
        });

        const todoMemories = allMemories.filter((m: any) => {
          const text = JSON.stringify(m.content).toLowerCase();
          return (
            text.includes('todo') || text.includes('task') || text.includes('authentication bug')
          );
        });

        if (todoMemories.length > 0) {
          logger.info(`✅ Found ${todoMemories.length} todo-related memories:\n`);

          todoMemories.slice(0, 10).forEach((memory: any, index: number) => {
            logger.info(`${index + 1}. ${memory.content.text || 'No text'}`);
            logger.info(`   Type: ${memory.type || 'unknown'}`);
            logger.info(`   Room: ${memory.roomId}`);
            logger.info(`   Created: ${new Date(memory.createdAt || 0).toLocaleString()}`);
            logger.info('');
          });
        } else {
          logger.warn('⚠️  No todo-related memories found');
        }
      } catch (memError) {
        logger.error('❌ Error querying memories:', memError);
      }
    }

    // Check for agents
    logger.info('\n👤 Checking for agents...');

    try {
      // Get entities which include agents
      const entities = await adapter.getEntities({ limit: 10 });

      if (entities && entities.length > 0) {
        logger.info(`✅ Found ${entities.length} entities/agents:\n`);

        entities.forEach((entity: any, index: number) => {
          logger.info(`${index + 1}. ${entity.name || 'Unnamed'} (${entity.id})`);
        });
      } else {
        logger.warn('⚠️  No entities/agents found');
      }
    } catch (error) {
      logger.error('❌ Error querying entities:', error);
    }

    // Check for rooms
    logger.info('\n🏠 Checking for rooms...');

    try {
      const rooms = await adapter.getRooms({ limit: 10 });

      if (rooms && rooms.length > 0) {
        logger.info(`✅ Found ${rooms.length} rooms:\n`);

        rooms.forEach((room: any, index: number) => {
          logger.info(`${index + 1}. ${room.name || 'Unnamed'} (${room.id})`);
          logger.info(`   Type: ${room.type || 'unknown'}`);
          logger.info(`   Created: ${new Date(room.createdAt || 0).toLocaleString()}`);
          logger.info('');
        });
      } else {
        logger.warn('⚠️  No rooms found');
      }
    } catch (error) {
      logger.error('❌ Error querying rooms:', error);
    }

    // Summary
    logger.info('\n📊 Summary:');
    logger.info('─'.repeat(40));

    const stats = {
      databaseExists: true,
      todosFound: false,
      todoRelatedMemories: false,
      agentsFound: false,
      roomsFound: false,
    };

    // Re-check for summary
    try {
      const memories = await adapter.getMemories({ count: 100 });
      const todoMemories = memories.filter((m: any) => {
        const text = JSON.stringify(m.content).toLowerCase();
        return text.includes('todo') || text.includes('task');
      });

      stats.todoRelatedMemories = todoMemories.length > 0;

      const entities = await adapter.getEntities({ limit: 10 });
      stats.agentsFound = entities.length > 0;

      const rooms = await adapter.getRooms({ limit: 10 });
      stats.roomsFound = rooms.length > 0;
    } catch (e) {
      // Ignore errors in summary
    }

    logger.info(`Database exists: ${stats.databaseExists ? '✅' : '❌'}`);
    logger.info(`Todo items found: ${stats.todosFound ? '✅' : '❌'}`);
    logger.info(`Todo-related memories: ${stats.todoRelatedMemories ? '✅' : '❌'}`);
    logger.info(`Agents found: ${stats.agentsFound ? '✅' : '❌'}`);
    logger.info(`Rooms found: ${stats.roomsFound ? '✅' : '❌'}`);

    if (!stats.todoRelatedMemories) {
      logger.warn('\n⚠️  The Todo scenario may not be actually creating todos!');
      logger.info('💡 The agent might be responding without executing the todo action.');
    }

    logger.info('\n✅ Verification complete');
  } catch (error) {
    logger.error('❌ Verification failed:', error);
  }
}

// Run the verification
verifyTodoScenario().catch((error) => {
  logger.error('Fatal error:', error);
  process.exit(1);
});
