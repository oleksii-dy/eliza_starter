#!/usr/bin/env tsx

import { spawn } from 'child_process';
import { logger } from '@elizaos/core';
import * as path from 'path';
import * as fs from 'fs';
import { PGlite } from '@electric-sql/pglite';

// Set database type before any imports
process.env.DATABASE_TYPE = 'pglite';

async function runTodoScenario() {
  logger.info('🚀 Running Todo Scenario Test with Verification\n');

  // Clean up any existing test database
  const dbPath = path.join(process.cwd(), '.scenario-test-db');
  if (fs.existsSync(dbPath)) {
    logger.info('🧹 Cleaning up existing test database...');
    fs.rmSync(dbPath, { recursive: true, force: true });
  }

  // Step 1: Run the scenario
  logger.info('📋 Step 1: Running Todo Scenario...\n');

  const scenarioProcess = spawn(
    'node',
    [
      'dist/index.js',
      'scenario',
      'run',
      '--filter',
      'GitHub Issue to Todo Task Management',
      '--verbose',
    ],
    {
      cwd: process.cwd(),
      env: { ...process.env, DATABASE_TYPE: 'pglite' },
      stdio: 'pipe',
    }
  );

  let scenarioOutput = '';
  let scenarioError = '';

  scenarioProcess.stdout.on('data', (data) => {
    const text = data.toString();
    scenarioOutput += text;
    process.stdout.write(text);
  });

  scenarioProcess.stderr.on('data', (data) => {
    const text = data.toString();
    scenarioError += text;
    process.stderr.write(text);
  });

  await new Promise((resolve) => {
    scenarioProcess.on('close', resolve);
  });

  logger.info('\n📊 Step 2: Verifying Results...\n');

  // Wait a bit for database to settle
  await new Promise((resolve) => setTimeout(resolve, 2000));

  // Step 2: Verify the database
  try {
    if (!fs.existsSync(dbPath)) {
      logger.error('❌ Test database was not created!');
      return;
    }

    logger.info('✅ Test database found at:', dbPath);

    // Connect to the database
    const db = new PGlite({
      dataDir: dbPath,
    });

    // Check if the database has the expected tables
    const tablesResult = await db.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
      ORDER BY table_name;
    `);

    logger.info('\n📋 Database Tables:');
    for (const row of tablesResult.rows as any[]) {
      logger.info(`  - ${row.table_name}`);
    }

    // Check for todos
    const todosResult = await db.query(`
      SELECT * FROM components 
      WHERE type = 'todo'
      ORDER BY "createdAt" DESC
      LIMIT 10;
    `);

    logger.info(`\n📝 Found ${todosResult.rows.length} todo components`);

    if (todosResult.rows.length > 0) {
      logger.info('\n🎯 Todo Details:');
      for (const todo of todosResult.rows as any[]) {
        const data = JSON.parse(todo.data);
        logger.info(`  - ID: ${todo.id}`);
        logger.info(`    Title: ${data.title || 'N/A'}`);
        logger.info(`    Description: ${data.description || 'N/A'}`);
        logger.info(`    Status: ${data.status || 'N/A'}`);
        logger.info(`    Created: ${new Date(todo.createdAt).toISOString()}`);
        logger.info('');
      }
    }

    // Check for messages that mention todos
    const messagesResult = await db.query(`
      SELECT * FROM memories 
      WHERE content::text LIKE '%todo%' 
         OR content::text LIKE '%task%'
      ORDER BY "createdAt" DESC
      LIMIT 10;
    `);

    logger.info(`\n💬 Found ${messagesResult.rows.length} messages mentioning todos/tasks`);

    if (messagesResult.rows.length > 0) {
      logger.info('\n📨 Recent Messages:');
      for (const msg of messagesResult.rows as any[]) {
        const content = JSON.parse(msg.content);
        logger.info(`  - ${content.text?.substring(0, 100)}...`);
      }
    }

    // Verify scenario outcome
    logger.info('\n🔍 Scenario Verification:');

    const scenarioPassed = scenarioOutput.includes('PASSED');
    const todoCreated = todosResult.rows.length > 0;
    const messagesExchanged = messagesResult.rows.length > 0;

    logger.info(`  ✅ Scenario reported PASSED: ${scenarioPassed}`);
    logger.info(`  ${todoCreated ? '✅' : '❌'} Todos were created: ${todoCreated}`);
    logger.info(
      `  ${messagesExchanged ? '✅' : '❌'} Messages were exchanged: ${messagesExchanged}`
    );

    if (scenarioPassed && !todoCreated) {
      logger.error('\n⚠️  WARNING: Scenario passed but no todos were created!');
      logger.error('This indicates the scenario verification is not working properly.');
    }

    await db.close();
  } catch (error) {
    logger.error('❌ Error verifying database:', error);
  }
}

// Run the test
runTodoScenario().catch(console.error);
