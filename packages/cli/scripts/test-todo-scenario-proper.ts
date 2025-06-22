#!/usr/bin/env tsx

import { logger } from '@elizaos/core';
import { spawn } from 'child_process';
import * as path from 'path';
import * as fs from 'fs';

// Set database type before any imports
process.env.DATABASE_TYPE = 'pglite';

async function testTodoScenario() {
  logger.info('🚀 Running Todo Scenario Test\n');

  // Clean up any existing test database
  const dbPath = path.join(process.cwd(), '.scenario-test-db');
  if (fs.existsSync(dbPath)) {
    logger.info('🧹 Cleaning up existing test database...');
    fs.rmSync(dbPath, { recursive: true, force: true });
  }

  // Step 1: Run the scenario with the todo plugin
  logger.info('📋 Step 1: Running Todo Scenario...\n');

  // First, let's run it with a simpler approach - direct scenario execution
  try {
    // Import required modules dynamically
    const { setDatabaseType } = await import('@elizaos/plugin-sql');
    setDatabaseType('pglite');
    logger.info('✅ Set database type to PGLite');

    // Import scenario
    const scenariosModule = await import('@elizaos/scenarios');
    const todoScenario = scenariosModule.allScenarios.find(
      (s) => s.name === 'GitHub Issue to Todo Task Management'
    );

    if (!todoScenario) {
      logger.error('❌ Todo scenario not found');
      return;
    }

    logger.info('✅ Found todo scenario');

    // Run scenario with proper setup
    const { runScenarioWithAgents } = await import('../dist/commands/scenario/run-scenario.js');

    const result = await runScenarioWithAgents(todoScenario, {
      verbose: true,
      benchmark: false,
    });

    logger.info('\n📊 Scenario Result:');
    logger.info(`  Name: ${result.name}`);
    logger.info(`  Passed: ${result.passed ? '✅' : '❌'}`);
    logger.info(`  Duration: ${result.duration}ms`);
    logger.info(`  Messages: ${result.transcript?.length || 0}`);

    if (result.errors && result.errors.length > 0) {
      logger.error('\n❌ Errors:');
      result.errors.forEach((err: string) => logger.error(`  - ${err}`));
    }

    // Step 2: Verify the results
    logger.info('\n🔍 Step 2: Verifying Database Contents...\n');

    // Wait for database to settle
    await new Promise((resolve) => setTimeout(resolve, 1000));

    if (!fs.existsSync(dbPath)) {
      logger.error('❌ Test database was not created!');
      return;
    }

    // Connect directly to PGLite to verify
    const { PGlite } = await import('@electric-sql/pglite');
    const db = new PGlite({ dataDir: dbPath });

    // Check tables
    const tablesResult = await db.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
      ORDER BY table_name;
    `);

    logger.info('📋 Database Tables:');
    for (const row of tablesResult.rows as any[]) {
      logger.info(`  - ${row.table_name}`);
    }

    // Check for messages
    const messagesResult = await db.query(`
      SELECT * FROM memories 
      WHERE content::text ILIKE '%todo%' 
         OR content::text ILIKE '%task%'
         OR content::text ILIKE '%authentication%'
      ORDER BY "createdAt" DESC
      LIMIT 20;
    `);

    logger.info(`\n💬 Found ${messagesResult.rows.length} todo-related messages`);

    if (messagesResult.rows.length > 0) {
      logger.info('\n📨 Messages:');
      for (const msg of messagesResult.rows.slice(0, 5) as any[]) {
        const content = JSON.parse(msg.content);
        logger.info(`  - ${content.text?.substring(0, 80)}...`);
      }
    }

    // Check for components (where todos might be stored)
    try {
      const componentsResult = await db.query(`
        SELECT * FROM components 
        WHERE type = 'todo' OR data::text ILIKE '%todo%'
        ORDER BY "createdAt" DESC
        LIMIT 10;
      `);

      logger.info(`\n📝 Found ${componentsResult.rows.length} todo components`);

      if (componentsResult.rows.length > 0) {
        logger.info('\n🎯 Todo Components:');
        for (const component of componentsResult.rows as any[]) {
          const data = JSON.parse(component.data);
          logger.info(`  - Type: ${component.type}`);
          logger.info(`    Data: ${JSON.stringify(data).substring(0, 100)}...`);
        }
      }
    } catch (err) {
      logger.warn('⚠️  Components table may not exist');
    }

    // Final verification
    logger.info('\n🏁 Final Verification:');
    const scenarioPassed = result.passed;
    const messagesExchanged = messagesResult.rows.length > 0;
    const hasTodoContent = messagesResult.rows.some((row: any) => {
      const content = JSON.parse(row.content);
      return (
        content.text?.toLowerCase().includes('todo') || content.text?.toLowerCase().includes('task')
      );
    });

    logger.info(`  ${scenarioPassed ? '✅' : '❌'} Scenario passed: ${scenarioPassed}`);
    logger.info(`  ${messagesExchanged ? '✅' : '❌'} Messages exchanged: ${messagesExchanged}`);
    logger.info(`  ${hasTodoContent ? '✅' : '❌'} Todo content found: ${hasTodoContent}`);

    if (scenarioPassed && !hasTodoContent) {
      logger.warn('\n⚠️  WARNING: Scenario passed but no todo content was created!');
      logger.warn('The agent may be responding without actually executing the todo action.');
    }

    await db.close();
  } catch (error) {
    logger.error('❌ Test failed:', error);
    logger.error('Stack:', error instanceof Error ? error.stack : String(error));
  }
}

// Run the test
testTodoScenario().catch(console.error);
