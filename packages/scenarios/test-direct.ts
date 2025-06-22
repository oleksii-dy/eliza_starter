#!/usr/bin/env tsx

// Set database type before imports
process.env.DATABASE_TYPE = 'pglite';

import { logger } from '@elizaos/core';

async function testScenarioDirect() {
  logger.info('🎯 Direct Scenario Test\n');

  try {
    // Load the research scenario directly
    const researchScenario = await import(
      './src/plugin-tests/01-research-knowledge-integration.js'
    );

    logger.info('📋 Loaded scenario:', researchScenario.default?.name || 'Unknown');

    // Check the scenario structure
    const scenario = researchScenario.default;
    if (!scenario) {
      logger.error('No default export found in scenario file');
      return;
    }

    logger.info('\n📊 Scenario Details:');
    logger.info(`- Name: ${scenario.name}`);
    logger.info(`- Description: ${scenario.description}`);
    logger.info(`- Required Plugins: ${scenario.requiredPlugins?.join(', ') || 'None'}`);
    logger.info(`- Actors: ${scenario.actors?.length || 0}`);
    logger.info(`- Steps: ${scenario.steps?.length || 0}`);

    // Check if research plugin is actually required
    const requiresResearch = scenario.requiredPlugins?.includes('@elizaos/plugin-research');
    logger.info(`\n✓ Requires research plugin: ${requiresResearch ? 'YES' : 'NO'}`);

    // Look at the steps to see what's supposed to happen
    if (scenario.steps) {
      logger.info('\n📝 Scenario Steps:');
      scenario.steps.forEach((step, index) => {
        logger.info(`\nStep ${index + 1}:`);
        logger.info(`  Actor: ${step.actor}`);
        logger.info(`  Action: ${step.action}`);
        if (step.message) {
          logger.info(`  Message: ${step.message.substring(0, 100)}...`);
        }
        if (step.expectedResponse) {
          logger.info(`  Expected: ${JSON.stringify(step.expectedResponse).substring(0, 100)}...`);
        }
      });
    }

    // Check the verification function
    if (scenario.verify) {
      logger.info('\n✓ Has verification function: YES');
      logger.info(
        '  Verification checks for:',
        scenario.verify
          .toString()
          .match(/check.*?[;|}]/g)
          ?.join('\n  ') || 'Unknown'
      );
    } else {
      logger.warn('\n⚠️  No verification function found!');
    }
  } catch (error) {
    logger.error('❌ Error loading scenario:', error);
  }
}

testScenarioDirect().catch(console.error);
