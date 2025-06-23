import { describe, it, expect } from 'vitest';
import { lowlevelTestingPlugin } from './index';

describe('Lowlevel Testing Plugin', () => {
  it('should have correct plugin structure', () => {
    expect(lowlevelTestingPlugin.name).toBe('lowlevel-testing');
    expect(lowlevelTestingPlugin.description).toContain('Tests real implementations');
    expect(Array.isArray(lowlevelTestingPlugin.tests)).toBe(true);
    expect(lowlevelTestingPlugin.tests).toHaveLength(7);
  });

  it('should have testDependencies defined', () => {
    expect(Array.isArray(lowlevelTestingPlugin.testDependencies)).toBe(true);
    expect(lowlevelTestingPlugin.testDependencies).toContain('@elizaos/plugin-dummy-services');
  });

  it('should have init function', () => {
    expect(typeof lowlevelTestingPlugin.init).toBe('function');
  });

  it('should have all expected test suites', () => {
    const expectedTestSuites = [
      'Wallet Service Real Implementation Tests',
      'LP Service Real Implementation Tests',
      'Token Data Service Real Implementation Tests',
      'Token Creation Service Real Implementation Tests',
      'Swap Service Real Implementation Tests',
      'Messaging Service Real Implementation Tests',
      'Dummy Services Implementation Report & Tests',
    ];

    expectedTestSuites.forEach((suiteName) => {
      const suite = lowlevelTestingPlugin.tests?.find((test) => test.name === suiteName);
      expect(suite).toBeDefined();
      expect(Array.isArray(suite?.tests)).toBe(true);
    });
  });

  it('should have test cases in each suite', () => {
    lowlevelTestingPlugin.tests?.forEach((suite) => {
      expect(suite.tests.length).toBeGreaterThan(0);

      suite.tests.forEach((test) => {
        expect(typeof test.name).toBe('string');
        expect(typeof test.fn).toBe('function');
        expect(test.name.length).toBeGreaterThan(0);
      });
    });
  });
});
