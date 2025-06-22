#!/usr/bin/env tsx

import { logger } from '@elizaos/core';
import { spawn } from 'child_process';
import * as path from 'path';

// Set database type before any imports
process.env.DATABASE_TYPE = 'pglite';

async function runResearchScenario() {
  logger.info('🔬 Testing Academic Paper Research Scenario\n');

  try {
    // Run the scenario using the CLI
    const cliPath = path.join(__dirname, '..', 'dist', 'index.js');

    logger.info('📋 Running scenario test...\n');

    const scenarioProcess = spawn(
      'node',
      [cliPath, 'scenario', 'run', '--filter', 'Academic Paper Research', '--verbose'],
      {
        cwd: path.join(__dirname, '..'),
        env: {
          ...process.env,
          DATABASE_TYPE: 'pglite',
          NODE_ENV: 'test',
        },
        stdio: 'pipe',
      }
    );

    let output = '';
    let errorOutput = '';

    scenarioProcess.stdout.on('data', (data) => {
      const text = data.toString();
      output += text;
      process.stdout.write(text);
    });

    scenarioProcess.stderr.on('data', (data) => {
      const text = data.toString();
      errorOutput += text;
      if (!text.includes('Debugger')) {
        process.stderr.write(text);
      }
    });

    await new Promise((resolve, reject) => {
      scenarioProcess.on('close', (code) => {
        if (code === 0) {
          resolve(code);
        } else {
          reject(new Error(`Scenario process exited with code ${code}`));
        }
      });

      scenarioProcess.on('error', (err) => {
        reject(err);
      });
    });

    // Analyze the output
    logger.info('\n\n📊 Scenario Results Analysis:\n');

    // Check if the research action was actually called
    const researchActionCalled = output.includes('research') || output.includes('Research');
    const messagesExchanged = (output.match(/💬/g) || []).length;
    const scenarioPassed = output.includes('PASSED');

    logger.info(`✓ Research action mentioned: ${researchActionCalled ? 'YES' : 'NO'}`);
    logger.info(`✓ Messages exchanged: ${messagesExchanged}`);
    logger.info(`✓ Scenario passed: ${scenarioPassed ? 'YES' : 'NO'}`);

    if (scenarioPassed && !researchActionCalled) {
      logger.warn('\n⚠️  WARNING: Scenario passed but no research action was detected!');
      logger.warn('This might be a false positive - the scenario may not be actually working.');
    }
  } catch (error) {
    logger.error('❌ Error running scenario:', error);

    // Try to provide helpful debugging info
    logger.info('\n🔍 Debugging Information:');
    logger.info('- Make sure the CLI is built: bun x tsup');
    logger.info('- Make sure the research plugin is built');
    logger.info('- Check that all dependencies are installed');
  }
}

// Run the test
runResearchScenario().catch(console.error);
