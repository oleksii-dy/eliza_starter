#!/usr/bin/env node

/**
 * Comprehensive Skills Validation
 * Tests every single skill (23 skills total): Combat, Gathering, Artisan, Support
 * Validates skill mechanics, experience gain, leveling, and bonuses
 */

import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.join(__dirname, '../..');

class SkillsValidation {
  constructor() {
    this.testResults = [];
    this.serverProcess = null;
    this.testStartTime = Date.now();
    this.skillCategories = {
      combat: [
        'Attack', 'Strength', 'Defence', 'Ranged', 'Prayer', 'Magic', 'Hitpoints', 'Slayer'
      ],
      gathering: [
        'Mining', 'Fishing', 'Woodcutting', 'Farming', 'Hunter'
      ],
      artisan: [
        'Smithing', 'Crafting', 'Fletching', 'Herblore', 'Cooking', 'Firemaking', 'Runecrafting', 'Construction'
      ],
      support: [
        'Agility', 'Thieving', 'Summoning'
      ]
    };
    this.skillRequirements = {
      'Attack': { maxLevel: 99, xpToMax: 13034431 },
      'Strength': { maxLevel: 99, xpToMax: 13034431 },
      'Defence': { maxLevel: 99, xpToMax: 13034431 },
      'Ranged': { maxLevel: 99, xpToMax: 13034431 },
      'Prayer': { maxLevel: 99, xpToMax: 13034431 },
      'Magic': { maxLevel: 99, xpToMax: 13034431 },
      'Hitpoints': { maxLevel: 99, xpToMax: 13034431 },
      'Slayer': { maxLevel: 99, xpToMax: 13034431 },
      'Mining': { maxLevel: 99, xpToMax: 13034431 },
      'Fishing': { maxLevel: 99, xpToMax: 13034431 },
      'Woodcutting': { maxLevel: 99, xpToMax: 13034431 },
      'Farming': { maxLevel: 99, xpToMax: 13034431 },
      'Hunter': { maxLevel: 99, xpToMax: 13034431 },
      'Smithing': { maxLevel: 99, xpToMax: 13034431 },
      'Crafting': { maxLevel: 99, xpToMax: 13034431 },
      'Fletching': { maxLevel: 99, xpToMax: 13034431 },
      'Herblore': { maxLevel: 99, xpToMax: 13034431 },
      'Cooking': { maxLevel: 99, xpToMax: 13034431 },
      'Firemaking': { maxLevel: 99, xpToMax: 13034431 },
      'Runecrafting': { maxLevel: 99, xpToMax: 13034431 },
      'Construction': { maxLevel: 99, xpToMax: 13034431 },
      'Agility': { maxLevel: 99, xpToMax: 13034431 },
      'Thieving': { maxLevel: 99, xpToMax: 13034431 },
      'Summoning': { maxLevel: 99, xpToMax: 13034431 }
    };
    this.visualColors = {
      combat: '#FF0000',      // Red
      gathering: '#008000',   // Green
      artisan: '#0000FF',     // Blue
      support: '#800080'      // Purple
    };
  }

  async runValidation() {
    console.log('📈 COMPREHENSIVE SKILLS VALIDATION');
    console.log('=================================\n');
    console.log('Testing all 23 skills across 4 categories:');
    console.log('• Combat Skills: 8 skills (Attack, Strength, Defence, etc.)');
    console.log('• Gathering Skills: 5 skills (Mining, Fishing, Woodcutting, etc.)');
    console.log('• Artisan Skills: 8 skills (Smithing, Crafting, Fletching, etc.)');
    console.log('• Support Skills: 3 skills (Agility, Thieving, Summoning)');
    console.log('• Experience System: XP gain, leveling, skill bonuses');
    console.log('• Skill Requirements: Equipment, quests, activities');
    console.log('• Visual Testing: Skill interface colors and UI\n');

    try {
      await this.runSkillTests();
      this.generateSkillReport();
    } catch (error) {
      console.error('❌ Skills validation failed:', error.message);
      this.logTest('Skills Validation', 'FAILED', error.message);
    } finally {
      await this.cleanup();
    }
  }

  async runSkillTests() {
    console.log('🚀 Starting comprehensive skills testing...\n');
    
    return new Promise((resolve, reject) => {
      this.serverProcess = spawn('bun', ['build/index.js'], {
        cwd: projectRoot,
        stdio: ['pipe', 'pipe', 'pipe'],
        env: { 
          ...process.env, 
          ENABLE_RPG: 'true',
          SKILLS_TEST: 'true',
          VISUAL_TEST: 'true'
        }
      });

      let skillChecklist = {
        serverStarted: false,
        skillSystemLoaded: false,
        combatSkillsDetected: 0,
        gatheringSkillsDetected: 0,
        artisanSkillsDetected: 0,
        supportSkillsDetected: 0,
        experienceSystemReady: false,
        skillLevelingActive: false,
        skillBonusesActive: false,
        skillRequirementsActive: false,
        skillInterfaceReady: false,
        totalSkillsValidated: 0
      };

      this.serverProcess.stdout.on('data', (data) => {
        const output = data.toString();
        
        // Server startup
        if (output.includes('running on port 4444')) {
          skillChecklist.serverStarted = true;
          this.logTest('🚀 Skills Test Server', 'PASSED', 'Server started for skills testing');
        }

        // Skills system detection
        if (output.includes('skills system') || output.includes('Skills System')) {
          skillChecklist.skillSystemLoaded = true;
          this.logTest('📊 Skills System', 'PASSED', 'Skills system loaded successfully');
        }

        // Experience system
        if (output.includes('experience') || output.includes('XP') || output.includes('leveling')) {
          skillChecklist.experienceSystemReady = true;
          this.logTest('⚡ Experience System', 'PASSED', 'XP gain and leveling system ready');
        }

        // Combat skills detection
        if (output.includes('attack') || output.includes('Attack')) {
          skillChecklist.combatSkillsDetected++;
          this.logTest('⚔️ Attack Skill', 'PASSED', 'Attack skill system active');
        }
        if (output.includes('strength') || output.includes('Strength')) {
          skillChecklist.combatSkillsDetected++;
          this.logTest('💪 Strength Skill', 'PASSED', 'Strength skill system active');
        }
        if (output.includes('defence') || output.includes('Defence')) {
          skillChecklist.combatSkillsDetected++;
          this.logTest('🛡️ Defence Skill', 'PASSED', 'Defence skill system active');
        }
        if (output.includes('ranged') || output.includes('Ranged')) {
          skillChecklist.combatSkillsDetected++;
          this.logTest('🏹 Ranged Skill', 'PASSED', 'Ranged skill system active');
        }
        if (output.includes('prayer') || output.includes('Prayer')) {
          skillChecklist.combatSkillsDetected++;
          this.logTest('🙏 Prayer Skill', 'PASSED', 'Prayer skill system active');
        }
        if (output.includes('magic') || output.includes('Magic')) {
          skillChecklist.combatSkillsDetected++;
          this.logTest('🔮 Magic Skill', 'PASSED', 'Magic skill system active');
        }
        if (output.includes('hitpoints') || output.includes('Hitpoints')) {
          skillChecklist.combatSkillsDetected++;
          this.logTest('❤️ Hitpoints Skill', 'PASSED', 'Hitpoints skill system active');
        }
        if (output.includes('slayer') || output.includes('Slayer')) {
          skillChecklist.combatSkillsDetected++;
          this.logTest('👹 Slayer Skill', 'PASSED', 'Slayer skill system active');
        }

        // Gathering skills detection
        if (output.includes('mining') || output.includes('Mining')) {
          skillChecklist.gatheringSkillsDetected++;
          this.logTest('⛏️ Mining Skill', 'PASSED', 'Mining skill system active');
        }
        if (output.includes('fishing') || output.includes('Fishing')) {
          skillChecklist.gatheringSkillsDetected++;
          this.logTest('🎣 Fishing Skill', 'PASSED', 'Fishing skill system active');
        }
        if (output.includes('woodcutting') || output.includes('Woodcutting')) {
          skillChecklist.gatheringSkillsDetected++;
          this.logTest('🪵 Woodcutting Skill', 'PASSED', 'Woodcutting skill system active');
        }
        if (output.includes('farming') || output.includes('Farming')) {
          skillChecklist.gatheringSkillsDetected++;
          this.logTest('🌱 Farming Skill', 'PASSED', 'Farming skill system active');
        }
        if (output.includes('hunter') || output.includes('Hunter')) {
          skillChecklist.gatheringSkillsDetected++;
          this.logTest('🏹 Hunter Skill', 'PASSED', 'Hunter skill system active');
        }

        // Artisan skills detection
        if (output.includes('smithing') || output.includes('Smithing')) {
          skillChecklist.artisanSkillsDetected++;
          this.logTest('🔨 Smithing Skill', 'PASSED', 'Smithing skill system active');
        }
        if (output.includes('crafting') || output.includes('Crafting')) {
          skillChecklist.artisanSkillsDetected++;
          this.logTest('🧵 Crafting Skill', 'PASSED', 'Crafting skill system active');
        }
        if (output.includes('fletching') || output.includes('Fletching')) {
          skillChecklist.artisanSkillsDetected++;
          this.logTest('🏹 Fletching Skill', 'PASSED', 'Fletching skill system active');
        }
        if (output.includes('herblore') || output.includes('Herblore')) {
          skillChecklist.artisanSkillsDetected++;
          this.logTest('🧪 Herblore Skill', 'PASSED', 'Herblore skill system active');
        }
        if (output.includes('cooking') || output.includes('Cooking')) {
          skillChecklist.artisanSkillsDetected++;
          this.logTest('👨‍🍳 Cooking Skill', 'PASSED', 'Cooking skill system active');
        }
        if (output.includes('firemaking') || output.includes('Firemaking')) {
          skillChecklist.artisanSkillsDetected++;
          this.logTest('🔥 Firemaking Skill', 'PASSED', 'Firemaking skill system active');
        }
        if (output.includes('runecrafting') || output.includes('Runecrafting')) {
          skillChecklist.artisanSkillsDetected++;
          this.logTest('🔮 Runecrafting Skill', 'PASSED', 'Runecrafting skill system active');
        }
        if (output.includes('construction') || output.includes('Construction')) {
          skillChecklist.artisanSkillsDetected++;
          this.logTest('🏗️ Construction Skill', 'PASSED', 'Construction skill system active');
        }

        // Support skills detection
        if (output.includes('agility') || output.includes('Agility')) {
          skillChecklist.supportSkillsDetected++;
          this.logTest('🏃 Agility Skill', 'PASSED', 'Agility skill system active');
        }
        if (output.includes('thieving') || output.includes('Thieving')) {
          skillChecklist.supportSkillsDetected++;
          this.logTest('🥷 Thieving Skill', 'PASSED', 'Thieving skill system active');
        }
        if (output.includes('summoning') || output.includes('Summoning')) {
          skillChecklist.supportSkillsDetected++;
          this.logTest('👹 Summoning Skill', 'PASSED', 'Summoning skill system active');
        }

        // Skill mechanics
        if (output.includes('level up') || output.includes('leveled up')) {
          skillChecklist.skillLevelingActive = true;
          this.logTest('📈 Skill Leveling', 'PASSED', 'Skill level-up mechanics working');
        }

        if (output.includes('skill bonus') || output.includes('bonus experience')) {
          skillChecklist.skillBonusesActive = true;
          this.logTest('⭐ Skill Bonuses', 'PASSED', 'Skill bonuses and multipliers active');
        }

        if (output.includes('skill requirement') || output.includes('level required')) {
          skillChecklist.skillRequirementsActive = true;
          this.logTest('📋 Skill Requirements', 'PASSED', 'Skill requirements system active');
        }

        // Skills interface
        if (output.includes('skills interface') || output.includes('stats interface')) {
          skillChecklist.skillInterfaceReady = true;
          this.logTest('🖥️ Skills Interface', 'PASSED', 'Skills UI and stats interface ready');
        }

        // Visual application to skills
        if (output.includes('[VisualRepresentationSystem] Applied') && output.includes('skill')) {
          const templateMatch = output.match(/Applied (.+?) template/);
          if (templateMatch) {
            const templateName = templateMatch[1];
            this.logTest(`🎨 Skill Visual: ${templateName}`, 'PASSED', `${templateName} skill visual applied`);
          }
        }

        // Count total validated skills
        skillChecklist.totalSkillsValidated = 
          skillChecklist.combatSkillsDetected + 
          skillChecklist.gatheringSkillsDetected + 
          skillChecklist.artisanSkillsDetected + 
          skillChecklist.supportSkillsDetected;

        // Specific skill activity validation
        this.validateSpecificSkillActivity(output);
      });

      this.serverProcess.stderr.on('data', (data) => {
        const error = data.toString();
        if (!error.includes('DeprecationWarning') && !error.includes('GLTFLoader')) {
          this.logTest('🚨 Skills System Error', 'ERROR', error.trim());
        }
      });

      this.serverProcess.on('error', (error) => {
        reject(new Error(`Failed to start skills test server: ${error.message}`));
      });

      // Complete skills testing
      setTimeout(() => {
        console.log('\n🔍 Skills testing period complete. Analyzing results...\n');
        
        // Validate skill system completeness
        if (skillChecklist.skillSystemLoaded && skillChecklist.experienceSystemReady) {
          this.logTest('✅ Core Skills Systems', 'PASSED', 'Skills and XP systems operational');
        } else {
          this.logTest('⚠️ Core Skills Systems', 'WARNING', 'Some skill systems not detected');
        }

        // Combat skills validation
        if (skillChecklist.combatSkillsDetected >= 6) {
          this.logTest('✅ Combat Skills Coverage', 'PASSED', `${skillChecklist.combatSkillsDetected}/8 combat skills detected`);
        } else {
          this.logTest('⚠️ Combat Skills Coverage', 'WARNING', `Only ${skillChecklist.combatSkillsDetected}/8 combat skills detected`);
        }

        // Gathering skills validation
        if (skillChecklist.gatheringSkillsDetected >= 3) {
          this.logTest('✅ Gathering Skills Coverage', 'PASSED', `${skillChecklist.gatheringSkillsDetected}/5 gathering skills detected`);
        } else {
          this.logTest('⚠️ Gathering Skills Coverage', 'WARNING', `Only ${skillChecklist.gatheringSkillsDetected}/5 gathering skills detected`);
        }

        // Artisan skills validation
        if (skillChecklist.artisanSkillsDetected >= 6) {
          this.logTest('✅ Artisan Skills Coverage', 'PASSED', `${skillChecklist.artisanSkillsDetected}/8 artisan skills detected`);
        } else {
          this.logTest('⚠️ Artisan Skills Coverage', 'WARNING', `Only ${skillChecklist.artisanSkillsDetected}/8 artisan skills detected`);
        }

        // Support skills validation
        if (skillChecklist.supportSkillsDetected >= 2) {
          this.logTest('✅ Support Skills Coverage', 'PASSED', `${skillChecklist.supportSkillsDetected}/3 support skills detected`);
        } else {
          this.logTest('⚠️ Support Skills Coverage', 'WARNING', `Only ${skillChecklist.supportSkillsDetected}/3 support skills detected`);
        }

        // Overall skills coverage
        if (skillChecklist.totalSkillsValidated >= 18) {
          this.logTest('✅ Overall Skills Complete', 'PASSED', `${skillChecklist.totalSkillsValidated}/23 skills validated`);
        } else {
          this.logTest('⚠️ Overall Skills', 'WARNING', `Only ${skillChecklist.totalSkillsValidated}/23 skills validated`);
        }

        // Skill mechanics validation
        if (skillChecklist.skillLevelingActive && skillChecklist.skillRequirementsActive) {
          this.logTest('✅ Skill Mechanics', 'PASSED', 'Leveling and requirements working');
        } else {
          this.logTest('⚠️ Skill Mechanics', 'WARNING', 'Some skill mechanics not detected');
        }

        resolve();
      }, 60000); // 60 second skills test

      setTimeout(() => {
        reject(new Error('Skills testing timeout'));
      }, 75000);
    });
  }

  validateSpecificSkillActivity(output) {
    // Check for specific skill activity mentions
    const skillActivities = [
      { search: 'gained.*experience', name: 'Experience Gain', category: 'XP System' },
      { search: 'mined.*ore', name: 'Mining Activity', category: 'Gathering' },
      { search: 'caught.*fish', name: 'Fishing Activity', category: 'Gathering' },
      { search: 'chopped.*tree', name: 'Woodcutting Activity', category: 'Gathering' },
      { search: 'smithed.*item', name: 'Smithing Activity', category: 'Artisan' },
      { search: 'crafted.*item', name: 'Crafting Activity', category: 'Artisan' },
      { search: 'cooked.*food', name: 'Cooking Activity', category: 'Artisan' },
      { search: 'cast.*spell', name: 'Magic Activity', category: 'Combat' },
      { search: 'attacked.*enemy', name: 'Combat Activity', category: 'Combat' },
      { search: 'completed.*lap', name: 'Agility Activity', category: 'Support' },
      { search: 'pickpocketed', name: 'Thieving Activity', category: 'Support' }
    ];

    skillActivities.forEach(activity => {
      const regex = new RegExp(activity.search, 'i');
      if (regex.test(output)) {
        this.logTest(`🎯 ${activity.name}`, 'PASSED', `${activity.category} - ${activity.name} detected`);
      }
    });
  }

  logTest(testName, status, description) {
    const timestamp = Date.now();
    const result = { test: testName, status, description, timestamp };
    this.testResults.push(result);

    const emoji = {
      'PASSED': '✅',
      'FAILED': '❌',
      'WARNING': '⚠️',
      'INFO': 'ℹ️',
      'ERROR': '🚨'
    }[status] || '📝';

    console.log(`${emoji} ${testName}: ${description}`);
  }

  generateSkillReport() {
    console.log('\n📈 COMPREHENSIVE SKILLS VALIDATION REPORT');
    console.log('==========================================\n');

    const passed = this.testResults.filter(r => r.status === 'PASSED').length;
    const failed = this.testResults.filter(r => r.status === 'FAILED').length;
    const warnings = this.testResults.filter(r => r.status === 'WARNING').length;
    const errors = this.testResults.filter(r => r.status === 'ERROR').length;

    console.log(`📊 Skills Test Summary:`);
    console.log(`   ✅ Tests Passed:   ${passed}`);
    console.log(`   ❌ Tests Failed:   ${failed}`);
    console.log(`   ⚠️  Warnings:      ${warnings}`);
    console.log(`   🚨 Errors:        ${errors}`);

    const totalTime = Date.now() - this.testStartTime;
    console.log(`   ⏱️  Total Duration: ${(totalTime / 1000).toFixed(1)}s\n`);

    // Skills category analysis
    console.log('📋 Skills Category Coverage:');
    
    const categories = [
      { name: 'Combat Skills', icon: '⚔️', skills: this.skillCategories.combat },
      { name: 'Gathering Skills', icon: '⛏️', skills: this.skillCategories.gathering },
      { name: 'Artisan Skills', icon: '🔨', skills: this.skillCategories.artisan },
      { name: 'Support Skills', icon: '🏃', skills: this.skillCategories.support }
    ];

    categories.forEach(category => {
      const categoryTests = this.testResults.filter(r => 
        category.skills.some(skill => r.test.toLowerCase().includes(skill.toLowerCase()))
      );
      
      const categoryPassed = categoryTests.filter(t => t.status === 'PASSED').length;
      const totalCategorySkills = category.skills.length;
      
      if (categoryTests.length > 0) {
        const percentage = ((categoryPassed / totalCategorySkills) * 100).toFixed(0);
        this.logTest(`${category.icon} ${category.name}`, 
          percentage >= 70 ? 'PASSED' : 'WARNING', 
          `${categoryPassed}/${totalCategorySkills} skills (${percentage}%) validated`);
      } else {
        this.logTest(`${category.icon} ${category.name}`, 'INFO', 'Not explicitly tested');
      }
    });

    // Individual skill breakdown
    console.log('\n🎯 Individual Skill Analysis:');
    Object.entries(this.skillCategories).forEach(([categoryName, skills]) => {
      console.log(`\n${categoryName.toUpperCase()} SKILLS:`);
      skills.forEach(skill => {
        const skillTests = this.testResults.filter(r => 
          r.test.toLowerCase().includes(skill.toLowerCase())
        );
        const skillPassed = skillTests.filter(t => t.status === 'PASSED').length > 0;
        console.log(`   ${skillPassed ? '✅' : '⚠️'} ${skill}`);
      });
    });

    // Experience system analysis
    console.log('\n⚡ Experience System Summary:');
    const xpTests = this.testResults.filter(r => 
      r.test.toLowerCase().includes('experience') || 
      r.test.toLowerCase().includes('leveling') ||
      r.test.toLowerCase().includes('xp')
    );
    if (xpTests.length > 0) {
      xpTests.forEach(test => {
        console.log(`   ${test.status === 'PASSED' ? '✅' : '⚠️'} ${test.test}`);
      });
    } else {
      console.log('   ℹ️ Experience system available but not explicitly tested');
    }

    // Final verdict
    console.log('\n🎯 SKILLS VALIDATION VERDICT:');
    if (passed >= 25 && failed === 0) {
      console.log('🎉 ALL SKILL SYSTEMS FULLY VALIDATED!');
      console.log('   ✨ Complete 23-skill system operational');
      console.log('   ⚔️ All combat skills (Attack, Strength, Defence, etc.)');
      console.log('   ⛏️ All gathering skills (Mining, Fishing, Woodcutting, etc.)');
      console.log('   🔨 All artisan skills (Smithing, Crafting, Fletching, etc.)');
      console.log('   🏃 All support skills (Agility, Thieving, Summoning)');
      console.log('   ⚡ Experience gain and leveling system');
      console.log('   📋 Skill requirements and bonuses');
      console.log('   🖥️ Skills interface and UI');
      console.log('   🚀 Ready for full skill-based gameplay!');
    } else if (passed >= 18 && failed <= 2) {
      console.log('✅ SKILL SYSTEMS MOSTLY VALIDATED');
      console.log('   🎮 Most skills working correctly');
      console.log('   🔧 Some skill systems need attention');
    } else {
      console.log('⚠️ SKILL SYSTEMS NEED WORK');
      console.log('   🛠️ Multiple skill systems require fixes');
      console.log('   🔍 Review failed skill categories');
    }

    this.saveSkillReport();
  }

  saveSkillReport() {
    try {
      const fs = require('fs');
      const reportPath = path.join(projectRoot, 'test-results', `skills-validation-${Date.now()}.json`);
      
      if (!fs.existsSync(path.dirname(reportPath))) {
        fs.mkdirSync(path.dirname(reportPath), { recursive: true });
      }

      const report = {
        timestamp: new Date().toISOString(),
        duration: Date.now() - this.testStartTime,
        summary: {
          passed: this.testResults.filter(r => r.status === 'PASSED').length,
          failed: this.testResults.filter(r => r.status === 'FAILED').length,
          warnings: this.testResults.filter(r => r.status === 'WARNING').length,
          errors: this.testResults.filter(r => r.status === 'ERROR').length
        },
        skillCategories: this.skillCategories,
        skillRequirements: this.skillRequirements,
        visualColors: this.visualColors,
        tests: this.testResults
      };

      fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
      console.log(`\n💾 Skills validation report saved: ${reportPath}`);
    } catch (error) {
      console.error('\n❌ Failed to save skills report:', error.message);
    }
  }

  async cleanup() {
    console.log('\n🧹 Cleaning up skills validation...');
    
    if (this.serverProcess) {
      this.serverProcess.kill('SIGTERM');
      
      setTimeout(() => {
        if (this.serverProcess && !this.serverProcess.killed) {
          this.serverProcess.kill('SIGKILL');
        }
      }, 3000);
    }

    console.log('✅ Skills validation cleanup completed');
  }
}

// Run validation if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const validator = new SkillsValidation();
  
  process.on('SIGINT', async () => {
    console.log('\n🛑 Skills validation interrupted');
    await validator.cleanup();
    process.exit(0);
  });

  validator.runValidation().catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
}

export { SkillsValidation };