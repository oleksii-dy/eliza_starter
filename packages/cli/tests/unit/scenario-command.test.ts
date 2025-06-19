import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  runScenarioCommand,
  loadScenarios,
  loadScenarioFile,
  loadScenariosFromDirectory,
  initializeServer,
} from '../../src/commands/scenario/index.js';
import { ScenarioActionTracker } from '../../src/commands/scenario/action-tracker.js';
import type { Scenario, ScenarioActor } from '../../src/scenario-runner/types.js';
import * as fs from 'fs';
import * as path from 'path';

// Mock fs module
vi.mock('fs');
vi.mock('fs/promises');

describe('Scenario Command Module', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('loadScenarioFile', () => {
    it('should load JSON scenario files', async () => {
      const mockScenario: Scenario = {
        id: 'test-scenario',
        name: 'Test Scenario',
        description: 'Test',
        actors: [],
        setup: {},
        execution: {},
        verification: { rules: [] },
      };

      vi.mocked(fs.existsSync).mockReturnValue(true);
      const fsPromises = await import('fs/promises');
      vi.mocked(fsPromises.readFile).mockResolvedValue(JSON.stringify(mockScenario));

      const scenario = await loadScenarioFile('/test/scenario.json');

      expect(scenario).toEqual(mockScenario);
      expect(fsPromises.readFile).toHaveBeenCalledWith(
        path.resolve('/test/scenario.json'),
        'utf-8'
      );
    });

    it('should load TypeScript scenario files', async () => {
      vi.mocked(fs.existsSync).mockReturnValue(true);
      
      // Mock dynamic import
      const mockModule = {
        default: {
          id: 'ts-scenario',
          name: 'TS Scenario',
          description: 'TypeScript scenario',
          actors: [],
          setup: {},
          execution: {},
          verification: { rules: [] },
        },
      };

      // Create a temporary file and mock its import
      const testPath = path.resolve('/test/scenario.ts');
      vi.doMock(testPath, () => mockModule);

      const scenario = await loadScenarioFile('/test/scenario.ts');

      expect(scenario).toEqual(mockModule.default);
    });

    it('should throw error for non-existent files', async () => {
      vi.mocked(fs.existsSync).mockReturnValue(false);

      await expect(loadScenarioFile('/non/existent.json')).rejects.toThrow(
        'Scenario file not found'
      );
    });

    it('should throw error for unsupported file formats', async () => {
      vi.mocked(fs.existsSync).mockReturnValue(true);

      await expect(loadScenarioFile('/test/scenario.txt')).rejects.toThrow(
        'Unsupported scenario file format'
      );
    });
  });

  describe('loadScenariosFromDirectory', () => {
    it('should load all scenario files from directory', async () => {
      const fsPromises = await import('fs/promises');
      
      vi.mocked(fsPromises.readdir).mockResolvedValue([
        'scenario1.json',
        'scenario2.ts',
        'not-a-scenario.txt',
        'subdir',
      ] as any);

      vi.mocked(fsPromises.stat).mockImplementation(async (filePath) => {
        const pathStr = String(filePath);
        if (pathStr.includes('subdir')) {
          return { isFile: () => false, isDirectory: () => true } as any;
        }
        return { isFile: () => true, isDirectory: () => false } as any;
      });

      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fsPromises.readFile).mockImplementation(async (filePath) => {
        const pathStr = String(filePath);
        if (pathStr.includes('scenario1.json')) {
          return JSON.stringify({
            id: 'scenario1',
            name: 'Scenario 1',
            actors: [],
            setup: {},
            execution: {},
            verification: { rules: [] },
          });
        }
        return '{}';
      });

      // Mock imports for TS files
      vi.doMock(path.join('/test/dir', 'scenario2.ts'), () => ({
        default: {
          id: 'scenario2',
          name: 'Scenario 2',
          actors: [],
          setup: {},
          execution: {},
          verification: { rules: [] },
        },
      }));

      const scenarios = await loadScenariosFromDirectory('/test/dir');

      expect(scenarios).toHaveLength(2);
      expect(scenarios[0].id).toBe('scenario1');
    });

    it('should handle errors gracefully', async () => {
      const fsPromises = await import('fs/promises');
      vi.mocked(fsPromises.readdir).mockRejectedValue(new Error('Permission denied'));

      const scenarios = await loadScenariosFromDirectory('/restricted/dir');

      expect(scenarios).toEqual([]);
    });
  });

  describe('loadScenarios', () => {
    it('should load single scenario when --scenario option is provided', async () => {
      const options = {
        scenario: '/test/scenario.json',
      };

      vi.mocked(fs.existsSync).mockReturnValue(true);
      const fsPromises = await import('fs/promises');
      vi.mocked(fsPromises.readFile).mockResolvedValue(
        JSON.stringify({
          id: 'single-scenario',
          name: 'Single Scenario',
          actors: [],
          setup: {},
          execution: {},
          verification: { rules: [] },
        })
      );

      const scenarios = await loadScenarios(options);

      expect(scenarios).toHaveLength(1);
      expect(scenarios[0].id).toBe('single-scenario');
    });

    it('should filter scenarios by pattern', async () => {
      const options = {
        directory: '/test/scenarios',
        filter: 'auth',
      };

      const fsPromises = await import('fs/promises');
      vi.mocked(fsPromises.readdir).mockResolvedValue(['auth-test.json', 'other-test.json'] as any);
      vi.mocked(fsPromises.stat).mockResolvedValue({ isFile: () => true, isDirectory: () => false } as any);
      vi.mocked(fs.existsSync).mockReturnValue(true);

      vi.mocked(fsPromises.readFile).mockImplementation(async (filePath) => {
        const pathStr = String(filePath);
        if (pathStr.includes('auth-test')) {
          return JSON.stringify({
            id: 'auth-test',
            name: 'Authentication Test',
            tags: ['auth'],
            actors: [],
            setup: {},
            execution: {},
            verification: { rules: [] },
          });
        }
        return JSON.stringify({
          id: 'other-test',
          name: 'Other Test',
          tags: ['other'],
          actors: [],
          setup: {},
          execution: {},
          verification: { rules: [] },
        });
      });

      const scenarios = await loadScenarios(options);

      expect(scenarios).toHaveLength(1);
      expect(scenarios[0].id).toBe('auth-test');
    });

    it('should look for scenarios in default locations', async () => {
      const options = {};

      vi.mocked(fs.existsSync).mockImplementation((pathArg) => {
        const pathStr = String(pathArg);
        return pathStr.includes('./scenarios');
      });

      const fsPromises = await import('fs/promises');
      vi.mocked(fsPromises.readdir).mockResolvedValue(['default.json'] as any);
      vi.mocked(fsPromises.stat).mockResolvedValue({ isFile: () => true, isDirectory: () => false } as any);
      vi.mocked(fsPromises.readFile).mockResolvedValue(
        JSON.stringify({
          id: 'default-scenario',
          name: 'Default Scenario',
          actors: [],
          setup: {},
          execution: {},
          verification: { rules: [] },
        })
      );

      const scenarios = await loadScenarios(options);

      expect(scenarios.length).toBeGreaterThan(0);
    });
  });
});

describe('ScenarioActionTracker', () => {
  let tracker: ScenarioActionTracker;
  let mockRuntime: any;
  let mockContext: any;
  let mockMetricsCollector: any;

  beforeEach(() => {
    mockMetricsCollector = {
      recordAction: vi.fn(),
    };

    tracker = new ScenarioActionTracker(mockMetricsCollector);

    mockRuntime = {
      actions: {
        execute: vi.fn().mockResolvedValue(true),
      },
    };

    mockContext = {
      scenario: { id: 'test-scenario' },
    };
  });

  describe('startTracking', () => {
    it('should intercept action executions', async () => {
      await tracker.startTracking(mockRuntime, mockContext);

      // Execute an action through the intercepted method
      await mockRuntime.actions.execute({ name: 'TEST_ACTION' });

      expect(mockMetricsCollector.recordAction).toHaveBeenCalledWith('TEST_ACTION');
    });

    it('should track action counts', async () => {
      await tracker.startTracking(mockRuntime, mockContext);

      // Execute multiple actions
      await mockRuntime.actions.execute({ name: 'ACTION_1' });
      await mockRuntime.actions.execute({ name: 'ACTION_2' });
      await mockRuntime.actions.execute({ name: 'ACTION_1' });

      const counts = tracker.getActionCounts();
      expect(counts['ACTION_1']).toBe(2);
      expect(counts['ACTION_2']).toBe(1);
    });

    it('should handle actions without runtime.actions gracefully', async () => {
      const runtimeWithoutActions = {};

      await expect(
        tracker.startTracking(runtimeWithoutActions as any, mockContext)
      ).resolves.not.toThrow();
    });
  });

  describe('stopTracking', () => {
    it('should restore original execute method', async () => {
      const originalExecute = mockRuntime.actions.execute;
      
      await tracker.startTracking(mockRuntime, mockContext);
      expect(mockRuntime.actions.execute).not.toBe(originalExecute);

      (global as any).runtime = mockRuntime;
      await tracker.stopTracking();
      
      // Clean up global
      delete (global as any).runtime;
    });

    it('should clear action counts', async () => {
      await tracker.startTracking(mockRuntime, mockContext);
      await mockRuntime.actions.execute({ name: 'TEST_ACTION' });

      expect(tracker.getTotalActionCount()).toBe(1);

      await tracker.stopTracking();
      expect(tracker.getTotalActionCount()).toBe(0);
    });
  });

  describe('getTotalActionCount', () => {
    it('should return total count of all actions', async () => {
      await tracker.startTracking(mockRuntime, mockContext);

      await mockRuntime.actions.execute({ name: 'ACTION_1' });
      await mockRuntime.actions.execute({ name: 'ACTION_2' });
      await mockRuntime.actions.execute({ name: 'ACTION_1' });
      await mockRuntime.actions.execute({ name: 'ACTION_3' });

      expect(tracker.getTotalActionCount()).toBe(4);
    });

    it('should return 0 when no actions executed', () => {
      expect(tracker.getTotalActionCount()).toBe(0);
    });
  });

  describe('getActionCounts', () => {
    it('should return counts by action name', async () => {
      await tracker.startTracking(mockRuntime, mockContext);

      await mockRuntime.actions.execute({ name: 'RESEARCH' });
      await mockRuntime.actions.execute({ name: 'CREATE_TODO' });
      await mockRuntime.actions.execute({ name: 'RESEARCH' });

      const counts = tracker.getActionCounts();
      expect(counts).toEqual({
        RESEARCH: 2,
        CREATE_TODO: 1,
      });
    });

    it('should return empty object when no actions executed', () => {
      const counts = tracker.getActionCounts();
      expect(counts).toEqual({});
    });
  });
}); 