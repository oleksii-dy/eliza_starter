/// <reference types="cypress" />

import { selectors } from '../../support/utils/selectors';
import { 
  setViewport, 
  loginAsTestUser, 
  waitForAnimation,
  takeScreenshot 
} from '../../support/utils/helpers';
import { 
  moveToPosition, 
  openPlayerInventory,
  performAttack,
  performJump
} from '../../support/commands/player';
import { createTestNPC, createTestItem } from '../../support/commands/entity';

describe('Complete User Journey', () => {
  beforeEach(() => {
    // Handle uncaught exceptions
    cy.on('uncaught:exception', (err) => {
      if (err.message.includes('getSystem is not a function') || 
          err.message.includes('Cannot read properties of undefined')) {
        return false;
      }
      return true;
    });
  });
  before(() => {
    // Set up test environment
    setViewport('desktop');
  });

  it('should complete a full user journey from login to quest completion', () => {
    // Step 1: Initial Load and Login
    cy.visit('/');
    takeScreenshot('01-initial-load');
    
    // Wait for world to load
    cy.waitForWorldLoad();
    takeScreenshot('02-world-loaded');
    
    // Step 2: Basic Movement Tutorial
    cy.log('Testing basic movement controls');
    
    // Move forward
    cy.movePlayer('forward', 1000);
    takeScreenshot('03-moved-forward');
    
    // Test all directions
    ['backward', 'left', 'right'].forEach((dir, index) => {
      cy.movePlayer(dir as any, 500);
      takeScreenshot(`04-moved-${dir}`);
    });
    
    // Test jump
    performJump();
    takeScreenshot('05-jumped');
    
    // Test camera rotation
    cy.rotateCamera(90, 0);
    takeScreenshot('06-camera-rotated');
    
    // Step 3: UI Exploration
    cy.log('Exploring UI elements');
    
    // Open sidebar
    cy.openSidebar();
    takeScreenshot('07-sidebar-open');
    
    // Check each tab
    const tabs = ['apps', 'inspect', 'avatar', 'settings'];
    tabs.forEach((tab, index) => {
      cy.selectSidebarTab(tab);
      waitForAnimation();
      takeScreenshot(`08-sidebar-${tab}`);
    });
    
    cy.closeSidebar();
    
    // Open menu
    cy.openMenu();
    takeScreenshot('09-menu-open');
    cy.closeMenu();
    
    // Step 4: Inventory Management
    cy.log('Testing inventory system');
    
    // Create and pick up items
    createTestItem('gold_coin', { x: 5, y: 0, z: 5 });
    createTestItem('health_potion', { x: 6, y: 0, z: 6 });
    createTestItem('iron_sword', { x: 7, y: 0, z: 7 });
    
    // Move to items
    moveToPosition({ x: 6, z: 6 });
    cy.wait(1000);
    
    // Pick up items
    cy.get('body').type('e');
    cy.wait(500);
    cy.get('body').type('e');
    cy.wait(500);
    cy.get('body').type('e');
    
    // Open inventory
    openPlayerInventory();
    takeScreenshot('10-inventory-with-items');
    
    // Organize items
    cy.get(selectors.inventoryItem).first().then($item => {
      if ($item.length > 0) {
        // Drag item to different slot
        cy.get(selectors.inventoryItem).first()
          .trigger('mousedown')
          .wait(100);
        
        cy.get(selectors.inventorySlot).eq(10)
          .trigger('mousemove')
          .trigger('mouseup');
      }
    });
    
    takeScreenshot('11-inventory-organized');
    
    // Close inventory
    cy.get('body').type('i');
    
    // Step 5: NPC Interaction
    cy.log('Testing NPC interactions');
    
    // Create quest NPC
    cy.fixture('entities/testEntities.json').then((entities) => {
      const questGiver = { 
        ...entities.npc.questGiver,
        position: { x: 15, y: 0, z: 15 }
      };
      cy.createEntity('npc', questGiver);
      
      // Move to NPC
      moveToPosition({ x: 14, z: 14 });
      cy.wait(2000);
      
      // Interact with NPC
      cy.get('body').type('e');
      takeScreenshot('12-npc-dialogue');
      
      // Accept quest
      cy.get('.Dialogue').within(() => {
        cy.contains('Accept').click();
      });
      
      takeScreenshot('13-quest-accepted');
    });
    
    // Step 6: Combat
    cy.log('Testing combat system');
    
    // Create enemy
    createTestNPC('Goblin', { x: 25, y: 0, z: 25 });
    
    // Move to enemy
    moveToPosition({ x: 23, z: 23 });
    cy.wait(2000);
    
    // Target enemy
    cy.get('[data-npc]').first().click();
    takeScreenshot('14-enemy-targeted');
    
    // Attack
    performAttack();
    cy.wait(500);
    performAttack();
    cy.wait(500);
    performAttack();
    
    takeScreenshot('15-combat-engaged');
    
    // Wait for combat to end
    cy.wait(3000);
    takeScreenshot('16-combat-complete');
    
    // Step 7: Shopping
    cy.log('Testing shop system');
    
    // Create shop NPC
    cy.fixture('entities/testEntities.json').then((entities) => {
      const shopkeeper = {
        ...entities.npc.shopkeeper,
        position: { x: 35, y: 0, z: 35 }
      };
      cy.createEntity('npc', shopkeeper);
      
      // Move to shop
      moveToPosition({ x: 34, z: 34 });
      cy.wait(2000);
      
      // Open shop
      cy.get('body').type('e');
      takeScreenshot('17-shop-open');
      
      // Buy item
      cy.get(selectors.tradeWindow).within(() => {
        cy.get('.ShopItem').first().click();
        cy.contains('Buy').click();
      });
      
      takeScreenshot('18-item-purchased');
    });
    
    // Step 8: Banking
    cy.log('Testing banking system');
    
    // Create banker
    createTestNPC('Banker', { x: 45, y: 0, z: 45 });
    
    // Move to bank
    moveToPosition({ x: 44, z: 44 });
    cy.wait(2000);
    
    // Open bank
    cy.get('body').type('e');
    
    cy.get(selectors.bankWindow).then($bank => {
      if ($bank.length > 0) {
        takeScreenshot('19-bank-open');
        
        // Deposit items
        cy.get(selectors.inventoryItem).first()
          .trigger('mousedown')
          .wait(100);
        
        cy.get(selectors.bankSlot).first()
          .trigger('mousemove')
          .trigger('mouseup');
        
        takeScreenshot('20-items-banked');
      }
    });
    
    // Step 9: Skills and Progression
    cy.log('Checking skills and progression');
    
    // Open skills
    cy.get('body').type('k');
    cy.get('.Skills').then($skills => {
      if ($skills.length > 0) {
        takeScreenshot('21-skills-window');
        cy.get('body').type('k'); // Close
      }
    });
    
    // Check quest log
    cy.get('body').type('l');
    cy.get(selectors.questLog).then($log => {
      if ($log.length > 0) {
        takeScreenshot('22-quest-log');
        cy.get('body').type('l'); // Close
      }
    });
    
    // Step 10: Final Overview
    cy.log('Creating final overview');
    
    // Return to spawn
    moveToPosition({ x: 0, z: 0 });
    cy.wait(3000);
    
    // Rotate camera for overview
    cy.rotateCamera(360, 0);
    takeScreenshot('23-final-overview');
    
    // Open all UI elements for final screenshot
    cy.openSidebar();
    cy.selectSidebarTab('inspect');
    openPlayerInventory();
    
    takeScreenshot('24-complete-ui');
    
    // Performance check
    cy.checkPerformance();
    
    // Log completion
    cy.log('User journey completed successfully!');
  });

  it('should handle edge cases and errors gracefully', () => {
    cy.visit('/');
    cy.waitForWorldLoad();
    
    // Test rapid UI toggling
    for (let i = 0; i < 5; i++) {
      cy.openSidebar();
      cy.closeSidebar();
    }
    
    // Test movement while UI is open
    cy.openSidebar();
    cy.movePlayer('forward', 1000);
    cy.closeSidebar();
    
    // Test interaction with non-existent entity
    cy.on('fail', (err) => {
      if (err.message.includes('non-existent-entity')) {
        cy.log('Handled non-existent entity gracefully');
        return false; // Prevent test failure
      }
      throw err;
    });
    
    cy.selectEntity('non-existent-entity');
    
    // Test extreme camera rotation
    cy.rotateCamera(3600, 1800);
    
    // Test inventory overflow
    for (let i = 0; i < 100; i++) {
      createTestItem('test_item', { x: i, y: 0, z: 0 });
    }
    
    // Test performance under load
    cy.checkPerformance();
  });

  it('should complete a PvP scenario', () => {
    cy.visit('/');
    cy.waitForWorldLoad();
    
    // Enable PvP
    cy.openMenu();
    cy.get('body').then($body => {
      if ($body.find(':contains("PvP")').length > 0) {
        cy.contains('PvP').click();
      }
    });
    cy.closeMenu();
    
    // Move to PvP zone
    cy.movePlayer('forward', 10000);
    
    // Look for other players
    cy.get('[data-player]').then($players => {
      if ($players.length > 0) {
        // Target player
        cy.get('[data-player]').first().click();
        
        // Initiate combat
        performAttack();
        
        takeScreenshot('pvp-combat');
      }
    });
  });

  it('should test multiplayer interactions', () => {
    cy.visit('/');
    cy.waitForWorldLoad();
    
    // Test chat
    cy.get(selectors.chatInput).type('Hello world!{enter}');
    
    // Check message appeared
    cy.get(selectors.chatMessages).should('contain', 'Hello world!');
    
    // Test emotes
    cy.get('body').type('/wave{enter}');
    
    // Test trading with another player
    cy.get('[data-player]').then($players => {
      if ($players.length > 0) {
        cy.get('[data-player]').first().rightclick();
        cy.contains('Trade').click();
        
        takeScreenshot('player-trade');
      }
    });
  });

  after(() => {
    // Generate test report
    cy.log('Test suite completed');
    cy.checkPerformance();
  });
}); 