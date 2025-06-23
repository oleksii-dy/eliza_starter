import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ScenarioRunner } from '../../src/scenario-runner/index.js';
import type { Scenario } from '../../src/scenario-runner/types.js';
import type { UUID } from '@elizaos/core';

/**
 * Developer utility tests for scenarios
 * These focus on providing quick feedback for common development tasks
 */
describe('Scenario Developer Utilities', () => {
  let runner: ScenarioRunner;

  beforeEach(() => {
    const mockServer = { stop: vi.fn() };
    const mockRuntime = {
      agentId: 'test-agent' as UUID,
      character: { name: 'Test Agent' },
      logger: {
        info: vi.fn(),
        warn: vi.fn(),
        error: vi.fn(),
        debug: vi.fn(),
      },
    };
    runner = new ScenarioRunner(mockServer as any, mockRuntime as any);
  });

  describe('Quick Scenario Builders', () => {
    it('should create minimal valid scenario template', () => {
      const minimal: Scenario = {
        id: 'test-id',
        name: 'Test Scenario',
        description: 'Minimal test scenario',
        actors: [
          {
            id: 'subject' as UUID,
            name: 'Subject',
            role: 'subject',
            script: { steps: [] },
          },
        ],
        setup: {},
        execution: {},
        verification: {
          rules: [
            {
              id: 'basic',
              type: 'llm',
              description: 'Basic check',
              config: {},
            },
          ],
        },
      };

      expect(() => runner.validateScenario(minimal)).not.toThrow();
    });

    it('should help identify missing required fields', () => {
      const missingFields = [
        { field: 'id', scenario: { name: 'Test', description: 'Test', actors: [], setup: {}, execution: {}, verification: { rules: [] } } },
        { field: 'actor', scenario: { id: 'test', name: 'Test', description: 'Test', actors: [], setup: {}, execution: {}, verification: { rules: [] } } },
      ];

      missingFields.forEach(({ field, scenario }) => {
        try {
          runner.validateScenario(scenario as Scenario);
          fail(`Expected validation to fail for missing ${field}`);
        } catch (error) {
          expect(error.message).toMatch(new RegExp(field, 'i'));
        }
      });
    });
  });

  describe('Scenario Structure Helpers', () => {
    it('should validate actor role combinations', () => {
      const scenarios = [
        {
          name: 'No subject actor',
          actors: [{ id: 'a1' as UUID, name: 'A1', role: 'assistant', script: { steps: [] } }],
          shouldFail: true,
        },
        {
          name: 'Multiple subject actors',
          actors: [
            { id: 'a1' as UUID, name: 'A1', role: 'subject', script: { steps: [] } },
            { id: 'a2' as UUID, name: 'A2', role: 'subject', script: { steps: [] } },
          ],
          shouldFail: true,
        },
        {
          name: 'Valid single subject',
          actors: [
            { id: 'a1' as UUID, name: 'A1', role: 'subject', script: { steps: [] } },
            { id: 'a2' as UUID, name: 'A2', role: 'assistant', script: { steps: [] } },
          ],
          shouldFail: false,
        },
      ];

      scenarios.forEach(({ name, actors, shouldFail }) => {
        const scenario: Scenario = {
          id: 'test',
          name,
          description: 'Test',
          actors,
          setup: {},
          execution: {},
          verification: {
            rules: [{ id: 'test', type: 'llm', description: 'Test', config: {} }],
          },
        };

        if (shouldFail) {
          expect(() => runner.validateScenario(scenario)).toThrow();
        } else {
          expect(() => runner.validateScenario(scenario)).not.toThrow();
        }
      });
    });
  });

  describe('Performance Helpers', () => {
    it('should efficiently chunk large arrays', () => {
      const largeArray = Array.from({ length: 1000 }, (_, i) => i);
      const startTime = Date.now();
      
      const chunks = runner.chunkArray(largeArray, 50);
      
      const endTime = Date.now();
      
      expect(chunks).toHaveLength(20); // 1000 / 50
      expect(chunks[0]).toHaveLength(50);
      expect(chunks[19]).toHaveLength(50);
      expect(endTime - startTime).toBeLessThan(10); // Should be very fast
    });

    it('should handle edge cases in chunking', () => {
      expect(runner.chunkArray([], 5)).toEqual([]);
      expect(runner.chunkArray([1], 5)).toEqual([[1]]);
      expect(runner.chunkArray([1, 2, 3], 10)).toEqual([[1, 2, 3]]);
    });
  });

  describe('Error Message Quality', () => {
    it('should provide specific error messages for each validation failure', () => {
      const testCases = [
        {
          scenario: { id: '', name: 'Test', description: 'Test', actors: [{ id: 'a' as UUID, name: 'A', role: 'subject', script: { steps: [] } }], setup: {}, execution: {}, verification: { rules: [{ id: 'r', type: 'llm', description: 'R', config: {} }] } },
          expectedKeywords: ['ID'],
        },
        {
          scenario: { id: 'test', name: '', description: 'Test', actors: [{ id: 'a' as UUID, name: 'A', role: 'subject', script: { steps: [] } }], setup: {}, execution: {}, verification: { rules: [{ id: 'r', type: 'llm', description: 'R', config: {} }] } },
          expectedKeywords: ['name'],
        },
        {
          scenario: { id: 'test', name: 'Test', description: 'Test', actors: [], setup: {}, execution: {}, verification: { rules: [{ id: 'r', type: 'llm', description: 'R', config: {} }] } },
          expectedKeywords: ['actor'],
        },
      ];

      testCases.forEach(({ scenario, expectedKeywords }) => {
        try {
          runner.validateScenario(scenario as Scenario);
          fail('Expected validation to throw an error');
        } catch (error) {
          const message = error.message.toLowerCase();
          expectedKeywords.forEach(keyword => {
            expect(message).toContain(keyword.toLowerCase());
          });
        }
      });
    });
  });

  describe('Claude Code Friendly Features', () => {
    it('should provide structured validation results for easy debugging', () => {
      const invalidScenario = {
        id: '',
        name: '',
        description: 'Test',
        actors: [],
        setup: {},
        execution: {},
        verification: { rules: [] },
      };

      let errorMessages: string[] = [];
      
      try {
        runner.validateScenario(invalidScenario as Scenario);
      } catch (error) {
        errorMessages.push(error.message);
      }

      // Should get at least one clear error message
      expect(errorMessages.length).toBeGreaterThan(0);
      expect(errorMessages[0]).toMatch(/must have/i);
    });

    it('should validate common scenario patterns', () => {
      const commonPatterns = [
        {
          name: 'Simple chat scenario',
          template: {
            id: 'chat-test',
            name: 'Simple Chat Test',
            description: 'Test basic chat functionality',
            actors: [
              { id: 'agent' as UUID, name: 'Agent', role: 'subject', script: { steps: [] } },
              { id: 'user' as UUID, name: 'User', role: 'assistant', script: { steps: [{ type: 'message', content: 'Hello' }] } },
            ],
            setup: { roomType: 'dm' },
            execution: { maxDuration: 30000 },
            verification: {
              rules: [
                { id: 'response', type: 'llm', description: 'Agent responds to greeting', config: {} },
              ],
            },
          },
        },
        {
          name: 'Multi-step workflow',
          template: {
            id: 'workflow-test',
            name: 'Multi-step Workflow Test',
            description: 'Test complex workflow',
            actors: [
              { id: 'agent' as UUID, name: 'Agent', role: 'subject', script: { steps: [] } },
              { id: 'user' as UUID, name: 'User', role: 'assistant', script: { 
                steps: [
                  { type: 'message', content: 'Step 1' },
                  { type: 'wait', waitTime: 1000 },
                  { type: 'message', content: 'Step 2' },
                ]
              } },
            ],
            setup: { roomType: 'group' },
            execution: { maxDuration: 60000, maxSteps: 10 },
            verification: {
              rules: [
                { id: 'step1', type: 'llm', description: 'Step 1 completed', config: {} },
                { id: 'step2', type: 'llm', description: 'Step 2 completed', config: {} },
              ],
            },
          },
        },
      ];

      commonPatterns.forEach(({ name, template }) => {
        expect(() => runner.validateScenario(template as Scenario), `Pattern "${name}" should be valid`).not.toThrow();
      });
    });
  });
});