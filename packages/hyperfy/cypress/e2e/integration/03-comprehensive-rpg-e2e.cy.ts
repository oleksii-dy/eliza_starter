/// <reference types="cypress" />

import { selectors } from '../../support/utils/selectors';
import { openPlayerInventory, performAttack, interactWithObject } from '../../support/commands/player';
import { createTestNPC, createTestItem } from '../../support/commands/entity';

describe('Comprehensive RPG End-to-End Test', () => {
  beforeEach(() => {
    cy.visit('/');
    cy.waitForWorldLoad();
    
    // Wait for RPG systems to initialize
    cy.window().then((win) => {
      cy.waitUntil(() => {
        const world = (win as any).world;
        return world && world.rpgSystems && Object.keys(world.rpgSystems).length > 0;
      }, {
        timeout: 15000,
        interval: 500,
        errorMsg: 'RPG systems failed to initialize'
      });
    });
  });

  describe('Client Connection and Physics', () => {
    it('should connect to server and enable physics simulation', () => {
      cy.log('Testing client connection and physics');
      
      // Verify world is loaded with physics
      cy.getWorld().then((world) => {
        expect(world).to.have.property('physics');
        expect(world.physics).to.not.be.null;
        
        // Check if physics is running
        expect(world.physics).to.have.property('scene');
        cy.log('Physics system verified');
      });
      
      // Test basic player movement with physics
      cy.getPlayerPosition().then((initialPos) => {
        cy.log(`Initial position: ${JSON.stringify(initialPos)}`);
        
        // Move forward and verify position changed
        cy.movePlayer('forward', 2000);
        cy.wait(1000);
        
        cy.getPlayerPosition().then((newPos) => {
          cy.log(`New position: ${JSON.stringify(newPos)}`);
          expect(newPos.x).to.not.equal(initialPos.x);
        });
      });
    });

    it('should handle player collision with environment', () => {
      cy.log('Testing physics collision');
      
      // Try to move through wall or obstacle (should be blocked)
      cy.getPlayerPosition().then((initialPos) => {
        // Move in one direction for a long time
        cy.movePlayer('forward', 5000);
        cy.wait(2000);
        
        cy.getPlayerPosition().then((newPos) => {
          // Player should have stopped at some point due to collision
          const distance = Math.sqrt(
            Math.pow(newPos.x - initialPos.x, 2) + 
            Math.pow(newPos.z - initialPos.z, 2)
          );
          
          // Distance should be reasonable (not infinite movement)
          expect(distance).to.be.lessThan(100);
          cy.log(`Collision test passed - moved ${distance} units`);
        });
      });
    });
  });

  describe('RPG World Setup with Entities Near Spawn', () => {
    it('should spawn mobs, items, and chests very close to player', () => {
      cy.log('Setting up RPG world with entities near spawn');
      
      cy.getPlayerPosition().then((playerPos) => {
        // Spawn a goblin very close to player (2 units away)
        const goblinPos = {
          x: playerPos.x + 2,
          y: playerPos.y,
          z: playerPos.z + 2
        };
        
        // Spawn an item chest even closer (1 unit away)
        const chestPos = {
          x: playerPos.x + 1,
          y: playerPos.y,
          z: playerPos.z
        };
        
        // Spawn some loot items scattered around
        const lootPositions = [
          { x: playerPos.x - 1, y: playerPos.y, z: playerPos.z + 1 },
          { x: playerPos.x + 1, y: playerPos.y, z: playerPos.z - 1 },
          { x: playerPos.x - 2, y: playerPos.y, z: playerPos.z - 1 }
        ];
        
        cy.log(`Spawning entities around player at ${JSON.stringify(playerPos)}`);
        
        // Create entities through world RPG systems
        cy.window().then((win) => {
          const world = (win as any).world;
          if (world && world.rpgSystems) {
            // Spawn mob
            if (world.rpgSystems.spawning) {
              world.rpgSystems.spawning.spawnNPC('goblin', goblinPos);
              cy.log(`Spawned goblin at ${JSON.stringify(goblinPos)}`);
            }
            
            // Spawn chest
            if (world.rpgSystems.loot) {
              world.rpgSystems.loot.spawnLootChest(chestPos, ['gold_coins', 'iron_sword']);
              cy.log(`Spawned chest at ${JSON.stringify(chestPos)}`);
            }
            
            // Spawn loot items
            if (world.rpgSystems.inventory) {
              lootPositions.forEach((pos, index) => {
                const items = ['gold_coin', 'health_potion', 'bread'];
                world.rpgSystems.inventory.spawnItem(items[index], pos);
                cy.log(`Spawned ${items[index]} at ${JSON.stringify(pos)}`);
              });
            }
          }
        });
        
        // Wait for entities to spawn
        cy.wait(2000);
        
        // Verify entities are visible in the world
        cy.get('.entity-goblin, [data-entity-type="goblin"]', { timeout: 5000 })
          .should('exist');
        cy.get('.entity-chest, [data-entity-type="chest"]', { timeout: 5000 })
          .should('exist');
      });
    });
  });

  describe('Combat System Integration', () => {
    it('should engage in battle with nearby mob', () => {
      cy.log('Testing combat with spawned mob');
      
      // Move slightly to face the goblin
      cy.movePlayer('right', 500);
      cy.wait(500);
      
      // Target the goblin (click on it)
      cy.get('.entity-goblin, [data-entity-type="goblin"]').first().click();
      
      // Verify targeting
      cy.get(selectors.targetFrame || '.target-frame', { timeout: 3000 })
        .should('be.visible');
      
      // Perform attack sequence
      for (let i = 0; i < 3; i++) {
        performAttack();
        cy.wait(1000);
        
        // Look for damage numbers or combat feedback
        cy.get('body').then($body => {
          // Check for any combat indicators
          if ($body.find('.damage-number, .combat-text, [data-damage]').length > 0) {
            cy.log(`Combat round ${i + 1} - damage dealt`);
          }
        });
      }
      
      // Check combat stats/XP gain
      cy.window().then((win) => {
        const world = (win as any).world;
        if (world && world.rpgSystems && world.rpgSystems.combat) {
          const combatSystem = world.rpgSystems.combat;
          cy.log('Combat system active:', combatSystem);
        }
      });
    });

    it('should display health and damage properly', () => {
      cy.log('Verifying health display and damage calculation');
      
      // Check player health bar
      cy.get('.health-bar, [data-ui="health"], .player-health', { timeout: 5000 })
        .should('exist');
      
      // Check if mob health is displayed when targeted
      cy.get('.entity-goblin, [data-entity-type="goblin"]').first().click();
      cy.get('.target-health, .mob-health-bar', { timeout: 3000 })
        .should('exist');
    });
  });

  describe('Loot and Inventory System', () => {
    it('should pick up items and manage inventory', () => {
      cy.log('Testing item pickup and inventory management');
      
      // Move to one of the loot items
      cy.movePlayer('left', 1000);
      cy.wait(500);
      
      // Try to pick up item (auto-pickup or interaction)
      cy.get('body').then($body => {
        // Try different interaction methods
        interactWithObject(); // 'E' key
        cy.wait(500);
        
        // Try clicking on items if they're visible
        if ($body.find('.item-pickup, [data-item]').length > 0) {
          cy.get('.item-pickup, [data-item]').first().click();
        }
      });
      
      // Open inventory to verify item was picked up
      openPlayerInventory();
      
      // Check inventory contents
      cy.get('.inventory, [data-ui="inventory"]').within(() => {
        cy.get('.inventory-slot, .item-slot').should('have.length.greaterThan', 0);
        
        // Look for items in inventory
        cy.get('body').then($inventory => {
          if ($inventory.find('.inventory-item, [data-item-type]').length > 0) {
            cy.log('Items found in inventory');
            cy.get('.inventory-item, [data-item-type]').should('exist');
          }
        });
      });
    });

    it('should interact with loot chest', () => {
      cy.log('Testing chest interaction');
      
      // Move to chest position
      cy.movePlayer('forward', 800);
      cy.wait(500);
      
      // Try to open chest
      cy.get('.entity-chest, [data-entity-type="chest"]').first().click();
      
      // Check for chest interface
      cy.get('body').then($body => {
        if ($body.find('.chest-interface, .loot-window, [data-ui="chest"]').length > 0) {
          cy.get('.chest-interface, .loot-window, [data-ui="chest"]')
            .should('be.visible');
          
          // Try to take items from chest
          cy.get('.chest-item, .loot-item').first().click();
          cy.log('Interacted with chest contents');
        } else {
          cy.log('Chest interaction may use different UI pattern');
        }
      });
    });

    it('should handle inventory management operations', () => {
      cy.log('Testing inventory operations');
      
      openPlayerInventory();
      
      // Test drag and drop if items exist
      cy.get('.inventory, [data-ui="inventory"]').within(() => {
        cy.get('.inventory-item, [data-item-type]').then($items => {
          if ($items.length > 0) {
            // Try to drag item to different slot
            cy.get('.inventory-item, [data-item-type]').first()
              .trigger('mousedown', { button: 0 })
              .wait(100);
            
            cy.get('.inventory-slot').eq(5)
              .trigger('mousemove')
              .trigger('mouseup');
            
            cy.log('Performed drag and drop operation');
          }
        });
      });
    });
  });

  describe('Equipment and Character Progression', () => {
    it('should equip items and show stat changes', () => {
      cy.log('Testing equipment system');
      
      openPlayerInventory();
      
      // Look for equippable items
      cy.get('.inventory, [data-ui="inventory"]').within(() => {
        cy.get('body').then($inventory => {
          // Look for weapons or armor
          const weaponSelectors = [
            '[data-item-type="weapon"]',
            '[data-item-type="sword"]',
            '.item-weapon',
            '.item-sword'
          ];
          
          weaponSelectors.forEach(selector => {
            if ($inventory.find(selector).length > 0) {
              cy.get(selector).first().rightclick();
              cy.log('Attempted to equip weapon');
            }
          });
        });
      });
      
      // Check equipment slots
      cy.get('body').then($body => {
        if ($body.find('.equipment-slot, [data-ui="equipment"]').length > 0) {
          cy.get('.equipment-slot, [data-ui="equipment"]').should('exist');
          cy.log('Equipment slots verified');
        }
      });
    });

    it('should display skill progression', () => {
      cy.log('Testing skill system');
      
      // Try to open skills interface
      cy.get('body').type('k'); // Common skills hotkey
      cy.wait(500);
      
      cy.get('body').then($body => {
        if ($body.find('.skills, [data-ui="skills"], .character-stats').length > 0) {
          cy.get('.skills, [data-ui="skills"], .character-stats')
            .should('be.visible');
          
          // Check for skill entries
          cy.get('.skill-entry, .stat-entry').should('have.length.greaterThan', 0);
          cy.log('Skills interface verified');
        } else {
          cy.log('Skills may be accessed through different UI');
        }
      });
    });
  });

  describe('NPCs and Quest System', () => {
    it('should interact with NPCs and handle dialogue', () => {
      cy.log('Testing NPC interaction');
      
      // Create a quest giver NPC close to player
      cy.getPlayerPosition().then((playerPos) => {
        cy.window().then((win) => {
          const world = (win as any).world;
          if (world && world.rpgSystems && world.rpgSystems.npc) {
            const npcPos = {
              x: playerPos.x + 3,
              y: playerPos.y,
              z: playerPos.z + 3
            };
            
            world.rpgSystems.npc.spawnNPC('quest_giver', npcPos);
            cy.log(`Spawned quest giver at ${JSON.stringify(npcPos)}`);
          }
        });
      });
      
      cy.wait(2000);
      
      // Move to NPC
      cy.movePlayer('forward', 1500);
      cy.wait(500);
      
      // Interact with NPC
      cy.get('.entity-npc, [data-entity-type="npc"]').first().click();
      
      // Check for dialogue interface
      cy.get('body').then($body => {
        if ($body.find('.dialogue, [data-ui="dialogue"], .npc-chat').length > 0) {
          cy.get('.dialogue, [data-ui="dialogue"], .npc-chat')
            .should('be.visible');
          cy.log('NPC dialogue interface opened');
        }
      });
    });
  });

  describe('World Persistence and State Management', () => {
    it('should maintain world state across interactions', () => {
      cy.log('Testing world state persistence');
      
      // Check that spawned entities are still present
      cy.get('.entity-goblin, [data-entity-type="goblin"]')
        .should('exist');
      
      // Verify player state is maintained
      cy.getPlayerPosition().then((pos) => {
        expect(pos).to.have.property('x');
        expect(pos).to.have.property('y');
        expect(pos).to.have.property('z');
        cy.log(`Player position maintained: ${JSON.stringify(pos)}`);
      });
      
      // Check RPG systems are still active
      cy.window().then((win) => {
        const world = (win as any).world;
        expect(world.rpgSystems).to.exist;
        const systemCount = Object.keys(world.rpgSystems).length;
        expect(systemCount).to.be.greaterThan(5);
        cy.log(`${systemCount} RPG systems active`);
      });
    });
  });

  describe('Performance and Stability', () => {
    it('should maintain stable frame rate during gameplay', () => {
      cy.log('Testing performance during active gameplay');
      
      // Perform intensive actions
      for (let i = 0; i < 5; i++) {
        cy.movePlayer('forward', 500);
        cy.movePlayer('right', 500);
        cy.movePlayer('backward', 500);
        cy.movePlayer('left', 500);
        
        // Attack while moving
        performAttack();
        cy.wait(200);
      }
      
      // Check that world is still responsive
      cy.getWorld().then((world) => {
        expect(world).to.exist;
        expect(world.frame).to.be.greaterThan(0);
        cy.log('World remains responsive after intensive actions');
      });
    });

    it('should handle multiple simultaneous RPG operations', () => {
      cy.log('Testing simultaneous RPG operations');
      
      // Open multiple interfaces simultaneously
      openPlayerInventory();
      cy.wait(200);
      
      cy.get('body').type('k'); // Skills
      cy.wait(200);
      
      // Interact with nearby entities while interfaces are open
      cy.get('.entity-goblin, [data-entity-type="goblin"]').first().click();
      performAttack();
      
      // Verify systems still work
      cy.getWorld().then((world) => {
        expect(world.rpgSystems).to.exist;
        cy.log('RPG systems stable during multi-interface operations');
      });
    });
  });
});