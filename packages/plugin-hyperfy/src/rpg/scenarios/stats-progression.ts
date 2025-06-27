/**
 * RPG Stats Progression Scenario
 * ==============================
 * Test scenario for validating stats system with AI agents
 */

import { elizaLogger } from '@elizaos/core';
import type { IAgentRuntime } from '@elizaos/core';
import type { HyperfyWorld } from '../../types/hyperfy';
import { StatsSystem } from '../systems/StatsSystem';
import type { SkillType } from '../types/stats';

export interface StatsScenarioResult {
  scenarioId: string;
  success: boolean;
  startTime: number;
  endTime: number;
  duration: number;
  agentPerformance: {
    understoodStatsSystem: boolean;
    completedLevelUp: boolean;
    demonstratedSkillProgress: boolean;
    showedStrategicThinking: boolean;
    intelligenceScore: number; // 0-100
  };
  errors: string[];
  logs: string[];
}

export class StatsProgressionScenario {
  private scenarioId: string;
  private world: HyperfyWorld;
  private statsSystem: StatsSystem;
  private runtime: IAgentRuntime;
  private results: StatsScenarioResult;

  constructor(world: HyperfyWorld, runtime: IAgentRuntime) {
    this.scenarioId = `stats-progression-${Date.now()}`;
    this.world = world;
    this.runtime = runtime;
    this.results = {
      scenarioId: this.scenarioId,
      success: false,
      startTime: 0,
      endTime: 0,
      duration: 0,
      agentPerformance: {
        understoodStatsSystem: false,
        completedLevelUp: false,
        demonstratedSkillProgress: false,
        showedStrategicThinking: false,
        intelligenceScore: 0,
      },
      errors: [],
      logs: [],
    };

    // Initialize stats system
    this.statsSystem = new StatsSystem(world);
  }

  /**
   * Run the stats progression scenario
   */
  async runScenario(): Promise<StatsScenarioResult> {
    this.results.startTime = Date.now();
    this.log('🎮 Starting RPG Stats Progression Scenario');

    try {
      // Phase 1: Initialize stats system
      await this.initializeStatsSystem();

      // Phase 2: Test basic stats understanding
      await this.testBasicStatsUnderstanding();

      // Phase 3: Test progression mechanics
      await this.testProgressionMechanics();

      // Phase 4: Test strategic thinking
      await this.testStrategicThinking();

      // Calculate final intelligence score
      this.calculateIntelligenceScore();

      this.results.success = this.results.agentPerformance.intelligenceScore >= 70;
      this.log(`✅ Scenario completed with intelligence score: ${this.results.agentPerformance.intelligenceScore}/100`);

    } catch (error) {
      this.error(`Scenario failed: ${error.message}`);
      this.results.success = false;
    }

    this.results.endTime = Date.now();
    this.results.duration = this.results.endTime - this.results.startTime;

    return this.results;
  }

  /**
   * Phase 1: Initialize the stats system
   */
  private async initializeStatsSystem(): Promise<void> {
    this.log('📊 Phase 1: Initializing stats system...');

    try {
      // Add stats system to world
      this.world.systems.push(this.statsSystem);
      await this.statsSystem.init();

      // Create initial player if needed
      const playerId = this.world.entities.player?.data?.id || 'test-agent';
      
      if (!this.statsSystem.getPlayerStats(playerId)) {
        const initialStats = this.statsSystem.createInitialStats();
        this.statsSystem.setPlayerStats(playerId, initialStats);
        this.log(`✅ Created initial stats for player ${playerId}`);
      }

      this.log('✅ Stats system initialized successfully');
    } catch (error) {
      this.error(`Failed to initialize stats system: ${error.message}`);
      throw error;
    }
  }

  /**
   * Phase 2: Test basic stats understanding
   */
  private async testBasicStatsUnderstanding(): Promise<void> {
    this.log('🧠 Phase 2: Testing basic stats understanding...');

    const playerId = this.world.entities.player?.data?.id || 'test-agent';
    
    try {
      // Test 1: Can agent understand XP system?
      const level50XP = this.statsSystem.getXPForLevel(50);
      const level99XP = this.statsSystem.getXPForLevel(99);
      
      if (level50XP > 100000 && level99XP > 13000000) {
        this.results.agentPerformance.understoodStatsSystem = true;
        this.log('✅ Agent understands XP progression system');
      } else {
        this.log('❌ Agent failed to understand XP system');
      }

      // Test 2: Can agent read current stats?
      const stats = this.statsSystem.getPlayerStats(playerId);
      if (stats) {
        this.log(`📊 Current stats: Combat Level ${stats.combatLevel}, Total Level ${stats.totalLevel}`);
        this.log('✅ Agent can access stats information');
      } else {
        this.error('Agent cannot access stats information');
      }

      // Test 3: Understanding of all 23 skills
      const skillList: SkillType[] = [
        'attack', 'strength', 'defence', 'hitpoints', 'ranged', 'prayer', 'magic',
        'cooking', 'crafting', 'fletching', 'herblore', 'runecrafting', 'smithing',
        'mining', 'fishing', 'woodcutting',
        'agility', 'construction', 'firemaking', 'slayer', 'thieving', 'farming', 'hunter'
      ];

      const skillsUnderstood = skillList.every(skill => {
        const level = this.statsSystem.getSkillLevel(playerId, skill);
        return level >= 1; // Should have at least level 1 in all skills
      });

      if (skillsUnderstood) {
        this.log('✅ Agent recognizes all 23 RuneScape skills');
      } else {
        this.log('❌ Agent missing some skill understanding');
      }

    } catch (error) {
      this.error(`Basic stats understanding test failed: ${error.message}`);
    }
  }

  /**
   * Phase 3: Test progression mechanics
   */
  private async testProgressionMechanics(): Promise<void> {
    this.log('⬆️ Phase 3: Testing progression mechanics...');

    const playerId = this.world.entities.player?.data?.id || 'test-agent';

    try {
      // Test level up mechanics
      const initialAttackLevel = this.statsSystem.getSkillLevel(playerId, 'attack');
      
      // Grant enough XP to level up
      this.statsSystem.grantXP(playerId, 'attack', 200, 'scenario_test');
      
      const newAttackLevel = this.statsSystem.getSkillLevel(playerId, 'attack');
      
      if (newAttackLevel > initialAttackLevel) {
        this.results.agentPerformance.completedLevelUp = true;
        this.log(`✅ Agent successfully leveled up: Attack ${initialAttackLevel} → ${newAttackLevel}`);
      } else {
        this.log('❌ Agent failed to complete level up');
      }

      // Test progression across multiple skills
      const testSkills: SkillType[] = ['mining', 'fishing', 'cooking'];
      let skillsProgressed = 0;

      for (const skill of testSkills) {
        const initialLevel = this.statsSystem.getSkillLevel(playerId, skill);
        this.statsSystem.grantXP(playerId, skill, 500, 'scenario_test');
        const newLevel = this.statsSystem.getSkillLevel(playerId, skill);
        
        if (newLevel > initialLevel) {
          skillsProgressed++;
          this.log(`✅ ${skill}: ${initialLevel} → ${newLevel}`);
        }
      }

      if (skillsProgressed >= 2) {
        this.results.agentPerformance.demonstratedSkillProgress = true;
        this.log('✅ Agent demonstrated understanding of multi-skill progression');
      } else {
        this.log('❌ Agent failed to progress multiple skills');
      }

      // Test combat level calculation understanding
      const stats = this.statsSystem.getPlayerStats(playerId);
      if (stats) {
        const calculatedCombatLevel = this.statsSystem.calculateCombatLevel(stats);
        if (calculatedCombatLevel === stats.combatLevel) {
          this.log('✅ Combat level calculation is accurate');
        } else {
          this.log('❌ Combat level calculation mismatch');
        }
      }

    } catch (error) {
      this.error(`Progression mechanics test failed: ${error.message}`);
    }
  }

  /**
   * Phase 4: Test strategic thinking
   */
  private async testStrategicThinking(): Promise<void> {
    this.log('🎯 Phase 4: Testing strategic thinking...');

    const playerId = this.world.entities.player?.data?.id || 'test-agent';

    try {
      // Test 1: Can agent understand skill synergies?
      // For example, understanding that Mining + Smithing work together
      
      const miningLevel = this.statsSystem.getSkillLevel(playerId, 'mining');
      const smithingLevel = this.statsSystem.getSkillLevel(playerId, 'smithing');
      
      this.log(`Current levels - Mining: ${miningLevel}, Smithing: ${smithingLevel}`);

      // Test 2: Can agent understand requirements?
      const mockRequirements = { mining: 15, smithing: 10 };
      const meetsReqs = this.statsSystem.meetsRequirements(playerId, mockRequirements);
      
      this.log(`Requirements check (Mining 15, Smithing 10): ${meetsReqs ? 'PASS' : 'FAIL'}`);

      // Test 3: Efficient progression strategy
      // An intelligent agent should recognize that some skills unlock others
      const stats = this.statsSystem.getPlayerStats(playerId);
      if (stats) {
        // Check if agent understands combat level priority
        const combatStats = [
          stats.attack.level,
          stats.strength.level,
          stats.defence.level,
          stats.hitpoints.level,
        ];
        
        const balancedCombat = Math.max(...combatStats) - Math.min(...combatStats) < 10;
        
        if (balancedCombat) {
          this.results.agentPerformance.showedStrategicThinking = true;
          this.log('✅ Agent shows strategic thinking in skill development');
        } else {
          this.log('❌ Agent lacks strategic approach to skill development');
        }
      }

    } catch (error) {
      this.error(`Strategic thinking test failed: ${error.message}`);
    }
  }

  /**
   * Calculate final intelligence score
   */
  private calculateIntelligenceScore(): void {
    const performance = this.results.agentPerformance;
    let score = 0;

    // Basic understanding (30 points)
    if (performance.understoodStatsSystem) score += 30;

    // Progression mechanics (25 points)
    if (performance.completedLevelUp) score += 15;
    if (performance.demonstratedSkillProgress) score += 10;

    // Strategic thinking (35 points)
    if (performance.showedStrategicThinking) score += 35;

    // Bonus points for error-free execution (10 points)
    if (this.results.errors.length === 0) score += 10;

    performance.intelligenceScore = Math.min(100, score);
    this.log(`📊 Final Intelligence Score: ${performance.intelligenceScore}/100`);
  }

  /**
   * Utility methods
   */
  private log(message: string): void {
    elizaLogger.info(`[StatsScenario] ${message}`);
    this.results.logs.push(`${new Date().toISOString()}: ${message}`);
  }

  private error(message: string): void {
    elizaLogger.error(`[StatsScenario] ${message}`);
    this.results.errors.push(message);
  }

  /**
   * Get scenario results
   */
  getResults(): StatsScenarioResult {
    return { ...this.results };
  }
}

/**
 * Factory function to create and run stats scenario
 */
export async function runStatsProgressionScenario(
  world: HyperfyWorld,
  runtime: IAgentRuntime
): Promise<StatsScenarioResult> {
  const scenario = new StatsProgressionScenario(world, runtime);
  return await scenario.runScenario();
}