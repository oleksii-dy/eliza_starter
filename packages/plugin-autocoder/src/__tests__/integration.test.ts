import { describe, it, expect, beforeEach } from 'vitest';
import { autocoderPlugin } from '../index.js';
import { createMockRuntime } from './test-utils.js';

describe('AutoCoder Plugin Integration', () => {
  let mockRuntime: any;

  beforeEach(() => {
    mockRuntime = createMockRuntime();
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
    expect(autocoderPlugin.services).toHaveLength(7);

    const serviceNames = autocoderPlugin.services?.map((service) => service.serviceName) || [];
    expect(serviceNames).toContain('docker');
    expect(serviceNames).toContain('communication-bridge');
    expect(serviceNames).toContain('container-orchestrator');
    expect(serviceNames).toContain('task-manager');
    expect(serviceNames).toContain('secure-environment');
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
    mockRuntime.getService.mockImplementation((name: string) => {
      if (name === 'trust-engine') return { getTrustLevel: () => 75 };
      if (name === 'role-manager') return { validateRole: () => true };
      if (name === 'docker') return { ping: () => Promise.resolve(true) };
      return null;
    });

    // Should not throw
    await expect(autocoderPlugin.init?.({}, mockRuntime)).resolves.toBeUndefined();
  });

  it('should initialize without errors when trust services are not available', async () => {
    mockRuntime.getService.mockImplementation((name: string) => {
      if (name === 'docker') return { ping: () => Promise.resolve(true) };
      return null; // No trust services
    });

    // Should not throw
    await expect(autocoderPlugin.init?.({}, mockRuntime)).resolves.toBeUndefined();
  });

  it('should initialize without errors and not modify runtime directly', async () => {
    await autocoderPlugin.init?.({}, mockRuntime);

    // Init function should complete without error
    // Actions are registered by the framework, not by the init function
    expect(mockRuntime.registerAction).not.toHaveBeenCalled();
    expect(autocoderPlugin.actions).toBeDefined();
    expect(autocoderPlugin.actions?.length).toBeGreaterThan(0);
  });
});
