import { describe, it, expect, beforeEach, vi } from 'vitest';
import * as utils from '../utils/plugin-templates';
import type { PluginSpecification } from '../services/plugin-creation-service';

describe('Plugin Generation - Naming and Formatting', () => {
  describe('Provider Generation', () => {
    it('should generate provider with correct naming convention', () => {
      const providerCode = utils.generateProviderCode(
        'timeProvider',
        'Provides current time context to the agent',
        {
          currentTime: 'string',
          timezone: 'string',
          offset: 'string',
        }
      );

      // Check that the export name is correct (should be timeProvider, not timeProviderProvider)
      expect(providerCode).toContain('export const timeProvider: Provider = {');
      expect(providerCode).not.toContain('export const timeProviderProvider: Provider = {');

      // Check that the name property matches
      expect(providerCode).toContain('name: "timeProvider"');
    });

    it('should handle provider names that already end with "Provider"', () => {
      const providerCode = utils.generateProviderCode('dataProvider', 'Provides data context', {});

      // Should still export as dataProvider (camelCase of input)
      expect(providerCode).toContain('export const dataProvider: Provider = {');
      expect(providerCode).toContain('name: "dataProvider"');
    });

    it('should format text output with proper escaped newlines', () => {
      const providerCode = utils.generateProviderCode('testProvider', 'Test provider', {
        field1: 'string',
        field2: 'number',
      });

      // Check for proper template literal with escaped newlines
      expect(providerCode).toContain('const formattedText = `testProvider Information:\\n` +');
      expect(providerCode).toContain(".join('\\n');");

      // Should not contain literal newlines in the template
      expect(providerCode).not.toMatch(/Information:\n/); // literal newline
    });
  });

  describe('Plugin Index Generation', () => {
    it('should handle provider imports correctly', () => {
      const spec: PluginSpecification = {
        name: '@elizaos/plugin-time',
        description: 'A time and timezone management plugin',
        providers: [
          {
            name: 'timeProvider',
            description: 'Provides current time context',
          },
        ],
      };

      const indexCode = utils.generatePluginIndex(spec.name, spec);

      // Should import with correct name
      expect(indexCode).toContain("import { timeProvider } from './providers/timeProvider.js';");

      // Should export in providers array
      expect(indexCode).toContain('providers: [\n    timeProvider\n  ]');

      // Should export individually
      expect(indexCode).toContain('export {\n  timeProvider\n};');
    });

    it('should handle providers with "Provider" suffix correctly', () => {
      const spec: PluginSpecification = {
        name: '@test/plugin',
        description: 'Test plugin',
        providers: [
          {
            name: 'dataProvider',
            description: 'Data provider',
          },
        ],
      };

      const indexCode = utils.generatePluginIndex(spec.name, spec);

      // Should still use camelCase name
      expect(indexCode).toContain("import { dataProvider } from './providers/dataProvider.js';");
      expect(indexCode).toContain('providers: [\n    dataProvider\n  ]');
    });

    it('should generate correct plugin class name', () => {
      const spec1: PluginSpecification = {
        name: '@elizaos/plugin-time',
        description: 'Time plugin',
      };

      const indexCode1 = utils.generatePluginIndex(spec1.name, spec1);
      expect(indexCode1).toContain('export const PlugintimePlugin: Plugin = {');

      const spec2: PluginSpecification = {
        name: 'simple-test',
        description: 'Simple test',
      };

      const indexCode2 = utils.generatePluginIndex(spec2.name, spec2);
      expect(indexCode2).toContain('export const SimpletestPlugin: Plugin = {');
    });
  });

  describe('Action Generation', () => {
    it('should generate actions with correct naming', () => {
      const actionCode = utils.generateActionCode(
        'getCurrentTime',
        'Get the current time in a specified timezone',
        {
          timezone: {
            type: 'string',
            description: 'IANA timezone',
            required: false,
          },
        }
      );

      expect(actionCode).toContain('export const getCurrentTimeAction: Action = {');
      expect(actionCode).toContain('name: "getCurrentTime"');
    });
  });

  describe('Template Escaping', () => {
    it('should properly escape all template literals', () => {
      const providerCode = utils.generateProviderCode('test', 'Test provider');

      // Count backticks - should be balanced
      const backticks = providerCode.match(/`/g) || [];
      expect(backticks.length % 2).toBe(0);

      // Check for proper escaping in error messages
      expect(providerCode).toContain('text: `Unable to retrieve test data: ${errorMsg}`');

      // Check for proper escaping in formatted text
      expect(providerCode).toContain('`test Information:\\n`');
    });
  });
});
