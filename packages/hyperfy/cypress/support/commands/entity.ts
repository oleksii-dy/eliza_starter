/// <reference types="cypress" />

// Entity-specific commands for Hyperfy

// Create a new entity
Cypress.Commands.add('createEntity', (type: string, data: any) => {
  cy.log(`Creating entity of type: ${type}`);
  
  return cy.getWorld().then((world) => {
    const entityData = {
      type,
      id: `test-${type}-${Date.now()}`,
      position: { x: 0, y: 0, z: 0 },
      rotation: { x: 0, y: 0, z: 0, w: 1 },
      ...data
    };
    
    const entity = world.entities.add(entityData);
    return entity;
  });
});

// Select an entity in the world
Cypress.Commands.add('selectEntity', (entityId: string) => {
  cy.log(`Selecting entity: ${entityId}`);
  
  cy.getWorld().then((world) => {
    const entity = world.entities.get(entityId);
    if (!entity) {
      throw new Error(`Entity ${entityId} not found`);
    }
    
    // Simulate click on entity
    if (world.selection) {
      world.selection.select(entity);
    }
    
    // Alternative: trigger selection event
    world.events.emit('entity:selected', { entity });
  });
  
  // Verify selection in UI
  cy.get('.InspectPane').should('be.visible');
  cy.get('.InspectPane').should('contain', entityId);
});

// Get entity by ID
Cypress.Commands.add('getEntity', (entityId: string) => {
  return cy.getWorld().then((world) => {
    const entity = world.entities.get(entityId);
    if (!entity) {
      throw new Error(`Entity ${entityId} not found`);
    }
    return entity;
  });
});

// Helper functions for entity testing
export const createTestNPC = (name: string, position = { x: 0, y: 0, z: 10 }) => {
  return cy.createEntity('npc', {
    name,
    position,
    config: {
      health: 100,
      level: 1,
      type: 'friendly'
    }
  });
};

export const createTestItem = (itemId: string, position = { x: 5, y: 0, z: 5 }) => {
  return cy.createEntity('item', {
    itemId,
    position,
    amount: 1
  });
};

export const verifyEntityPosition = (entityId: string, expectedPos: { x: number, y: number, z: number }) => {
  cy.getEntity(entityId).then((entity) => {
    const pos = entity.getPosition();
    expect(pos.x).to.be.closeTo(expectedPos.x, 0.1);
    expect(pos.y).to.be.closeTo(expectedPos.y, 0.1);
    expect(pos.z).to.be.closeTo(expectedPos.z, 0.1);
  });
}; 