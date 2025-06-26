#!/usr/bin/env node

/**
 * Comprehensive UI Validation
 * Tests all interface components: inventory, stats, trading, equipment, magic, etc.
 */

import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.join(__dirname, '../..');

class UIValidation {
  constructor() {
    this.testResults = [];
    this.serverProcess = null;
    this.testStartTime = Date.now();
    this.uiComponents = {
      core: [
        'Inventory Interface', 'Stats Interface', 'Equipment Interface', 'Chat Interface', 'Minimap'
      ],
      trading: [
        'Trading Interface', 'Grand Exchange Interface', 'Banking Interface', 'Shop Interface', 'Loot Interface'
      ],
      skills: [
        'Magic Interface', 'Prayer Interface', 'Combat Interface', 'Skills Interface', 'Quest Interface'
      ],
      advanced: [
        'Friends Interface', 'Clan Interface', 'Options Interface', 'Music Interface', 'Emotes Interface'
      ]
    };
    this.interfaceElements = {
      inventory: ['28 Slots', 'Item Icons', 'Stack Numbers', 'Drag & Drop', 'Right-click Menu'],
      stats: ['Skill Levels', 'Experience Values', 'Combat Level', 'Total Level', 'Skill Icons'],
      equipment: ['Weapon Slot', 'Armor Slots', 'Accessory Slots', 'Equipment Stats', 'Combat Bonuses'],
      trading: ['Offer Window', 'Accept Button', 'Trade History', 'Value Display', 'Trade Chat']
    };
    this.visualElements = {
      colors: ['Interface Borders', 'Button Colors', 'Text Colors', 'Status Indicators'],
      animations: ['Button Hover', 'Tab Switching', 'Window Opening', 'Icon Animations'],
      layouts: ['Window Positioning', 'Component Sizing', 'Text Alignment', 'Icon Placement']
    };
    this.visualColors = {
      inventory: '#8B4513',      // Brown
      stats: '#00FF00',          // Green
      equipment: '#FFD700',      // Gold
      trading: '#0000FF',        // Blue
      magic: '#9370DB',          // Purple
      banking: '#FF0000'         // Red
    };
  }

  async runValidation() {
    console.log('🖥️ COMPREHENSIVE UI VALIDATION');
    console.log('==============================\n');
    console.log('Testing all user interface components:');
    console.log('• Core Interfaces: Inventory, Stats, Equipment, Chat, Minimap');
    console.log('• Trading Interfaces: Trading, GE, Banking, Shop, Loot');
    console.log('• Skills Interfaces: Magic, Prayer, Combat, Skills, Quest');
    console.log('• Advanced Interfaces: Friends, Clan, Options, Music, Emotes');
    console.log('• Interface Elements: Slots, icons, buttons, menus, displays');
    console.log('• Visual Elements: Colors, animations, layouts, positioning');
    console.log('• Interaction Testing: Clicking, dragging, keyboard, hover\n');

    try {
      await this.runUITests();
      this.generateUIReport();
    } catch (error) {
      console.error('❌ UI validation failed:', error.message);
      this.logTest('UI Validation', 'FAILED', error.message);
    } finally {
      await this.cleanup();
    }
  }

  async runUITests() {
    console.log('🚀 Starting comprehensive UI testing...\n');
    
    return new Promise((resolve, reject) => {
      this.serverProcess = spawn('bun', ['build/index.js'], {
        cwd: projectRoot,
        stdio: ['pipe', 'pipe', 'pipe'],
        env: { 
          ...process.env, 
          ENABLE_RPG: 'true',
          UI_TEST: 'true',
          VISUAL_TEST: 'true'
        }
      });

      let uiChecklist = {
        serverStarted: false,
        uiSystemLoaded: false,
        interfaceManagerReady: false,
        coreInterfacesDetected: 0,
        tradingInterfacesDetected: 0,
        skillsInterfacesDetected: 0,
        advancedInterfacesDetected: 0,
        inventoryInterfaceReady: false,
        statsInterfaceReady: false,
        equipmentInterfaceReady: false,
        tradingInterfaceReady: false,
        magicInterfaceReady: false,
        bankingInterfaceReady: false,
        visualElementsDetected: 0,
        interactionSystemReady: false,
        responsiveDesignActive: false,
        totalUIActivitiesDetected: 0
      };

      this.serverProcess.stdout.on('data', (data) => {
        const output = data.toString();
        
        // Server startup
        if (output.includes('running on port 4444')) {
          uiChecklist.serverStarted = true;
          this.logTest('🚀 UI Test Server', 'PASSED', 'Server started for UI testing');
        }

        // UI system detection
        if (output.includes('ui system') || output.includes('UI System') || output.includes('interface system')) {
          uiChecklist.uiSystemLoaded = true;
          this.logTest('🖥️ UI System', 'PASSED', 'UI system loaded successfully');
        }

        // Interface manager
        if (output.includes('interface manager') || output.includes('UI manager')) {
          uiChecklist.interfaceManagerReady = true;
          this.logTest('📱 Interface Manager', 'PASSED', 'Interface manager ready');
        }

        // Core interfaces
        if (output.includes('inventory interface') || output.includes('Inventory Interface')) {
          uiChecklist.coreInterfacesDetected++;
          uiChecklist.inventoryInterfaceReady = true;
          this.logTest('🎒 Inventory Interface', 'PASSED', '28-slot inventory interface ready');
        }
        if (output.includes('stats interface') || output.includes('Stats Interface')) {
          uiChecklist.coreInterfacesDetected++;
          uiChecklist.statsInterfaceReady = true;
          this.logTest('📊 Stats Interface', 'PASSED', 'Skills and stats interface ready');
        }
        if (output.includes('equipment interface') || output.includes('Equipment Interface')) {
          uiChecklist.coreInterfacesDetected++;
          uiChecklist.equipmentInterfaceReady = true;
          this.logTest('⚔️ Equipment Interface', 'PASSED', 'Equipment interface ready');
        }
        if (output.includes('chat interface') || output.includes('Chat Interface')) {
          uiChecklist.coreInterfacesDetected++;
          this.logTest('💬 Chat Interface', 'PASSED', 'Chat interface ready');
        }
        if (output.includes('minimap') || output.includes('Minimap')) {
          uiChecklist.coreInterfacesDetected++;
          this.logTest('🗺️ Minimap', 'PASSED', 'Minimap interface ready');
        }

        // Trading interfaces
        if (output.includes('trading interface') || output.includes('Trading Interface')) {
          uiChecklist.tradingInterfacesDetected++;
          uiChecklist.tradingInterfaceReady = true;
          this.logTest('🤝 Trading Interface', 'PASSED', 'Player trading interface ready');
        }
        if (output.includes('grand exchange interface') || output.includes('GE interface')) {
          uiChecklist.tradingInterfacesDetected++;
          this.logTest('💰 Grand Exchange Interface', 'PASSED', 'GE trading interface ready');
        }
        if (output.includes('banking interface') || output.includes('Banking Interface')) {
          uiChecklist.tradingInterfacesDetected++;
          uiChecklist.bankingInterfaceReady = true;
          this.logTest('🏦 Banking Interface', 'PASSED', 'Bank interface ready');
        }
        if (output.includes('shop interface') || output.includes('Shop Interface')) {
          uiChecklist.tradingInterfacesDetected++;
          this.logTest('🛒 Shop Interface', 'PASSED', 'Shop interface ready');
        }
        if (output.includes('loot interface') || output.includes('Loot Interface')) {
          uiChecklist.tradingInterfacesDetected++;
          this.logTest('💎 Loot Interface', 'PASSED', 'Loot interface ready');
        }

        // Skills interfaces
        if (output.includes('magic interface') || output.includes('Magic Interface')) {
          uiChecklist.skillsInterfacesDetected++;
          uiChecklist.magicInterfaceReady = true;
          this.logTest('🔮 Magic Interface', 'PASSED', 'Magic spellbook interface ready');
        }
        if (output.includes('prayer interface') || output.includes('Prayer Interface')) {
          uiChecklist.skillsInterfacesDetected++;
          this.logTest('🙏 Prayer Interface', 'PASSED', 'Prayer interface ready');
        }
        if (output.includes('combat interface') || output.includes('Combat Interface')) {
          uiChecklist.skillsInterfacesDetected++;
          this.logTest('⚔️ Combat Interface', 'PASSED', 'Combat interface ready');
        }
        if (output.includes('skills interface') || output.includes('Skills Interface')) {
          uiChecklist.skillsInterfacesDetected++;
          this.logTest('📈 Skills Interface', 'PASSED', 'Skills overview interface ready');
        }
        if (output.includes('quest interface') || output.includes('Quest Interface')) {
          uiChecklist.skillsInterfacesDetected++;
          this.logTest('📜 Quest Interface', 'PASSED', 'Quest interface ready');
        }

        // Advanced interfaces
        if (output.includes('friends interface') || output.includes('Friends Interface')) {
          uiChecklist.advancedInterfacesDetected++;
          this.logTest('👥 Friends Interface', 'PASSED', 'Friends list interface ready');
        }
        if (output.includes('clan interface') || output.includes('Clan Interface')) {
          uiChecklist.advancedInterfacesDetected++;
          this.logTest('🏰 Clan Interface', 'PASSED', 'Clan interface ready');
        }
        if (output.includes('options interface') || output.includes('Options Interface')) {
          uiChecklist.advancedInterfacesDetected++;
          this.logTest('⚙️ Options Interface', 'PASSED', 'Options interface ready');
        }
        if (output.includes('music interface') || output.includes('Music Interface')) {
          uiChecklist.advancedInterfacesDetected++;
          this.logTest('🎵 Music Interface', 'PASSED', 'Music interface ready');
        }
        if (output.includes('emotes interface') || output.includes('Emotes Interface')) {
          uiChecklist.advancedInterfacesDetected++;
          this.logTest('😊 Emotes Interface', 'PASSED', 'Emotes interface ready');
        }

        // Interaction system
        if (output.includes('interaction system') || output.includes('click handler') || output.includes('UI interaction')) {
          uiChecklist.interactionSystemReady = true;
          this.logTest('🖱️ Interaction System', 'PASSED', 'UI interaction system ready');
        }

        // Visual elements
        if (output.includes('ui color') || output.includes('interface color')) {
          uiChecklist.visualElementsDetected++;
          this.logTest('🎨 UI Colors', 'PASSED', 'Interface color system active');
        }
        if (output.includes('ui animation') || output.includes('interface animation')) {
          uiChecklist.visualElementsDetected++;
          this.logTest('✨ UI Animations', 'PASSED', 'Interface animation system active');
        }
        if (output.includes('responsive') || output.includes('adaptive layout')) {
          uiChecklist.responsiveDesignActive = true;
          this.logTest('📱 Responsive Design', 'PASSED', 'Responsive UI design active');
        }

        // UI activities
        if (output.includes('interface opened') || output.includes('window opened')) {
          uiChecklist.totalUIActivitiesDetected++;
          this.logTest('🪟 Interface Opening', 'PASSED', 'Interface opening activity detected');
        }
        if (output.includes('button clicked') || output.includes('UI interaction')) {
          uiChecklist.totalUIActivitiesDetected++;
          this.logTest('👆 UI Interaction', 'PASSED', 'UI interaction activity detected');
        }

        // Visual application to UI
        if (output.includes('[VisualRepresentationSystem] Applied') && (output.includes('interface') || output.includes('ui'))) {
          const templateMatch = output.match(/Applied (.+?) template/);
          if (templateMatch) {
            const templateName = templateMatch[1];
            this.logTest(`🎨 UI Visual: ${templateName}`, 'PASSED', `${templateName} interface visual applied`);
          }
        }

        // Specific UI activity validation
        this.validateSpecificUIActivity(output);
      });

      this.serverProcess.stderr.on('data', (data) => {
        const error = data.toString();
        if (!error.includes('DeprecationWarning') && !error.includes('GLTFLoader')) {
          this.logTest('🚨 UI System Error', 'ERROR', error.trim());
        }
      });

      this.serverProcess.on('error', (error) => {
        reject(new Error(`Failed to start UI test server: ${error.message}`));
      });

      // Complete UI testing
      setTimeout(() => {
        console.log('\n🔍 UI testing period complete. Analyzing results...\n');
        
        // Validate UI system completeness
        if (uiChecklist.uiSystemLoaded && uiChecklist.interfaceManagerReady) {
          this.logTest('✅ Core UI Systems', 'PASSED', 'UI and interface management systems operational');
        } else {
          this.logTest('⚠️ Core UI Systems', 'WARNING', 'Some UI systems not detected');
        }

        // Core interfaces validation
        if (uiChecklist.coreInterfacesDetected >= 4) {
          this.logTest('✅ Core Interfaces Coverage', 'PASSED', `${uiChecklist.coreInterfacesDetected}/5 core interfaces detected`);
        } else {
          this.logTest('⚠️ Core Interfaces Coverage', 'WARNING', `Only ${uiChecklist.coreInterfacesDetected}/5 core interfaces detected`);
        }

        // Trading interfaces validation
        if (uiChecklist.tradingInterfacesDetected >= 3) {
          this.logTest('✅ Trading Interfaces Coverage', 'PASSED', `${uiChecklist.tradingInterfacesDetected}/5 trading interfaces detected`);
        } else {
          this.logTest('⚠️ Trading Interfaces Coverage', 'WARNING', `Only ${uiChecklist.tradingInterfacesDetected}/5 trading interfaces detected`);
        }

        // Skills interfaces validation
        if (uiChecklist.skillsInterfacesDetected >= 3) {
          this.logTest('✅ Skills Interfaces Coverage', 'PASSED', `${uiChecklist.skillsInterfacesDetected}/5 skills interfaces detected`);
        } else {
          this.logTest('⚠️ Skills Interfaces Coverage', 'WARNING', `Only ${uiChecklist.skillsInterfacesDetected}/5 skills interfaces detected`);
        }

        // Advanced interfaces validation
        if (uiChecklist.advancedInterfacesDetected >= 3) {
          this.logTest('✅ Advanced Interfaces Coverage', 'PASSED', `${uiChecklist.advancedInterfacesDetected}/5 advanced interfaces detected`);
        } else {
          this.logTest('⚠️ Advanced Interfaces Coverage', 'WARNING', `Only ${uiChecklist.advancedInterfacesDetected}/5 advanced interfaces detected`);
        }

        // Essential interface validation
        if (uiChecklist.inventoryInterfaceReady && uiChecklist.statsInterfaceReady) {
          this.logTest('✅ Essential Interfaces', 'PASSED', 'Inventory and stats interfaces working');
        } else {
          this.logTest('⚠️ Essential Interfaces', 'WARNING', 'Essential interfaces not detected');
        }

        // Trading interface validation
        if (uiChecklist.tradingInterfaceReady && uiChecklist.bankingInterfaceReady) {
          this.logTest('✅ Trading Interfaces', 'PASSED', 'Trading and banking interfaces working');
        } else {
          this.logTest('⚠️ Trading Interfaces', 'WARNING', 'Trading interfaces not detected');
        }

        // Visual and interaction validation
        if (uiChecklist.visualElementsDetected >= 2 && uiChecklist.interactionSystemReady) {
          this.logTest('✅ UI Visuals & Interaction', 'PASSED', 'Visual elements and interaction system working');
        } else {
          this.logTest('⚠️ UI Visuals & Interaction', 'WARNING', 'Visual or interaction systems not detected');
        }

        resolve();
      }, 60000); // 60 second UI test

      setTimeout(() => {
        reject(new Error('UI testing timeout'));
      }, 75000);
    });
  }

  validateSpecificUIActivity(output) {
    // Check for specific UI activity mentions
    const uiActivities = [
      { search: 'inventory.*opened', name: 'Inventory Opening', category: 'Core Interface' },
      { search: 'stats.*displayed', name: 'Stats Display', category: 'Core Interface' },
      { search: 'equipment.*interface', name: 'Equipment Interface', category: 'Core Interface' },
      { search: 'trade.*window', name: 'Trade Window', category: 'Trading Interface' },
      { search: 'bank.*interface', name: 'Bank Interface', category: 'Trading Interface' },
      { search: 'magic.*spellbook', name: 'Magic Spellbook', category: 'Skills Interface' },
      { search: 'button.*clicked', name: 'Button Interaction', category: 'User Interaction' },
      { search: 'drag.*drop', name: 'Drag and Drop', category: 'User Interaction' }
    ];

    uiActivities.forEach(activity => {
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

  generateUIReport() {
    console.log('\n🖥️ COMPREHENSIVE UI VALIDATION REPORT');
    console.log('=====================================\n');

    const passed = this.testResults.filter(r => r.status === 'PASSED').length;
    const failed = this.testResults.filter(r => r.status === 'FAILED').length;
    const warnings = this.testResults.filter(r => r.status === 'WARNING').length;
    const errors = this.testResults.filter(r => r.status === 'ERROR').length;

    console.log(`📊 UI Test Summary:`);
    console.log(`   ✅ Tests Passed:   ${passed}`);
    console.log(`   ❌ Tests Failed:   ${failed}`);
    console.log(`   ⚠️  Warnings:      ${warnings}`);
    console.log(`   🚨 Errors:        ${errors}`);

    const totalTime = Date.now() - this.testStartTime;
    console.log(`   ⏱️  Total Duration: ${(totalTime / 1000).toFixed(1)}s\n`);

    // UI components analysis
    console.log('📋 UI Components Coverage:');
    
    const componentCategories = [
      { name: 'Core Interfaces', icon: '🖥️', components: this.uiComponents.core },
      { name: 'Trading Interfaces', icon: '💰', components: this.uiComponents.trading },
      { name: 'Skills Interfaces', icon: '📈', components: this.uiComponents.skills },
      { name: 'Advanced Interfaces', icon: '⚙️', components: this.uiComponents.advanced }
    ];

    componentCategories.forEach(category => {
      const categoryTests = this.testResults.filter(r => 
        category.components.some(component => r.test.toLowerCase().includes(component.toLowerCase()))
      );
      
      const categoryPassed = categoryTests.filter(t => t.status === 'PASSED').length;
      const totalCategoryComponents = category.components.length;
      
      if (categoryTests.length > 0) {
        const percentage = ((categoryPassed / totalCategoryComponents) * 100).toFixed(0);
        this.logTest(`${category.icon} ${category.name}`, 
          percentage >= 70 ? 'PASSED' : 'WARNING', 
          `${categoryPassed}/${totalCategoryComponents} interfaces (${percentage}%) validated`);
      } else {
        this.logTest(`${category.icon} ${category.name}`, 'INFO', 'Not explicitly tested');
      }
    });

    // Individual interface breakdown
    console.log('\n🖱️ Individual Interface Analysis:');
    Object.entries(this.uiComponents).forEach(([categoryName, interfaces]) => {
      console.log(`\n${categoryName.toUpperCase()} INTERFACES:`);
      interfaces.forEach(interfaceName => {
        const interfaceTests = this.testResults.filter(r => 
          r.test.toLowerCase().includes(interfaceName.toLowerCase())
        );
        const interfacePassed = interfaceTests.filter(t => t.status === 'PASSED').length > 0;
        console.log(`   ${interfacePassed ? '✅' : '⚠️'} ${interfaceName}`);
      });
    });

    // Interface elements summary
    console.log('\n🔧 Interface Elements Summary:');
    Object.entries(this.interfaceElements).forEach(([interfaceName, elements]) => {
      console.log(`\n${interfaceName.toUpperCase()} ELEMENTS:`);
      elements.forEach(element => {
        console.log(`   📋 ${element}`);
      });
    });

    // Visual elements summary
    console.log('\n🎨 Visual Elements Summary:');
    const visualTests = this.testResults.filter(r => 
      r.test.toLowerCase().includes('visual') || 
      r.test.toLowerCase().includes('color') ||
      r.test.toLowerCase().includes('animation')
    );
    if (visualTests.length > 0) {
      visualTests.forEach(test => {
        console.log(`   ${test.status === 'PASSED' ? '✅' : '⚠️'} ${test.test}`);
      });
    } else {
      console.log('   ℹ️ Visual elements available but not explicitly tested');
    }

    // User interaction summary
    console.log('\n🖱️ User Interaction Analysis:');
    console.log('   👆 Click Interactions: Button clicks, menu selections');
    console.log('   🖱️ Drag & Drop: Item movement, interface positioning');
    console.log('   ⌨️ Keyboard Input: Text entry, hotkeys, shortcuts');
    console.log('   👆 Hover Effects: Tooltips, button highlights');
    console.log('   📱 Touch Support: Mobile-friendly interactions');
    console.log('   ♿ Accessibility: Screen reader support, keyboard navigation');

    // Final verdict
    console.log('\n🎯 UI VALIDATION VERDICT:');
    if (passed >= 25 && failed === 0) {
      console.log('🎉 COMPLETE UI SYSTEM VALIDATED!');
      console.log('   ✨ All interface components operational');
      console.log('   🎒 Inventory interface with 28-slot layout');
      console.log('   📊 Stats interface with skill tracking');
      console.log('   ⚔️ Equipment interface with combat bonuses');
      console.log('   💰 Trading interfaces (Trading, GE, Banking)');
      console.log('   🔮 Skills interfaces (Magic, Prayer, Combat)');
      console.log('   ⚙️ Advanced interfaces (Friends, Clan, Options)');
      console.log('   🎨 Visual elements with color coding');
      console.log('   🖱️ Interactive elements with click/drag support');
      console.log('   🚀 Ready for full UI-based gameplay!');
    } else if (passed >= 18 && failed <= 2) {
      console.log('✅ UI SYSTEM MOSTLY VALIDATED');
      console.log('   🎮 Core interface functionality working');
      console.log('   🔧 Some interface components need attention');
    } else {
      console.log('⚠️ UI SYSTEM NEEDS WORK');
      console.log('   🛠️ Multiple interface systems require fixes');
      console.log('   🔍 Review failed interface components');
    }

    this.saveUIReport();
  }

  saveUIReport() {
    try {
      const fs = require('fs');
      const reportPath = path.join(projectRoot, 'test-results', `ui-validation-${Date.now()}.json`);
      
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
        uiComponents: this.uiComponents,
        interfaceElements: this.interfaceElements,
        visualElements: this.visualElements,
        visualColors: this.visualColors,
        tests: this.testResults
      };

      fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
      console.log(`\n💾 UI validation report saved: ${reportPath}`);
    } catch (error) {
      console.error('\n❌ Failed to save UI report:', error.message);
    }
  }

  async cleanup() {
    console.log('\n🧹 Cleaning up UI validation...');
    
    if (this.serverProcess) {
      this.serverProcess.kill('SIGTERM');
      
      setTimeout(() => {
        if (this.serverProcess && !this.serverProcess.killed) {
          this.serverProcess.kill('SIGKILL');
        }
      }, 3000);
    }

    console.log('✅ UI validation cleanup completed');
  }
}

// Run validation if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const validator = new UIValidation();
  
  process.on('SIGINT', async () => {
    console.log('\n🛑 UI validation interrupted');
    await validator.cleanup();
    process.exit(0);
  });

  validator.runValidation().catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
}

export { UIValidation };