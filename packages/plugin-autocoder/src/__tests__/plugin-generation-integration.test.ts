import { describe, it, expect, beforeEach, mock, afterEach } from 'bun:test';
import type { IAgentRuntime } from '@elizaos/core';

// Mock modules with factory functions
const mockWriteFile = mock().mockResolvedValue(undefined);
const mockEnsureDir = mock().mockResolvedValue(undefined);
const mockWriteJson = mock().mockResolvedValue(undefined);
const mockPathExists = mock().mockResolvedValue(true);
const mockReadFile = mock().mockResolvedValue('');
const mockRemove = mock().mockResolvedValue(undefined);

mock.module('fs-extra', () => ({
  default: {
    ensureDir: mockEnsureDir,
    writeFile: mockWriteFile,
    writeJson: mockWriteJson,
    pathExists: mockPathExists,
    readFile: mockReadFile,
    remove: mockRemove,
  },
  ensureDir: mockEnsureDir,
  writeFile: mockWriteFile,
  writeJson: mockWriteJson,
  pathExists: mockPathExists,
  readFile: mockReadFile,
  remove: mockRemove,
}));

mock.module('child_process', () => ({
  spawn: mock(() => ({
    stdout: { on: mock() },
    stderr: { on: mock() },
    on: mock((event: string, callback: Function) => {
      if (event === 'close') {
        setTimeout(() => callback(0), 10);
      }
    }),
    kill: mock(),
  })),
}));

// Import after mocks
import { PluginCreationService, type PluginSpecification } from '../services/PluginCreationService.ts';
import { createMockRuntime } from './test-utils.ts';
import * as fs from 'fs-extra';
import * as utils from '../utils/plugin-templates.ts';
import { spawn } from 'child_process';

describe('Plugin Generation Integration', () => {
  let service: PluginCreationService;
  let _runtime: IAgentRuntime;

  beforeEach(async () => {
    mock.restore();

    // Clear all mock calls
    mockWriteFile.mockClear();
    mockEnsureDir.mockClear();
    mockWriteJson.mockClear();

    const runtime = createMockRuntime({
      getSetting: (key: string) => {
        if (key === 'PLUGIN_DATA_DIR') {
          return '/test/plugins';
        }
        if (key === 'ANTHROPIC_API_KEY') {
          return null;
        } // Force template usage
        return null;
      },
    });

    service = new PluginCreationService(runtime);
    await service.initialize(runtime);
  });

  afterEach(() => {
    service.stop();
  });

  it('should generate provider files with correct naming and formatting', async () => {
    const _spec: PluginSpecification = {
      name: '@test/time-plugin',
      description: 'Test time plugin',
      providers: [
        {
          name: 'timeProvider',
          description: 'Provides current time context',
          dataStructure: {
            currentTime: 'string',
            timezone: 'string',
          },
        },
      ],
    };

    const jobId = await service.createPlugin(_spec);

    // Wait for job to complete
    await new Promise((resolve) => setTimeout(resolve, 500));

    // Verify job completed successfully
    const job = service.getJob(jobId);
    expect(job?.status).toBe('completed');

    // Check that writeFile was called with the correct provider code
    const writeFileCalls = mockWriteFile.mock.calls;
    const providerCall = writeFileCalls.find((call) =>
      call[0].toString().includes('providers/timeProvider.ts')
    );

    expect(providerCall).toBeDefined();
    if (providerCall) {
      const generatedCode = providerCall[1] as string;

      // Check naming convention
      expect(generatedCode).toContain('export const timeProvider: Provider = {');
      expect(generatedCode).toContain('name: "timeProvider"');

      // Check newline formatting
      expect(generatedCode).toContain('`timeProvider Information:\\n`');
      expect(generatedCode).toContain(".join('\\n')");

      // Check data structure handling
      expect(generatedCode).toContain("currentTime: 'Sample currentTime value'");
      expect(generatedCode).toContain("timezone: 'Sample timezone value'");
    }
  });

  it('should generate index file with correct provider imports', async () => {
    const _spec: PluginSpecification = {
      name: '@test/multi-component',
      description: 'Test plugin with multiple components',
      actions: [
        {
          name: 'testAction',
          description: 'Test action',
        },
      ],
      providers: [
        {
          name: 'dataProvider',
          description: 'Data provider',
        },
        {
          name: 'configProvider',
          description: 'Config provider',
        },
      ],
    };

    const jobId = await service.createPlugin(_spec);

    // Wait for job to complete
    await new Promise((resolve) => setTimeout(resolve, 200));

    // Verify job completed successfully
    const job = service.getJob(jobId);
    expect(job?.status).toBe('completed');

    // Check index file generation
    const writeFileCalls = mockWriteFile.mock.calls;
    const indexCall = writeFileCalls.find((call) => call[0].toString().endsWith('src/index.ts'));

    expect(indexCall).toBeDefined();
    if (indexCall) {
      const indexCode = indexCall[1] as string;

      // Check imports
      expect(indexCode).toContain("import { testActionAction } from './actions/testAction.ts';");
      expect(indexCode).toContain("import { dataProvider } from './providers/dataProvider.ts';");
      expect(indexCode).toContain(
        "import { configProvider } from './providers/configProvider.ts';"
      );

      // Check plugin definition
      expect(indexCode).toContain('export const MulticomponentPlugin: Plugin = {');
      expect(indexCode).toContain('actions: [\n    testActionAction\n  ]');
      expect(indexCode).toContain('providers: [\n    dataProvider,\n    configProvider\n  ]');

      // Check exports
      expect(indexCode).toContain(
        'export {\n  testActionAction,\n  dataProvider,\n  configProvider\n};'
      );
    }
  });

  it('should handle providers with "Provider" suffix correctly', async () => {
    const _spec: PluginSpecification = {
      name: '@test/suffix-test',
      description: 'Test provider suffix handling',
      providers: [
        {
          name: 'timeProvider',
          description: 'Already has Provider suffix',
        },
        {
          name: 'data',
          description: 'No Provider suffix',
        },
      ],
    };

    const jobId = await service.createPlugin(_spec);

    // Wait for job to complete
    await new Promise((resolve) => setTimeout(resolve, 200));

    // Verify job completed successfully
    const job = service.getJob(jobId);
    expect(job?.status).toBe('completed');

    const writeFileCalls = mockWriteFile.mock.calls;

    // Check timeProvider file (already has suffix)
    const timeProviderCall = writeFileCalls.find((call) =>
      call[0].toString().includes('providers/timeProvider.ts')
    );
    expect(timeProviderCall).toBeDefined();
    if (timeProviderCall) {
      const code = timeProviderCall[1] as string;
      expect(code).toContain('export const timeProvider: Provider = {');
    }

    // Check data provider file (no suffix)
    const dataProviderCall = writeFileCalls.find((call) =>
      call[0].toString().includes('providers/data.ts')
    );
    expect(dataProviderCall).toBeDefined();
    if (dataProviderCall) {
      const code = dataProviderCall[1] as string;
      expect(code).toContain('export const data: Provider = {');
    }

    // Check index file imports
    const indexCall = writeFileCalls.find((call) => call[0].toString().endsWith('src/index.ts'));
    expect(indexCall).toBeDefined();
    if (indexCall) {
      const indexCode = indexCall[1] as string;
      expect(indexCode).toContain("import { timeProvider } from './providers/timeProvider.ts';");
      expect(indexCode).toContain("import { dataProvider } from './providers/data.ts';");
      expect(indexCode).toContain('providers: [\n    timeProvider,\n    dataProvider\n  ]');
    }
  });

  it('should generate valid TypeScript code that would compile', async () => {
    const _spec: PluginSpecification = {
      name: '@test/compile-test',
      description: 'Test compilation validity',
      providers: [
        {
          name: 'testProvider',
          description: 'Test provider',
          dataStructure: {
            field1: 'string',
            field2: 'number',
            field3: 'boolean',
          },
        },
      ],
    };

    const jobId = await service.createPlugin(_spec);

    // Wait for job to complete
    await new Promise((resolve) => setTimeout(resolve, 200));

    // Verify job completed successfully
    const job = service.getJob(jobId);
    expect(job?.status).toBe('completed');

    const writeFileCalls = mockWriteFile.mock.calls;
    const providerCall = writeFileCalls.find((call) =>
      call[0].toString().includes('providers/testProvider.ts')
    );

    expect(providerCall).toBeDefined();
    if (providerCall) {
      const code = providerCall[1] as string;

      // Check for valid TypeScript syntax
      expect(code).toMatch(/import \{[\s\S]*\} from "@elizaos\/core";/);
      expect(code).toMatch(/export const \w+: Provider = \{/);
      expect(code).toMatch(/async \([\s\S]*\): Promise<ProviderResult> =>/);

      // Check template literal syntax is correct
      expect(code).not.toContain('\\`'); // No escaped backticks
      expect(code).toContain('`testProvider Information:\\n`');

      // Check data structure mapping
      expect(code).toContain("field1: 'Sample field1 value'");
      expect(code).toContain('field2: 0');
      expect(code).toContain('field3: false');
    }
  });
});
