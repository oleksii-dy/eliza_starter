import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ScenarioRunner } from '../../src/scenario-runner/index.js';
import type { Scenario } from '../../src/scenario-runner/types.js';
import type { UUID } from '@elizaos/core';

/**
 * Simple scenario tests focused on developer experience and quick feedback
 * These tests avoid complex mock setups and focus on validation and basic functionality
 */
describe('ScenarioRunner - Simple Tests', () => {
  let runner: ScenarioRunner;
  let mockServer: any;
  let mockRuntime: any;

  beforeEach(() => {
    // Minimal mock setup for fast tests
    mockServer = {
      stop: vi.fn().mockResolvedValue(undefined),
    };

    mockRuntime = {
      agentId: 'test-agent-id' as UUID,
      character: { name: 'Test Agent' },
      logger: {
        info: vi.fn(),
        warn: vi.fn(),
        error: vi.fn(),
        debug: vi.fn(),
      },
    };

    runner = new ScenarioRunner(mockServer, mockRuntime);
  });

  describe('Scenario Validation - Fast Feedback', () => {
    it('should validate scenario structure quickly', () => {
      const invalidScenario: Scenario = {
        id: '',
        name: '',
        description: '',
        actors: [],
        setup: {},
        execution: {},
        verification: { rules: [] },
      };

      expect(() => runner.validateScenario(invalidScenario)).toThrow();
    });

    it('should require scenario ID', () => {
      const scenario: Scenario = {
        id: '', // Empty ID should fail
        name: 'Test Scenario',
        description: 'Test description',
        actors: [
          {
            id: 'actor1' as UUID,
            name: 'Actor 1',
            role: 'subject',
            script: { steps: [] },
          },
        ],
        setup: {},
        execution: {},
        verification: {
          rules: [
            {
              id: 'rule1',
              type: 'llm',
              description: 'Test rule',
              config: {},
            },
          ],
        },
      };

      expect(() => runner.validateScenario(scenario)).toThrow('Scenario must have an ID');
    });

    it('should require at least one actor', () => {
      const scenario: Scenario = {
        id: 'test-scenario',
        name: 'Test Scenario',
        description: 'Test description',
        actors: [], // No actors should fail
        setup: {},
        execution: {},
        verification: {
          rules: [
            {
              id: 'rule1',
              type: 'llm',
              description: 'Test rule',
              config: {},
            },
          ],
        },
      };

      expect(() => runner.validateScenario(scenario)).toThrow('Scenario must have at least one actor');
    });

    it('should require exactly one subject actor', () => {
      const scenario: Scenario = {
        id: 'test-scenario',
        name: 'Test Scenario',
        description: 'Test description',
        actors: [
          {
            id: 'actor1' as UUID,
            name: 'Actor 1',
            role: 'assistant', // No subject actor
            script: { steps: [] },
          },
        ],
        setup: {},
        execution: {},
        verification: {
          rules: [
            {
              id: 'rule1',
              type: 'llm',
              description: 'Test rule',
              config: {},
            },
          ],
        },
      };

      expect(() => runner.validateScenario(scenario)).toThrow('Scenario must have exactly one subject actor');
    });

    it('should reject multiple subject actors', () => {
      const scenario: Scenario = {
        id: 'test-scenario',
        name: 'Test Scenario',
        description: 'Test description',
        actors: [
          {
            id: 'actor1' as UUID,
            name: 'Actor 1',
            role: 'subject', // First subject
            script: { steps: [] },
          },
          {
            id: 'actor2' as UUID,
            name: 'Actor 2',
            role: 'subject', // Second subject - should fail
            script: { steps: [] },
          },
        ],
        setup: {},
        execution: {},
        verification: {
          rules: [
            {
              id: 'rule1',
              type: 'llm',
              description: 'Test rule',
              config: {},
            },
          ],
        },
      };

      expect(() => runner.validateScenario(scenario)).toThrow('Scenario can only have one subject actor');
    });

    it('should require verification rules', () => {
      const scenario: Scenario = {
        id: 'test-scenario',
        name: 'Test Scenario',
        description: 'Test description',
        actors: [
          {
            id: 'actor1' as UUID,
            name: 'Actor 1',
            role: 'subject',
            script: { steps: [] },
          },
        ],
        setup: {},
        execution: {},
        verification: {
          rules: [], // No rules should fail
        },
      };

      expect(() => runner.validateScenario(scenario)).toThrow('Scenario must have at least one verification rule');
    });

    it('should require rule IDs', () => {
      const scenario: Scenario = {
        id: 'test-scenario',
        name: 'Test Scenario',
        description: 'Test description',
        actors: [
          {
            id: 'actor1' as UUID,
            name: 'Actor 1',
            role: 'subject',
            script: { steps: [] },
          },
        ],
        setup: {},
        execution: {},
        verification: {
          rules: [
            {
              id: '', // Empty ID should fail
              type: 'llm',
              description: 'Test rule',
              config: {},
            },
          ],
        },
      };

      expect(() => runner.validateScenario(scenario)).toThrow('All verification rules must have an ID');
    });

    it('should validate a proper scenario successfully', () => {
      const validScenario: Scenario = {
        id: 'valid-scenario',
        name: 'Valid Test Scenario',
        description: 'A properly structured test scenario',
        actors: [
          {
            id: 'subject-actor' as UUID,
            name: 'Subject Actor',
            role: 'subject',
            script: {
              steps: [
                { type: 'message', content: 'Hello world' },
              ],
            },
          },
          {
            id: 'assistant-actor' as UUID,
            name: 'Assistant Actor',
            role: 'assistant',
            script: {
              steps: [
                { type: 'message', content: 'Hello back' },
              ],
            },
          },
        ],
        setup: {
          roomType: 'group',
        },
        execution: {
          maxDuration: 30000,
        },
        verification: {
          rules: [
            {
              id: 'interaction-check',
              type: 'llm',
              description: 'Check if actors interacted',
              config: {
                successCriteria: 'Actors exchanged messages',
              },
            },
          ],
        },
      };

      // Should not throw
      expect(() => runner.validateScenario(validScenario)).not.toThrow();
    });
  });

  describe('Helper Functions - Developer Utilities', () => {
    it('should chunk arrays correctly', () => {
      const testArray = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
      const chunks = runner.chunkArray(testArray, 3);

      expect(chunks).toEqual([
        [1, 2, 3],
        [4, 5, 6],
        [7, 8, 9],
        [10],
      ]);
    });

    it('should handle empty arrays', () => {
      const chunks = runner.chunkArray([], 3);
      expect(chunks).toEqual([]);
    });

    it('should handle single item arrays', () => {
      const chunks = runner.chunkArray([1], 3);
      expect(chunks).toEqual([[1]]);
    });
  });

  describe('Error Handling - Clear Messages', () => {
    it('should provide clear error messages for common issues', () => {
      const scenarios = [
        {
          scenario: { id: '', name: 'Test', description: 'Test', actors: [], setup: {}, execution: {}, verification: { rules: [] } },
          expectedError: 'Scenario must have an ID',
        },
        {
          scenario: { id: 'test', name: 'Test', description: 'Test', actors: [], setup: {}, execution: {}, verification: { rules: [] } },
          expectedError: 'Scenario must have at least one actor',
        },
      ];

      scenarios.forEach(({ scenario, expectedError }) => {
        try {
          runner.validateScenario(scenario as Scenario);
          fail('Expected validation to throw an error');
        } catch (error) {
          expect(error.message).toContain(expectedError);
        }
      });
    });
  });
});