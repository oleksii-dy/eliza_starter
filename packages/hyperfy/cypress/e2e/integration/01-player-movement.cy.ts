/// <reference types="cypress" />

import { performJump, moveToPosition, performAttack } from '../../support/commands/player'
import { selectors } from '../../support/utils/selectors'

describe('Player Movement and Controls', () => {
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

  it('should move player forward with W key', () => {
    cy.getPlayerPosition().then(startPos => {
      cy.movePlayer('forward', 2000)

      cy.getPlayerPosition().then(endPos => {
        // Player should have moved
        const distance = Math.sqrt(Math.pow(endPos.x - startPos.x, 2) + Math.pow(endPos.z - startPos.z, 2))
        expect(distance).to.be.greaterThan(1)
      })
    })
  })

  it('should move player in all directions', () => {
    const directions = ['forward', 'backward', 'left', 'right'] as const

    directions.forEach(direction => {
      cy.getPlayerPosition().then(startPos => {
        cy.movePlayer(direction, 1000)

        cy.getPlayerPosition().then(endPos => {
          // Verify movement occurred
          const moved = startPos.x !== endPos.x || startPos.z !== endPos.z
          expect(moved).to.be.true
        })
      })

      cy.wait(500)
    })
  })

  it('should rotate camera with mouse drag', () => {
    // Take initial screenshot
    cy.screenshot('camera-initial')

    // Rotate camera right
    cy.rotateCamera(100, 0)
    cy.wait(500)
    cy.screenshot('camera-rotated-right')

    // Rotate camera left
    cy.rotateCamera(-200, 0)
    cy.wait(500)
    cy.screenshot('camera-rotated-left')

    // Rotate camera up/down
    cy.rotateCamera(0, -50)
    cy.wait(500)
    cy.screenshot('camera-rotated-up')
  })

  it('should handle simultaneous movement and rotation', () => {
    // Start moving forward
    cy.get('body').type('w')

    // Rotate while moving
    cy.rotateCamera(90, 0)

    // Continue for a bit
    cy.wait(1000)

    // Stop moving
    cy.get('body').type('w') // Release

    cy.getPlayerPosition().then(pos => {
      // Should have moved in a curve
      expect(pos.x).to.not.equal(0)
      expect(pos.z).to.not.equal(0)
    })
  })

  it('should jump when pressing spacebar', () => {
    cy.getPlayerPosition().then(startPos => {
      performJump()

      // Check Y position changed during jump
      cy.wait(250) // Mid-jump
      cy.getPlayerPosition().then(midPos => {
        expect(midPos.y).to.be.greaterThan(startPos.y)
      })

      // Wait for landing
      cy.wait(1000)
      cy.getPlayerPosition().then(endPos => {
        expect(endPos.y).to.be.closeTo(startPos.y, 0.1)
      })
    })
  })

  it('should stop at world boundaries', () => {
    // Move to a far position
    cy.movePlayer('forward', 30000) // Long movement

    cy.getPlayerPosition().then(pos => {
      // Should be constrained by world bounds
      // Exact bounds depend on world configuration
      expect(Math.abs(pos.x)).to.be.lessThan(10000)
      expect(Math.abs(pos.z)).to.be.lessThan(10000)
    })
  })

  it('should handle collision with entities', () => {
    // Create an obstacle
    cy.createEntity('structure', {
      model: 'cube.glb',
      position: { x: 10, y: 0, z: 0 },
      collision: true,
    })

    // Try to move through it
    moveToPosition({ x: 15, z: 0 })

    cy.getPlayerPosition().then(pos => {
      // Should stop before the obstacle
      expect(pos.x).to.be.lessThan(10)
    })
  })

  it('should sprint with shift key', () => {
    // Normal speed
    cy.getPlayerPosition().then(startPos => {
      cy.movePlayer('forward', 1000)

      cy.getPlayerPosition().then(normalEndPos => {
        const normalDistance = Math.sqrt(
          Math.pow(normalEndPos.x - startPos.x, 2) + Math.pow(normalEndPos.z - startPos.z, 2)
        )

        // Reset position
        cy.getWorld().then(world => {
          const player = world.entities.getLocalPlayer()
          if (player) {
            player.setPosition(startPos)
          }
        })

        // Sprint speed
        cy.get('body').type('{shift}', { release: false })
        cy.movePlayer('forward', 1000)
        cy.get('body').type('{shift}') // Release

        cy.getPlayerPosition().then(sprintEndPos => {
          const sprintDistance = Math.sqrt(
            Math.pow(sprintEndPos.x - startPos.x, 2) + Math.pow(sprintEndPos.z - startPos.z, 2)
          )

          // Sprint should be faster
          expect(sprintDistance).to.be.greaterThan(normalDistance * 1.3)
        })
      })
    })
  })

  it('should crouch with control key', () => {
    cy.getPlayerPosition().then(startPos => {
      // Press crouch
      cy.get('body').type('{ctrl}', { release: false })
      cy.wait(500)

      cy.getPlayerPosition().then(crouchPos => {
        // Y position might be lower when crouching
        expect(crouchPos.y).to.be.lessThan(startPos.y + 0.5)
      })

      // Release crouch
      cy.get('body').type('{ctrl}')
    })
  })

  it('should handle diagonal movement', () => {
    // Press W and D together for diagonal movement
    cy.get('body').type('w', { release: false }).type('d', { release: false })

    cy.wait(1000)

    // Release keys
    cy.get('body').type('w').type('d')

    cy.getPlayerPosition().then(pos => {
      // Should have moved diagonally
      expect(pos.x).to.be.greaterThan(0)
      expect(pos.z).to.be.greaterThan(0)
    })
  })

  it('should maintain movement during UI interactions', () => {
    // Start moving
    cy.get('body').type('w', { release: false })

    // Open sidebar while moving
    cy.openSidebar()
    cy.wait(500)

    // Should still be moving
    cy.getPlayerPosition().then(midPos => {
      expect(midPos.z).to.be.greaterThan(0)

      // Close sidebar
      cy.closeSidebar()

      // Release movement
      cy.get('body').type('w')
    })
  })

  it('should handle first-person/third-person camera toggle', () => {
    // Check if camera toggle exists
    cy.get('body').type('v') // Common toggle key
    cy.wait(500)
    cy.screenshot('camera-mode-1')

    cy.get('body').type('v')
    cy.wait(500)
    cy.screenshot('camera-mode-2')
  })

  it('should interact with nearby objects', () => {
    // Create interactable object
    cy.createEntity('item', {
      itemId: 'health_potion',
      position: { x: 5, y: 0, z: 5 },
      interactable: true,
    })

    // Move close to it
    moveToPosition({ x: 4, z: 4 })

    // Try to interact
    cy.get('body').type('e')
    cy.wait(500)

    // Check for interaction UI or pickup
    cy.get('body').then($body => {
      const hasInteractionUI = $body.find('.InteractionPrompt').length > 0
      const hasInventoryUpdate = $body.find('.InventoryNotification').length > 0

      expect(hasInteractionUI || hasInventoryUpdate).to.be.true
    })
  })

  it('should perform basic attack', () => {
    performAttack()

    // Check for attack animation or effect
    cy.wait(500)
    cy.screenshot('player-attack')
  })

  it('should handle movement on different terrains', () => {
    // This test would check movement speed on different surfaces
    // if the world has terrain variations

    const terrainPositions = [
      { x: 0, z: 0, terrain: 'grass' },
      { x: 50, z: 50, terrain: 'sand' },
      { x: -50, z: -50, terrain: 'stone' },
    ]

    terrainPositions.forEach(({ x, z, terrain }) => {
      moveToPosition({ x, z })
      cy.wait(1000)

      // Measure movement speed on this terrain
      cy.getPlayerPosition().then(startPos => {
        cy.movePlayer('forward', 1000)

        cy.getPlayerPosition().then(endPos => {
          const distance = Math.sqrt(Math.pow(endPos.x - startPos.x, 2) + Math.pow(endPos.z - startPos.z, 2))

          cy.log(`Movement distance on ${terrain}: ${distance}`)
        })
      })
    })
  })
})
