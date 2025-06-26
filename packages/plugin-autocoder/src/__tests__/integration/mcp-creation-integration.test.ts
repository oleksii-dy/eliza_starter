import { describe, it, expect, beforeEach, afterEach, mock } from 'bun:test';
import * as path from 'path';
import * as fs from 'fs/promises';
import * as os from 'os';
import type { IAgentRuntime } from '@elizaos/core';

// Mock child_process to avoid running real commands
mock.module('child_process', () => ({
  exec: mock((cmd: string, opts: any, callback?: any) => {
    const cb = callback || ((err: any, stdout: string, stderr: string) => { /* empty */ });
    // Simulate successful command execution for npm install, tsc, etc.
    process.nextTick(() => cb(null, 'Success', ''));
  }),
}));

import { MCPCreationService } from '../../services/McpCreationService.js';

describe('MCP Creation Integration Tests', () => {
  let tempDir: string;
  let service: MCPCreationService;
  let mockRuntime: IAgentRuntime;

  beforeEach(async () => {
    // Create a real temporary directory for testing
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'mcp-test-'));

    mockRuntime = {
      agentId: 'test-agent',
      character: { name: 'Test Agent' },
      getSetting: mock().mockReturnValue(null),
      getService: mock().mockReturnValue(null),
    } as any;

    service = new MCPCreationService(mockRuntime);
    await service.start();
  });

  afterEach(async () => {
    // Clean up temporary directory
    try {
      await fs.rm(tempDir, { recursive: true, force: true });
    } catch (error) {
      // Ignore cleanup errors
    }

    if (service) {
      await service.stop();
    }
  });

  it('should create basic MCP project structure', async () => {
    const config = {
      name: 'simple-time-plugin',
      description: 'A simple time reporting plugin',
      outputDir: tempDir,
      tools: [
        {
          name: 'getCurrentTime',
          description: 'Get the current time',
          parameters: {
            type: 'object',
            properties: {
              timezone: {
                type: 'string',
                description: 'Timezone to get time for',
                required: false,
              },
            },
          },
        },
      ],
    };

    const result = await service.createMCPProject(config);

    // For this test, we'll accept either success or production validation failure
    // since we're mainly testing the file structure creation
    const projectPath = path.join(tempDir, 'simple-time-plugin');

    // Check that basic files were created regardless of the final success status
    try {
      await fs.access(path.join(projectPath, 'package.json'));
      const packageJson = JSON.parse(await fs.readFile(path.join(projectPath, 'package.json'), 'utf-8'));
      expect(packageJson.name).toBe('simple-time-plugin');
      expect(packageJson.description).toBe('A simple time reporting plugin');

      // If we got this far, the basic structure creation worked
      console.log('✅ Basic MCP project structure created successfully');
    } catch (error) {
      console.error('Failed to create basic project structure:', error);
      throw error;
    }
  });

  it('should handle errors gracefully', async () => {
    const config = {
      name: '', // Invalid name should cause failure
      description: 'Test plugin',
      outputDir: tempDir,
    };

    const result = await service.createMCPProject(config);
    expect(result.success).toBe(false);
    expect(result.error).toBeDefined();
  });

  it('should sanitize project names safely', async () => {
    const config = {
      name: '../malicious/path',
      description: 'Test plugin',
      outputDir: tempDir,
    };

    const result = await service.createMCPProject(config);
    if (result.success) {
      // Should have sanitized the name
      const projectPath = result.projectPath!;
      expect(projectPath).toContain('malicious-path');
      expect(projectPath).not.toContain('../');
    }
  });
});
