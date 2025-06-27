import { describe, it, expect } from 'bun:test';
import * as utils from '../utils/plugin-templates.ts';
import type { PluginSpecification } from '../services/PluginCreationService.ts';

describe('Plugin Template Generation', () => {
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
      expect(providerCode).toContain('name: "timeProvider"');

      // Check newline formatting
      expect(providerCode).toContain('`timeProvider Information:\\n`');
      expect(providerCode).toContain(".join('\\n')");

      // Check data structure handling
      expect(providerCode).toContain("currentTime: 'Sample currentTime value'");
      expect(providerCode).toContain("timezone: 'Sample timezone value'");
      expect(providerCode).toContain("offset: 'Sample offset value'");
    });

    it('should generate valid TypeScript code', () => {
      const providerCode = utils.generateProviderCode('testProvider', 'Test provider', {
        field1: 'string',
        field2: 'number',
        field3: 'boolean',
        field4: 'array',
        field5: 'object',
      });

      // Check TypeScript syntax
      expect(providerCode).toMatch(/import \{[\s\S]*\} from "@elizaos\/core";/);
      expect(providerCode).toMatch(/export const \w+: Provider = \{/);
      expect(providerCode).toMatch(/async \([\s\S]*\): Promise<ProviderResult> =>/);

      // Check data type mappings
      expect(providerCode).toContain("field1: 'Sample field1 value'");
      expect(providerCode).toContain('field2: 0');
      expect(providerCode).toContain('field3: false');
      expect(providerCode).toContain('field4: []');
      expect(providerCode).toContain('field5: { /* empty */ }');
    });
  });

  describe('Plugin Index Generation', () => {
    it('should handle provider imports correctly', () => {
      const _spec: PluginSpecification = {
        name: '@elizaos/plugin-time',
        description: 'A time and timezone management plugin',
        providers: [
          {
            name: 'timeProvider',
            description: 'Provides current time context',
          },
          {
            name: 'dataProvider',
            description: 'Provides data context',
          },
        ],
      };

      const indexCode = utils.generatePluginIndex(_spec.name, _spec);

      // Check imports
      expect(indexCode).toContain("import { timeProvider } from './providers/timeProvider.ts';");
      expect(indexCode).toContain("import { dataProvider } from './providers/dataProvider.ts';");

      // Check plugin class name
      expect(indexCode).toContain('export const PlugintimePlugin: Plugin = {');
      expect(indexCode).toContain('name: "@elizaos/plugin-time"');

      // Check providers array
      expect(indexCode).toContain('providers: [\n    timeProvider,\n    dataProvider\n  ]');

      // Check exports
      expect(indexCode).toContain('export {\n  timeProvider,\n  dataProvider\n};');
      expect(indexCode).toContain('export default PlugintimePlugin;');
    });

    it('should handle mixed components correctly', () => {
      const _spec: PluginSpecification = {
        name: '@test/full-plugin',
        description: 'Full featured plugin',
        actions: [
          {
            name: 'doSomething',
            description: 'Does something',
          },
        ],
        providers: [
          {
            name: 'infoProvider',
            description: 'Provides info',
          },
        ],
        services: [
          {
            name: 'DataService',
            description: 'Handles data',
          },
        ],
        evaluators: [
          {
            name: 'quality',
            description: 'Evaluates quality',
          },
        ],
      };

      const indexCode = utils.generatePluginIndex(_spec.name, _spec);

      // Check all imports
      expect(indexCode).toContain("import { doSomethingAction } from './actions/doSomething.ts';");
      expect(indexCode).toContain("import { infoProvider } from './providers/infoProvider.ts';");
      expect(indexCode).toContain("import { DataService } from './services/DataService.ts';");
      expect(indexCode).toContain("import { qualityEvaluator } from './evaluators/quality.ts';");

      // Check arrays
      expect(indexCode).toContain('actions: [\n    doSomethingAction\n  ]');
      expect(indexCode).toContain('providers: [\n    infoProvider\n  ]');
      expect(indexCode).toContain('services: [\n    DataService\n  ]');
      expect(indexCode).toContain('evaluators: [\n    qualityEvaluator\n  ]');
    });

    it('should handle environment variables and secrets manager', () => {
      const _spec: PluginSpecification = {
        name: '@test/secure-plugin',
        description: 'Plugin with secrets',
        environmentVariables: [
          {
            name: 'API_KEY',
            description: 'API key for service',
            required: true,
            sensitive: true,
          },
          {
            name: 'BASE_URL',
            description: 'Base URL for API',
            required: false,
            sensitive: false,
          },
        ],
      };

      const indexCode = utils.generatePluginIndex(_spec.name, _spec);

      // Check secrets manager import
      expect(indexCode).toContain(
        'import type EnhancedSecretManager from "@elizaos/plugin-secrets-manager";'
      );

      // Check dependencies
      expect(indexCode).toContain("dependencies: ['plugin-env']");

      // Check environment variable declarations
      expect(indexCode).toContain('declaredEnvVars: {');
      expect(indexCode).toContain("'API_KEY': {");
      expect(indexCode).toContain("type: 'apikey'");
      expect(indexCode).toContain('required: true');

      expect(indexCode).toContain("'BASE_URL': {");
      expect(indexCode).toContain("type: 'config'");
      expect(indexCode).toContain('required: false');

      // Check init function
      expect(indexCode).toContain(
        'async init(_config: Record<string, string>, _runtime: IAgentRuntime)'
      );
      expect(indexCode).toContain("await getConfigValue(_runtime, 'API_KEY')");
      expect(indexCode).toContain("await getConfigValue(_runtime, 'BASE_URL')");
    });
  });

  describe('Action Generation', () => {
    it('should generate actions with correct naming and parameters', () => {
      const actionCode = utils.generateActionCode(
        'getCurrentTime',
        'Get the current time in a specified timezone',
        {
          timezone: {
            type: 'string',
            description: 'IANA timezone',
            required: false,
          },
          format: {
            type: 'string',
            description: 'Time format',
            required: true,
          },
        }
      );

      expect(actionCode).toContain('export const getCurrentTimeAction: Action = {');
      expect(actionCode).toContain('name: "getCurrentTime"');
      expect(actionCode).toContain('description: "Get the current time in a specified timezone"');

      // Check parameter handling
      expect(actionCode).toContain('const { timezone, format } = params');
      expect(actionCode).toContain('if (!format)');
      expect(actionCode).toContain('return "format is required"');
    });
  });

  describe('Service Generation', () => {
    it('should generate services with correct class structure', () => {
      const serviceCode = utils.generateServiceCode(
        'TimeService',
        'Manages time-related operations',
        ['getCurrentTime', 'convertTimezone']
      );

      expect(serviceCode).toContain('export class TimeService extends Service');
      expect(serviceCode).toContain('static serviceType: "timeservice" = "timeservice"');
      expect(serviceCode).toContain(
        'capabilityDescription: string = "Manages time-related operations"'
      );

      // Check methods
      expect(serviceCode).toContain('async getCurrentTime(...args: any[]): Promise<any>');
      expect(serviceCode).toContain('async convertTimezone(...args: any[]): Promise<any>');

      // Check service registry
      expect(serviceCode).toContain('interface ServiceTypeRegistry {');
      expect(serviceCode).toContain('TIMESERVICE: "timeservice"');
    });
  });

  describe('Evaluator Generation', () => {
    it('should generate evaluators with triggers', () => {
      const evaluatorCode = utils.generateEvaluatorCode(
        'timeRelevance',
        'Evaluates if time-related queries are relevant',
        ['time', 'clock', 'timezone']
      );

      expect(evaluatorCode).toContain('export const timeRelevanceEvaluator: Evaluator = {');
      expect(evaluatorCode).toContain('name: "timeRelevance"');

      // Check triggers
      expect(evaluatorCode).toContain("content.includes('time')");
      expect(evaluatorCode).toContain("content.includes('clock')");
      expect(evaluatorCode).toContain("content.includes('timezone')");

      // Check evaluation logic
      expect(evaluatorCode).toContain('timeRelevance evaluation complete');
    });
  });

  describe('Template Edge Cases', () => {
    it('should handle empty data structures', () => {
      const providerCode = utils.generateProviderCode(
        'emptyProvider',
        'Provider with no data structure'
      );

      expect(providerCode).toContain('export const emptyProvider: Provider = {');
      expect(providerCode).toContain("status: 'active'");
      expect(providerCode).toContain('available: true');
    });

    it('should handle plugin names with special characters', () => {
      const _spec: PluginSpecification = {
        name: '@org/plugin-with-dashes_and_underscores',
        description: 'Complex name',
      };

      const indexCode = utils.generatePluginIndex(_spec.name, _spec);
      expect(indexCode).toContain('export const PluginwithdashesandunderscoresPlugin: Plugin = {');
    });

    it('should handle providers already ending with "Provider"', () => {
      const _spec: PluginSpecification = {
        name: '@test/plugin',
        description: 'Test',
        providers: [
          {
            name: 'dataProvider',
            description: 'Already has Provider suffix',
          },
        ],
      };

      const indexCode = utils.generatePluginIndex(_spec.name, _spec);
      // Should not double the Provider suffix
      expect(indexCode).toContain("import { dataProvider } from './providers/dataProvider.ts';");
      expect(indexCode).not.toContain('dataProviderProvider');
    });
  });
});
