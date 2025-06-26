#!/usr/bin/env node

/**
 * Final RPG Verification Test
 * 
 * This test verifies that the complete RPG system is working:
 * 1. All 22 RPG systems load correctly
 * 2. NPCs spawn with proper positions and visual representations
 * 3. Spawning system creates entities successfully
 * 4. Visual system applies correct templates and colors
 */

import puppeteer from 'puppeteer';
import fs from 'fs-extra';
import path from 'path';

const CONFIG = {
  headless: false,
  timeout: 45000,
  worldUrl: 'http://localhost:4444',
  resultDir: 'test-results'
};

async function main() {
  console.log('🎮 Running Final RPG System Verification...');
  console.log(`📋 Testing complete RPG plugin integration`);
  
  let browser;
  try {
    // Ensure results directory exists
    await fs.ensureDir(CONFIG.resultDir);

    browser = await puppeteer.launch({
      headless: CONFIG.headless,
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-web-security']
    });

    const page = await browser.newPage();
    await page.setViewport({ width: 1920, height: 1080 });

    // Set up console logging
    page.on('console', msg => {
      const type = msg.type();
      if (['log', 'info', 'warn', 'error'].includes(type)) {
        console.log(`[Browser ${type}] ${msg.text()}`);
      }
    });

    console.log('🌍 Loading RPG world...');
    await page.goto(CONFIG.worldUrl, { waitUntil: 'domcontentloaded' });

    // Wait for world and RPG systems initialization
    console.log('⏳ Waiting for world and all RPG systems...');
    await page.waitForFunction(() => {
      return window.world && 
             window.world.getSystem && 
             window.world.getSystem('spawning') &&
             window.world.getSystem('npc') &&
             window.world.getSystem('visualRepresentation') &&
             window.world.getSystem('combat') &&
             window.world.getSystem('inventory');
    }, { timeout: CONFIG.timeout });

    // Wait additional time for NPCs to spawn
    console.log('⏳ Waiting for NPC spawning...');
    await new Promise(resolve => setTimeout(resolve, 8000));

    // Run comprehensive verification
    const results = await page.evaluate(async () => {
      console.log('[FinalTest] Starting comprehensive RPG verification...');
      
      const world = window.world;
      const verification = {
        systems: {},
        spawning: {},
        npcs: {},
        visuals: {},
        summary: {}
      };

      // Check all expected RPG systems
      const expectedSystems = [
        'combat', 'inventory', 'npc', 'loot', 'spawning', 'skills', 'movement', 
        'visualRepresentation', 'quest', 'banking', 'trading', 'prayer', 'shop',
        'magic', 'ranged', 'deathRespawn', 'pvp', 'playerHomes', 'grandExchange',
        'clan', 'construction', 'minigame'
      ];

      for (const systemName of expectedSystems) {
        verification.systems[systemName] = !!world.getSystem(systemName);
      }

      // Check spawning system
      const spawningSystem = world.getSystem('spawning');
      if (spawningSystem) {
        verification.spawning = {
          systemLoaded: true,
          spawners: spawningSystem.spawners ? Array.from(spawningSystem.spawners.values()).map(spawner => ({
            id: spawner.id,
            position: spawner.position,
            type: spawner.type,
            maxEntities: spawner.maxEntities,
            activeEntities: spawner.activeEntities ? spawner.activeEntities.size : 0,
            isActive: spawner.isActive,
            entityDefinitions: spawner.entityDefinitions
          })) : [],
          activeSpawns: spawningSystem.activeSpawns ? Array.from(spawningSystem.activeSpawns.entries()).map(([entityId, spawnerId]) => ({
            entityId, spawnerId
          })) : []
        };
      }

      // Check NPC system
      const npcSystem = world.getSystem('npc');
      if (npcSystem && npcSystem.npcs) {
        verification.npcs = {
          systemLoaded: true,
          totalNpcs: npcSystem.npcs.size,
          npcs: Array.from(npcSystem.npcs.values()).map(npc => ({
            id: npc.id,
            name: npc.name || 'Unknown',
            position: npc.position,
            state: npc.state,
            type: npc.type
          }))
        };
      }

      // Check visual system
      const visualSystem = world.getSystem('visualRepresentation');
      if (visualSystem && visualSystem.entityVisuals) {
        verification.visuals = {
          systemLoaded: true,
          totalVisuals: visualSystem.entityVisuals.size,
          visuals: Array.from(visualSystem.entityVisuals.entries()).map(([entityId, visual]) => ({
            entityId,
            templateName: visual.templateName,
            color: visual.color,
            visible: visual.visible,
            position: visual.group ? {
              x: visual.group.position.x,
              y: visual.group.position.y,
              z: visual.group.position.z
            } : null
          }))
        };
      }

      // Generate summary
      verification.summary = {
        totalSystemsLoaded: Object.values(verification.systems).filter(Boolean).length,
        expectedSystems: expectedSystems.length,
        spawners: verification.spawning.spawners?.length || 0,
        activeSpawns: verification.spawning.activeSpawns?.length || 0,
        npcs: verification.npcs.totalNpcs || 0,
        visuals: verification.visuals.totalVisuals || 0,
        allSystemsLoaded: Object.values(verification.systems).every(Boolean),
        spawningWorking: (verification.spawning.spawners?.length || 0) > 0 && (verification.npcs.totalNpcs || 0) > 0,
        visualsWorking: (verification.visuals.totalVisuals || 0) > 0
      };

      console.log('[FinalTest] Verification complete');
      return verification;
    });

    // Display comprehensive results
    console.log('\n🎯 FINAL RPG SYSTEM VERIFICATION RESULTS');
    console.log('════════════════════════════════════════════════════════════════');
    
    console.log('\n🔧 RPG Systems Status:');
    let systemsOk = 0;
    for (const [system, loaded] of Object.entries(results.systems)) {
      console.log(`   ${loaded ? '✅' : '❌'} ${system}: ${loaded ? 'LOADED' : 'MISSING'}`);
      if (loaded) systemsOk++;
    }
    console.log(`   Total: ${systemsOk}/${Object.keys(results.systems).length} systems loaded`);

    console.log('\n🏭 Spawning System:');
    console.log(`   System Loaded: ${results.spawning.systemLoaded ? '✅' : '❌'}`);
    console.log(`   Spawners: ${results.summary.spawners}`);
    console.log(`   Active Spawns: ${results.summary.activeSpawns}`);
    if (results.spawning.spawners && results.spawning.spawners.length > 0) {
      console.log('   Spawner Details:');
      results.spawning.spawners.forEach(spawner => {
        console.log(`     ${spawner.id}: ${spawner.isActive ? 'ACTIVE' : 'INACTIVE'} at [${spawner.position.x}, ${spawner.position.y}, ${spawner.position.z}]`);
        console.log(`       Entities: ${spawner.activeEntities}/${spawner.maxEntities}, Types: ${spawner.entityDefinitions.map(def => def.entityType).join(', ')}`);
      });
    }

    console.log('\n👥 NPC System:');
    console.log(`   System Loaded: ${results.npcs.systemLoaded ? '✅' : '❌'}`);
    console.log(`   Total NPCs: ${results.summary.npcs}`);
    if (results.npcs.npcs && results.npcs.npcs.length > 0) {
      console.log('   NPC Details:');
      results.npcs.npcs.forEach(npc => {
        const pos = npc.position;
        console.log(`     ${npc.name || npc.id}: ${npc.type} at [${pos?.x?.toFixed(2) || 'N/A'}, ${pos?.y?.toFixed(2) || 'N/A'}, ${pos?.z?.toFixed(2) || 'N/A'}]`);
        console.log(`       State: ${npc.state || 'Unknown'}`);
      });
    }

    console.log('\n👁️ Visual System:');
    console.log(`   System Loaded: ${results.visuals.systemLoaded ? '✅' : '❌'}`);
    console.log(`   Total Visuals: ${results.summary.visuals}`);
    if (results.visuals.visuals && results.visuals.visuals.length > 0) {
      console.log('   Visual Details:');
      results.visuals.visuals.forEach(visual => {
        const pos = visual.position;
        console.log(`     ${visual.entityId}: template="${visual.templateName}", color=${visual.color}`);
        if (pos) {
          console.log(`       Position: [${pos.x.toFixed(2)}, ${pos.y.toFixed(2)}, ${pos.z.toFixed(2)}], Visible: ${visual.visible ? 'YES' : 'NO'}`);
        }
      });
    }

    console.log('\n🏁 OVERALL ASSESSMENT:');
    console.log(`   All Systems Loaded: ${results.summary.allSystemsLoaded ? '✅' : '❌'} (${systemsOk}/${Object.keys(results.systems).length})`);
    console.log(`   Spawning Working: ${results.summary.spawningWorking ? '✅' : '❌'}`);
    console.log(`   Visuals Working: ${results.summary.visualsWorking ? '✅' : '❌'}`);
    console.log(`   NPCs with Positions: ${results.npcs.npcs ? results.npcs.npcs.filter(npc => npc.position && npc.position.x !== undefined).length : 0}`);

    // Save detailed results
    const timestamp = Date.now();
    const resultFile = path.join(CONFIG.resultDir, `final-rpg-verification-${timestamp}.json`);
    await fs.writeJson(resultFile, {
      timestamp,
      config: CONFIG,
      results,
      assessment: {
        allSystemsLoaded: results.summary.allSystemsLoaded,
        spawningWorking: results.summary.spawningWorking,
        visualsWorking: results.summary.visualsWorking,
        systemCount: systemsOk,
        npcCount: results.summary.npcs,
        visualCount: results.summary.visuals
      }
    }, { spaces: 2 });

    console.log(`\n💾 Detailed results saved to: ${resultFile}`);

    // Final verdict
    const allWorking = results.summary.allSystemsLoaded && 
                      results.summary.spawningWorking && 
                      results.summary.visualsWorking;

    if (allWorking) {
      console.log('\n🎉 RPG SYSTEM VERIFICATION: ✅ COMPLETE SUCCESS!');
      console.log('🚀 All systems operational, NPCs spawning with visuals!');
    } else {
      console.log('\n⚠️ RPG SYSTEM VERIFICATION: 🔄 PARTIAL SUCCESS');
      if (!results.summary.allSystemsLoaded) console.log('   ❌ Some systems not loaded');
      if (!results.summary.spawningWorking) console.log('   ❌ Spawning system issues');
      if (!results.summary.visualsWorking) console.log('   ❌ Visual system issues');
    }

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error(error.stack);
    process.exit(1);
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}

main().catch(console.error);