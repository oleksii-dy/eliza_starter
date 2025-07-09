import type { IAgentRuntime, TestSuite } from '@elizaos/core';
import { strict as assert } from 'node:assert';
import path from 'path';
import fs from 'fs-extra';
import os from 'os';
import { PluginManagerService } from '../../services/pluginManagerService.ts';
import { PluginManagerServiceType } from '../../types.ts';

/**
 * E2E Test Suite for the full plugin lifecycle.
 *
 * NOTE: This test requires a live environment and specific environment variables
 * to be set to run correctly. It interacts with a real GitHub repository.
 *
 * Required Environment Variables:
 * - E2E_GITHUB_TOKEN: A GitHub personal access token with `repo` scope.
 * - E2E_TEST_REPO_URL: The HTTPS URL of a test repository the token has write access to.
 *   (e.g., https://github.com/your-username/your-test-repo.git)
 */
export const fullLifecycleE2ETest: TestSuite = {
  name: 'Plugin Manager Full Lifecycle E2E Test',
  tests: [
    {
      name: 'should clone, edit, and create a pull request for a plugin',
      fn: async (runtime: IAgentRuntime) => {
        const GITHUB_TOKEN = process.env.E2E_GITHUB_TOKEN;
        const REPO_URL = process.env.E2E_TEST_REPO_URL;

        if (!GITHUB_TOKEN || !REPO_URL) {
          console.log('[E2E Test] Skipping GitHub test: Required environment variables not set.');
          console.log('  - E2E_GITHUB_TOKEN:', GITHUB_TOKEN ? 'set' : 'not set');
          console.log('  - E2E_TEST_REPO_URL:', REPO_URL ? 'set' : 'not set');
          return; // Skip test gracefully
        }

        // Use the real PluginManagerService from the runtime
        const pluginManager = runtime.getService(
          PluginManagerServiceType.PLUGIN_MANAGER
        ) as PluginManagerService;
        assert(pluginManager, 'PluginManagerService not found in runtime.');

        // Override runtime settings to inject the token for this test
        const originalGetSetting = runtime.getSetting;
        runtime.getSetting = (key: string) => {
          if (key === 'GITHUB_TOKEN') {
            return GITHUB_TOKEN;
          }
          return originalGetSetting.call(runtime, key);
        };

        const tempDir = path.join(os.tmpdir(), `eliza-e2e-test-${Date.now()}`);
        await fs.ensureDir(tempDir);

        console.log(`[E2E Test] Using temporary directory: ${tempDir}`);

        try {
          // 1. Clone the repository
          console.log(`[E2E Test] Cloning repository: ${REPO_URL}`);
          const cloneResult = await pluginManager.cloneRepository(REPO_URL, tempDir);
          assert.strictEqual(
            cloneResult.success,
            true,
            `Failed to clone repo: ${cloneResult.error}`
          );
          assert(
            await fs.pathExists(path.join(tempDir, 'README.md')),
            'README.md not found after clone'
          );
          console.log('[E2E Test] Clone successful.');

          // 2. Edit a file
          const readmePath = path.join(tempDir, 'README.md');
          const newContent = `\n\nE2E test modification at ${new Date().toISOString()}`;
          await fs.appendFile(readmePath, newContent);
          console.log('[E2E Test] README.md modified.');

          // 3. Create a Pull Request
          const branchName = `e2e-test-branch-${Date.now()}`;
          const prTitle = `E2E Test PR: ${new Date().toISOString()}`;
          const prBody = 'This is an automated pull request created by an E2E test.';

          console.log(`[E2E Test] Creating pull request on new branch: ${branchName}`);

          const prResult = await pluginManager.createPullRequest(tempDir, {
            branch: branchName,
            title: prTitle,
            body: prBody,
            files: [{ path: 'README.md', content: await fs.readFile(readmePath, 'utf-8') }],
          });

          assert(prResult, 'Pull request creation should return a result.');
          assert(prResult.id, 'Pull request should have an ID.');
          assert.strictEqual(prResult.title, prTitle, 'Pull request title is incorrect.');
          console.log(`[E2E Test] Pull request created successfully: ${prResult.url}`);
        } finally {
          // Cleanup
          runtime.getSetting = originalGetSetting; // Restore original getSetting
          await fs.remove(tempDir);
          console.log(`[E2E Test] Cleaned up temporary directory: ${tempDir}`);
        }
      },
    },
  ],
};
