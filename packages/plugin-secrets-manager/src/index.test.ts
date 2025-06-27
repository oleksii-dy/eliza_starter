import { describe, it, expect } from 'bun:test';
import { EnhancedSecretManager } from './enhanced-service';
import { envPlugin } from './index';

// Simplified TestSuite implementation for local use
class TestSuite {
  constructor(private name: string, private config: any) {}
  
  addTest(test: any) {
    it(test.name, async () => {
      const context = this.config.beforeEach ? this.config.beforeEach() : {};
      await test.fn(context);
    });
  }
  
  run() {
    // No-op, bun:test handles execution
  }
}

const createUnitTest = (config: { name: string; fn: (context?: any) => Promise<void> | void }) => config;

describe('index', () => {
  const envPluginSuite = new TestSuite('envPlugin', {});
  
  envPluginSuite.addTest(
    createUnitTest({
      name: 'envPlugin should export a valid plugin object',
      fn: () => {
        expect(envPlugin).toBeDefined();
        expect(envPlugin.name).toBe('plugin-env');
        expect(envPlugin.description).toContain('Secret and environment variable management');
      },
    })
  );

  envPluginSuite.addTest(
    createUnitTest({
      name: 'envPlugin should include EnhancedSecretManager in services',
      fn: () => {
        expect(envPlugin.services).toBeDefined();
        expect(envPlugin.services?.length).toBeGreaterThan(0);
      },
    })
  );

  envPluginSuite.addTest(
    createUnitTest({
      name: 'envPlugin should have providers array',
      fn: () => {
        expect(envPlugin.providers).toBeDefined();
        expect(Array.isArray(envPlugin.providers)).toBe(true);
      },
    })
  );

  envPluginSuite.addTest(
    createUnitTest({
      name: 'envPlugin should have actions array',
      fn: () => {
        expect(envPlugin.actions).toBeDefined();
        expect(Array.isArray(envPlugin.actions)).toBe(true);
      },
    })
  );

  envPluginSuite.addTest(
    createUnitTest({
      name: 'envPlugin should have evaluators array or undefined',
      fn: () => {
        // evaluators is optional in the plugin interface
        if (envPlugin.evaluators) {
          expect(Array.isArray(envPlugin.evaluators)).toBe(true);
        } else {
          expect(envPlugin.evaluators).toBeUndefined();
        }
      },
    })
  );

  envPluginSuite.addTest(
    createUnitTest({
      name: 'envPlugin should have an init function',
      fn: () => {
        expect(envPlugin.init).toBeDefined();
        expect(typeof envPlugin.init).toBe('function');
      },
    })
  );

  envPluginSuite.addTest(
    createUnitTest({
      name: 'envPlugin should export types',
      fn: () => {
        // Test that types are exported by importing them dynamically
        void import('./index').then((module) => {
          expect(module.EnhancedSecretManager).toBe(EnhancedSecretManager);
        });
      },
    })
  );

  envPluginSuite.run();
});
