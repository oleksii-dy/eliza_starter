#!/usr/bin/env tsx

import { logger } from '@elizaos/core';
import * as path from 'path';
import * as fs from 'fs';

// Set database type before any imports
process.env.DATABASE_TYPE = 'pglite';

async function testSingleScenario() {
  logger.info('🎯 Testing Single Scenario: Academic Paper Research\n');

  try {
    // Clean up any existing test database
    const dbPath = path.join(process.cwd(), '.scenario-test-db');
    if (fs.existsSync(dbPath)) {
      logger.info('🧹 Cleaning up existing test database...');
      fs.rmSync(dbPath, { recursive: true, force: true });
    }

    // Import required modules
    const { setDatabaseType } = await import('@elizaos/plugin-sql');
    setDatabaseType('pglite');
    logger.info('✅ Set database type to PGLite');

    // Load the research scenario
    const scenariosModule = await import('@elizaos/scenarios');
    const researchScenario = scenariosModule.allScenarios.find(
      (s) => s.name === 'Academic Paper Research and Knowledge Storage'
    );

    if (!researchScenario) {
      logger.error('❌ Research scenario not found');
      return;
    }

    logger.info('✅ Found research scenario');
    logger.info(`📋 Scenario: ${researchScenario.name}`);
    logger.info(`📝 Description: ${researchScenario.description}`);

    // Check required plugins
    const requiredPlugins = researchScenario.setup?.environment?.plugins || [];
    logger.info(`\n🔌 Required plugins: ${requiredPlugins.join(', ')}`);

    // Run the scenario
    logger.info('\n🚀 Running scenario...\n');

    const { runScenarioWithAgents } = await import('../dist/commands/scenario/run-scenario.js');

    const result = await runScenarioWithAgents(researchScenario, {
      verbose: true,
      benchmark: false,
    });

    // Display results
    logger.info('\n📊 Scenario Results:');
    logger.info('═'.repeat(50));
    logger.info(`✅ Scenario: ${result.name}`);
    logger.info(`${result.passed ? '✅' : '❌'} Status: ${result.passed ? 'PASSED' : 'FAILED'}`);
    logger.info(`⏱️  Duration: ${result.duration}ms`);
    logger.info(`💬 Messages exchanged: ${result.transcript?.length || 0}`);

    if (result.transcript && result.transcript.length > 0) {
      logger.info('\n📝 Conversation Transcript:');
      logger.info('─'.repeat(50));

      result.transcript.forEach((msg: any, idx: number) => {
        const sender = msg.sender || 'Unknown';
        const content = msg.content?.text || msg.content || 'No content';
        logger.info(
          `${idx + 1}. ${sender}: ${content.substring(0, 100)}${content.length > 100 ? '...' : ''}`
        );
      });
    }

    if (result.errors && result.errors.length > 0) {
      logger.error('\n❌ Errors encountered:');
      result.errors.forEach((err: string) => logger.error(`  - ${err}`));
    }

    // Verify actual execution
    if (result.passed && (!result.transcript || result.transcript.length === 0)) {
      logger.warn('\n⚠️  WARNING: Scenario passed but no messages were exchanged!');
      logger.warn('This indicates the scenario may not be executing properly.');
    }

    // Check database for actual data
    logger.info('\n🔍 Verifying Database Contents...');

    if (fs.existsSync(dbPath)) {
      const { PGlite } = await import('@electric-sql/pglite');
      const db = new PGlite({ dataDir: dbPath });

      try {
        // Check for memories
        const memoriesResult = await db.query(`
          SELECT COUNT(*) as count FROM memories
        `);

        const memoryCount = (memoriesResult.rows[0] as any).count;
        logger.info(`💾 Memories created: ${memoryCount}`);

        // Check for research-related content
        const researchMemories = await db.query(`
          SELECT * FROM memories 
          WHERE content::text ILIKE '%research%' 
             OR content::text ILIKE '%paper%'
             OR content::text ILIKE '%knowledge%'
          LIMIT 5
        `);

        if (researchMemories.rows.length > 0) {
          logger.info(`📚 Found ${researchMemories.rows.length} research-related memories`);
        }

        await db.close();
      } catch (err) {
        logger.warn('Could not query database:', err);
      }
    }
  } catch (error) {
    logger.error('❌ Test failed:', error);
    if (error instanceof Error) {
      logger.error('Stack:', error.stack);
    }
  }
}

// Run the test
testSingleScenario().catch(console.error);
