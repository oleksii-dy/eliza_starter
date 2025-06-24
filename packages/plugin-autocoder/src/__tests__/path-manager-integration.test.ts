import { describe, it, expect, beforeEach } from 'vitest';
import { OrchestrationManager } from '../managers/orchestration-manager';
import { createMockRuntime } from './test-helpers/mock-runtime';
import * as path from 'path';
import * as fs from 'fs-extra';

describe('OrchestrationManager Path Integration', () => {
  let orchestrationManager: OrchestrationManager;
  let mockRuntime: any;

  beforeEach(() => {
    mockRuntime = createMockRuntime();
    orchestrationManager = new OrchestrationManager(mockRuntime);
  });

  it('should use .eliza directory for data storage', () => {
    // Get the data directory from the private method (we'll test the effect)
    const dataDir = (orchestrationManager as any).getDataDir();

    // Verify it points to .eliza structure
    expect(dataDir).toContain('.eliza');
    expect(dataDir).toContain('plugins');
    expect(dataDir).toContain('autocoder');
  });

  it('should create archives in .eliza/data/plugins/autocoder/archives', async () => {
    // Initialize the manager
    await orchestrationManager.initialize();

    // The lifecycle manager should be using the correct path
    const lifecycleManager = (orchestrationManager as any).lifecycleManager;
    const archiveDir = lifecycleManager.archiveDir;

    expect(archiveDir).toContain('.eliza');
    expect(archiveDir).toContain('data');
    expect(archiveDir).toContain('plugins');
    expect(archiveDir).toContain('autocoder');
    expect(archiveDir).toContain('archives');
  });

  it('should create logs in .eliza/data/plugins/autocoder/logs', async () => {
    // Initialize the manager
    await orchestrationManager.initialize();

    // The detailed logger should be using the correct path
    const detailedLogger = (orchestrationManager as any).detailedLogger;
    const logDir = detailedLogger.logDir;

    expect(logDir).toContain('.eliza');
    expect(logDir).toContain('data');
    expect(logDir).toContain('plugins');
    expect(logDir).toContain('autocoder');
    expect(logDir).toContain('logs');
  });

  it('should not use legacy paths like test-key or .eliza-data', () => {
    const dataDir = (orchestrationManager as any).getDataDir();

    // Should not contain legacy paths
    expect(dataDir).not.toContain('test-key');
    expect(dataDir).not.toContain('test-api-key');
    expect(dataDir).not.toContain('fallback-api-key');
    expect(dataDir).not.toContain('.eliza-data');
  });
});
