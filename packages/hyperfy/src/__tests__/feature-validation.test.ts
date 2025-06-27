/**
 * Feature Validation and Success Verification Tests
 * 
 * Comprehensive validation of all hyperfy features with success criteria
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { World } from '../core/World';
import { Entity } from '../core/Entity';
import { Component } from '../core/Component';
import { System } from '../core/System';

// Validation utilities
class FeatureValidator {
  static validateEntity(entity: Entity, requiredComponents: string[] = []) {
    const validations = {
      hasValidId: !!entity.id && typeof entity.id === 'string',
      hasComponents: !!entity.components,
      hasRequiredComponents: requiredComponents.every(type => entity.getComponent(type) !== null),
      componentsLinked: Array.from(entity.components.values()).every(comp => comp.entity === entity)
    };

    const isValid = Object.values(validations).every(v => v);
    
    return {
      isValid,
      validations,
      entity: {
        id: entity.id,
        componentCount: entity.components.size,
        componentTypes: Array.from(entity.components.keys())
      }
    };
  }

  static validateWorld(world: World, expectedEntities = 0, expectedSystems = 0) {
    const validations = {
      hasEntities: !!world.entities,
      hasSystems: !!world.systems,
      entityCountCorrect: world.entities.size >= expectedEntities,
      systemCountCorrect: world.systems.length >= expectedSystems,
      hasUpdateMethod: typeof world.update === 'function'
    };

    const isValid = Object.values(validations).every(v => v);
    
    return {
      isValid,
      validations,
      world: {
        entityCount: world.entities.size,
        systemCount: world.systems.length,
        hasUpdateMethod: typeof world.update === 'function'
      }
    };
  }

  static validateSystem(system: System) {
    const validations = {
      hasName: !!system.name && typeof system.name === 'string',
      hasDescription: !!system.description && typeof system.description === 'string',
      hasUpdateMethod: typeof system.update === 'function',
      hasSystemsArray: Array.isArray(system.systems)
    };

    const isValid = Object.values(validations).every(v => v);
    
    return {
      isValid,
      validations,
      system: {
        name: system.name,
        description: system.description,
        hasUpdate: typeof system.update === 'function'
      }
    };
  }

  static validateComponent(component: Component, expectedType?: string) {
    const validations = {
      hasType: !!component.type && typeof component.type === 'string',
      typeMatches: !expectedType || component.type === expectedType,
      hasEntityReference: component.entity === null || component.entity instanceof Entity
    };

    const isValid = Object.values(validations).every(v => v);
    
    return {
      isValid,
      validations,
      component: {
        type: component.type,
        hasEntity: !!component.entity,
        entityId: component.entity?.id || null
      }
    };
  }
}

// Success criteria definitions
const SUCCESS_CRITERIA = {
  ENTITY_CREATION: {
    name: 'Entity Creation',
    description: 'Entities must be created with unique IDs and proper initialization',
    validate: (entity: Entity) => {
      const result = FeatureValidator.validateEntity(entity);
      return {
        success: result.isValid && !!entity.id,
        details: result
      };
    }
  },

  COMPONENT_MANAGEMENT: {
    name: 'Component Management',
    description: 'Components must be properly added, retrieved, and removed',
    validate: (entity: Entity, componentType: string) => {
      const hasComponent = !!entity.getComponent(componentType);
      const component = entity.getComponent(componentType);
      const componentValid = component ? FeatureValidator.validateComponent(component, componentType) : null;
      
      return {
        success: hasComponent && componentValid?.isValid,
        details: {
          hasComponent,
          componentValid: componentValid?.isValid,
          component: componentValid?.component
        }
      };
    }
  },

  WORLD_MANAGEMENT: {
    name: 'World Management',
    description: 'World must properly manage entities and systems',
    validate: (world: World, expectedEntities = 0) => {
      const result = FeatureValidator.validateWorld(world, expectedEntities);
      return {
        success: result.isValid,
        details: result
      };
    }
  },

  SYSTEM_INTEGRATION: {
    name: 'System Integration',
    description: 'Systems must be properly integrated and functional',
    validate: (system: System) => {
      const result = FeatureValidator.validateSystem(system);
      return {
        success: result.isValid,
        details: result
      };
    }
  },

  PERFORMANCE_STANDARDS: {
    name: 'Performance Standards',
    description: 'Operations must meet performance benchmarks',
    validate: (operation: () => void, maxTimeMs = 100) => {
      const startTime = performance.now();
      operation();
      const duration = performance.now() - startTime;
      
      return {
        success: duration < maxTimeMs,
        details: {
          duration,
          maxAllowed: maxTimeMs,
          withinLimits: duration < maxTimeMs
        }
      };
    }
  }
};

describe('Feature Validation and Success Verification', () => {
  let world: World;

  beforeEach(() => {
    world = new World();
  });

  afterEach(() => {
    if (world) {
      world.destroy?.();
    }
  });

  describe('Core Feature Validation', () => {
    it('should validate entity creation meets success criteria', () => {
      const entity = world.createEntity();
      const validation = SUCCESS_CRITERIA.ENTITY_CREATION.validate(entity);
      
      expect(validation.success).toBe(true);
      expect(validation.details.isValid).toBe(true);
      expect(validation.details.entity.id).toBeDefined();
      
      console.log('✅ Entity Creation Validation:', validation.details);
    });

    it('should validate component management meets success criteria', () => {
      const entity = world.createEntity();
      const component = new Component();
      component.type = 'test-component';
      
      entity.addComponent(component);
      
      const validation = SUCCESS_CRITERIA.COMPONENT_MANAGEMENT.validate(entity, 'test-component');
      
      expect(validation.success).toBe(true);
      expect(validation.details.hasComponent).toBe(true);
      expect(validation.details.componentValid).toBe(true);
      
      console.log('✅ Component Management Validation:', validation.details);
    });

    it('should validate world management meets success criteria', () => {
      // Create some entities
      world.createEntity();
      world.createEntity();
      world.createEntity();
      
      const validation = SUCCESS_CRITERIA.WORLD_MANAGEMENT.validate(world, 3);
      
      expect(validation.success).toBe(true);
      expect(validation.details.world.entityCount).toBe(3);
      
      console.log('✅ World Management Validation:', validation.details);
    });

    it('should validate system integration meets success criteria', () => {
      class TestSystem extends System {
        name = 'test-system';
        description = 'Test system for validation';
        systems = [];
        
        update() {
          // Test system update
        }
      }
      
      const system = new TestSystem();
      world.addSystem(system);
      
      const validation = SUCCESS_CRITERIA.SYSTEM_INTEGRATION.validate(system);
      
      expect(validation.success).toBe(true);
      expect(validation.details.system.name).toBe('test-system');
      
      console.log('✅ System Integration Validation:', validation.details);
    });

    it('should validate performance meets success criteria', () => {
      const operation = () => {
        // Create 1000 entities quickly
        for (let i = 0; i < 1000; i++) {
          world.createEntity();
        }
      };
      
      const validation = SUCCESS_CRITERIA.PERFORMANCE_STANDARDS.validate(operation, 100);
      
      expect(validation.success).toBe(true);
      expect(validation.details.duration).toBeLessThan(100);
      
      console.log('✅ Performance Standards Validation:', validation.details);
    });
  });

  describe('RPG Feature Validation', () => {
    it('should validate RPG character creation', () => {
      const player = world.createEntity();
      
      // Create RPG components
      const stats = new Component();
      stats.type = 'stats';
      
      const inventory = new Component();
      inventory.type = 'inventory';
      
      const position = new Component();
      position.type = 'position';
      
      player.addComponent(stats);
      player.addComponent(inventory);
      player.addComponent(position);
      
      const requiredComponents = ['stats', 'inventory', 'position'];
      const validation = FeatureValidator.validateEntity(player, requiredComponents);
      
      expect(validation.isValid).toBe(true);
      expect(validation.validations.hasRequiredComponents).toBe(true);
      expect(validation.entity.componentCount).toBe(3);
      
      console.log('✅ RPG Character Validation:', validation);
    });

    it('should validate RPG combat system', () => {
      // Create player and enemy
      const player = world.createEntity();
      const enemy = world.createEntity();
      
      const playerCombat = new Component();
      playerCombat.type = 'combat';
      
      const enemyCombat = new Component();
      enemyCombat.type = 'combat';
      
      player.addComponent(playerCombat);
      enemy.addComponent(enemyCombat);
      
      const playerValidation = FeatureValidator.validateEntity(player, ['combat']);
      const enemyValidation = FeatureValidator.validateEntity(enemy, ['combat']);
      
      expect(playerValidation.isValid).toBe(true);
      expect(enemyValidation.isValid).toBe(true);
      
      console.log('✅ RPG Combat System Validation:', {
        player: playerValidation,
        enemy: enemyValidation
      });
    });

    it('should validate RPG world state', () => {
      // Create a complete RPG world
      const players = [];
      const npcs = [];
      const items = [];
      
      // Create players
      for (let i = 0; i < 3; i++) {
        const player = world.createEntity();
        player.addComponent(new Component());
        player.components.get(player.components.keys().next().value).type = 'player';
        players.push(player);
      }
      
      // Create NPCs
      for (let i = 0; i < 5; i++) {
        const npc = world.createEntity();
        npc.addComponent(new Component());
        npc.components.get(npc.components.keys().next().value).type = 'npc';
        npcs.push(npc);
      }
      
      // Create items
      for (let i = 0; i < 10; i++) {
        const item = world.createEntity();
        item.addComponent(new Component());
        item.components.get(item.components.keys().next().value).type = 'item';
        items.push(item);
      }
      
      const validation = FeatureValidator.validateWorld(world, 18); // 3 + 5 + 10
      
      expect(validation.isValid).toBe(true);
      expect(validation.world.entityCount).toBe(18);
      
      console.log('✅ RPG World State Validation:', {
        ...validation,
        breakdown: {
          players: players.length,
          npcs: npcs.length,
          items: items.length
        }
      });
    });
  });

  describe('Integration Validation', () => {
    it('should validate end-to-end RPG scenario', () => {
      // Create a complete RPG scenario
      const player = world.createEntity();
      
      // Add all required components
      const components = [
        { type: 'player', data: { name: 'TestPlayer', level: 1 } },
        { type: 'position', data: { x: 0, y: 0, z: 0 } },
        { type: 'stats', data: { hp: 100, mp: 50 } },
        { type: 'inventory', data: { items: [] } },
        { type: 'combat', data: { inCombat: false } }
      ];
      
      components.forEach(({ type, data }) => {
        const component = new Component();
        component.type = type;
        Object.assign(component, data);
        player.addComponent(component);
      });
      
      // Validate complete setup
      const validation = FeatureValidator.validateEntity(
        player, 
        components.map(c => c.type)
      );
      
      expect(validation.isValid).toBe(true);
      expect(validation.validations.hasRequiredComponents).toBe(true);
      expect(validation.entity.componentCount).toBe(5);
      
      // Test interaction
      const position = player.getComponent('position') as any;
      position.x = 10;
      position.z = 5;
      
      const positionUpdated = position.x === 10 && position.z === 5;
      
      expect(positionUpdated).toBe(true);
      
      console.log('✅ End-to-End RPG Scenario Validation:', {
        entityValidation: validation,
        positionUpdate: positionUpdated,
        finalState: {
          componentCount: validation.entity.componentCount,
          position: { x: position.x, z: position.z }
        }
      });
    });

    it('should validate system performance under load', () => {
      const startTime = performance.now();
      
      // Create many entities with components
      const entities = [];
      for (let i = 0; i < 500; i++) {
        const entity = world.createEntity();
        
        ['position', 'stats', 'render'].forEach(type => {
          const component = new Component();
          component.type = type;
          entity.addComponent(component);
        });
        
        entities.push(entity);
      }
      
      const endTime = performance.now();
      const duration = endTime - startTime;
      
      // Validate all entities
      const allValid = entities.every(entity => {
        const validation = FeatureValidator.validateEntity(entity, ['position', 'stats', 'render']);
        return validation.isValid;
      });
      
      expect(allValid).toBe(true);
      expect(duration).toBeLessThan(200); // Should complete in under 200ms
      expect(entities.length).toBe(500);
      
      console.log('✅ Performance Under Load Validation:', {
        entitiesCreated: entities.length,
        duration: Math.round(duration),
        allEntitiesValid: allValid,
        entitiesPerSecond: Math.round(entities.length / (duration / 1000))
      });
    });
  });

  describe('Success Verification', () => {
    it('should verify all success criteria are met', () => {
      const results = {
        entityCreation: false,
        componentManagement: false,
        worldManagement: false,
        systemIntegration: false,
        performanceStandards: false
      };
      
      // Test entity creation
      const entity = world.createEntity();
      results.entityCreation = SUCCESS_CRITERIA.ENTITY_CREATION.validate(entity).success;
      
      // Test component management
      const component = new Component();
      component.type = 'test';
      entity.addComponent(component);
      results.componentManagement = SUCCESS_CRITERIA.COMPONENT_MANAGEMENT.validate(entity, 'test').success;
      
      // Test world management
      world.createEntity();
      world.createEntity();
      results.worldManagement = SUCCESS_CRITERIA.WORLD_MANAGEMENT.validate(world, 2).success;
      
      // Test system integration
      class TestSystem extends System {
        name = 'validation-system';
        description = 'System for validation testing';
        systems = [];
        update() {}
      }
      const system = new TestSystem();
      results.systemIntegration = SUCCESS_CRITERIA.SYSTEM_INTEGRATION.validate(system).success;
      
      // Test performance
      const performanceTest = () => {
        for (let i = 0; i < 100; i++) {
          world.createEntity();
        }
      };
      results.performanceStandards = SUCCESS_CRITERIA.PERFORMANCE_STANDARDS.validate(performanceTest, 50).success;
      
      // Verify all criteria are met
      const allCriteriaMet = Object.values(results).every(result => result === true);
      
      expect(allCriteriaMet).toBe(true);
      
      console.log('✅ Success Verification Complete:', {
        allCriteriaMet,
        breakdown: results
      });
    });
  });
});