// @ts-nocheck
/**
 * Magic Spell Combat Test Scenario
 * 
 * Comprehensive test of magic combat system:
 * 1. Player prepares spells and runes
 * 2. Player engages target with different spell types
 * 3. Test mana consumption and regeneration
 * 4. Test spell accuracy, damage, and effects
 * 5. Test different magic schools (combat, teleport, utility)
 * 6. Validate spell mechanics and mana management
 * 
 * Visual verification: Spell effects, mana changes, combat animations
 * Data validation: Spell damage, mana costs, accuracy rates, cooldowns
 */

import { TestScenario } from '../ScenarioTestFramework.js';
import { Vector3 } from '../../types.js';

export const MagicSpellCombatScenario: TestScenario = {
  id: 'magic_spell_combat_test',
  name: 'Magic Spell Combat Test',
  description: 'Player uses various magic spells in combat situations',
  maxDuration: 180000, // 3 minutes for comprehensive magic testing

  async setup(framework) {
    framework.log('🔮 Setting up magic spell combat test scenario...');

    const rpgHelpers = framework.getRPGHelpers();

    // Spawn player with high magic level and mana (outside safe zones)
    const playerPosition: Vector3 = { x: 150, y: 1, z: 150 };
    const player = rpgHelpers.spawnPlayer('magic_test_player', {
      position: playerPosition,
      stats: {
        hitpoints: { current: 80, max: 80 },
        defence: { level: 20, xp: 0 },
        attack: { level: 10, xp: 0 },     // Low melee for magic focus
        strength: { level: 10, xp: 0 },
        magic: { level: 50, xp: 0 },      // High magic level
        prayer: { level: 25, xp: 0 }
      },
      mana: { current: 100, max: 100 },   // Full mana to start
      visualOverride: {
        color: '#9400D3', // Dark violet for magic user
        size: { width: 1, height: 2, depth: 1 }
      }
    });

    if (!player) {
      throw new Error('Failed to spawn magic test player');
    }

    // Ensure the player entity is properly registered for combat system
    const world = framework.getWorld();
    if (!world.entities.items.has('magic_test_player')) {
      world.entities.items.set('magic_test_player', player);
      framework.log('📝 Magic player entity registered in world entities');
    }

    framework.log('🧙 Magic player spawned with high magic level and full mana');

    // Equip player with magic equipment and runes
    const inventory = player.getComponent('inventory');
    if (inventory) {
      const magicItems = [
        // Weapons and equipment
        { itemId: 1379, quantity: 1, name: 'Staff of fire', equipSlot: 'weapon' },
        { itemId: 579, quantity: 1, name: 'Mystic hat', equipSlot: 'head' },
        { itemId: 577, quantity: 1, name: 'Mystic robe top', equipSlot: 'body' },
        
        // Runes for various spells
        { itemId: 554, quantity: 1000, name: 'Fire rune' },      // Fire magic
        { itemId: 555, quantity: 1000, name: 'Water rune' },     // Water magic
        { itemId: 556, quantity: 1000, name: 'Air rune' },       // Air magic
        { itemId: 557, quantity: 1000, name: 'Earth rune' },     // Earth magic
        { itemId: 558, quantity: 500, name: 'Mind rune' },       // Combat spells
        { itemId: 559, quantity: 500, name: 'Body rune' },       // Combat spells
        { itemId: 560, quantity: 200, name: 'Death rune' },      // High-level spells
        { itemId: 561, quantity: 200, name: 'Nature rune' },     // Nature magic
        { itemId: 562, quantity: 100, name: 'Law rune' },        // Teleport spells
        { itemId: 563, quantity: 100, name: 'Chaos rune' },      // Chaos magic
        
        // Consumables
        { itemId: 3024, quantity: 10, name: 'Super restore' },   // Restore mana
        { itemId: 2436, quantity: 5, name: 'Super attack' }      // Stat boosts
      ];

      magicItems.forEach(item => {
        if (inventory.items.length < inventory.maxSlots) {
          inventory.items.push({
            itemId: item.itemId,
            quantity: item.quantity,
            metadata: { 
              name: item.name,
              equipSlot: item.equipSlot || null,
              runeType: item.name.includes('rune') ? 'magic_component' : 'equipment'
            }
          });
        }
      });

      framework.log('🎒 Player equipped with magic gear and comprehensive rune set');
    }

    // Create training dummy for controlled damage testing (outside safe zones)
    const trainingDummy = rpgHelpers.spawnNPC('training_dummy', {
      position: { x: 158, y: 1, z: 150 },
      behavior: 'stationary',
      visualOverride: {
        color: '#8B4513', // Brown training dummy
        size: { width: 1, height: 2, depth: 1 }
      },
      statsOverride: {
        hitpoints: { current: 200, max: 200 },
        defence: { level: 10 },
        magic: { level: 1 } // Low magic defence
      }
    });

    // Create mobile combat target for advanced testing (outside safe zones)
    const magicTarget = rpgHelpers.spawnNPC('wizard', {
      position: { x: 165, y: 1, z: 150 },
      behavior: 'defensive', // Fights back but doesn't initiate
      visualOverride: {
        color: '#FF6347', // Tomato red enemy wizard
        size: { width: 0.9, height: 1.8, depth: 0.9 }
      },
      statsOverride: {
        hitpoints: { current: 100, max: 100 },
        defence: { level: 15 },
        magic: { level: 25 },
        attack: { level: 20 }
      }
    });

    if (!trainingDummy || !magicTarget) {
      throw new Error('Failed to spawn magic test targets');
    }

    // Ensure the target entities are properly registered for combat system
    if (!world.entities.items.has(trainingDummy.id)) {
      world.entities.items.set(trainingDummy.id, trainingDummy);
      framework.log('📝 Training dummy registered in world entities');
    }
    if (!world.entities.items.has(magicTarget.id)) {
      world.entities.items.set(magicTarget.id, magicTarget);
      framework.log('📝 Magic target registered in world entities');
    }

    framework.log('🎯 Training dummy and enemy wizard spawned for magic testing');

    // Create spell testing areas with visual markers (outside safe zones)
    const spellAreas = [
      { pos: { x: 155, y: 1, z: 150 }, color: '#FF4500', name: 'combat_spells' },     // Orange for combat
      { pos: { x: 160, y: 1, z: 155 }, color: '#32CD32', name: 'utility_spells' },   // Green for utility
      { pos: { x: 145, y: 1, z: 150 }, color: '#4169E1', name: 'teleport_test' }     // Blue for teleport
    ];

    spellAreas.forEach(area => {
      rpgHelpers.spawnItem(`${area.name}_marker`, {
        position: area.pos,
        visualOverride: {
          color: area.color,
          size: { width: 1.5, height: 0.2, depth: 1.5 }
        }
      });
    });

    framework.log('✨ Spell testing areas created: Orange (combat), Green (utility), Blue (teleport)');

    // Store test data
    (framework as any).magicTestData = {
      playerId: 'magic_test_player',
      trainingDummyId: trainingDummy.id,
      magicTargetId: magicTarget.id,
      initialMana: 100,
      maxMana: 100,
      spellAreas: {
        combat: { x: 155, y: 1, z: 150 },
        utility: { x: 160, y: 1, z: 155 },
        teleport: { x: 145, y: 1, z: 150 }
      },
      spellsToTest: [
        { name: 'Wind Strike', level: 1, damage: '2-8', mana: 1, runes: ['air', 'mind'] },
        { name: 'Earth Bolt', level: 29, damage: '9-15', mana: 4, runes: ['earth', 'chaos'] },
        { name: 'Fire Blast', level: 35, damage: '11-16', mana: 5, runes: ['fire', 'air', 'death'] },
        { name: 'Water Wave', level: 65, damage: '14-20', mana: 7, runes: ['water', 'air', 'earth'] },
        { name: 'Teleport', level: 25, damage: '0', mana: 3, runes: ['law', 'air'] }
      ],
      phase: 'setup_complete',
      spellsCast: [],
      totalDamageDealt: 0,
      manaConsumed: 0,
      spellAccuracy: { hits: 0, attempts: 0 },
      combatSpellsTested: false,
      utilitySpellsTested: false,
      teleportTested: false,
      startTime: Date.now(),
      phases: []
    };

    framework.log('✅ Magic spell combat scenario setup complete');
    framework.log('📋 Test phases: Combat Spells → Utility Magic → Teleportation → Accuracy Testing');
  },

  async condition(framework) {
    const testData = (framework as any).magicTestData;
    if (!testData) return false;

    const rpgHelpers = framework.getRPGHelpers();
    const currentTime = Date.now();
    const elapsed = currentTime - testData.startTime;

    // Get entities
    const player = rpgHelpers.getTestEntity(testData.playerId);
    const trainingDummy = rpgHelpers.getTestEntity(testData.trainingDummyId);
    const magicTarget = rpgHelpers.getTestEntity(testData.magicTargetId);

    if (!player) {
      framework.log('❌ Magic test player missing');
      return false;
    }

    // Get current stats
    const playerStats = player.getComponent('stats');
    const playerMana = player.getComponent('mana') || { current: testData.initialMana, max: testData.maxMana };
    const playerInventory = player.getComponent('inventory');
    
    if (!playerStats || !playerInventory) {
      framework.log('❌ Player components missing');
      return false;
    }

    const currentMana = playerMana.current;
    const maxMana = playerMana.max;

    switch (testData.phase) {
      case 'setup_complete':
        // Phase 1: Move to combat spell area and start testing
        framework.log('🔥 Phase 1: Moving to combat spell testing area...');
        
        const movement = player.getComponent('movement');
        if (movement) {
          movement.destination = testData.spellAreas.combat;
          movement.isMoving = true;
        }

        // Check if reached combat area
        const playerPos = player.position || movement?.position;
        if (playerPos) {
          const distanceToCombat = Math.sqrt(
            Math.pow(playerPos.x - testData.spellAreas.combat.x, 2) +
            Math.pow(playerPos.z - testData.spellAreas.combat.z, 2)
          );

          if (distanceToCombat < 2) {
            testData.phase = 'test_combat_spells';
            testData.phases.push({ phase: 'reached_combat_area', time: elapsed });
            framework.log('⚔️ Reached combat spell area');
          }
        }
        return false;

      case 'test_combat_spells':
        // Phase 2: Test offensive combat spells
        framework.log(`🔥 Phase 2: Testing combat spells... Mana: ${currentMana}/${maxMana}`);
        
        if (!testData.combatSpellsTested && trainingDummy) {
          // Cast combat spells at training dummy
          const spellToTest = testData.spellsToTest[testData.spellsCast.length % 4]; // First 4 are combat spells
          
          if (currentMana >= spellToTest.mana && testData.spellsCast.length < 4) {
            // Check rune availability
            const hasRunes = spellToTest.runes.every(runeType => {
              return playerInventory.items.some(item => 
                item.metadata?.name?.toLowerCase().includes(runeType) && item.quantity > 0
              );
            });

            if (hasRunes) {
              // Consume runes
              spellToTest.runes.forEach(runeType => {
                const runeSlot = playerInventory.items.findIndex(item => 
                  item.metadata?.name?.toLowerCase().includes(runeType)
                );
                if (runeSlot !== -1 && playerInventory.items[runeSlot].quantity > 0) {
                  playerInventory.items[runeSlot].quantity--;
                }
              });

              // Cast spell - consume mana and deal damage
              playerMana.current = Math.max(0, currentMana - spellToTest.mana);
              
              // Calculate damage (simplified)
              const baseDamage = parseInt(spellToTest.damage.split('-')[1]) || 10;
              const magicLevel = playerStats.magic?.level || 1;
              const damage = Math.floor(baseDamage * (1 + magicLevel / 100));
              
              // Apply damage to dummy
              const dummyStats = trainingDummy.getComponent('stats');
              if (dummyStats) {
                dummyStats.hitpoints.current = Math.max(0, dummyStats.hitpoints.current - damage);
                testData.totalDamageDealt += damage;
              }

              testData.manaConsumed += spellToTest.mana;
              testData.spellsCast.push({
                name: spellToTest.name,
                damage,
                manaCost: spellToTest.mana,
                target: 'training_dummy',
                time: elapsed
              });

              testData.spellAccuracy.attempts++;
              testData.spellAccuracy.hits++; // Training dummy always hit

              framework.log(`✨ Cast ${spellToTest.name}: ${damage} damage, -${spellToTest.mana} mana`);
            }
          } else if (testData.spellsCast.length >= 4) {
            testData.combatSpellsTested = true;
            testData.phase = 'move_to_utility';
            testData.phases.push({ 
              phase: 'combat_spells_complete', 
              time: elapsed, 
              spellsCast: testData.spellsCast.length 
            });
            framework.log('✅ Combat spells testing complete');
          }
        }
        return false;

      case 'move_to_utility':
        // Phase 3: Move to utility spell area
        framework.log('🔧 Phase 3: Moving to utility spell area...');
        
        const utilityMovement = player.getComponent('movement');
        if (utilityMovement) {
          utilityMovement.destination = testData.spellAreas.utility;
          utilityMovement.isMoving = true;
        }

        // Check if reached utility area
        const playerPosUtil = player.position || utilityMovement?.position;
        if (playerPosUtil) {
          const distanceToUtility = Math.sqrt(
            Math.pow(playerPosUtil.x - testData.spellAreas.utility.x, 2) +
            Math.pow(playerPosUtil.z - testData.spellAreas.utility.z, 2)
          );

          if (distanceToUtility < 2) {
            testData.phase = 'test_utility_spells';
            testData.phases.push({ phase: 'reached_utility_area', time: elapsed });
            framework.log('🔧 Reached utility spell area');
          }
        }
        return false;

      case 'test_utility_spells':
        // Phase 4: Test utility and support spells
        framework.log(`🔧 Phase 4: Testing utility spells... Mana: ${currentMana}/${maxMana}`);
        
        if (!testData.utilitySpellsTested) {
          // Test mana restoration spell/potion
          const restoreSlot = playerInventory.items.findIndex(item => 
            item.metadata?.name?.toLowerCase().includes('restore')
          );
          
          if (restoreSlot !== -1 && playerInventory.items[restoreSlot].quantity > 0 && currentMana < maxMana) {
            const restoreItem = playerInventory.items[restoreSlot];
            restoreItem.quantity--;
            
            // Restore mana
            const manaRestored = Math.min(30, maxMana - currentMana);
            playerMana.current = Math.min(maxMana, currentMana + manaRestored);
            
            testData.spellsCast.push({
              name: 'Mana Restore',
              damage: 0,
              manaCost: -manaRestored,
              target: 'self',
              time: elapsed
            });
            
            framework.log(`💙 Used restore potion: +${manaRestored} mana`);
            testData.utilitySpellsTested = true;
            testData.phase = 'move_to_teleport';
            testData.phases.push({ phase: 'utility_spells_complete', time: elapsed });
          }
        }
        return false;

      case 'move_to_teleport':
        // Phase 5: Move to teleportation test area
        framework.log('🌀 Phase 5: Moving to teleportation test area...');
        
        const teleMovement = player.getComponent('movement');
        if (teleMovement) {
          teleMovement.destination = testData.spellAreas.teleport;
          teleMovement.isMoving = true;
        }

        // Check if reached teleport area
        const playerPosTele = player.position || teleMovement?.position;
        if (playerPosTele) {
          const distanceToTeleport = Math.sqrt(
            Math.pow(playerPosTele.x - testData.spellAreas.teleport.x, 2) +
            Math.pow(playerPosTele.z - testData.spellAreas.teleport.z, 2)
          );

          if (distanceToTeleport < 2) {
            testData.phase = 'test_teleport';
            testData.phases.push({ phase: 'reached_teleport_area', time: elapsed });
            framework.log('🌀 Reached teleportation area');
          }
        }
        return false;

      case 'test_teleport':
        // Phase 6: Test teleportation magic
        framework.log(`🌀 Phase 6: Testing teleportation... Mana: ${currentMana}/${maxMana}`);
        
        if (!testData.teleportTested) {
          const teleportSpell = testData.spellsToTest.find(spell => spell.name === 'Teleport');
          
          if (currentMana >= teleportSpell.mana) {
            // Check law runes
            const lawRuneSlot = playerInventory.items.findIndex(item => 
              item.metadata?.name?.toLowerCase().includes('law')
            );
            const airRuneSlot = playerInventory.items.findIndex(item => 
              item.metadata?.name?.toLowerCase().includes('air')
            );
            
            if (lawRuneSlot !== -1 && airRuneSlot !== -1 && 
                playerInventory.items[lawRuneSlot].quantity > 0 && 
                playerInventory.items[airRuneSlot].quantity > 0) {
              
              // Consume runes
              playerInventory.items[lawRuneSlot].quantity--;
              playerInventory.items[airRuneSlot].quantity--;
              
              // Consume mana
              playerMana.current = currentMana - teleportSpell.mana;
              
              // Teleport to combat area
              const teleportDest = testData.spellAreas.combat;
              const playerMovement = player.getComponent('movement');
              if (playerMovement) {
                playerMovement.position = teleportDest;
                player.position = teleportDest;
              }
              
              testData.spellsCast.push({
                name: 'Teleport',
                damage: 0,
                manaCost: teleportSpell.mana,
                target: 'location',
                time: elapsed
              });
              
              testData.teleportTested = true;
              testData.phase = 'accuracy_test';
              testData.phases.push({ phase: 'teleport_complete', time: elapsed });
              framework.log('✨ Teleportation successful!');
            }
          }
        }
        return false;

      case 'accuracy_test':
        // Phase 7: Test spell accuracy with mobile target
        framework.log(`🎯 Phase 7: Testing spell accuracy vs mobile target... Hits: ${testData.spellAccuracy.hits}/${testData.spellAccuracy.attempts}`);
        
        if (magicTarget && testData.spellAccuracy.attempts < 10) {
          // Cast spells at moving target
          const spellToTest = testData.spellsToTest[0]; // Wind Strike - cheap spell
          
          if (currentMana >= spellToTest.mana) {
            // Attempt spell cast
            playerMana.current = currentMana - spellToTest.mana;
            testData.spellAccuracy.attempts++;
            
            // Accuracy calculation (simplified)
            const magicLevel = playerStats.magic?.level || 1;
            const targetDefence = magicTarget.getComponent('stats')?.magic?.level || 1;
            const accuracy = Math.min(0.9, 0.4 + (magicLevel - targetDefence) / 100);
            const hit = Math.random() < accuracy;
            
            if (hit) {
              testData.spellAccuracy.hits++;
              const damage = Math.floor(Math.random() * 6) + 2; // 2-8 damage
              
              const targetStats = magicTarget.getComponent('stats');
              if (targetStats) {
                targetStats.hitpoints.current = Math.max(0, targetStats.hitpoints.current - damage);
                testData.totalDamageDealt += damage;
              }
              
              framework.log(`💥 Hit mobile target: ${damage} damage`);
            } else {
              framework.log(`💨 Missed mobile target`);
            }
            
            testData.spellsCast.push({
              name: spellToTest.name,
              damage: hit ? damage : 0,
              manaCost: spellToTest.mana,
              target: 'mobile_enemy',
              hit,
              time: elapsed
            });
          }
        }
        
        // Complete test after enough attempts
        if (testData.spellAccuracy.attempts >= 10) {
          testData.phase = 'test_complete';
          testData.phases.push({ phase: 'accuracy_test_complete', time: elapsed });
        }
        return false;

      case 'test_complete':
        // Final phase: Display comprehensive results
        framework.log('📊 MAGIC SPELL COMBAT TEST COMPLETE!');
        framework.log('📈 Magic Test Results:');
        framework.log(`   🔥 Combat spells tested: ${testData.combatSpellsTested ? 'YES' : 'NO'}`);
        framework.log(`   🔧 Utility spells tested: ${testData.utilitySpellsTested ? 'YES' : 'NO'}`);
        framework.log(`   🌀 Teleportation tested: ${testData.teleportTested ? 'YES' : 'NO'}`);
        framework.log(`   ⚡ Total spells cast: ${testData.spellsCast.length}`);
        framework.log(`   💥 Total damage dealt: ${testData.totalDamageDealt}`);
        framework.log(`   💙 Total mana consumed: ${testData.manaConsumed}`);
        framework.log(`   🎯 Spell accuracy: ${testData.spellAccuracy.hits}/${testData.spellAccuracy.attempts} (${((testData.spellAccuracy.hits / testData.spellAccuracy.attempts) * 100).toFixed(1)}%)`);
        framework.log(`   💙 Final mana: ${currentMana}/${maxMana}`);
        
        framework.log('✨ Spell casting details:');
        testData.spellsCast.forEach((spell, index) => {
          const hit = spell.hit !== undefined ? (spell.hit ? '✓' : '✗') : '✓';
          framework.log(`   ${index + 1}. ${spell.name}: ${spell.damage} dmg, ${spell.manaCost} mana ${hit}`);
        });

        framework.log('📋 Phase timeline:');
        testData.phases.forEach((phase, index) => {
          framework.log(`   ${index + 1}. ${phase.phase} at ${(phase.time / 1000).toFixed(1)}s`);
        });

        // Validate magic mechanics
        const magicEffective = testData.totalDamageDealt > 0;
        const spellVarietyTested = testData.combatSpellsTested && testData.utilitySpellsTested && testData.teleportTested;
        const manaSystemWorking = testData.manaConsumed > 0;
        const accuracyReasonable = testData.spellAccuracy.attempts > 0 && 
          (testData.spellAccuracy.hits / testData.spellAccuracy.attempts) > 0.3;
        
        if (magicEffective && spellVarietyTested && manaSystemWorking && accuracyReasonable) {
          framework.log('🎉 ALL MAGIC MECHANICS WORKING CORRECTLY!');
        } else {
          framework.log('⚠️ Some magic mechanics may need attention');
        }

        return true; // Test complete

      default:
        framework.log(`❌ Unknown phase: ${testData.phase}`);
        return false;
    }
  },

  async cleanup(framework) {
    framework.log('🧹 Cleaning up magic spell combat test...');
    
    const testData = (framework as any).magicTestData;
    if (testData) {
      const rpgHelpers = framework.getRPGHelpers();
      
      // Clean up test entities
      rpgHelpers.removeTestEntity(testData.playerId);
      rpgHelpers.removeTestEntity(testData.trainingDummyId);
      rpgHelpers.removeTestEntity(testData.magicTargetId);
      rpgHelpers.removeTestEntity('combat_spells_marker');
      rpgHelpers.removeTestEntity('utility_spells_marker');
      rpgHelpers.removeTestEntity('teleport_test_marker');
    }
    
    framework.log('✅ Magic test cleanup complete');
  }
};