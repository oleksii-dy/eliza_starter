import { describe, it, expect, beforeAll, afterAll, spyOn } from 'bun:test';
import plugin from '../plugin';
import { logger } from '@elizaos/core';
import type { HandlerCallback } from '@elizaos/core';
import dotenv from 'dotenv';
import {
  runCoreActionTests,
  documentTestResult,
  createMockRuntime,
  createMockMessage,
  createMockState,
} from './utils/core-test-utils';

// Setup environment variables
dotenv.config();

// Spy on logger to capture logs for documentation
beforeAll(() => {
  spyOn(logger, 'info');
  spyOn(logger, 'error');
  spyOn(logger, 'warn');
});

afterAll(() => {
  // No global restore needed in bun:test;
});

describe('Actions', () => {
  // Check that actions array exists (even if empty)
  it('should have actions array defined', () => {
    expect(plugin.actions).toBeDefined();
    expect(Array.isArray(plugin.actions)).toBe(true);
  });

  // Run core tests on all plugin actions
  it('should pass core action tests', () => {
    if (plugin.actions && plugin.actions.length > 0) {
      const coreTestResults = runCoreActionTests(plugin.actions);
      expect(coreTestResults).toBeDefined();
      expect(coreTestResults.formattedNames).toBeDefined();
      expect(coreTestResults.formattedActions).toBeDefined();
      expect(coreTestResults.composedExamples).toBeDefined();

      // Document the core test results
      documentTestResult('Core Action Tests', coreTestResults);
    } else {
      // Plugin has no actions, which is valid
      expect(true).toBe(true);
    }
  });

  describe('Actions Status', () => {
    it('should have empty actions array for this starter plugin', () => {
      expect(plugin.actions).toEqual([]);
    });
  });
});
