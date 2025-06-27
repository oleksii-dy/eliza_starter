import { describe, it, expect, beforeEach, afterEach } from 'bun:test';
import autocoderPlugin from '../index.ts';
import type { IAgentRuntime } from '@elizaos/core';
import { mkdtemp, rm } from 'fs/promises';
import { tmpdir } from 'os';
import * as path from 'path';

describe('AutoCoder Plugin Integration', () => {
  let runtime: IAgentRuntime;
  let tempDir: string;

  beforeEach(async () => {
    // Create temporary directory for test data
    tempDir = await mkdtemp(path.join(tmpdir(), 'autocoder-test-'));

    // Create a minimal runtime for testing
    runtime = {
      agentId: '00000000-0000-0000-0000-000000000000',
      character: {
        name: 'TestAgent',
        bio: ['Test agent for integration tests'],
        system: 'You are a test agent.',
        settings: {
          PLUGIN_DATA_DIR: tempDir,
        },
      },
      getSetting: (key: string) => {
        const settings: Record<string, any> = {
          PLUGIN_DATA_DIR: tempDir,
        };
        return settings[key] || process.env[key];
      },
      getService: (name: string) => {
        // Return mock services as needed
        if (name === 'trust-engine') {
          return { getTrustLevel: () => 75 };
        }
        if (name === 'role-manager') {
          return { validateRole: () => true };
        }
        if (name === 'docker') {
          return { ping: () => Promise.resolve(true) };
        }
        return null;
      },
      services: new Map(),
      registerService: () => {
        /* empty */
      },
    } as any;
  });

  afterEach(async () => {
    // Clean up temporary directory
    if (tempDir) {
      await rm(tempDir, { recursive: true, force: true });
    }
  });

  it('should export a valid plugin', () => {
    expect(autocoderPlugin).toBeDefined();
    expect(autocoderPlugin.name).toBe('@elizaos/plugin-autocoder');
    expect(autocoderPlugin.description).toContain('auto-coding system');
    expect(autocoderPlugin.services).toBeDefined();
    expect(autocoderPlugin.actions).toBeDefined();
    expect(autocoderPlugin.providers).toBeDefined();
  });

  it('should have all required services', () => {
    expect(autocoderPlugin.services).toBeDefined();
    expect(autocoderPlugin.services?.length).toBeGreaterThanOrEqual(5);

    const serviceNames =
      autocoderPlugin.services?.map((service) =>
        typeof service === 'function' ? service.serviceName : service.component.serviceName
      ) || [];
    expect(serviceNames).toContain('docker');
    expect(serviceNames).toContain('autocoder');
  });

  it('should have container management actions', () => {
    const actionNames = autocoderPlugin.actions?.map((action) => action.name) || [];
    expect(actionNames).toContain('SPAWN_SUB_AGENT');
    expect(actionNames).toContain('MONITOR_TASK');
    expect(actionNames).toContain('TERMINATE_TASK');
  });

  it('should declare correct dependencies', () => {
    expect(autocoderPlugin.dependencies).toContain('plugin-env');
    expect(autocoderPlugin.dependencies).toContain('plugin-manager');
    expect(autocoderPlugin.dependencies).toContain('plugin-trust');
  });

  it('should initialize without errors when trust services are available', async () => {
    // Services are already set up in beforeEach with trust services

    // Should not throw
    await expect(
      autocoderPlugin.init?.(
        {
          /* empty */
        },
        runtime
      )
    ).resolves.toBeUndefined();
  });

  it('should initialize without errors when trust services are not available', async () => {
    // Create runtime without trust services
    const runtimeWithoutTrust = {
      ...runtime,
      getService: (name: string) => {
        if (name === 'docker') {
          return { ping: () => Promise.resolve(true) };
        }
        return null; // No trust services
      },
    } as IAgentRuntime;

    // Should not throw
    await expect(
      autocoderPlugin.init?.(
        {
          /* empty */
        },
        runtimeWithoutTrust
      )
    ).resolves.toBeUndefined();
  });

  it('should initialize without errors and not modify runtime directly', async () => {
    await autocoderPlugin.init?.(
      {
        /* empty */
      },
      runtime
    );

    // Init function should complete without error
    // Actions are registered by the framework, not by the init function
    expect(autocoderPlugin.actions).toBeDefined();
    expect(autocoderPlugin.actions?.length).toBeGreaterThan(0);
  });
});
