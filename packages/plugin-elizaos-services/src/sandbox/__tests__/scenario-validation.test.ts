/**
 * Test to verify sandbox scenario works with the scenario runner system
 */

import { describe, test, expect } from 'bun:test';
import { v4 as uuidv4 } from 'uuid';
import type { UUID } from '@elizaos/core';

// Import our scenario
import { multiAgentDevTeamScenario } from '/Users/shawwalters/eliza-self/packages/scenarios/src/sandbox/multi-agent-dev-team.js';

describe('Sandbox Scenario Validation', () => {
  test('scenario has correct structure', () => {
    expect(multiAgentDevTeamScenario).toBeDefined();
    expect(multiAgentDevTeamScenario.id).toBe('multi-agent-dev-team');
    expect(multiAgentDevTeamScenario.name).toBe('Multi-Agent Development Team');
    expect(multiAgentDevTeamScenario.category).toBe('sandbox');
    expect(multiAgentDevTeamScenario.tags).toContain('multi-agent');
    expect(multiAgentDevTeamScenario.tags).toContain('sandbox');
    expect(multiAgentDevTeamScenario.tags).toContain('e2b');
  });

  test('scenario has required actors', () => {
    expect(multiAgentDevTeamScenario.actors).toBeDefined();
    expect(multiAgentDevTeamScenario.actors.length).toBe(2);

    const subjectActor = multiAgentDevTeamScenario.actors.find((a) => a.role === 'subject');
    const adversaryActor = multiAgentDevTeamScenario.actors.find((a) => a.role === 'adversary');

    expect(subjectActor).toBeDefined();
    expect(subjectActor?.name).toBe('MainAgent');
    expect(adversaryActor).toBeDefined();
    expect(adversaryActor?.name).toBe('ProductManager');
  });

  test('scenario has verification rules', () => {
    expect(multiAgentDevTeamScenario.verification).toBeDefined();
    expect(multiAgentDevTeamScenario.verification.rules).toBeDefined();
    expect(multiAgentDevTeamScenario.verification.rules.length).toBeGreaterThan(0);

    // Check for specific verification rules
    const ruleIds = multiAgentDevTeamScenario.verification.rules.map((r) => r.id);
    expect(ruleIds).toContain('spawn-dev-team-action');
    expect(ruleIds).toContain('task-delegation-response');
    expect(ruleIds).toContain('project-coordination');
  });

  test('scenario passes basic validation checks', () => {
    // These are the basic checks the ScenarioRunner does
    expect(multiAgentDevTeamScenario.id).toBeTruthy();
    expect(multiAgentDevTeamScenario.name).toBeTruthy();
    expect(multiAgentDevTeamScenario.description).toBeTruthy();
    expect(multiAgentDevTeamScenario.actors.length).toBeGreaterThan(0);

    // Check exactly one subject actor
    const subjectActors = multiAgentDevTeamScenario.actors.filter((a) => a.role === 'subject');
    expect(subjectActors.length).toBe(1);

    // Check verification rules
    expect(multiAgentDevTeamScenario.verification.rules.length).toBeGreaterThan(0);

    // Check all rules have IDs
    multiAgentDevTeamScenario.verification.rules.forEach((rule) => {
      expect(rule.id).toBeTruthy();
    });
  });

  test('actors have proper script steps', () => {
    multiAgentDevTeamScenario.actors.forEach((actor) => {
      // Only actors with adversary role have scripts in this scenario
      if (actor.role === 'adversary') {
        expect(actor.script).toBeDefined();
        expect(actor.script!.steps).toBeDefined();
        expect(Array.isArray(actor.script!.steps)).toBe(true);
        expect(actor.script!.steps.length).toBeGreaterThan(0);

        // Each step should have proper structure
        actor.script!.steps.forEach((step) => {
          expect(step.type).toBeDefined();
          expect(['message', 'action', 'wait'].includes(step.type)).toBe(true);
        });
      } else {
        // Subject actors may not have scripts - they respond to messages
        expect(['subject'].includes(actor.role)).toBe(true);
      }
    });
  });

  test('verification rules have proper structure', () => {
    multiAgentDevTeamScenario.verification.rules.forEach((rule) => {
      expect(rule.id).toBeTruthy();
      expect(rule.type).toBeDefined();
      expect(['llm', 'code', 'pattern'].includes(rule.type)).toBe(true);
      expect(rule.description).toBeTruthy();
      expect(rule.config).toBeDefined();
    });
  });

  test('scenario works with scenario runner validation logic', () => {
    // Simulate the validation logic from ScenarioRunner
    const scenario = multiAgentDevTeamScenario;

    // Must have ID
    if (!scenario.id) {
      throw new Error('Scenario must have an ID');
    }

    // Must have actors
    if (!scenario.actors || scenario.actors.length === 0) {
      throw new Error('Scenario must have at least one actor');
    }

    // Must have exactly one subject
    const subjectActors = scenario.actors.filter((a) => a.role === 'subject');
    if (subjectActors.length === 0) {
      throw new Error('Scenario must have exactly one subject actor');
    }
    if (subjectActors.length > 1) {
      throw new Error('Scenario can only have one subject actor');
    }

    // Must have verification rules
    if (
      !scenario.verification ||
      !scenario.verification.rules ||
      scenario.verification.rules.length === 0
    ) {
      throw new Error('Scenario must have at least one verification rule');
    }

    // All rules must have IDs
    scenario.verification.rules.forEach((rule) => {
      if (!rule.id) {
        throw new Error('All verification rules must have an ID');
      }
    });

    // If we get here, validation passed
    expect(true).toBe(true);
  });
});
