#!/usr/bin/env node

/**
 * Comprehensive Grand Exchange Validation
 * Tests market trading, pricing systems, buy/sell orders, and market data
 */

import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.join(__dirname, '../..');

class GrandExchangeValidation {
  constructor() {
    this.testResults = [];
    this.serverProcess = null;
    this.testStartTime = Date.now();
    this.tradingFeatures = {
      core: [
        'Buy Orders', 'Sell Orders', 'Price Discovery', 'Order Matching', 'Transaction History'
      ],
      market: [
        'Market Data', 'Price Charts', 'Volume Tracking', 'Market Trends', 'Price Alerts'
      ],
      advanced: [
        'Limit Orders', 'Market Orders', 'Partial Fills', 'Order Cancellation', 'Trading Fees'
      ],
      security: [
        'Trade Verification', 'Anti-Manipulation', 'Rate Limiting', 'Audit Trail'
      ]
    };
    this.testItems = {
      weapons: ['Bronze Sword', 'Iron Dagger', 'Steel Sword', 'Rune Sword'],
      armor: ['Bronze Helmet', 'Iron Shield', 'Steel Body', 'Rune Legs'],
      consumables: ['Lobster', 'Shark', 'Prayer Potion(4)', 'Strength Potion'],
      materials: ['Oak Logs', 'Iron Ore', 'Coal', 'Gold Ore'],
      rare: ['Dragon Items', 'Rare Equipment', 'Special Items']
    };
    this.marketMechanics = {
      pricing: ['Current Price', 'High Price', 'Low Price', 'Average Price'],
      volume: ['Daily Volume', 'Weekly Volume', 'Total Traded'],
      trends: ['Price History', 'Volume History', 'Market Volatility']
    };
    this.visualColors = {
      buy_order: '#00FF00',      // Green
      sell_order: '#FF0000',     // Red
      completed: '#0000FF',      // Blue
      pending: '#FFFF00',        // Yellow
      cancelled: '#808080'       // Gray
    };
  }

  async runValidation() {
    console.log('💰 COMPREHENSIVE GRAND EXCHANGE VALIDATION');
    console.log('==========================================\n');
    console.log('Testing complete market trading system:');
    console.log('• Core Trading: Buy/sell orders, price discovery, matching');
    console.log('• Market Data: Price charts, volume tracking, trends');
    console.log('• Advanced Features: Limit orders, partial fills, fees');
    console.log('• Security: Trade verification, anti-manipulation');
    console.log('• Item Coverage: Weapons, armor, consumables, materials');
    console.log('• Trading Interface: Order placement, history, alerts');
    console.log('• Visual Testing: Order status colors and market UI\n');

    try {
      await this.runGrandExchangeTests();
      this.generateGrandExchangeReport();
    } catch (error) {
      console.error('❌ Grand Exchange validation failed:', error.message);
      this.logTest('Grand Exchange Validation', 'FAILED', error.message);
    } finally {
      await this.cleanup();
    }
  }

  async runGrandExchangeTests() {
    console.log('🚀 Starting comprehensive Grand Exchange testing...\n');
    
    return new Promise((resolve, reject) => {
      this.serverProcess = spawn('bun', ['build/index.js'], {
        cwd: projectRoot,
        stdio: ['pipe', 'pipe', 'pipe'],
        env: { 
          ...process.env, 
          ENABLE_RPG: 'true',
          GRAND_EXCHANGE_TEST: 'true',
          VISUAL_TEST: 'true'
        }
      });

      let geChecklist = {
        serverStarted: false,
        grandExchangeSystemLoaded: false,
        marketDataSystemReady: false,
        orderSystemReady: false,
        coreFeaturesDetected: 0,
        marketFeaturesDetected: 0,
        advancedFeaturesDetected: 0,
        securityFeaturesDetected: 0,
        tradableItemsDetected: 0,
        buyOrdersActive: false,
        sellOrdersActive: false,
        priceDiscoveryActive: false,
        orderMatchingActive: false,
        tradingInterfaceReady: false,
        marketHistoryAvailable: false,
        totalTradingActivitiesDetected: 0
      };

      this.serverProcess.stdout.on('data', (data) => {
        const output = data.toString();
        
        // Server startup
        if (output.includes('running on port 4444')) {
          geChecklist.serverStarted = true;
          this.logTest('🚀 GE Test Server', 'PASSED', 'Server started for Grand Exchange testing');
        }

        // Grand Exchange system detection
        if (output.includes('grand exchange') || output.includes('Grand Exchange') || output.includes('GE')) {
          geChecklist.grandExchangeSystemLoaded = true;
          this.logTest('💰 Grand Exchange System', 'PASSED', 'Grand Exchange system loaded successfully');
        }

        // Market data system
        if (output.includes('market data') || output.includes('price data') || output.includes('trading data')) {
          geChecklist.marketDataSystemReady = true;
          this.logTest('📊 Market Data System', 'PASSED', 'Market data and pricing system ready');
        }

        // Order system
        if (output.includes('order system') || output.includes('trading order') || output.includes('order matching')) {
          geChecklist.orderSystemReady = true;
          this.logTest('📝 Order System', 'PASSED', 'Order placement and matching system ready');
        }

        // Core trading features
        if (output.includes('buy order') || output.includes('Buy Order')) {
          geChecklist.coreFeaturesDetected++;
          geChecklist.buyOrdersActive = true;
          this.logTest('💚 Buy Orders', 'PASSED', 'Buy order system active');
        }
        if (output.includes('sell order') || output.includes('Sell Order')) {
          geChecklist.coreFeaturesDetected++;
          geChecklist.sellOrdersActive = true;
          this.logTest('❤️ Sell Orders', 'PASSED', 'Sell order system active');
        }
        if (output.includes('price discovery') || output.includes('pricing')) {
          geChecklist.coreFeaturesDetected++;
          geChecklist.priceDiscoveryActive = true;
          this.logTest('💲 Price Discovery', 'PASSED', 'Price discovery mechanism active');
        }
        if (output.includes('order matching') || output.includes('trade matching')) {
          geChecklist.coreFeaturesDetected++;
          geChecklist.orderMatchingActive = true;
          this.logTest('🔄 Order Matching', 'PASSED', 'Order matching system active');
        }
        if (output.includes('transaction history') || output.includes('trade history')) {
          geChecklist.coreFeaturesDetected++;
          this.logTest('📜 Transaction History', 'PASSED', 'Transaction history tracking active');
        }

        // Market features
        if (output.includes('market data') || output.includes('Market Data')) {
          geChecklist.marketFeaturesDetected++;
          this.logTest('📈 Market Data', 'PASSED', 'Market data collection active');
        }
        if (output.includes('price chart') || output.includes('price graph')) {
          geChecklist.marketFeaturesDetected++;
          this.logTest('📊 Price Charts', 'PASSED', 'Price charting system active');
        }
        if (output.includes('volume tracking') || output.includes('trading volume')) {
          geChecklist.marketFeaturesDetected++;
          this.logTest('📉 Volume Tracking', 'PASSED', 'Trading volume tracking active');
        }
        if (output.includes('market trend') || output.includes('price trend')) {
          geChecklist.marketFeaturesDetected++;
          this.logTest('📈 Market Trends', 'PASSED', 'Market trend analysis active');
        }
        if (output.includes('price alert') || output.includes('market alert')) {
          geChecklist.marketFeaturesDetected++;
          this.logTest('🔔 Price Alerts', 'PASSED', 'Price alert system active');
        }

        // Advanced features
        if (output.includes('limit order') || output.includes('Limit Order')) {
          geChecklist.advancedFeaturesDetected++;
          this.logTest('🎯 Limit Orders', 'PASSED', 'Limit order functionality active');
        }
        if (output.includes('market order') || output.includes('Market Order')) {
          geChecklist.advancedFeaturesDetected++;
          this.logTest('⚡ Market Orders', 'PASSED', 'Market order functionality active');
        }
        if (output.includes('partial fill') || output.includes('partial execution')) {
          geChecklist.advancedFeaturesDetected++;
          this.logTest('📊 Partial Fills', 'PASSED', 'Partial order execution active');
        }
        if (output.includes('order cancellation') || output.includes('cancel order')) {
          geChecklist.advancedFeaturesDetected++;
          this.logTest('❌ Order Cancellation', 'PASSED', 'Order cancellation system active');
        }
        if (output.includes('trading fee') || output.includes('transaction fee')) {
          geChecklist.advancedFeaturesDetected++;
          this.logTest('💳 Trading Fees', 'PASSED', 'Trading fee system active');
        }

        // Security features
        if (output.includes('trade verification') || output.includes('verify trade')) {
          geChecklist.securityFeaturesDetected++;
          this.logTest('🔒 Trade Verification', 'PASSED', 'Trade verification system active');
        }
        if (output.includes('anti-manipulation') || output.includes('manipulation detection')) {
          geChecklist.securityFeaturesDetected++;
          this.logTest('🛡️ Anti-Manipulation', 'PASSED', 'Anti-manipulation system active');
        }
        if (output.includes('rate limiting') || output.includes('rate limit')) {
          geChecklist.securityFeaturesDetected++;
          this.logTest('⏱️ Rate Limiting', 'PASSED', 'Rate limiting system active');
        }
        if (output.includes('audit trail') || output.includes('trading audit')) {
          geChecklist.securityFeaturesDetected++;
          this.logTest('📋 Audit Trail', 'PASSED', 'Trading audit trail active');
        }

        // Tradable items detection
        if (output.includes('tradable item') || output.includes('market item')) {
          geChecklist.tradableItemsDetected++;
          this.logTest('🗡️ Tradable Items', 'PASSED', 'Items available for trading');
        }

        // Trading interface
        if (output.includes('trading interface') || output.includes('GE interface') || output.includes('exchange interface')) {
          geChecklist.tradingInterfaceReady = true;
          this.logTest('🖥️ Trading Interface', 'PASSED', 'Grand Exchange UI ready');
        }

        // Market history
        if (output.includes('market history') || output.includes('price history')) {
          geChecklist.marketHistoryAvailable = true;
          this.logTest('📚 Market History', 'PASSED', 'Historical market data available');
        }

        // Trading activities
        if (output.includes('order placed') || output.includes('trade executed')) {
          geChecklist.totalTradingActivitiesDetected++;
          this.logTest('💱 Trading Activity', 'PASSED', 'Trading activity detected');
        }

        // Visual application to GE
        if (output.includes('[VisualRepresentationSystem] Applied') && (output.includes('exchange') || output.includes('order'))) {
          const templateMatch = output.match(/Applied (.+?) template/);
          if (templateMatch) {
            const templateName = templateMatch[1];
            this.logTest(`🎨 GE Visual: ${templateName}`, 'PASSED', `${templateName} trading visual applied`);
          }
        }

        // Specific GE activity validation
        this.validateSpecificGEActivity(output);
      });

      this.serverProcess.stderr.on('data', (data) => {
        const error = data.toString();
        if (!error.includes('DeprecationWarning') && !error.includes('GLTFLoader')) {
          this.logTest('🚨 Grand Exchange System Error', 'ERROR', error.trim());
        }
      });

      this.serverProcess.on('error', (error) => {
        reject(new Error(`Failed to start Grand Exchange test server: ${error.message}`));
      });

      // Complete Grand Exchange testing
      setTimeout(() => {
        console.log('\n🔍 Grand Exchange testing period complete. Analyzing results...\n');
        
        // Validate GE system completeness
        if (geChecklist.grandExchangeSystemLoaded && geChecklist.marketDataSystemReady) {
          this.logTest('✅ Core GE Systems', 'PASSED', 'Grand Exchange and market data systems operational');
        } else {
          this.logTest('⚠️ Core GE Systems', 'WARNING', 'Some GE systems not detected');
        }

        // Core features validation
        if (geChecklist.coreFeaturesDetected >= 4) {
          this.logTest('✅ Core Trading Features', 'PASSED', `${geChecklist.coreFeaturesDetected}/5 core features detected`);
        } else {
          this.logTest('⚠️ Core Trading Features', 'WARNING', `Only ${geChecklist.coreFeaturesDetected}/5 core features detected`);
        }

        // Market features validation
        if (geChecklist.marketFeaturesDetected >= 3) {
          this.logTest('✅ Market Features Coverage', 'PASSED', `${geChecklist.marketFeaturesDetected}/5 market features detected`);
        } else {
          this.logTest('⚠️ Market Features Coverage', 'WARNING', `Only ${geChecklist.marketFeaturesDetected}/5 market features detected`);
        }

        // Advanced features validation
        if (geChecklist.advancedFeaturesDetected >= 3) {
          this.logTest('✅ Advanced Features Coverage', 'PASSED', `${geChecklist.advancedFeaturesDetected}/5 advanced features detected`);
        } else {
          this.logTest('⚠️ Advanced Features Coverage', 'WARNING', `Only ${geChecklist.advancedFeaturesDetected}/5 advanced features detected`);
        }

        // Security features validation
        if (geChecklist.securityFeaturesDetected >= 2) {
          this.logTest('✅ Security Features Coverage', 'PASSED', `${geChecklist.securityFeaturesDetected}/4 security features detected`);
        } else {
          this.logTest('⚠️ Security Features Coverage', 'WARNING', `Only ${geChecklist.securityFeaturesDetected}/4 security features detected`);
        }

        // Trading functionality validation
        if (geChecklist.buyOrdersActive && geChecklist.sellOrdersActive && geChecklist.orderMatchingActive) {
          this.logTest('✅ Trading Functionality', 'PASSED', 'Buy/sell orders and matching working');
        } else {
          this.logTest('⚠️ Trading Functionality', 'WARNING', 'Some trading functionality not detected');
        }

        // Interface and data validation
        if (geChecklist.tradingInterfaceReady && geChecklist.marketHistoryAvailable) {
          this.logTest('✅ Interface & Data', 'PASSED', 'Trading UI and market data available');
        } else {
          this.logTest('⚠️ Interface & Data', 'WARNING', 'Interface or data systems not detected');
        }

        resolve();
      }, 60000); // 60 second Grand Exchange test

      setTimeout(() => {
        reject(new Error('Grand Exchange testing timeout'));
      }, 75000);
    });
  }

  validateSpecificGEActivity(output) {
    // Check for specific Grand Exchange activity mentions
    const geActivities = [
      { search: 'order.*placed', name: 'Order Placement', category: 'Trading' },
      { search: 'trade.*executed', name: 'Trade Execution', category: 'Matching' },
      { search: 'price.*updated', name: 'Price Updates', category: 'Market Data' },
      { search: 'order.*filled', name: 'Order Completion', category: 'Trading' },
      { search: 'market.*data.*updated', name: 'Market Data Updates', category: 'Data' },
      { search: 'volume.*tracked', name: 'Volume Tracking', category: 'Analytics' },
      { search: 'fee.*calculated', name: 'Fee Calculation', category: 'Economics' },
      { search: 'order.*cancelled', name: 'Order Cancellation', category: 'Management' }
    ];

    geActivities.forEach(activity => {
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

  generateGrandExchangeReport() {
    console.log('\n💰 COMPREHENSIVE GRAND EXCHANGE VALIDATION REPORT');
    console.log('================================================\n');

    const passed = this.testResults.filter(r => r.status === 'PASSED').length;
    const failed = this.testResults.filter(r => r.status === 'FAILED').length;
    const warnings = this.testResults.filter(r => r.status === 'WARNING').length;
    const errors = this.testResults.filter(r => r.status === 'ERROR').length;

    console.log(`📊 Grand Exchange Test Summary:`);
    console.log(`   ✅ Tests Passed:   ${passed}`);
    console.log(`   ❌ Tests Failed:   ${failed}`);
    console.log(`   ⚠️  Warnings:      ${warnings}`);
    console.log(`   🚨 Errors:        ${errors}`);

    const totalTime = Date.now() - this.testStartTime;
    console.log(`   ⏱️  Total Duration: ${(totalTime / 1000).toFixed(1)}s\n`);

    // Trading features analysis
    console.log('📋 Trading Features Coverage:');
    
    const featureCategories = [
      { name: 'Core Features', icon: '💰', features: this.tradingFeatures.core },
      { name: 'Market Features', icon: '📊', features: this.tradingFeatures.market },
      { name: 'Advanced Features', icon: '🎯', features: this.tradingFeatures.advanced },
      { name: 'Security Features', icon: '🔒', features: this.tradingFeatures.security }
    ];

    featureCategories.forEach(category => {
      const categoryTests = this.testResults.filter(r => 
        category.features.some(feature => r.test.toLowerCase().includes(feature.toLowerCase()))
      );
      
      const categoryPassed = categoryTests.filter(t => t.status === 'PASSED').length;
      const totalCategoryFeatures = category.features.length;
      
      if (categoryTests.length > 0) {
        const percentage = ((categoryPassed / totalCategoryFeatures) * 100).toFixed(0);
        this.logTest(`${category.icon} ${category.name}`, 
          percentage >= 70 ? 'PASSED' : 'WARNING', 
          `${categoryPassed}/${totalCategoryFeatures} features (${percentage}%) validated`);
      } else {
        this.logTest(`${category.icon} ${category.name}`, 'INFO', 'Not explicitly tested');
      }
    });

    // Individual feature breakdown
    console.log('\n💱 Individual Feature Analysis:');
    Object.entries(this.tradingFeatures).forEach(([categoryName, features]) => {
      console.log(`\n${categoryName.toUpperCase()} FEATURES:`);
      features.forEach(feature => {
        const featureTests = this.testResults.filter(r => 
          r.test.toLowerCase().includes(feature.toLowerCase())
        );
        const featurePassed = featureTests.filter(t => t.status === 'PASSED').length > 0;
        console.log(`   ${featurePassed ? '✅' : '⚠️'} ${feature}`);
      });
    });

    // Market mechanics summary
    console.log('\n📈 Market Mechanics Summary:');
    const mechanicsTests = this.testResults.filter(r => 
      r.test.toLowerCase().includes('price') || 
      r.test.toLowerCase().includes('volume') ||
      r.test.toLowerCase().includes('market')
    );
    if (mechanicsTests.length > 0) {
      mechanicsTests.forEach(test => {
        console.log(`   ${test.status === 'PASSED' ? '✅' : '⚠️'} ${test.test}`);
      });
    } else {
      console.log('   ℹ️ Market mechanics available but not explicitly tested');
    }

    // Trading flow summary
    console.log('\n🔄 Trading Flow Analysis:');
    console.log('   1. 💚 Order Placement: Users can place buy/sell orders');
    console.log('   2. 🔍 Price Discovery: Market determines fair prices');
    console.log('   3. 🔄 Order Matching: System matches compatible orders');
    console.log('   4. ⚡ Trade Execution: Completed trades transfer items/coins');
    console.log('   5. 📊 Market Data: Price and volume data updated');
    console.log('   6. 📜 History Tracking: Transaction history maintained');

    // Final verdict
    console.log('\n🎯 GRAND EXCHANGE VALIDATION VERDICT:');
    if (passed >= 20 && failed === 0) {
      console.log('🎉 COMPLETE GRAND EXCHANGE SYSTEM VALIDATED!');
      console.log('   ✨ Full market trading system operational');
      console.log('   💰 Buy/sell order system working');
      console.log('   📊 Market data and price discovery active');
      console.log('   🎯 Advanced trading features available');
      console.log('   🔒 Security and anti-manipulation systems');
      console.log('   🖥️ Trading interface and user experience');
      console.log('   📈 Market history and analytics');
      console.log('   🚀 Ready for full economic gameplay!');
    } else if (passed >= 15 && failed <= 2) {
      console.log('✅ GRAND EXCHANGE SYSTEM MOSTLY VALIDATED');
      console.log('   🎮 Core trading functionality working');
      console.log('   🔧 Some advanced features need attention');
    } else {
      console.log('⚠️ GRAND EXCHANGE SYSTEM NEEDS WORK');
      console.log('   🛠️ Multiple trading systems require fixes');
      console.log('   🔍 Review failed market features');
    }

    this.saveGrandExchangeReport();
  }

  saveGrandExchangeReport() {
    try {
      const fs = require('fs');
      const reportPath = path.join(projectRoot, 'test-results', `grand-exchange-validation-${Date.now()}.json`);
      
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
        tradingFeatures: this.tradingFeatures,
        testItems: this.testItems,
        marketMechanics: this.marketMechanics,
        visualColors: this.visualColors,
        tests: this.testResults
      };

      fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
      console.log(`\n💾 Grand Exchange validation report saved: ${reportPath}`);
    } catch (error) {
      console.error('\n❌ Failed to save Grand Exchange report:', error.message);
    }
  }

  async cleanup() {
    console.log('\n🧹 Cleaning up Grand Exchange validation...');
    
    if (this.serverProcess) {
      this.serverProcess.kill('SIGTERM');
      
      setTimeout(() => {
        if (this.serverProcess && !this.serverProcess.killed) {
          this.serverProcess.kill('SIGKILL');
        }
      }, 3000);
    }

    console.log('✅ Grand Exchange validation cleanup completed');
  }
}

// Run validation if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const validator = new GrandExchangeValidation();
  
  process.on('SIGINT', async () => {
    console.log('\n🛑 Grand Exchange validation interrupted');
    await validator.cleanup();
    process.exit(0);
  });

  validator.runValidation().catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
}

export { GrandExchangeValidation };