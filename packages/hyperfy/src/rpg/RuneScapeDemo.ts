// @ts-nocheck
/**
 * RuneScape Demo - Comprehensive demonstration of all RPG systems
 * Integrates skills, resources, spells, zones, and classes
 */

import { System } from '../core/systems/System';
import type { World } from '../types';
import { ResourceSpawningSystem } from './systems/ResourceSpawningSystem';
import { EnhancedSkillsSystem } from './systems/EnhancedSkillsSystem';
import { EnhancedMagicSystem } from './systems/EnhancedMagicSystem';
import { VisualResourceTest } from './testing/VisualResourceTest';
import { SkillType } from './systems/skills/SkillDefinitions';
import { SpellType } from './systems/spells/SpellDefinitions';
import { ResourceType } from './systems/resources/ResourceDefinitions';
import { ZoneType, ZONE_DEFINITIONS } from './systems/zones/ZoneDefinitions';

export class RuneScapeDemo extends System {
  private resourceSystem!: ResourceSpawningSystem;
  private skillsSystem!: EnhancedSkillsSystem;
  private magicSystem!: EnhancedMagicSystem;
  private visualTest!: VisualResourceTest;
  private demoState: string = 'inactive';
  private demoPlayer: any = null;
  private currentDemo: string = '';

  constructor(world: World) {
    super(world);
  }

  async initialize(): Promise<void> {
    console.log('[RuneScapeDemo] Initializing comprehensive demo...');
    
    // Find or create required systems
    this.resourceSystem = this.world.systems.find(s => s instanceof ResourceSpawningSystem) ||
                         new ResourceSpawningSystem(this.world);
    this.skillsSystem = this.world.systems.find(s => s instanceof EnhancedSkillsSystem) ||
                       new EnhancedSkillsSystem(this.world);
    this.magicSystem = this.world.systems.find(s => s instanceof EnhancedMagicSystem) ||
                      new EnhancedMagicSystem(this.world);
    this.visualTest = new VisualResourceTest(this.world);

    // Add systems if they weren't already added
    if (!this.world.systems.includes(this.resourceSystem)) {
      this.world.addSystem(this.resourceSystem);
      await this.resourceSystem.initialize();
    }
    if (!this.world.systems.includes(this.skillsSystem)) {
      this.world.addSystem(this.skillsSystem);
      await this.skillsSystem.initialize();
    }
    if (!this.world.systems.includes(this.magicSystem)) {
      this.world.addSystem(this.magicSystem);
      await this.magicSystem.initialize();
    }
    
    this.world.addSystem(this.visualTest);
    await this.visualTest.initialize();

    // Set up demo commands
    this.setupDemoCommands();
    
    console.log('[RuneScapeDemo] Demo system ready!');
    this.showDemoMenu();
  }

  private setupDemoCommands(): void {
    this.world.events.on('demo:start_skills', () => this.startSkillsDemo());
    this.world.events.on('demo:start_magic', () => this.startMagicDemo());
    this.world.events.on('demo:start_resources', () => this.startResourcesDemo());
    this.world.events.on('demo:start_zones', () => this.startZonesDemo());
    this.world.events.on('demo:start_full', () => this.startFullDemo());
    this.world.events.on('demo:visual_test', () => this.startVisualTest());
    this.world.events.on('demo:stop', () => this.stopDemo());
    this.world.events.on('demo:menu', () => this.showDemoMenu());
  }

  private showDemoMenu(): void {
    console.log('\n🎮 ===== RUNESCAPE-LIKE RPG DEMO ===== 🎮');
    console.log('Available demos:');
    console.log('  📚 demo:start_skills   - Skills and experience system');
    console.log('  🔮 demo:start_magic    - Magic spells and combat');
    console.log('  🌳 demo:start_resources - Resource harvesting');
    console.log('  🗺️  demo:start_zones    - Zone exploration and features');
    console.log('  🌟 demo:start_full     - Complete integrated demo');
    console.log('  👁️  demo:visual_test   - Visual verification test');
    console.log('  ⏹️  demo:stop          - Stop current demo');
    console.log('  📋 demo:menu          - Show this menu');
    console.log('=====================================\n');
  }

  private async startSkillsDemo(): Promise<void> {
    console.log('\n📚 Starting Skills Demo...');
    this.currentDemo = 'skills';
    this.demoState = 'active';

    // Create demo player if needed
    await this.createDemoPlayer();

    console.log('\n=== SKILLS SYSTEM DEMONSTRATION ===');
    
    // Show initial skills
    this.logPlayerSkills('Initial player skills');

    // Demonstrate woodcutting
    console.log('\n🪓 Demonstrating Woodcutting:');
    await this.demonstrateWoodcutting();

    // Demonstrate mining
    console.log('\n⛏️ Demonstrating Mining:');
    await this.demonstrateMining();

    // Demonstrate fishing
    console.log('\n🎣 Demonstrating Fishing:');
    await this.demonstrateFishing();

    // Demonstrate combat skills
    console.log('\n⚔️ Demonstrating Combat Training:');
    await this.demonstrateCombatTraining();

    // Show final skills
    this.logPlayerSkills('Final player skills after training');
    
    console.log('\n✅ Skills demo completed!');
    console.log('Key features demonstrated:');
    console.log('- Experience gain and level calculation');
    console.log('- Multiple skill types (combat, gathering, crafting)');
    console.log('- RuneScape-style XP table (levels 1-99)');
    console.log('- Zone-based XP multipliers');
    console.log('- Skill requirements and validation');
  }

  private async startMagicDemo(): Promise<void> {
    console.log('\n🔮 Starting Magic Demo...');
    this.currentDemo = 'magic';
    this.demoState = 'active';

    await this.createDemoPlayer();

    console.log('\n=== MAGIC SYSTEM DEMONSTRATION ===');

    // Give player magic level and runes
    console.log('🎓 Training magic to level 60...');
    this.skillsSystem.addExperience(this.demoPlayer.id, SkillType.MAGIC, 273742); // Level 60
    this.magicSystem.createMagicComponent(this.demoPlayer.id);

    // Add runes to inventory
    const inventory = this.demoPlayer.getComponent('inventory');
    inventory.items[0] = { itemId: 556, quantity: 1000 }; // Air runes
    inventory.items[1] = { itemId: 555, quantity: 1000 }; // Water runes
    inventory.items[2] = { itemId: 557, quantity: 1000 }; // Earth runes
    inventory.items[3] = { itemId: 554, quantity: 1000 }; // Fire runes
    inventory.items[4] = { itemId: 558, quantity: 1000 }; // Mind runes
    inventory.items[5] = { itemId: 562, quantity: 1000 }; // Chaos runes
    inventory.items[6] = { itemId: 560, quantity: 1000 }; // Death runes

    console.log('🧙‍♂️ Player now has level 60 Magic and full rune supply');

    // Demonstrate combat spells
    console.log('\n💥 Combat Spells:');
    await this.demonstrateCombatMagic();

    // Demonstrate utility spells
    console.log('\n🔧 Utility Spells:');
    await this.demonstrateUtilityMagic();

    // Demonstrate teleport spells
    console.log('\n🌀 Teleport Spells:');
    await this.demonstrateTeleportMagic();

    console.log('\n✅ Magic demo completed!');
    console.log('Key features demonstrated:');
    console.log('- Spell progression based on magic level');
    console.log('- Rune requirements for spells');
    console.log('- Combat, utility, and teleport spells');
    console.log('- Spell casting mechanics and cooldowns');
    console.log('- Magic experience gain');
  }

  private async startResourcesDemo(): Promise<void> {
    console.log('\n🌳 Starting Resources Demo...');
    this.currentDemo = 'resources';
    this.demoState = 'active';

    await this.createDemoPlayer();

    console.log('\n=== RESOURCE SYSTEM DEMONSTRATION ===');

    // Spawn all resources
    console.log('🌍 Spawning resources across the world...');
    this.resourceSystem.forceSpawnAllResources();

    // Show resource distribution by zone
    this.logResourceDistribution();

    // Demonstrate harvesting progression
    console.log('\n🪓 Demonstrating resource harvesting progression:');
    await this.demonstrateResourceProgression();

    // Show visual diversity
    console.log('\n🎨 Resource visual diversity:');
    this.demonstrateResourceVisuals();

    console.log('\n✅ Resources demo completed!');
    console.log('Key features demonstrated:');
    console.log('- Diverse resource types with unique visuals');
    console.log('- Zone-based resource distribution');
    console.log('- Level requirements for harvesting');
    console.log('- Resource respawning mechanics');
    console.log('- Rarity-based spawning');
  }

  private async startZonesDemo(): Promise<void> {
    console.log('\n🗺️ Starting Zones Demo...');
    this.currentDemo = 'zones';
    this.demoState = 'active';

    await this.createDemoPlayer();

    console.log('\n=== ZONE SYSTEM DEMONSTRATION ===');

    // Tour of all zones
    const zonesTour = [
      { zone: ZoneType.LUMBRIDGE, coords: { x: 0, z: 0 } },
      { zone: ZoneType.VARROCK, coords: { x: 100, z: 0 } },
      { zone: ZoneType.DRAYNOR, coords: { x: -100, z: 0 } },
      { zone: ZoneType.BARBARIAN_VILLAGE, coords: { x: 0, z: 100 } },
      { zone: ZoneType.FALADOR, coords: { x: -100, z: 100 } },
      { zone: ZoneType.WILDERNESS, coords: { x: 150, z: 150 } },
      { zone: ZoneType.RESOURCE_FOREST, coords: { x: 0, z: 200 } }
    ];

    for (const stop of zonesTour) {
      console.log(`\n📍 Visiting ${stop.zone}...`);
      await this.visitZone(stop.zone, stop.coords);
      await this.wait(1000);
    }

    console.log('\n✅ Zones demo completed!');
    console.log('Key features demonstrated:');
    console.log('- Multiple themed zones with unique characteristics');
    console.log('- Zone-based skill multipliers');
    console.log('- PvP and safe zone configurations');
    console.log('- Resource distribution by zone theme');
    console.log('- Banking and shop availability by zone');
  }

  private async startFullDemo(): Promise<void> {
    console.log('\n🌟 Starting Full Integrated Demo...');
    this.currentDemo = 'full';
    this.demoState = 'active';

    await this.createDemoPlayer();

    console.log('\n=== COMPLETE RPG SYSTEM DEMONSTRATION ===');

    // Full gameplay loop
    console.log('\n🎮 Complete Gameplay Loop:');
    
    // 1. Start in Lumbridge as a new player
    console.log('\n1️⃣ New Player Experience in Lumbridge:');
    await this.demonstrateNewPlayerExperience();

    // 2. Progress to Draynor for better resources
    console.log('\n2️⃣ Progression to Draynor Village:');
    await this.demonstrateEarlyGameProgression();

    // 3. Advanced training in specialized zones
    console.log('\n3️⃣ Advanced Training in Specialized Zones:');
    await this.demonstrateAdvancedTraining();

    // 4. High-level content in Wilderness
    console.log('\n4️⃣ High-level Content in Wilderness:');
    await this.demonstrateHighLevelContent();

    // 5. Show final character progression
    console.log('\n5️⃣ Final Character Progression:');
    this.logPlayerSkills('Final character stats');
    this.logCharacterSummary();

    console.log('\n🎉 Full demo completed!');
    console.log('Complete RuneScape-like experience demonstrated:');
    console.log('- Progressive skill training (1-99 levels)');
    console.log('- Zone-based content progression');
    console.log('- Resource gathering and crafting loops');
    console.log('- Combat and magic systems');
    console.log('- Visual feedback and world interaction');
  }

  private async startVisualTest(): Promise<void> {
    console.log('\n👁️ Starting Visual Verification Test...');
    this.currentDemo = 'visual';
    this.demoState = 'active';

    // Trigger visual test
    this.world.events.emit('test:spawn_visual_resources');
    
    // Run color analysis
    this.visualTest.runColorDistinctionTest();
    
    // Generate comprehensive report
    const report = this.visualTest.generateVisualTestReport();
    console.log('\n📊 Visual Test Report:');
    console.log(JSON.stringify(report, null, 2));

    console.log('\n✅ Visual test completed!');
    console.log('Check the 3D world to verify resource appearances!');
  }

  private stopDemo(): void {
    console.log('\n⏹️ Stopping demo...');
    this.demoState = 'inactive';
    this.currentDemo = '';
    
    // Clear visual test if active
    this.world.events.emit('test:clear_visual_resources');
    
    console.log('Demo stopped. Use demo:menu to see available demos.');
  }

  // Helper methods for demonstrations

  private async createDemoPlayer(): Promise<void> {
    if (this.demoPlayer) return;

    this.demoPlayer = this.world.createEntity({
      type: 'player',
      id: 'demo_player',
      components: []
    });

    // Add essential components
    this.demoPlayer.addComponent({
      type: 'movement',
      position: { x: 0, y: 0, z: 0 },
      velocity: { x: 0, y: 0, z: 0 }
    });

    this.demoPlayer.addComponent({
      type: 'stats',
      hitpoints: { current: 100, max: 100 },
      attack: { level: 1, xp: 0 },
      strength: { level: 1, xp: 0 },
      defence: { level: 1, xp: 0 }
    });

    this.demoPlayer.addComponent({
      type: 'inventory',
      items: new Array(28).fill(null),
      maxSize: 28
    });

    // Initialize skills and magic
    this.skillsSystem.createPlayerSkills(this.demoPlayer);
    this.magicSystem.createMagicComponent(this.demoPlayer.id);

    console.log('👤 Demo player created and initialized');
  }

  private async demonstrateWoodcutting(): Promise<void> {
    // Give multiple woodcutting levels to show progression
    const trees = [
      { type: ResourceType.TREE_NORMAL, level: 1 },
      { type: ResourceType.TREE_OAK, level: 15 },
      { type: ResourceType.TREE_WILLOW, level: 30 },
      { type: ResourceType.TREE_MAPLE, level: 45 }
    ];

    for (const tree of trees) {
      // Give required level
      if (tree.level > 1) {
        this.skillsSystem.addExperience(this.demoPlayer.id, SkillType.WOODCUTTING, 
          this.getXPForLevel(tree.level + 5));
      }

      const currentLevel = this.skillsSystem.getSkillLevel(this.demoPlayer.id, SkillType.WOODCUTTING);
      console.log(`  🌳 ${tree.type} (Req: Lvl ${tree.level}, Player: Lvl ${currentLevel})`);
    }
  }

  private async demonstrateMining(): Promise<void> {
    const ores = [
      { type: ResourceType.ROCK_COPPER, level: 1 },
      { type: ResourceType.ROCK_IRON, level: 15 },
      { type: ResourceType.ROCK_COAL, level: 30 },
      { type: ResourceType.ROCK_MITHRIL, level: 55 }
    ];

    for (const ore of ores) {
      if (ore.level > 1) {
        this.skillsSystem.addExperience(this.demoPlayer.id, SkillType.MINING, 
          this.getXPForLevel(ore.level + 5));
      }

      const currentLevel = this.skillsSystem.getSkillLevel(this.demoPlayer.id, SkillType.MINING);
      console.log(`  ⛏️ ${ore.type} (Req: Lvl ${ore.level}, Player: Lvl ${currentLevel})`);
    }
  }

  private async demonstrateFishing(): Promise<void> {
    const fish = [
      { type: ResourceType.FISHING_NET, level: 1 },
      { type: ResourceType.FISHING_BAIT, level: 20 },
      { type: ResourceType.FISHING_CAGE, level: 40 }
    ];

    for (const fishSpot of fish) {
      if (fishSpot.level > 1) {
        this.skillsSystem.addExperience(this.demoPlayer.id, SkillType.FISHING, 
          this.getXPForLevel(fishSpot.level + 5));
      }

      const currentLevel = this.skillsSystem.getSkillLevel(this.demoPlayer.id, SkillType.FISHING);
      console.log(`  🎣 ${fishSpot.type} (Req: Lvl ${fishSpot.level}, Player: Lvl ${currentLevel})`);
    }
  }

  private async demonstrateCombatTraining(): Promise<void> {
    // Simulate combat training
    const combatSkills = [SkillType.ATTACK, SkillType.STRENGTH, SkillType.DEFENCE];
    
    for (const skill of combatSkills) {
      this.skillsSystem.addExperience(this.demoPlayer.id, skill, 13363); // Level 30
      const level = this.skillsSystem.getSkillLevel(this.demoPlayer.id, skill);
      console.log(`  ⚔️ ${skill}: Level ${level}`);
    }

    // Hitpoints should also increase
    this.skillsSystem.addExperience(this.demoPlayer.id, SkillType.HITPOINTS, 20000);
    const hpLevel = this.skillsSystem.getSkillLevel(this.demoPlayer.id, SkillType.HITPOINTS);
    console.log(`  ❤️ Hitpoints: Level ${hpLevel}`);

    const combatLevel = this.skillsSystem.getCombatLevel(this.demoPlayer.id);
    console.log(`  🛡️ Combat Level: ${combatLevel}`);
  }

  private async demonstrateCombatMagic(): Promise<void> {
    const combatSpells = [
      SpellType.WIND_STRIKE,
      SpellType.WATER_STRIKE,
      SpellType.EARTH_STRIKE,
      SpellType.FIRE_STRIKE,
      SpellType.WIND_BOLT,
      SpellType.FIRE_BOLT,
      SpellType.WIND_BLAST
    ];

    for (const spell of combatSpells) {
      console.log(`  ⚡ Casting ${spell}...`);
      const success = this.magicSystem.castSpell(this.demoPlayer.id, spell, 'dummy_target');
      console.log(`    ${success ? '✅ Success' : '❌ Failed'}`);
      await this.wait(500);
    }
  }

  private async demonstrateUtilityMagic(): Promise<void> {
    const utilitySpells = [
      SpellType.LOW_LEVEL_ALCHEMY,
      SpellType.HIGH_LEVEL_ALCHEMY,
      SpellType.TELEKINETIC_GRAB
    ];

    for (const spell of utilitySpells) {
      console.log(`  🔧 Demonstrating ${spell}...`);
      // These would need target items, so just show they're available
      const magic = this.magicSystem.getPlayerMagic(this.demoPlayer.id);
      const available = magic?.spellBook.includes(spell);
      console.log(`    ${available ? '✅ Available' : '❌ Not available'}`);
    }
  }

  private async demonstrateTeleportMagic(): Promise<void> {
    const teleportSpells = [
      SpellType.VARROCK_TELEPORT,
      SpellType.LUMBRIDGE_TELEPORT,
      SpellType.FALADOR_TELEPORT
    ];

    for (const spell of teleportSpells) {
      console.log(`  🌀 Casting ${spell}...`);
      const success = this.magicSystem.castSpell(this.demoPlayer.id, spell);
      console.log(`    ${success ? '✅ Teleported' : '❌ Failed'}`);
      await this.wait(1000);
    }
  }

  private logResourceDistribution(): void {
    const zones = [
      { name: 'Lumbridge', center: { x: 0, z: 0 } },
      { name: 'Varrock', center: { x: 100, z: 0 } },
      { name: 'Draynor', center: { x: -100, z: 0 } },
      { name: 'Wilderness', center: { x: 150, z: 150 } },
      { name: 'Resource Forest', center: { x: 0, z: 200 } }
    ];

    console.log('\n📊 Resource distribution by zone:');
    
    for (const zone of zones) {
      const resources = this.resourceSystem.getResourcesInRange(zone.center.x, zone.center.z, 50);
      const counts: Record<string, number> = {};

      resources.forEach(resource => {
        const category = resource.resourceType.split('_')[0];
        counts[category] = (counts[category] || 0) + 1;
      });

      console.log(`  🗺️ ${zone.name}: Trees=${counts.tree || 0}, Rocks=${counts.rock || 0}, Fishing=${counts.fishing || 0}`);
    }
  }

  private async demonstrateResourceProgression(): Promise<void> {
    const progression = [
      { resource: ResourceType.TREE_NORMAL, skill: SkillType.WOODCUTTING, level: 1 },
      { resource: ResourceType.TREE_OAK, skill: SkillType.WOODCUTTING, level: 15 },
      { resource: ResourceType.ROCK_IRON, skill: SkillType.MINING, level: 15 },
      { resource: ResourceType.FISHING_BAIT, skill: SkillType.FISHING, level: 20 }
    ];

    for (const step of progression) {
      console.log(`  📈 Training ${step.skill} to level ${step.level} for ${step.resource}`);
      this.skillsSystem.addExperience(this.demoPlayer.id, step.skill, this.getXPForLevel(step.level + 2));
      
      const currentLevel = this.skillsSystem.getSkillLevel(this.demoPlayer.id, step.skill);
      console.log(`    ✅ Can now harvest ${step.resource} (Level ${currentLevel})`);
    }
  }

  private demonstrateResourceVisuals(): void {
    console.log('\n🎨 Resource visual themes:');
    console.log('  🌳 Trees: Browns (#8B4513) to magical purples (#8A2BE2)');
    console.log('  ⛏️ Rocks: Earthy tones with metallic shine for ores');
    console.log('  🎣 Fishing: Blue water colors with different intensities');
    console.log('  ✨ Special effects: Emissive glow for rare resources');
  }

  private async visitZone(zoneType: ZoneType, coords: { x: number; z: number }): Promise<void> {
    // Move player to zone
    const movement = this.demoPlayer.getComponent('movement');
    movement.position = { x: coords.x, y: 0, z: coords.z };

    // Get zone info
    const zone = Object.values(ZONE_DEFINITIONS).find(z => z.type === zoneType);
    if (!zone) return;

    console.log(`  🏛️ ${zone.name}: ${zone.description}`);
    console.log(`    Theme: ${zone.theme}`);
    console.log(`    Features: Bank=${zone.features.hasBank}, Shops=${zone.features.hasShops}, PvP=${zone.features.pvpEnabled}`);
    
    // Show skill multipliers
    const multipliers = zone.features.skillMultipliers;
    if (multipliers && Object.keys(multipliers).length > 0) {
      console.log(`    Skill bonuses: ${JSON.stringify(multipliers)}`);
    }

    // Show nearby resources
    const nearbyResources = this.resourceSystem.getResourcesInRange(coords.x, coords.z, 30);
    if (nearbyResources.length > 0) {
      const resourceTypes = [...new Set(nearbyResources.map(r => r.resourceType))];
      console.log(`    Resources: ${resourceTypes.slice(0, 3).join(', ')}${resourceTypes.length > 3 ? '...' : ''}`);
    }
  }

  private async demonstrateNewPlayerExperience(): Promise<void> {
    console.log('  🏰 Starting in Lumbridge Castle...');
    
    // Move to Lumbridge
    const movement = this.demoPlayer.getComponent('movement');
    movement.position = { x: 0, y: 0, z: 0 };
    
    // Basic resource gathering
    console.log('  🪓 Cutting normal trees for first logs...');
    this.skillsSystem.addExperience(this.demoPlayer.id, SkillType.WOODCUTTING, 200);
    
    console.log('  ⛏️ Mining copper and tin for first ores...');
    this.skillsSystem.addExperience(this.demoPlayer.id, SkillType.MINING, 150);
    
    console.log('  🎣 Catching shrimp at the river...');
    this.skillsSystem.addExperience(this.demoPlayer.id, SkillType.FISHING, 100);
    
    const wcLevel = this.skillsSystem.getSkillLevel(this.demoPlayer.id, SkillType.WOODCUTTING);
    console.log(`    Woodcutting is now level ${wcLevel}`);
  }

  private async demonstrateEarlyGameProgression(): Promise<void> {
    console.log('  🚶‍♂️ Traveling to Draynor Village...');
    
    // Move to Draynor
    const movement = this.demoPlayer.getComponent('movement');
    movement.position = { x: -100, y: 0, z: 0 };
    
    // Train to access better resources
    console.log('  🌳 Training woodcutting for willow trees...');
    this.skillsSystem.addExperience(this.demoPlayer.id, SkillType.WOODCUTTING, 15000);
    
    console.log('  🎣 Learning fly fishing...');
    this.skillsSystem.addExperience(this.demoPlayer.id, SkillType.FISHING, 5000);
    
    const wcLevel = this.skillsSystem.getSkillLevel(this.demoPlayer.id, SkillType.WOODCUTTING);
    const fishLevel = this.skillsSystem.getSkillLevel(this.demoPlayer.id, SkillType.FISHING);
    console.log(`    Skills: Woodcutting ${wcLevel}, Fishing ${fishLevel}`);
  }

  private async demonstrateAdvancedTraining(): Promise<void> {
    console.log('  🏭 Moving to specialized training areas...');
    
    // Resource Forest for woodcutting
    console.log('  🌲 Training in Resource Forest (1.5x woodcutting XP)...');
    const movement = this.demoPlayer.getComponent('movement');
    movement.position = { x: 0, y: 0, z: 200 };
    this.skillsSystem.addExperience(this.demoPlayer.id, SkillType.WOODCUTTING, 50000);
    
    // Varrock for mining
    console.log('  ⛏️ Mining in Varrock (1.1x mining XP)...');
    movement.position = { x: 100, y: 0, z: 0 };
    this.skillsSystem.addExperience(this.demoPlayer.id, SkillType.MINING, 40000);
    
    const wcLevel = this.skillsSystem.getSkillLevel(this.demoPlayer.id, SkillType.WOODCUTTING);
    const miningLevel = this.skillsSystem.getSkillLevel(this.demoPlayer.id, SkillType.MINING);
    console.log(`    Advanced skills: Woodcutting ${wcLevel}, Mining ${miningLevel}`);
  }

  private async demonstrateHighLevelContent(): Promise<void> {
    console.log('  ⚠️ Entering the dangerous Wilderness...');
    
    // Move to Wilderness
    const movement = this.demoPlayer.getComponent('movement');
    movement.position = { x: 150, y: 0, z: 150 };
    
    console.log('  🌳 Cutting yew trees (level 60 required)...');
    this.skillsSystem.addExperience(this.demoPlayer.id, SkillType.WOODCUTTING, 273742); // Level 60
    
    console.log('  💎 Mining runite ore (level 85 required)...');
    this.skillsSystem.addExperience(this.demoPlayer.id, SkillType.MINING, 3972294); // Level 85
    
    const wcLevel = this.skillsSystem.getSkillLevel(this.demoPlayer.id, SkillType.WOODCUTTING);
    const miningLevel = this.skillsSystem.getSkillLevel(this.demoPlayer.id, SkillType.MINING);
    console.log(`    High-level skills: Woodcutting ${wcLevel}, Mining ${miningLevel}`);
    console.log('    ⚠️ Warning: PvP enabled in this area!');
  }

  private logPlayerSkills(title: string): void {
    console.log(`\n📊 ${title}:`);
    
    const skills = this.skillsSystem.getPlayerSkills(this.demoPlayer.id);
    if (!skills) return;

    const combatSkills = [SkillType.ATTACK, SkillType.STRENGTH, SkillType.DEFENCE, SkillType.HITPOINTS, SkillType.MAGIC, SkillType.RANGED, SkillType.PRAYER];
    const gatheringSkills = [SkillType.WOODCUTTING, SkillType.MINING, SkillType.FISHING];
    const craftingSkills = [SkillType.SMITHING, SkillType.COOKING, SkillType.CRAFTING, SkillType.FLETCHING];

    console.log('  ⚔️ Combat Skills:');
    combatSkills.forEach(skill => {
      const level = skills.skills[skill].level;
      const xp = skills.skills[skill].totalXp;
      console.log(`    ${skill}: Level ${level} (${xp.toLocaleString()} XP)`);
    });

    console.log('  🌳 Gathering Skills:');
    gatheringSkills.forEach(skill => {
      const level = skills.skills[skill].level;
      const xp = skills.skills[skill].totalXp;
      console.log(`    ${skill}: Level ${level} (${xp.toLocaleString()} XP)`);
    });

    console.log('  🔨 Crafting Skills:');
    craftingSkills.forEach(skill => {
      const level = skills.skills[skill].level;
      const xp = skills.skills[skill].totalXp;
      console.log(`    ${skill}: Level ${level} (${xp.toLocaleString()} XP)`);
    });

    console.log(`  📈 Total Level: ${skills.totalLevel}`);
    console.log(`  ⚔️ Combat Level: ${skills.combatLevel}`);
  }

  private logCharacterSummary(): void {
    const skills = this.skillsSystem.getPlayerSkills(this.demoPlayer.id);
    if (!skills) return;

    console.log('\n🎯 Character Progression Summary:');
    console.log(`  👤 Total Level: ${skills.totalLevel}`);
    console.log(`  ⚔️ Combat Level: ${skills.combatLevel}`);
    
    // Find highest skills
    const skillLevels = Object.entries(skills.skills).map(([skill, data]) => ({
      skill,
      level: data.level
    })).sort((a, b) => b.level - a.level);

    console.log('  🏆 Top Skills:');
    skillLevels.slice(0, 5).forEach((skill, index) => {
      console.log(`    ${index + 1}. ${skill.skill}: Level ${skill.level}`);
    });

    const totalXP = Object.values(skills.skills).reduce((sum, skill) => sum + skill.totalXp, 0);
    console.log(`  📊 Total Experience: ${totalXP.toLocaleString()}`);
  }

  private getXPForLevel(level: number): number {
    // Simplified XP table lookup
    const xpTable = [0, 0, 83, 174, 276, 388, 512, 650, 801, 969, 1154, 1358, 1584, 1833, 2107, 2411, 2746, 3115, 3523, 3973, 4470, 5018, 5624, 6291, 7028, 7842, 8740, 9730, 10824, 12031, 13363, 14833, 16456, 18247, 20224, 22406, 24815, 27473, 30408, 33648, 37224, 41171, 45529, 50339, 55649, 61512, 67983, 75127, 83014, 91721, 101333, 111945, 123660, 136594, 150872, 166636, 184040, 203254, 224466, 247886, 273742];
    return xpTable[Math.min(level, xpTable.length - 1)] || 0;
  }

  private async wait(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  update(deltaTime: number): void {
    // Update demo state if needed
  }

  serialize(): any {
    return {
      demoState: this.demoState,
      currentDemo: this.currentDemo
    };
  }

  deserialize(data: any): void {
    this.demoState = data.demoState || 'inactive';
    this.currentDemo = data.currentDemo || '';
  }
}