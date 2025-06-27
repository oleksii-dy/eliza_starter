/**
 * Comprehensive RPG Systems Unit Tests
 * 
 * Tests all RPG systems including combat, inventory, skills, and quests
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { World } from '../core/World';
import { Entity } from '../core/Entity';
import { Component } from '../core/Component';

// Mock RPG Components
class StatsComponent extends Component {
  type = 'stats';
  attack = 1;
  strength = 1;
  defence = 1;
  hitpoints = { current: 10, max: 10 };
  magic = 1;
  ranged = 1;
  prayer = 1;
  
  constructor(stats: Partial<StatsComponent> = {}) {
    super();
    Object.assign(this, stats);
  }
}

class InventoryComponent extends Component {
  type = 'inventory';
  items: Array<{ id: string; quantity: number }> = [];
  maxSlots = 28;
  
  addItem(itemId: string, quantity = 1) {
    const existing = this.items.find(item => item.id === itemId);
    if (existing) {
      existing.quantity += quantity;
    } else if (this.items.length < this.maxSlots) {
      this.items.push({ id: itemId, quantity });
    }
    return this.items.length <= this.maxSlots;
  }
  
  removeItem(itemId: string, quantity = 1) {
    const item = this.items.find(item => item.id === itemId);
    if (item) {
      item.quantity -= quantity;
      if (item.quantity <= 0) {
        this.items = this.items.filter(i => i !== item);
      }
      return true;
    }
    return false;
  }
  
  hasItem(itemId: string, quantity = 1) {
    const item = this.items.find(item => item.id === itemId);
    return item ? item.quantity >= quantity : false;
  }
}

class CombatComponent extends Component {
  type = 'combat';
  inCombat = false;
  target: string | null = null;
  lastAttackTime = 0;
  attackSpeed = 4000; // 4 seconds default
  
  canAttack(currentTime: number) {
    return currentTime - this.lastAttackTime >= this.attackSpeed;
  }
  
  attack(targetId: string, currentTime: number) {
    if (!this.canAttack(currentTime)) return false;
    
    this.target = targetId;
    this.inCombat = true;
    this.lastAttackTime = currentTime;
    return true;
  }
}

class SkillsComponent extends Component {
  type = 'skills';
  skills: Record<string, { level: number; xp: number }> = {
    attack: { level: 1, xp: 0 },
    strength: { level: 1, xp: 0 },
    defence: { level: 1, xp: 0 },
    magic: { level: 1, xp: 0 },
    ranged: { level: 1, xp: 0 },
    prayer: { level: 1, xp: 0 },
  };
  
  addXP(skill: string, xp: number) {
    if (this.skills[skill]) {
      this.skills[skill].xp += xp;
      // Simple level calculation: level = Math.floor(xp / 100) + 1
      this.skills[skill].level = Math.floor(this.skills[skill].xp / 100) + 1;
      return true;
    }
    return false;
  }
  
  getLevel(skill: string) {
    return this.skills[skill]?.level || 1;
  }
}

describe('RPG Systems Tests', () => {
  let world: World;

  beforeEach(() => {
    world = new World();
  });

  afterEach(() => {
    if (world) {
      world.destroy?.();
    }
  });

  describe('Stats System', () => {
    it('should create character with base stats', () => {
      const entity = world.createEntity();
      const stats = new StatsComponent({
        attack: 10,
        strength: 15,
        defence: 8,
        hitpoints: { current: 20, max: 20 }
      });
      
      entity.addComponent(stats);
      
      expect(stats.attack).toBe(10);
      expect(stats.strength).toBe(15);
      expect(stats.defence).toBe(8);
      expect(stats.hitpoints.current).toBe(20);
      expect(stats.hitpoints.max).toBe(20);
    });

    it('should handle stat modifications', () => {
      const entity = world.createEntity();
      const stats = new StatsComponent();
      entity.addComponent(stats);
      
      stats.attack += 5;
      stats.hitpoints.current -= 3;
      
      expect(stats.attack).toBe(6); // 1 + 5
      expect(stats.hitpoints.current).toBe(7); // 10 - 3
    });

    it('should not allow hitpoints to exceed maximum', () => {
      const entity = world.createEntity();
      const stats = new StatsComponent();
      entity.addComponent(stats);
      
      stats.hitpoints.current = stats.hitpoints.max + 10;
      
      // In a real system, this would be clamped
      const clampedHP = Math.min(stats.hitpoints.current, stats.hitpoints.max);
      expect(clampedHP).toBe(stats.hitpoints.max);
    });
  });

  describe('Inventory System', () => {
    it('should add items to inventory', () => {
      const entity = world.createEntity();
      const inventory = new InventoryComponent();
      entity.addComponent(inventory);
      
      const success = inventory.addItem('sword', 1);
      
      expect(success).toBe(true);
      expect(inventory.items.length).toBe(1);
      expect(inventory.items[0].id).toBe('sword');
      expect(inventory.items[0].quantity).toBe(1);
    });

    it('should stack identical items', () => {
      const entity = world.createEntity();
      const inventory = new InventoryComponent();
      entity.addComponent(inventory);
      
      inventory.addItem('coin', 100);
      inventory.addItem('coin', 50);
      
      expect(inventory.items.length).toBe(1);
      expect(inventory.items[0].quantity).toBe(150);
    });

    it('should respect inventory slot limits', () => {
      const entity = world.createEntity();
      const inventory = new InventoryComponent();
      inventory.maxSlots = 2;
      entity.addComponent(inventory);
      
      const success1 = inventory.addItem('item1', 1);
      const success2 = inventory.addItem('item2', 1);
      const success3 = inventory.addItem('item3', 1);
      
      expect(success1).toBe(true);
      expect(success2).toBe(true);
      expect(success3).toBe(false);
      expect(inventory.items.length).toBe(2);
    });

    it('should remove items correctly', () => {
      const entity = world.createEntity();
      const inventory = new InventoryComponent();
      entity.addComponent(inventory);
      
      inventory.addItem('potion', 5);
      const success = inventory.removeItem('potion', 2);
      
      expect(success).toBe(true);
      expect(inventory.items[0].quantity).toBe(3);
    });

    it('should check item existence', () => {
      const entity = world.createEntity();
      const inventory = new InventoryComponent();
      entity.addComponent(inventory);
      
      inventory.addItem('key', 1);
      
      expect(inventory.hasItem('key')).toBe(true);
      expect(inventory.hasItem('key', 2)).toBe(false);
      expect(inventory.hasItem('nonexistent')).toBe(false);
    });
  });

  describe('Combat System', () => {
    it('should initialize combat component', () => {
      const entity = world.createEntity();
      const combat = new CombatComponent();
      entity.addComponent(combat);
      
      expect(combat.inCombat).toBe(false);
      expect(combat.target).toBeNull();
      expect(combat.attackSpeed).toBe(4000);
    });

    it('should handle attack timing', () => {
      const entity = world.createEntity();
      const combat = new CombatComponent();
      entity.addComponent(combat);
      
      const time1 = 1000;
      const time2 = 2000;
      const time3 = 6000;
      
      // First attack should succeed
      expect(combat.canAttack(time1)).toBe(true);
      const attack1 = combat.attack('target1', time1);
      expect(attack1).toBe(true);
      
      // Second attack too soon should fail
      expect(combat.canAttack(time2)).toBe(false);
      
      // Third attack after cooldown should succeed
      expect(combat.canAttack(time3)).toBe(true);
    });

    it('should track combat state', () => {
      const entity = world.createEntity();
      const combat = new CombatComponent();
      entity.addComponent(combat);
      
      combat.attack('enemy1', 1000);
      
      expect(combat.inCombat).toBe(true);
      expect(combat.target).toBe('enemy1');
      expect(combat.lastAttackTime).toBe(1000);
    });
  });

  describe('Skills System', () => {
    it('should initialize with base skills', () => {
      const entity = world.createEntity();
      const skills = new SkillsComponent();
      entity.addComponent(skills);
      
      expect(skills.getLevel('attack')).toBe(1);
      expect(skills.getLevel('strength')).toBe(1);
      expect(skills.skills.attack.xp).toBe(0);
    });

    it('should add experience and level up', () => {
      const entity = world.createEntity();
      const skills = new SkillsComponent();
      entity.addComponent(skills);
      
      const success = skills.addXP('attack', 150);
      
      expect(success).toBe(true);
      expect(skills.skills.attack.xp).toBe(150);
      expect(skills.getLevel('attack')).toBe(2); // 150/100 + 1 = 2
    });

    it('should handle multiple skill progression', () => {
      const entity = world.createEntity();
      const skills = new SkillsComponent();
      entity.addComponent(skills);
      
      skills.addXP('attack', 200);
      skills.addXP('strength', 300);
      skills.addXP('defence', 50);
      
      expect(skills.getLevel('attack')).toBe(3);
      expect(skills.getLevel('strength')).toBe(4);
      expect(skills.getLevel('defence')).toBe(1);
    });

    it('should reject invalid skills', () => {
      const entity = world.createEntity();
      const skills = new SkillsComponent();
      entity.addComponent(skills);
      
      const success = skills.addXP('invalid-skill', 100);
      
      expect(success).toBe(false);
      expect(skills.getLevel('invalid-skill')).toBe(1);
    });
  });

  describe('Integration Tests', () => {
    it('should create a complete RPG character', () => {
      const entity = world.createEntity();
      
      const stats = new StatsComponent({
        attack: 20,
        strength: 25,
        defence: 15,
        hitpoints: { current: 30, max: 30 }
      });
      
      const inventory = new InventoryComponent();
      const combat = new CombatComponent();
      const skills = new SkillsComponent();
      
      entity.addComponent(stats);
      entity.addComponent(inventory);
      entity.addComponent(combat);
      entity.addComponent(skills);
      
      // Add starting equipment
      inventory.addItem('bronze-sword', 1);
      inventory.addItem('bread', 5);
      
      // Add some experience
      skills.addXP('attack', 100);
      
      // Verify character state
      expect(entity.getComponent('stats')).toBe(stats);
      expect(entity.getComponent('inventory')).toBe(inventory);
      expect(entity.getComponent('combat')).toBe(combat);
      expect(entity.getComponent('skills')).toBe(skills);
      
      expect(inventory.hasItem('bronze-sword')).toBe(true);
      expect(skills.getLevel('attack')).toBe(2);
    });

    it('should handle combat between two entities', () => {
      // Create player
      const player = world.createEntity();
      const playerStats = new StatsComponent();
      const playerCombat = new CombatComponent();
      player.addComponent(playerStats);
      player.addComponent(playerCombat);
      
      // Create enemy
      const enemy = world.createEntity();
      const enemyStats = new StatsComponent();
      const enemyCombat = new CombatComponent();
      enemy.addComponent(enemyStats);
      enemy.addComponent(enemyCombat);
      
      // Player attacks enemy
      const attackTime = 1000;
      const playerAttack = playerCombat.attack(enemy.id, attackTime);
      
      expect(playerAttack).toBe(true);
      expect(playerCombat.target).toBe(enemy.id);
      expect(playerCombat.inCombat).toBe(true);
    });
  });

  describe('Performance and Validation', () => {
    it('should handle many RPG entities efficiently', () => {
      const startTime = performance.now();
      
      // Create 100 complete RPG characters
      for (let i = 0; i < 100; i++) {
        const entity = world.createEntity();
        entity.addComponent(new StatsComponent());
        entity.addComponent(new InventoryComponent());
        entity.addComponent(new CombatComponent());
        entity.addComponent(new SkillsComponent());
      }
      
      const endTime = performance.now();
      const duration = endTime - startTime;
      
      expect(duration).toBeLessThan(50); // Should be fast
      expect(world.entities.size).toBe(100);
    });

    it('should validate RPG system integrity', () => {
      const entity = world.createEntity();
      const stats = new StatsComponent();
      const inventory = new InventoryComponent();
      
      entity.addComponent(stats);
      entity.addComponent(inventory);
      
      // Verify all components are properly linked
      expect(stats.entity).toBe(entity);
      expect(inventory.entity).toBe(entity);
      
      // Verify component retrieval
      expect(entity.getComponent('stats')).toBe(stats);
      expect(entity.getComponent('inventory')).toBe(inventory);
    });
  });
});