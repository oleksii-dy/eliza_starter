/// <reference types="cypress" />
import 'cypress-real-events'

// Player-specific commands for Hyperfy

// Move player in a direction
Cypress.Commands.add('movePlayer', (direction: 'forward' | 'backward' | 'left' | 'right', duration: number = 1000) => {
  cy.log(`Moving player ${direction} for ${duration}ms`)

  const keyMap = {
    forward: 'w',
    backward: 's',
    left: 'a',
    right: 'd',
  }

  const key = keyMap[direction]

  // Press and hold key
  cy.get('body').realPress(key as any, { pressDelay: duration })
})

// Rotate camera
Cypress.Commands.add('rotateCamera', (deltaX: number, deltaY: number) => {
  cy.log(`Rotating camera by (${deltaX}, ${deltaY})`)

  // Get viewport center
  cy.get('.App__viewport').then($viewport => {
    const rect = $viewport[0].getBoundingClientRect()
    const centerX = rect.left + rect.width / 2
    const centerY = rect.top + rect.height / 2

    // Perform mouse drag to rotate camera
    cy.get('.App__viewport')
      .realMouseDown({ x: centerX, y: centerY, button: 'right' })
      .realMouseMove(centerX + deltaX, centerY + deltaY)
      .realMouseUp({ x: centerX + deltaX, y: centerY + deltaY })
  })
})

// Get player position
Cypress.Commands.add('getPlayerPosition', () => {
  return cy.getWorld().then(world => {
    const localPlayer = world.entities.getLocalPlayer()
    if (!localPlayer) {
      // Try to get first player
      const players = world.entities.getAllPlayers()
      if (players.length === 0) {
        throw new Error('No player found')
      }
      return players[0].getPosition()
    }
    return localPlayer.getPosition()
  })
})

// Helper functions for player testing
export const moveToPosition = (targetPos: { x: number; z: number }, tolerance = 1) => {
  cy.getPlayerPosition().then(currentPos => {
    const dx = targetPos.x - currentPos.x
    const dz = targetPos.z - currentPos.z
    const distance = Math.sqrt(dx * dx + dz * dz)

    if (distance < tolerance) {
      cy.log('Already at target position')
      return
    }

    // Calculate angle to target
    const angle = Math.atan2(dx, dz)
    const currentAngle = 0 // Assume facing forward initially
    const angleDiff = angle - currentAngle

    // Rotate to face target
    if (Math.abs(angleDiff) > 0.1) {
      cy.rotateCamera(angleDiff * 100, 0)
      cy.wait(500)
    }

    // Move forward
    const moveTime = Math.min(distance * 100, 5000) // Cap at 5 seconds
    cy.movePlayer('forward', moveTime)
  })
}

export const performJump = () => {
  cy.log('Performing jump')
  cy.get('body').type(' ') // Spacebar for jump
  cy.wait(1000)
}

export const performAttack = () => {
  cy.log('Performing attack')
  cy.get('.App__viewport').realClick()
  cy.wait(500)
}

export const openPlayerInventory = () => {
  cy.log('Opening player inventory')
  cy.get('body').type('i')
  cy.wait(500)
  cy.get('.Inventory').should('be.visible')
}

export const interactWithObject = () => {
  cy.log('Interacting with object')
  cy.get('body').type('e')
  cy.wait(500)
}
