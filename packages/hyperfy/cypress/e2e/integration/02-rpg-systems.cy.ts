/// <reference types="cypress" />

import { selectors } from '../../support/utils/selectors'
import { openPlayerInventory, performAttack } from '../../support/commands/player'
import { createTestNPC, createTestItem } from '../../support/commands/entity'

describe('RPG Systems Integration', () => {
  beforeEach(() => {
    // Handle uncaught exceptions
    cy.on('uncaught:exception', err => {
      if (
        err.message.includes('getSystem is not a function') ||
        err.message.includes('Cannot read properties of undefined')
      ) {
        return false
      }
      return true
    })

    cy.visit('/')
    cy.waitForWorldLoad()
  })

  describe('Inventory System', () => {
    it('should open inventory with I key', () => {
      openPlayerInventory()
      cy.get(selectors.inventory).should('be.visible')
    })

    it('should display inventory slots', () => {
      openPlayerInventory()

      cy.get(selectors.inventory).within(() => {
        cy.get(selectors.inventorySlot).should('have.length.greaterThan', 0)
      })
    })

    it('should pick up items', () => {
      // Create item near player
      createTestItem('gold_coin', { x: 2, y: 0, z: 2 })

      // Move to item
      cy.movePlayer('forward', 500)

      // Pick up item (might be automatic or require interaction)
      cy.get('body').type('e')
      cy.wait(500)

      // Check inventory
      openPlayerInventory()
      cy.get(selectors.inventory).within(() => {
        cy.contains('gold').should('exist')
      })
    })

    it('should drag and drop items between slots', () => {
      openPlayerInventory()

      // Find item in inventory
      cy.get(selectors.inventoryItem)
        .first()
        .then($item => {
          if ($item.length > 0) {
            // Drag to another slot
            cy.get(selectors.inventoryItem).first().trigger('mousedown', { button: 0 }).wait(100)

            cy.get(selectors.inventorySlot).eq(5).trigger('mousemove').trigger('mouseup')

            // Verify item moved
            cy.get(selectors.inventorySlot).eq(5).find(selectors.inventoryItem).should('exist')
          }
        })
    })

    it('should equip items', () => {
      // Create equipment item
      createTestItem('iron_sword', { x: 2, y: 0, z: 2 })

      // Pick up
      cy.movePlayer('forward', 500)
      cy.get('body').type('e')
      cy.wait(500)

      openPlayerInventory()

      // Right-click to equip
      cy.get(selectors.inventory).within(() => {
        cy.contains('sword').rightclick()
      })

      // Check if equipped (might show in equipment slots or player stats)
      cy.get('.Equipment').should('contain', 'sword')
    })
  })

  describe('Combat System', () => {
    it('should target hostile NPCs', () => {
      // Create hostile NPC
      createTestNPC('Goblin', { x: 10, y: 0, z: 10 }).then(npc => {
        // Look at NPC
        cy.rotateCamera(45, 0)

        // Click to target
        cy.get(`[data-entity="${npc.data.id}"]`).click()

        // Should show target frame
        cy.get(selectors.targetFrame).should('be.visible')
        cy.get(selectors.targetFrame).should('contain', 'Goblin')
      })
    })

    it('should perform melee attack', () => {
      createTestNPC('Training Dummy', { x: 5, y: 0, z: 5 })

      // Move close
      cy.movePlayer('forward', 1000)

      // Attack
      performAttack()

      // Should show damage numbers
      cy.get(selectors.damageNumber, { timeout: 2000 }).should('exist')
    })

    it('should show health bars', () => {
      createTestNPC('Enemy', { x: 10, y: 0, z: 10 })

      // Health bars should be visible
      cy.get(selectors.healthBar).should('have.length.greaterThan', 0)
    })

    it('should handle player death and respawn', () => {
      // This would require a way to damage the player
      // Mock taking fatal damage
      cy.getWorld().then(world => {
        const player = world.entities.getLocalPlayer()
        if (player && player.takeDamage) {
          player.takeDamage(9999)
        }
      })

      // Should show death screen
      cy.get('.DeathScreen', { timeout: 5000 }).should('be.visible')

      // Click respawn
      cy.contains('Respawn').click()

      // Should be alive again
      cy.get('.DeathScreen').should('not.exist')
      cy.getPlayerPosition().then(pos => {
        // Should be at spawn point
        expect(pos.x).to.be.closeTo(0, 10)
        expect(pos.z).to.be.closeTo(0, 10)
      })
    })
  })

  describe('Quest System', () => {
    it('should interact with quest NPCs', () => {
      // Create quest giver
      cy.fixture('entities/testEntities.json').then(entities => {
        const questGiver = entities.npc.questGiver
        cy.createEntity('npc', questGiver)

        // Move to NPC
        cy.movePlayer('forward', 2000)

        // Interact
        cy.get('body').type('e')

        // Should show dialogue
        cy.get('.Dialogue').should('be.visible')
        cy.get('.Dialogue').should('contain', 'Quest')
      })
    })

    it('should display quest log', () => {
      // Open quest log (common key: L)
      cy.get('body').type('l')

      cy.get(selectors.questLog).should('be.visible')
      cy.get(selectors.questLog).within(() => {
        cy.get(selectors.questItem).should('exist')
      })
    })

    it('should track quest objectives', () => {
      // Accept a quest first
      cy.fixture('entities/testEntities.json').then(entities => {
        cy.createEntity('npc', entities.npc.questGiver)
        cy.movePlayer('forward', 2000)
        cy.get('body').type('e')

        // Accept quest
        cy.get('.Dialogue').within(() => {
          cy.contains('Accept').click()
        })

        // Check quest tracker
        cy.get('.QuestTracker').should('be.visible')
        cy.get('.QuestTracker').should('contain', 'Objective')
      })
    })
  })

  describe('Trading System', () => {
    it('should open trade window with NPCs', () => {
      // Create merchant NPC
      cy.fixture('entities/testEntities.json').then(entities => {
        cy.createEntity('npc', entities.npc.shopkeeper)

        cy.movePlayer('forward', 1000)
        cy.get('body').type('e')

        // Should open shop/trade window
        cy.get(selectors.tradeWindow).should('be.visible')
      })
    })

    it('should buy items from shops', () => {
      cy.fixture('entities/testEntities.json').then(entities => {
        cy.createEntity('npc', entities.npc.shopkeeper)

        cy.movePlayer('forward', 1000)
        cy.get('body').type('e')

        cy.get(selectors.tradeWindow).within(() => {
          // Click on item to buy
          cy.get('.ShopItem').first().click()
          cy.contains('Buy').click()
        })

        // Check inventory for new item
        openPlayerInventory()
        cy.get(selectors.inventory).should('contain', 'sword')
      })
    })
  })

  describe('Banking System', () => {
    it('should open bank interface', () => {
      // Create bank NPC or object
      createTestNPC('Banker', { x: 10, y: 0, z: 10 })

      cy.movePlayer('forward', 1500)
      cy.get('body').type('e')

      cy.get(selectors.bankWindow).should('be.visible')
    })

    it('should deposit items to bank', () => {
      // Assuming player has items
      createTestNPC('Banker', { x: 10, y: 0, z: 10 })

      cy.movePlayer('forward', 1500)
      cy.get('body').type('e')

      cy.get(selectors.bankWindow).within(() => {
        // Drag item from inventory to bank
        cy.get(selectors.inventoryItem).first().trigger('mousedown').wait(100)

        cy.get(selectors.bankSlot).first().trigger('mousemove').trigger('mouseup')
      })
    })

    it('should organize bank tabs', () => {
      createTestNPC('Banker', { x: 10, y: 0, z: 10 })

      cy.movePlayer('forward', 1500)
      cy.get('body').type('e')

      cy.get(selectors.bankWindow).within(() => {
        // Check for tabs
        cy.get(selectors.bankTab).should('have.length.greaterThan', 1)

        // Switch tabs
        cy.get(selectors.bankTab).eq(1).click()
      })
    })
  })

  describe('Skills System', () => {
    it('should display skill levels', () => {
      // Open skills window (common key: K)
      cy.get('body').type('k')

      cy.get('.Skills').should('be.visible')
      cy.get('.Skills').within(() => {
        // Check for skill entries
        cy.contains('Attack').should('exist')
        cy.contains('Defense').should('exist')
        cy.contains('Magic').should('exist')
      })
    })

    it('should gain experience from actions', () => {
      // Perform action that gives XP
      createTestNPC('Training Dummy', { x: 5, y: 0, z: 5 })
      cy.movePlayer('forward', 1000)
      performAttack()

      // Check for XP notification
      cy.get('.ExperienceGain', { timeout: 2000 }).should('exist')
      cy.get('.ExperienceGain').should('contain', 'XP')
    })
  })

  describe('Magic System', () => {
    it('should cast spells', () => {
      // Select spell (if spellbook exists)
      cy.get('body').type('p') // Common spellbook key

      cy.get('.Spellbook').then($spellbook => {
        if ($spellbook.length > 0) {
          cy.get('.Spellbook').within(() => {
            cy.get('.Spell').first().click()
          })

          // Cast on target
          createTestNPC('Enemy', { x: 10, y: 0, z: 10 })
          cy.get('[data-npc]').first().click()

          // Should show spell effect
          cy.get('.SpellEffect').should('exist')
        }
      })
    })

    it('should consume mana', () => {
      // Check mana bar before and after casting
      cy.get(selectors.manaBar).then($manaBar => {
        const initialMana = parseInt($manaBar.attr('data-value') || '100')

        // Cast spell
        cy.get('body').type('1') // Hotkey for spell

        cy.get(selectors.manaBar).then($newManaBar => {
          const currentMana = parseInt($newManaBar.attr('data-value') || '100')
          expect(currentMana).to.be.lessThan(initialMana)
        })
      })
    })
  })

  describe('PvP System', () => {
    it('should toggle PvP mode', () => {
      // Toggle PvP (if available)
      cy.openMenu()
      cy.get('body').then($body => {
        if ($body.find(':contains("PvP")').length > 0) {
          cy.contains('PvP').click()

          // Should show PvP indicator
          cy.get('.PvPIndicator').should('exist')
        }
      })
      cy.closeMenu()
    })

    it('should show combat levels in PvP zones', () => {
      // Move to PvP zone
      cy.movePlayer('forward', 10000) // Move far to potential PvP area

      // Other players should show combat levels
      cy.get('[data-player]').each($player => {
        cy.wrap($player).find('.CombatLevel').should('exist')
      })
    })
  })

  describe('Minigames', () => {
    it('should join minigame lobbies', () => {
      // Look for minigame portal or NPC
      createTestNPC('Minigame Master', { x: 20, y: 0, z: 20 })

      cy.movePlayer('forward', 2500)
      cy.get('body').type('e')

      // Should show minigame interface
      cy.get('.MinigameMenu').then($menu => {
        if ($menu.length > 0) {
          cy.get('.MinigameMenu').within(() => {
            cy.contains('Join').click()
          })

          // Should enter lobby
          cy.get('.MinigameLobby').should('be.visible')
        }
      })
    })
  })
})
