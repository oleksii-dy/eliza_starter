import { describe, it, expect, beforeEach } from 'vitest';
import { createTestWorld, runWorldFor } from '../createTestWorld';
import type { World } from '../../types';
import type { PrayerSystem } from '../../rpg/systems/PrayerSystem';

describe('PrayerSystem Runtime', () => {
  let world: World;
  let prayerSystem: PrayerSystem;

  beforeEach(async () => {
    world = await createTestWorld();
    prayerSystem = world.getSystem('prayer') as PrayerSystem;
  });

  describe('Basic Prayer Functions', () => {
    it('should activate and deactivate prayers', async () => {
      const player = (world as any).createTestPlayer('player1');

      // Set up player stats with prayer
      const stats = player.getComponent('stats');
      if (stats) {
        stats.prayer = {
          level: 50,
          xp: 100000,
          points: 50,
          maxPoints: 50
        };
      }

      // Activate a basic prayer
      const activated = prayerSystem.activatePrayer('player1', 'thickSkin');
      expect(activated).toBe(true);

      // Check prayer is active
      const activePrayers = prayerSystem.getActivePrayers('player1');
      expect(activePrayers).toContain('thickSkin');

      // Deactivate the prayer
      const deactivated = prayerSystem.deactivatePrayer('player1', 'thickSkin');
      expect(deactivated).toBe(true);

      // Check prayer is no longer active
      const updatedPrayers = prayerSystem.getActivePrayers('player1');
      expect(updatedPrayers).not.toContain('thickSkin');
    });

    it('should prevent prayers without sufficient level', async () => {
      const player = (world as any).createTestPlayer('player1');

      // Set low prayer level
      const stats = player.getComponent('stats');
      if (stats) {
        stats.prayer = {
          level: 1,
          xp: 0,
          points: 1,
          maxPoints: 1
        };
      }

      // Try to activate high level prayer
      const activated = prayerSystem.activatePrayer('player1', 'protectFromMelee');
      expect(activated).toBe(false);
    });

    it('should handle protection prayers on combat component', async () => {
      const player = (world as any).createTestPlayer('player1');

      // Set up stats
      const stats = player.getComponent('stats');
      if (stats) {
        stats.prayer = {
          level: 43,
          xp: 50000,
          points: 43,
          maxPoints: 43
        };
      }

      // Ensure combat component exists
      const combat = player.getComponent('combat');
      if (!combat) {
        player.addComponent('combat', {
          type: 'combat',
          inCombat: false,
          target: null,
          lastAttackTime: 0,
          attackSpeed: 4,
          combatStyle: 'accurate',
          autoRetaliate: true,
          hitSplatQueue: [],
          animationQueue: [],
          specialAttackEnergy: 100,
          specialAttackActive: false,
          protectionPrayers: {
            melee: false,
            ranged: false,
            magic: false
          }
        });
      }

      // Activate protection prayer
      prayerSystem.activatePrayer('player1', 'protectFromMelee');

      // Check combat component updated
      const updatedCombat = player.getComponent('combat');
      expect(updatedCombat?.protectionPrayers?.melee).toBe(true);
    });

    it('should deactivate conflicting prayers', async () => {
      const player = (world as any).createTestPlayer('player1');

      // Set up stats
      const stats = player.getComponent('stats');
      if (stats) {
        stats.prayer = {
          level: 50,
          xp: 100000,
          points: 50,
          maxPoints: 50
        };
      }

      // Activate first prayer
      prayerSystem.activatePrayer('player1', 'thickSkin');

      // Activate conflicting prayer (rock skin conflicts with thick skin)
      prayerSystem.activatePrayer('player1', 'rockSkin');

      const activePrayers = prayerSystem.getActivePrayers('player1');
      expect(activePrayers).toContain('rockSkin');
      expect(activePrayers).not.toContain('thickSkin');
    });

    it('should deactivate all prayers', async () => {
      const player = (world as any).createTestPlayer('player1');

      // Set up stats
      const stats = player.getComponent('stats');
      if (stats) {
        stats.prayer = {
          level: 50,
          xp: 100000,
          points: 50,
          maxPoints: 50
        };
      }

      // Activate multiple prayers
      prayerSystem.activatePrayer('player1', 'thickSkin');
      prayerSystem.activatePrayer('player1', 'burstOfStrength');
      prayerSystem.activatePrayer('player1', 'clarityOfThought');

      // Deactivate all
      prayerSystem.deactivateAllPrayers('player1');

      const activePrayers = prayerSystem.getActivePrayers('player1');
      expect(activePrayers.length).toBe(0);
    });
  });

  describe('Prayer Point System', () => {
    it('should track prayer points during runtime', async () => {
      const player = (world as any).createTestPlayer('player1');

      // Set up stats with specific prayer points
      const stats = player.getComponent('stats');
      if (stats) {
        stats.prayer = {
          level: 50,
          xp: 100000,
          points: 50,
          maxPoints: 50
        };
      }

      // Activate a prayer
      prayerSystem.activatePrayer('player1', 'thickSkin');

      // Run world for a bit
      await runWorldFor(world, 1000);

      // Prayer should still be active (drain is slow)
      const activePrayers = prayerSystem.getActivePrayers('player1');
      expect(activePrayers).toContain('thickSkin');
    });

    it('should not allow prayers without prayer points', async () => {
      const player = (world as any).createTestPlayer('player1');

      // Set up stats with no prayer points
      const stats = player.getComponent('stats');
      if (stats) {
        stats.prayer = {
          level: 50,
          xp: 100000,
          points: 0,
          maxPoints: 50
        };
      }

      // Try to activate prayer without points
      const activated = prayerSystem.activatePrayer('player1', 'thickSkin');
      expect(activated).toBe(false);
    });
  });
});
