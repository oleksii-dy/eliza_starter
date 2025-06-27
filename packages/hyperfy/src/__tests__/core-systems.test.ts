/**
 * Comprehensive Core Systems Unit Tests
 * 
 * Tests all core hyperfy systems with proper validation and success verification
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { World } from '../core/World';
import { Entity } from '../core/entities/Entity';
import { System } from '../core/systems/System';
import type { Component } from '../types/index';

describe('Core Systems Tests', () => {
  let world: World;

  beforeEach(() => {
    world = new World();
  });

  afterEach(() => {
    if (world) {
      world.destroy?.();
    }
  });

  describe('World System', () => {
    it('should create a world instance', () => {
      expect(world).toBeDefined();
      expect(world).toBeInstanceOf(World);
    });

    it('should initialize with empty state', () => {
      expect(world.entities).toBeDefined();
      expect(world.systems).toBeDefined();
    });

    it('should add and retrieve entities', () => {
      const entity = world.createEntity();
      expect(entity).toBeDefined();
      expect(entity).toBeInstanceOf(Entity);
      
      const retrieved = world.getEntityById(entity.id);
      expect(retrieved).toBe(entity);
    });

    it('should remove entities properly', () => {
      const entity = world.createEntity();
      const entityId = entity.id;
      
      world.destroyEntity(entity);
      
      const retrieved = world.getEntityById(entityId);
      expect(retrieved).toBeNull();
    });
  });

  describe('Entity System', () => {
    it('should create entity with unique ID', () => {
      const entity1 = world.createEntity();
      const entity2 = world.createEntity();
      
      expect(entity1.id).toBeDefined();
      expect(entity2.id).toBeDefined();
      expect(entity1.id).not.toBe(entity2.id);
    });

    it('should add and remove components', () => {
      const entity = world.createEntity();
      
      const component = new Component();
      component.type = 'test';
      
      entity.addComponent(component);
      expect(entity.getComponent('test')).toBe(component);
      
      entity.removeComponent('test');
      expect(entity.getComponent('test')).toBeNull();
    });

    it('should handle multiple components', () => {
      const entity = world.createEntity();
      
      const comp1 = new Component();
      comp1.type = 'position';
      
      const comp2 = new Component();
      comp2.type = 'velocity';
      
      entity.addComponent(comp1);
      entity.addComponent(comp2);
      
      expect(entity.getComponent('position')).toBe(comp1);
      expect(entity.getComponent('velocity')).toBe(comp2);
      expect(entity.components.length).toBe(2);
    });
  });

  describe('Component System', () => {
    it('should create component with type', () => {
      const component = new Component();
      component.type = 'test-component';
      
      expect(component.type).toBe('test-component');
      expect(component.entity).toBeNull();
    });

    it('should link to entity when added', () => {
      const entity = world.createEntity();
      const component = new Component();
      component.type = 'test';
      
      entity.addComponent(component);
      expect(component.entity).toBe(entity);
    });
  });

  describe('System Management', () => {
    it('should add systems to world', () => {
      class TestSystem extends System {
        name = 'test-system';
        description = 'Test system for validation';
        systems = [];
        
        update() {
          // Test update logic
        }
      }
      
      const system = new TestSystem();
      world.addSystem(system);
      
      expect(world.systems).toContain(system);
    });

    it('should update systems in order', () => {
      const updateOrder: string[] = [];
      
      class SystemA extends System {
        name = 'system-a';
        description = 'First system';
        systems = [];
        
        update() {
          updateOrder.push('a');
        }
      }
      
      class SystemB extends System {
        name = 'system-b';
        description = 'Second system';
        systems = [];
        
        update() {
          updateOrder.push('b');
        }
      }
      
      world.addSystem(new SystemA());
      world.addSystem(new SystemB());
      
      world.update(16); // 16ms delta
      
      expect(updateOrder).toEqual(['a', 'b']);
    });
  });

  describe('Performance Validation', () => {
    it('should handle large numbers of entities efficiently', () => {
      const startTime = performance.now();
      
      // Create 1000 entities
      const entities = [];
      for (let i = 0; i < 1000; i++) {
        const entity = world.createEntity();
        const component = new Component();
        component.type = 'performance-test';
        entity.addComponent(component);
        entities.push(entity);
      }
      
      const endTime = performance.now();
      const duration = endTime - startTime;
      
      // Should complete in under 100ms
      expect(duration).toBeLessThan(100);
      expect(entities.length).toBe(1000);
    });

    it('should efficiently query entities by component', () => {
      // Add entities with different components
      for (let i = 0; i < 100; i++) {
        const entity = world.createEntity();
        const component = new Component();
        component.type = i % 2 === 0 ? 'even' : 'odd';
        entity.addComponent(component);
      }
      
      const startTime = performance.now();
      const evenEntities = world.getEntitiesWithComponent('even');
      const endTime = performance.now();
      
      expect(evenEntities.length).toBe(50);
      expect(endTime - startTime).toBeLessThan(10); // Should be very fast
    });
  });

  describe('Error Handling', () => {
    it('should handle invalid entity operations gracefully', () => {
      expect(() => {
        world.getEntityById('invalid-id');
      }).not.toThrow();
      
      expect(world.getEntityById('invalid-id')).toBeNull();
    });

    it('should handle duplicate component addition', () => {
      const entity = world.createEntity();
      const component1 = new Component();
      component1.type = 'duplicate-test';
      
      const component2 = new Component();
      component2.type = 'duplicate-test';
      
      entity.addComponent(component1);
      entity.addComponent(component2); // Should replace first
      
      expect(entity.getComponent('duplicate-test')).toBe(component2);
    });

    it('should handle removal of non-existent components', () => {
      const entity = world.createEntity();
      
      expect(() => {
        entity.removeComponent('non-existent');
      }).not.toThrow();
    });
  });
});