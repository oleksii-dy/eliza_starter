#!/usr/bin/env bun

import { elizaLogger } from '@elizaos/core';
import { promises as fs } from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import { exec } from 'child_process';
import { promisify } from 'util';

// Load environment variables
dotenv.config();

const execAsync = promisify(exec);
const INSTANCE_ID = process.argv[2] || 'axios__axios-5919';

async function debugInstance() {
  elizaLogger.info(`🔍 Debugging SWE-bench instance: ${INSTANCE_ID}`);

  // Check for API key
  if (!process.env.ANTHROPIC_API_KEY) {
    elizaLogger.error('❌ ANTHROPIC_API_KEY not found in environment');
    process.exit(1);
  }

  // Read the cached instance data
  const cacheDir = '.swe-bench-cache';
  const dataFile = path.join(cacheDir, 'typescript-instances-all.json');

  try {
    const data = JSON.parse(await fs.readFile(dataFile, 'utf-8'));
    let instance = data.find((i: any) => i.instance_id === INSTANCE_ID);

    // Try alternative ID format if not found
    if (!instance) {
      instance = data.find((i: any) => {
        const altId = `${i.org}__${i.repo}-${i.number}`;
        return altId === INSTANCE_ID || i.instance_id === INSTANCE_ID;
      });
    }

    if (!instance) {
      elizaLogger.error(`Instance ${INSTANCE_ID} not found in cache`);
      elizaLogger.info('Available instances:');
      data.slice(0, 10).forEach((i: any) => {
        elizaLogger.info(`  - ${i.instance_id || `${i.org}__${i.repo}-${i.number}`}`);
      });
      return;
    }

    elizaLogger.info('Instance details:');
    elizaLogger.info(`- Repo: ${instance.repo || `${instance.org}/${instance.repo}`}`);
    elizaLogger.info(
      `- Repo URL: ${instance.repo_url || `https://github.com/${instance.org}/${instance.repo}`}`
    );
    elizaLogger.info(`- Base commit: ${instance.base_commit || instance.base?.sha}`);
    elizaLogger.info(`- Issue: ${instance.issue_title || instance.title}`);
    elizaLogger.info(
      `- Issue body: ${(instance.issue_body || instance.body || '')?.substring(0, 200)}...`
    );

    // Try to understand the issue better
    elizaLogger.info('\n📋 Issue Analysis:');
    elizaLogger.info(`Title: ${instance.issue_title || instance.title}`);
    elizaLogger.info(`Issue number: ${instance.issue_number || instance.number}`);

    // Look at the test patch to understand what needs to be fixed
    if (instance.test_patch) {
      elizaLogger.info('\n🧪 Test patch preview:');
      elizaLogger.info(`${instance.test_patch.substring(0, 500)}...`);
    }

    // Try a simple clone test
    elizaLogger.info('\n🔧 Testing git clone...');
    const testDir = '.swe-bench-debug';
    await fs.mkdir(testDir, { recursive: true });

    const repoPath = path.join(testDir, 'dayjs-test');

    // Remove if exists
    try {
      await fs.rm(repoPath, { recursive: true, force: true });
    } catch {}

    // Try cloning with a simpler approach
    try {
      elizaLogger.info('Attempting to clone repository...');

      // Use Bun's shell API instead of child_process
      const repoUrl = instance.repo_url || `https://github.com/${instance.org}/${instance.repo}`;
      const { stdout, stderr, exitCode } = await Bun.$`git clone ${repoUrl} ${repoPath}`.quiet();

      if (exitCode !== 0) {
        elizaLogger.error('Clone failed:', stderr.toString());
        return;
      }

      elizaLogger.info('✅ Clone successful!');

      // Checkout the base commit
      const baseCommit = instance.base_commit || instance.base?.sha;
      elizaLogger.info(`Checking out base commit: ${baseCommit}`);
      const checkoutResult = await Bun.$`cd ${repoPath} && git checkout ${baseCommit}`.quiet();

      if (checkoutResult.exitCode !== 0) {
        elizaLogger.error('Checkout failed:', checkoutResult.stderr.toString());
        return;
      }

      elizaLogger.info('✅ Checked out base commit!');

      // Look at the repository structure
      const files = await fs.readdir(repoPath);
      elizaLogger.info('\nRepository structure:');
      for (const file of files.slice(0, 10)) {
        elizaLogger.info(`  - ${file}`);
      }

      // Check if it's a TypeScript or JavaScript project
      const packageJson = JSON.parse(
        await fs.readFile(path.join(repoPath, 'package.json'), 'utf-8')
      );
      elizaLogger.info('\nProject info:');
      elizaLogger.info(`  - Name: ${packageJson.name}`);
      elizaLogger.info(`  - Version: ${packageJson.version}`);
      elizaLogger.info(`  - Main: ${packageJson.main}`);
      elizaLogger.info(`  - Scripts: ${Object.keys(packageJson.scripts || {}).join(', ')}`);

      // Now let's analyze what needs to be fixed
      elizaLogger.info('\n🎯 Fix Strategy:');
      elizaLogger.info(`Based on the issue: "${instance.issue_title || instance.title}"`);

      // Try to apply the test patch to see if tests are already passing
      if (instance.test_patch) {
        elizaLogger.info('\n🧪 Applying test patch...');
        const testPatchFile = path.join(testDir, 'test.patch');
        await fs.writeFile(testPatchFile, instance.test_patch);

        try {
          // First check if patch can be applied
          const checkResult =
            await Bun.$`cd ${repoPath} && git apply --check ${testPatchFile} 2>&1`.quiet();
          if (checkResult.exitCode !== 0) {
            elizaLogger.error(
              '❌ Patch check failed:',
              checkResult.stdout.toString() || checkResult.stderr.toString()
            );

            // Try to understand why
            elizaLogger.info('\n📝 Test patch content (first 20 lines):');
            const patchLines = instance.test_patch.split('\n');
            patchLines.slice(0, 20).forEach((line: string, idx: number) => {
              elizaLogger.info(`  ${idx + 1}: ${line}`);
            });
          } else {
            // Actually apply the patch
            const patchResult = await Bun.$`cd ${repoPath} && git apply ${testPatchFile}`.quiet();
            if (patchResult.exitCode === 0) {
              elizaLogger.info('✅ Test patch applied successfully!');

              // Run npm install
              elizaLogger.info('📦 Installing dependencies...');
              const installResult = await Bun.$`cd ${repoPath} && npm install`.quiet();
              if (installResult.exitCode !== 0) {
                elizaLogger.warn('⚠️  npm install had issues:', installResult.stderr.toString());
              }

              // Try to run tests
              elizaLogger.info('🧪 Running tests...');
              const testResult = await Bun.$`cd ${repoPath} && npm test`.quiet();
              elizaLogger.info(`Test exit code: ${testResult.exitCode}`);
              if (testResult.exitCode === 0) {
                elizaLogger.warn(
                  '⚠️  Tests are already passing! This might be why the evaluation is failing.'
                );
              } else {
                elizaLogger.info('✅ Tests are failing as expected, patch should fix them.');
              }
            } else {
              elizaLogger.error('❌ Failed to apply test patch:', patchResult.stderr.toString());
            }
          }
        } catch (error) {
          elizaLogger.error('Error applying test patch:', error);
        }
      }

      // Look for relevant files based on issue
      const issueKeywords = (instance.issue_title || instance.title || '')
        .toLowerCase()
        .split(/\s+/);
      elizaLogger.info(`\n🔍 Looking for files related to: ${issueKeywords.join(', ')}`);

      // Create regex pattern from keywords
      const pattern = new RegExp(issueKeywords.filter((k) => k.length > 2).join('|'), 'i');
      const relevantFiles = await findFiles(repoPath, pattern);
      elizaLogger.info('\nPotentially relevant files:');
      for (const file of relevantFiles.slice(0, 10)) {
        elizaLogger.info(`  - ${file}`);
      }

      // Clean up
      await fs.rm(testDir, { recursive: true, force: true });
    } catch (error) {
      elizaLogger.error('Error during debug:', error);
    }
  } catch (error) {
    elizaLogger.error('Failed to read cache:', error);
  }
}

async function findFiles(dir: string, pattern: RegExp): Promise<string[]> {
  const files: string[] = [];

  async function search(currentDir: string) {
    const entries = await fs.readdir(currentDir, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(currentDir, entry.name);
      const relativePath = path.relative(dir, fullPath);

      if (entry.isDirectory() && !entry.name.startsWith('.') && entry.name !== 'node_modules') {
        await search(fullPath);
      } else if (entry.isFile() && pattern.test(fullPath)) {
        files.push(relativePath);
      }
    }
  }

  await search(dir);
  return files;
}

// Run the debug script
debugInstance().catch((error) => {
  elizaLogger.error('Fatal error:', error);
  console.error('Stack trace:', error.stack);
  process.exit(1);
});
