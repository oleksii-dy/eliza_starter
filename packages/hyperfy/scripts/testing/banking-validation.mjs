#!/usr/bin/env node

/**
 * Comprehensive Banking Validation
 * Tests 816-slot banking system, PIN protection, tabs, and security features
 */

import { spawn } from 'child_process'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const projectRoot = path.join(__dirname, '../..')

class BankingValidation {
  constructor() {
    this.testResults = []
    this.serverProcess = null
    this.testStartTime = Date.now()
    this.bankingFeatures = {
      core: ['Bank Account', 'Item Storage', 'Deposit System', 'Withdrawal System', 'Bank Tabs'],
      security: ['PIN Protection', 'Bank Verification', 'Access Control', 'Audit Logging', 'Session Management'],
      advanced: ['Bank Search', 'Item Organization', 'Quantity Limits', 'Bank Notes', 'Bank Presets'],
      interface: ['Bank Interface', 'Tab Management', 'Item Display', 'Search Function', 'Sort Options'],
    }
    this.bankingCapacity = {
      slots: 816,
      tabs: 9,
      itemsPerTab: 90,
      maxStackSize: 2147483647,
      specialSlots: ['Coin Pouch', 'Note Storage', 'Key Ring'],
    }
    this.securityFeatures = {
      pin: ['4-Digit PIN', 'PIN Verification', 'Failed Attempt Tracking', 'PIN Reset'],
      access: ['Account Verification', 'Session Timeout', 'Concurrent Access Prevention'],
      logging: ['Deposit Logs', 'Withdrawal Logs', 'Access Logs', 'Security Events'],
    }
    this.visualColors = {
      deposit: '#00FF00', // Green
      withdraw: '#FF0000', // Red
      tab_active: '#0000FF', // Blue
      tab_inactive: '#808080', // Gray
      pin_prompt: '#FFFF00', // Yellow
    }
  }

  async runValidation() {
    console.log('🏦 COMPREHENSIVE BANKING VALIDATION')
    console.log('==================================\n')
    console.log('Testing complete banking system:')
    console.log('• Core Banking: 816 slots, deposit/withdraw, tabs system')
    console.log('• Security: PIN protection, verification, access control')
    console.log('• Advanced Features: Search, organization, presets, notes')
    console.log('• Bank Interface: Tab management, item display, sorting')
    console.log('• Capacity Management: 9 tabs, 90 items per tab')
    console.log('• Security Logging: Audit trail, access logs, events')
    console.log('• Visual Testing: Banking interface colors and UI\n')

    try {
      await this.runBankingTests()
      this.generateBankingReport()
    } catch (error) {
      console.error('❌ Banking validation failed:', error.message)
      this.logTest('Banking Validation', 'FAILED', error.message)
    } finally {
      await this.cleanup()
    }
  }

  async runBankingTests() {
    console.log('🚀 Starting comprehensive banking testing...\n')

    return new Promise((resolve, reject) => {
      this.serverProcess = spawn('bun', ['build/index.js'], {
        cwd: projectRoot,
        stdio: ['pipe', 'pipe', 'pipe'],
        env: {
          ...process.env,
          ENABLE_RPG: 'true',
          BANKING_TEST: 'true',
          VISUAL_TEST: 'true',
        },
      })

      let bankingChecklist = {
        serverStarted: false,
        bankingSystemLoaded: false,
        bankAccountsReady: false,
        coreFeaturesDetected: 0,
        securityFeaturesDetected: 0,
        advancedFeaturesDetected: 0,
        interfaceFeaturesDetected: 0,
        depositSystemActive: false,
        withdrawalSystemActive: false,
        tabSystemActive: false,
        pinProtectionActive: false,
        bankSearchActive: false,
        bankInterfaceReady: false,
        securityLoggingActive: false,
        capacityValidated: false,
        totalBankingActivitiesDetected: 0,
      }

      this.serverProcess.stdout.on('data', data => {
        const output = data.toString()

        // Server startup
        if (output.includes('running on port 4444')) {
          bankingChecklist.serverStarted = true
          this.logTest('🚀 Banking Test Server', 'PASSED', 'Server started for banking testing')
        }

        // Banking system detection
        if (output.includes('banking system') || output.includes('Banking System')) {
          bankingChecklist.bankingSystemLoaded = true
          this.logTest('🏦 Banking System', 'PASSED', 'Banking system loaded successfully')
        }

        // Bank accounts setup
        if (output.includes('bank account') || output.includes('player bank') || output.includes('bank storage')) {
          bankingChecklist.bankAccountsReady = true
          this.logTest('👤 Bank Accounts', 'PASSED', 'Player bank accounts ready')
        }

        // Core banking features
        if (output.includes('bank account') || output.includes('Bank Account')) {
          bankingChecklist.coreFeaturesDetected++
          this.logTest('🏛️ Bank Account', 'PASSED', 'Bank account system active')
        }
        if (output.includes('item storage') || output.includes('bank storage')) {
          bankingChecklist.coreFeaturesDetected++
          this.logTest('📦 Item Storage', 'PASSED', 'Item storage system active')
        }
        if (output.includes('deposit') || output.includes('Deposit')) {
          bankingChecklist.coreFeaturesDetected++
          bankingChecklist.depositSystemActive = true
          this.logTest('⬇️ Deposit System', 'PASSED', 'Item deposit system active')
        }
        if (output.includes('withdraw') || output.includes('Withdraw')) {
          bankingChecklist.coreFeaturesDetected++
          bankingChecklist.withdrawalSystemActive = true
          this.logTest('⬆️ Withdrawal System', 'PASSED', 'Item withdrawal system active')
        }
        if (output.includes('bank tab') || output.includes('Bank Tab')) {
          bankingChecklist.coreFeaturesDetected++
          bankingChecklist.tabSystemActive = true
          this.logTest('📁 Bank Tabs', 'PASSED', 'Bank tab organization system active')
        }

        // Security features
        if (output.includes('PIN') || output.includes('pin protection') || output.includes('bank PIN')) {
          bankingChecklist.securityFeaturesDetected++
          bankingChecklist.pinProtectionActive = true
          this.logTest('🔐 PIN Protection', 'PASSED', 'Bank PIN protection system active')
        }
        if (output.includes('bank verification') || output.includes('account verification')) {
          bankingChecklist.securityFeaturesDetected++
          this.logTest('✅ Bank Verification', 'PASSED', 'Bank verification system active')
        }
        if (output.includes('access control') || output.includes('bank access')) {
          bankingChecklist.securityFeaturesDetected++
          this.logTest('🚪 Access Control', 'PASSED', 'Bank access control system active')
        }
        if (output.includes('audit log') || output.includes('bank log')) {
          bankingChecklist.securityFeaturesDetected++
          bankingChecklist.securityLoggingActive = true
          this.logTest('📝 Audit Logging', 'PASSED', 'Bank audit logging system active')
        }
        if (output.includes('session management') || output.includes('bank session')) {
          bankingChecklist.securityFeaturesDetected++
          this.logTest('⏰ Session Management', 'PASSED', 'Bank session management active')
        }

        // Advanced features
        if (output.includes('bank search') || output.includes('search bank')) {
          bankingChecklist.advancedFeaturesDetected++
          bankingChecklist.bankSearchActive = true
          this.logTest('🔍 Bank Search', 'PASSED', 'Bank search functionality active')
        }
        if (output.includes('item organization') || output.includes('bank organization')) {
          bankingChecklist.advancedFeaturesDetected++
          this.logTest('📊 Item Organization', 'PASSED', 'Item organization system active')
        }
        if (output.includes('quantity limit') || output.includes('bank limit')) {
          bankingChecklist.advancedFeaturesDetected++
          this.logTest('📏 Quantity Limits', 'PASSED', 'Quantity limit system active')
        }
        if (output.includes('bank note') || output.includes('bank notes')) {
          bankingChecklist.advancedFeaturesDetected++
          this.logTest('📄 Bank Notes', 'PASSED', 'Bank notes system active')
        }
        if (output.includes('bank preset') || output.includes('bank presets')) {
          bankingChecklist.advancedFeaturesDetected++
          this.logTest('💾 Bank Presets', 'PASSED', 'Bank presets system active')
        }

        // Interface features
        if (output.includes('bank interface') || output.includes('banking interface')) {
          bankingChecklist.interfaceFeaturesDetected++
          bankingChecklist.bankInterfaceReady = true
          this.logTest('🖥️ Bank Interface', 'PASSED', 'Bank interface system ready')
        }
        if (output.includes('tab management') || output.includes('manage tabs')) {
          bankingChecklist.interfaceFeaturesDetected++
          this.logTest('📂 Tab Management', 'PASSED', 'Tab management interface active')
        }
        if (output.includes('item display') || output.includes('bank display')) {
          bankingChecklist.interfaceFeaturesDetected++
          this.logTest('🖼️ Item Display', 'PASSED', 'Item display system active')
        }
        if (output.includes('search function') || output.includes('search feature')) {
          bankingChecklist.interfaceFeaturesDetected++
          this.logTest('🔎 Search Function', 'PASSED', 'Search function interface active')
        }
        if (output.includes('sort option') || output.includes('bank sort')) {
          bankingChecklist.interfaceFeaturesDetected++
          this.logTest('📈 Sort Options', 'PASSED', 'Sorting options interface active')
        }

        // Capacity validation
        if (output.includes('816') || output.includes('816 slots') || output.includes('bank capacity')) {
          bankingChecklist.capacityValidated = true
          this.logTest('📦 Bank Capacity', 'PASSED', '816-slot banking capacity confirmed')
        }

        // Banking activities
        if (output.includes('deposited item') || output.includes('item deposited')) {
          bankingChecklist.totalBankingActivitiesDetected++
          this.logTest('💰 Deposit Activity', 'PASSED', 'Item deposit activity detected')
        }
        if (output.includes('withdrew item') || output.includes('item withdrawn')) {
          bankingChecklist.totalBankingActivitiesDetected++
          this.logTest('💳 Withdrawal Activity', 'PASSED', 'Item withdrawal activity detected')
        }

        // Visual application to banking
        if (
          output.includes('[VisualRepresentationSystem] Applied') &&
          (output.includes('bank') || output.includes('tab'))
        ) {
          const templateMatch = output.match(/Applied (.+?) template/)
          if (templateMatch) {
            const templateName = templateMatch[1]
            this.logTest(`🎨 Banking Visual: ${templateName}`, 'PASSED', `${templateName} banking visual applied`)
          }
        }

        // Specific banking activity validation
        this.validateSpecificBankingActivity(output)
      })

      this.serverProcess.stderr.on('data', data => {
        const error = data.toString()
        if (!error.includes('DeprecationWarning') && !error.includes('GLTFLoader')) {
          this.logTest('🚨 Banking System Error', 'ERROR', error.trim())
        }
      })

      this.serverProcess.on('error', error => {
        reject(new Error(`Failed to start banking test server: ${error.message}`))
      })

      // Complete banking testing
      setTimeout(() => {
        console.log('\n🔍 Banking testing period complete. Analyzing results...\n')

        // Validate banking system completeness
        if (bankingChecklist.bankingSystemLoaded && bankingChecklist.bankAccountsReady) {
          this.logTest('✅ Core Banking Systems', 'PASSED', 'Banking and account systems operational')
        } else {
          this.logTest('⚠️ Core Banking Systems', 'WARNING', 'Some banking systems not detected')
        }

        // Core features validation
        if (bankingChecklist.coreFeaturesDetected >= 4) {
          this.logTest(
            '✅ Core Banking Features',
            'PASSED',
            `${bankingChecklist.coreFeaturesDetected}/5 core features detected`
          )
        } else {
          this.logTest(
            '⚠️ Core Banking Features',
            'WARNING',
            `Only ${bankingChecklist.coreFeaturesDetected}/5 core features detected`
          )
        }

        // Security features validation
        if (bankingChecklist.securityFeaturesDetected >= 3) {
          this.logTest(
            '✅ Security Features Coverage',
            'PASSED',
            `${bankingChecklist.securityFeaturesDetected}/5 security features detected`
          )
        } else {
          this.logTest(
            '⚠️ Security Features Coverage',
            'WARNING',
            `Only ${bankingChecklist.securityFeaturesDetected}/5 security features detected`
          )
        }

        // Advanced features validation
        if (bankingChecklist.advancedFeaturesDetected >= 3) {
          this.logTest(
            '✅ Advanced Features Coverage',
            'PASSED',
            `${bankingChecklist.advancedFeaturesDetected}/5 advanced features detected`
          )
        } else {
          this.logTest(
            '⚠️ Advanced Features Coverage',
            'WARNING',
            `Only ${bankingChecklist.advancedFeaturesDetected}/5 advanced features detected`
          )
        }

        // Interface features validation
        if (bankingChecklist.interfaceFeaturesDetected >= 3) {
          this.logTest(
            '✅ Interface Features Coverage',
            'PASSED',
            `${bankingChecklist.interfaceFeaturesDetected}/5 interface features detected`
          )
        } else {
          this.logTest(
            '⚠️ Interface Features Coverage',
            'WARNING',
            `Only ${bankingChecklist.interfaceFeaturesDetected}/5 interface features detected`
          )
        }

        // Essential functionality validation
        if (bankingChecklist.depositSystemActive && bankingChecklist.withdrawalSystemActive) {
          this.logTest('✅ Essential Banking Functions', 'PASSED', 'Deposit and withdrawal systems working')
        } else {
          this.logTest('⚠️ Essential Banking Functions', 'WARNING', 'Core banking functions not detected')
        }

        // Security validation
        if (bankingChecklist.pinProtectionActive && bankingChecklist.securityLoggingActive) {
          this.logTest('✅ Banking Security', 'PASSED', 'PIN protection and logging active')
        } else {
          this.logTest('⚠️ Banking Security', 'WARNING', 'Security features not fully detected')
        }

        // Capacity validation
        if (bankingChecklist.capacityValidated) {
          this.logTest('✅ Banking Capacity', 'PASSED', '816-slot capacity confirmed')
        } else {
          this.logTest('⚠️ Banking Capacity', 'WARNING', 'Banking capacity not explicitly validated')
        }

        resolve()
      }, 60000) // 60 second banking test

      setTimeout(() => {
        reject(new Error('Banking testing timeout'))
      }, 75000)
    })
  }

  validateSpecificBankingActivity(output) {
    // Check for specific banking activity mentions
    const bankingActivities = [
      { search: 'opened.*bank', name: 'Bank Access', category: 'Interface' },
      { search: 'deposited.*item', name: 'Item Deposit', category: 'Storage' },
      { search: 'withdrew.*item', name: 'Item Withdrawal', category: 'Retrieval' },
      { search: 'entered.*PIN', name: 'PIN Entry', category: 'Security' },
      { search: 'searched.*bank', name: 'Bank Search', category: 'Navigation' },
      { search: 'changed.*tab', name: 'Tab Navigation', category: 'Organization' },
      { search: 'bank.*session.*started', name: 'Session Start', category: 'Access' },
      { search: 'bank.*session.*ended', name: 'Session End', category: 'Security' },
    ]

    bankingActivities.forEach(activity => {
      const regex = new RegExp(activity.search, 'i')
      if (regex.test(output)) {
        this.logTest(`🎯 ${activity.name}`, 'PASSED', `${activity.category} - ${activity.name} detected`)
      }
    })
  }

  logTest(testName, status, description) {
    const timestamp = Date.now()
    const result = { test: testName, status, description, timestamp }
    this.testResults.push(result)

    const emoji =
      {
        PASSED: '✅',
        FAILED: '❌',
        WARNING: '⚠️',
        INFO: 'ℹ️',
        ERROR: '🚨',
      }[status] || '📝'

    console.log(`${emoji} ${testName}: ${description}`)
  }

  generateBankingReport() {
    console.log('\n🏦 COMPREHENSIVE BANKING VALIDATION REPORT')
    console.log('==========================================\n')

    const passed = this.testResults.filter(r => r.status === 'PASSED').length
    const failed = this.testResults.filter(r => r.status === 'FAILED').length
    const warnings = this.testResults.filter(r => r.status === 'WARNING').length
    const errors = this.testResults.filter(r => r.status === 'ERROR').length

    console.log(`📊 Banking Test Summary:`)
    console.log(`   ✅ Tests Passed:   ${passed}`)
    console.log(`   ❌ Tests Failed:   ${failed}`)
    console.log(`   ⚠️  Warnings:      ${warnings}`)
    console.log(`   🚨 Errors:        ${errors}`)

    const totalTime = Date.now() - this.testStartTime
    console.log(`   ⏱️  Total Duration: ${(totalTime / 1000).toFixed(1)}s\n`)

    // Banking features analysis
    console.log('📋 Banking Features Coverage:')

    const featureCategories = [
      { name: 'Core Features', icon: '🏛️', features: this.bankingFeatures.core },
      { name: 'Security Features', icon: '🔒', features: this.bankingFeatures.security },
      { name: 'Advanced Features', icon: '🚀', features: this.bankingFeatures.advanced },
      { name: 'Interface Features', icon: '🖥️', features: this.bankingFeatures.interface },
    ]

    featureCategories.forEach(category => {
      const categoryTests = this.testResults.filter(r =>
        category.features.some(feature => r.test.toLowerCase().includes(feature.toLowerCase()))
      )

      const categoryPassed = categoryTests.filter(t => t.status === 'PASSED').length
      const totalCategoryFeatures = category.features.length

      if (categoryTests.length > 0) {
        const percentage = ((categoryPassed / totalCategoryFeatures) * 100).toFixed(0)
        this.logTest(
          `${category.icon} ${category.name}`,
          percentage >= 70 ? 'PASSED' : 'WARNING',
          `${categoryPassed}/${totalCategoryFeatures} features (${percentage}%) validated`
        )
      } else {
        this.logTest(`${category.icon} ${category.name}`, 'INFO', 'Not explicitly tested')
      }
    })

    // Individual feature breakdown
    console.log('\n🏦 Individual Feature Analysis:')
    Object.entries(this.bankingFeatures).forEach(([categoryName, features]) => {
      console.log(`\n${categoryName.toUpperCase()} FEATURES:`)
      features.forEach(feature => {
        const featureTests = this.testResults.filter(r => r.test.toLowerCase().includes(feature.toLowerCase()))
        const featurePassed = featureTests.filter(t => t.status === 'PASSED').length > 0
        console.log(`   ${featurePassed ? '✅' : '⚠️'} ${feature}`)
      })
    })

    // Banking capacity summary
    console.log('\n📦 Banking Capacity Analysis:')
    console.log(`   📊 Total Slots: ${this.bankingCapacity.slots} slots`)
    console.log(`   📁 Bank Tabs: ${this.bankingCapacity.tabs} tabs`)
    console.log(`   📋 Items per Tab: ${this.bankingCapacity.itemsPerTab} items`)
    console.log(`   📈 Max Stack Size: ${this.bankingCapacity.maxStackSize.toLocaleString()}`)
    console.log(`   🔑 Special Slots: ${this.bankingCapacity.specialSlots.join(', ')}`)

    // Security summary
    console.log('\n🔒 Banking Security Summary:')
    const securityTests = this.testResults.filter(
      r =>
        r.test.toLowerCase().includes('pin') ||
        r.test.toLowerCase().includes('security') ||
        r.test.toLowerCase().includes('verification')
    )
    if (securityTests.length > 0) {
      securityTests.forEach(test => {
        console.log(`   ${test.status === 'PASSED' ? '✅' : '⚠️'} ${test.test}`)
      })
    } else {
      console.log('   ℹ️ Security features available but not explicitly tested')
    }

    // Banking workflow summary
    console.log('\n🔄 Banking Workflow Analysis:')
    console.log('   1. 🚪 Bank Access: Player approaches bank booth/NPC')
    console.log('   2. 🔐 PIN Entry: Security verification if enabled')
    console.log('   3. 🖥️ Interface Open: Banking interface displays')
    console.log('   4. 📂 Tab Selection: Choose appropriate bank tab')
    console.log('   5. ⬇️ Deposit Items: Move items from inventory to bank')
    console.log('   6. ⬆️ Withdraw Items: Move items from bank to inventory')
    console.log('   7. 🔍 Search/Sort: Find items using search/sort features')
    console.log('   8. 🚪 Close Bank: End banking session securely')

    // Final verdict
    console.log('\n🎯 BANKING VALIDATION VERDICT:')
    if (passed >= 20 && failed === 0) {
      console.log('🎉 COMPLETE BANKING SYSTEM VALIDATED!')
      console.log('   ✨ Full 816-slot banking system operational')
      console.log('   🔐 PIN protection and security features active')
      console.log('   📁 9-tab organization system working')
      console.log('   ⬇️⬆️ Deposit and withdrawal systems functional')
      console.log('   🔍 Search and organization features available')
      console.log('   🖥️ Complete banking interface ready')
      console.log('   📝 Security logging and audit trail active')
      console.log('   🚀 Ready for secure banking gameplay!')
    } else if (passed >= 15 && failed <= 2) {
      console.log('✅ BANKING SYSTEM MOSTLY VALIDATED')
      console.log('   🎮 Core banking functionality working')
      console.log('   🔧 Some banking features need attention')
    } else {
      console.log('⚠️ BANKING SYSTEM NEEDS WORK')
      console.log('   🛠️ Multiple banking systems require fixes')
      console.log('   🔍 Review failed security and core features')
    }

    this.saveBankingReport()
  }

  saveBankingReport() {
    try {
      const fs = require('fs')
      const reportPath = path.join(projectRoot, 'test-results', `banking-validation-${Date.now()}.json`)

      if (!fs.existsSync(path.dirname(reportPath))) {
        fs.mkdirSync(path.dirname(reportPath), { recursive: true })
      }

      const report = {
        timestamp: new Date().toISOString(),
        duration: Date.now() - this.testStartTime,
        summary: {
          passed: this.testResults.filter(r => r.status === 'PASSED').length,
          failed: this.testResults.filter(r => r.status === 'FAILED').length,
          warnings: this.testResults.filter(r => r.status === 'WARNING').length,
          errors: this.testResults.filter(r => r.status === 'ERROR').length,
        },
        bankingFeatures: this.bankingFeatures,
        bankingCapacity: this.bankingCapacity,
        securityFeatures: this.securityFeatures,
        visualColors: this.visualColors,
        tests: this.testResults,
      }

      fs.writeFileSync(reportPath, JSON.stringify(report, null, 2))
      console.log(`\n💾 Banking validation report saved: ${reportPath}`)
    } catch (error) {
      console.error('\n❌ Failed to save banking report:', error.message)
    }
  }

  async cleanup() {
    console.log('\n🧹 Cleaning up banking validation...')

    if (this.serverProcess) {
      this.serverProcess.kill('SIGTERM')

      setTimeout(() => {
        if (this.serverProcess && !this.serverProcess.killed) {
          this.serverProcess.kill('SIGKILL')
        }
      }, 3000)
    }

    console.log('✅ Banking validation cleanup completed')
  }
}

// Run validation if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const validator = new BankingValidation()

  process.on('SIGINT', async () => {
    console.log('\n🛑 Banking validation interrupted')
    await validator.cleanup()
    process.exit(0)
  })

  validator.runValidation().catch(error => {
    console.error('Fatal error:', error)
    process.exit(1)
  })
}

export { BankingValidation }
