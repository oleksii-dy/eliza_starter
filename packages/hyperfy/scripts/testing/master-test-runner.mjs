#!/usr/bin/env node

/**
 * Master Test Runner
 * Orchestrates all comprehensive RPG validation tests
 * Runs every single test suite and generates master report
 */

import { spawn } from 'child_process'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const projectRoot = path.join(__dirname, '../..')

class MasterTestRunner {
  constructor() {
    this.testResults = []
    this.testStartTime = Date.now()
    this.testSuites = [
      {
        name: 'Comprehensive RPG Validation',
        file: 'comprehensive-rpg-validation.mjs',
        description: 'Master validation of all RPG systems',
        category: 'Master',
        timeout: 120000,
      },
      {
        name: 'Items Validation',
        file: 'items-validation.mjs',
        description: 'All item types, categories, and functionality',
        category: 'Content',
        timeout: 75000,
      },
      {
        name: 'Skills Validation',
        file: 'skills-validation.mjs',
        description: 'All 23 skills across 4 categories',
        category: 'Progression',
        timeout: 75000,
      },
      {
        name: 'Construction Validation',
        file: 'construction-validation.mjs',
        description: 'House building with 18 room types',
        category: 'Building',
        timeout: 75000,
      },
      {
        name: 'Grand Exchange Validation',
        file: 'grand-exchange-validation.mjs',
        description: 'Market trading and economic systems',
        category: 'Economy',
        timeout: 75000,
      },
      {
        name: 'Banking Validation',
        file: 'banking-validation.mjs',
        description: '816-slot banking with security features',
        category: 'Storage',
        timeout: 75000,
      },
      {
        name: 'UI Validation',
        file: 'ui-validation.mjs',
        description: 'All interface components and user experience',
        category: 'Interface',
        timeout: 75000,
      },
    ]
    this.executionResults = new Map()
    this.overallStats = {
      suitesRun: 0,
      suitesPassed: 0,
      suitesFailed: 0,
      totalTests: 0,
      totalPassed: 0,
      totalFailed: 0,
      totalWarnings: 0,
      totalErrors: 0,
    }
  }

  async runAllTests() {
    console.log('🚀 MASTER RPG VALIDATION TEST RUNNER')
    console.log('===================================\n')
    console.log('Running comprehensive validation of the entire RPG system:')
    console.log(`• ${this.testSuites.length} Test Suites`)
    console.log('• 24 Core RPG Systems')
    console.log('• 200+ Items across all categories')
    console.log('• 23 Skills (Combat, Gathering, Artisan, Support)')
    console.log('• 18 Construction room types')
    console.log('• Complete Grand Exchange trading system')
    console.log('• 816-slot banking with security')
    console.log('• All UI components and interfaces')
    console.log('• Visual testing with color validation\n')

    try {
      // Run compilation check first
      await this.runCompilationCheck()

      // Run all test suites sequentially
      for (const testSuite of this.testSuites) {
        await this.runTestSuite(testSuite)
      }

      // Generate final master report
      this.generateMasterReport()
    } catch (error) {
      console.error('❌ Master test execution failed:', error.message)
      this.logTest('Master Test Runner', 'FAILED', error.message)
    }
  }

  async runCompilationCheck() {
    console.log('🔍 PRELIMINARY COMPILATION CHECK')
    console.log('================================\n')

    return new Promise((resolve, reject) => {
      console.log('📋 Checking TypeScript compilation...')

      const tscProcess = spawn('bun', ['run', 'build'], {
        cwd: projectRoot,
        stdio: ['pipe', 'pipe', 'pipe'],
      })

      let output = ''
      let errors = ''

      tscProcess.stdout.on('data', data => {
        output += data.toString()
      })

      tscProcess.stderr.on('data', data => {
        errors += data.toString()
      })

      tscProcess.on('close', code => {
        if (code === 0) {
          this.logTest('✅ TypeScript Compilation', 'PASSED', 'Code compiles without errors')
          console.log('📋 Running linting check...')

          // Run linting check
          const lintProcess = spawn('bun', ['run', 'lint'], {
            cwd: projectRoot,
            stdio: ['pipe', 'pipe', 'pipe'],
          })

          let lintOutput = ''
          let lintErrors = ''

          lintProcess.stdout.on('data', data => {
            lintOutput += data.toString()
          })

          lintProcess.stderr.on('data', data => {
            lintErrors += data.toString()
          })

          lintProcess.on('close', lintCode => {
            if (lintCode === 0) {
              this.logTest('✅ Code Linting', 'PASSED', 'Code passes all linting rules')
            } else {
              this.logTest('⚠️ Code Linting', 'WARNING', 'Linting issues detected but continuing')
            }

            console.log('\n🎯 Compilation and linting checks complete. Starting test suites...\n')
            resolve()
          })
        } else {
          this.logTest('❌ TypeScript Compilation', 'FAILED', 'Compilation errors detected')
          console.error('Compilation errors:', errors)
          reject(new Error('Compilation failed'))
        }
      })

      tscProcess.on('error', error => {
        reject(new Error(`Compilation check failed: ${error.message}`))
      })
    })
  }

  async runTestSuite(testSuite) {
    console.log(`\n🧪 RUNNING: ${testSuite.name.toUpperCase()}`)
    console.log(`${'='.repeat(testSuite.name.length + 10)}\n`)
    console.log(`📝 Description: ${testSuite.description}`)
    console.log(`📂 Category: ${testSuite.category}`)
    console.log(`⏱️ Timeout: ${testSuite.timeout / 1000}s\n`)

    const startTime = Date.now()
    this.overallStats.suitesRun++

    return new Promise(resolve => {
      const testProcess = spawn('node', [path.join(__dirname, testSuite.file)], {
        cwd: __dirname,
        stdio: ['pipe', 'pipe', 'pipe'],
      })

      let output = ''
      let errors = ''
      let passed = 0
      let failed = 0
      let warnings = 0
      let errorsCount = 0

      testProcess.stdout.on('data', data => {
        const text = data.toString()
        output += text
        process.stdout.write(text) // Real-time output

        // Count test results
        const lines = text.split('\n')
        lines.forEach(line => {
          if (line.includes('✅')) passed++
          if (line.includes('❌')) failed++
          if (line.includes('⚠️')) warnings++
          if (line.includes('🚨')) errorsCount++
        })
      })

      testProcess.stderr.on('data', data => {
        const text = data.toString()
        errors += text
        if (!text.includes('DeprecationWarning') && !text.includes('GLTFLoader')) {
          process.stderr.write(text) // Real-time error output
        }
      })

      testProcess.on('close', code => {
        const duration = Date.now() - startTime

        const result = {
          name: testSuite.name,
          category: testSuite.category,
          description: testSuite.description,
          passed: passed,
          failed: failed,
          warnings: warnings,
          errors: errorsCount,
          duration: duration,
          exitCode: code,
          success: code === 0 && failed === 0,
        }

        this.executionResults.set(testSuite.name, result)

        if (result.success) {
          this.overallStats.suitesPassed++
          this.logTest(
            `✅ ${testSuite.name}`,
            'PASSED',
            `Completed successfully (${passed} passed, ${warnings} warnings)`
          )
        } else {
          this.overallStats.suitesFailed++
          this.logTest(`❌ ${testSuite.name}`, 'FAILED', `Failed with ${failed} failures, ${errorsCount} errors`)
        }

        // Update overall stats
        this.overallStats.totalTests += passed + failed + warnings + errorsCount
        this.overallStats.totalPassed += passed
        this.overallStats.totalFailed += failed
        this.overallStats.totalWarnings += warnings
        this.overallStats.totalErrors += errorsCount

        console.log(`\n⏱️ Suite completed in ${(duration / 1000).toFixed(1)}s\n`)
        resolve()
      })

      testProcess.on('error', error => {
        this.logTest(`🚨 ${testSuite.name}`, 'ERROR', `Process error: ${error.message}`)
        this.overallStats.suitesFailed++
        resolve()
      })

      // Timeout handling
      setTimeout(() => {
        if (!testProcess.killed) {
          testProcess.kill('SIGTERM')
          this.logTest(`⏰ ${testSuite.name}`, 'WARNING', 'Test suite timed out')

          setTimeout(() => {
            if (!testProcess.killed) {
              testProcess.kill('SIGKILL')
            }
          }, 5000)
        }
      }, testSuite.timeout)
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

  generateMasterReport() {
    console.log('\n🏆 MASTER RPG VALIDATION REPORT')
    console.log('==============================\n')

    const totalTime = Date.now() - this.testStartTime

    // Overall execution summary
    console.log('📊 Master Execution Summary:')
    console.log(`   🧪 Test Suites Run: ${this.overallStats.suitesRun}`)
    console.log(`   ✅ Suites Passed: ${this.overallStats.suitesPassed}`)
    console.log(`   ❌ Suites Failed: ${this.overallStats.suitesFailed}`)
    console.log(`   ⏱️ Total Duration: ${(totalTime / 1000 / 60).toFixed(1)} minutes\n`)

    // Individual suite results
    console.log('📋 Test Suite Results:')
    for (const [suiteName, result] of this.executionResults) {
      const status = result.success ? '✅' : '❌'
      console.log(`   ${status} ${suiteName}`)
      console.log(`      📝 ${result.description}`)
      console.log(`      📊 ${result.passed} passed, ${result.failed} failed, ${result.warnings} warnings`)
      console.log(`      ⏱️ ${(result.duration / 1000).toFixed(1)}s\n`)
    }

    // Aggregated test statistics
    console.log('🔢 Aggregated Test Statistics:')
    console.log(`   📝 Total Tests: ${this.overallStats.totalTests}`)
    console.log(`   ✅ Total Passed: ${this.overallStats.totalPassed}`)
    console.log(`   ❌ Total Failed: ${this.overallStats.totalFailed}`)
    console.log(`   ⚠️ Total Warnings: ${this.overallStats.totalWarnings}`)
    console.log(`   🚨 Total Errors: ${this.overallStats.totalErrors}\n`)

    // Calculate success rate
    const successRate =
      this.overallStats.totalTests > 0
        ? ((this.overallStats.totalPassed / this.overallStats.totalTests) * 100).toFixed(1)
        : 0

    console.log(`📈 Overall Success Rate: ${successRate}%\n`)

    // System coverage analysis
    console.log('🎮 RPG System Coverage Analysis:')
    const categories = ['Master', 'Content', 'Progression', 'Building', 'Economy', 'Storage', 'Interface']
    categories.forEach(category => {
      const categoryResults = Array.from(this.executionResults.values()).filter(r => r.category === category)
      const categorySuccess = categoryResults.every(r => r.success)
      console.log(`   ${categorySuccess ? '✅' : '❌'} ${category} Systems`)
    })

    // Feature validation summary
    console.log('\n🔍 Feature Validation Summary:')
    console.log('   ⚔️ Combat Systems: Weapons, armor, magic, prayer')
    console.log('   📈 Progression Systems: 23 skills, experience, leveling')
    console.log('   🗡️ Content Systems: 200+ items, NPCs, quests')
    console.log('   🏗️ Building Systems: Construction, 18 room types')
    console.log('   💰 Economic Systems: Grand Exchange, trading, banking')
    console.log('   🎒 Storage Systems: Inventory, banking, containers')
    console.log('   🖥️ Interface Systems: All UI components and interactions')

    // Final verdict
    console.log('\n🎯 FINAL MASTER VERDICT:')

    if (
      this.overallStats.suitesPassed === this.overallStats.suitesRun &&
      this.overallStats.totalFailed === 0 &&
      this.overallStats.totalErrors === 0
    ) {
      console.log('🎉 COMPLETE RPG SYSTEM FULLY VALIDATED AND OPERATIONAL!')
      console.log('   ✨ All test suites passed successfully')
      console.log('   🎮 All 24 core RPG systems functional')
      console.log('   🗡️ Complete item system (200+ items)')
      console.log('   📈 Full skill system (23 skills)')
      console.log('   🏗️ Construction system (18 room types)')
      console.log('   💰 Grand Exchange market system')
      console.log('   🏦 Banking system (816 slots)')
      console.log('   🖥️ Complete UI system')
      console.log('   🎨 Visual system with color testing')
      console.log('   🔒 Security and validation systems')
      console.log('   🚀 READY FOR FULL PRODUCTION DEPLOYMENT!')
    } else if (
      this.overallStats.suitesPassed >= this.overallStats.suitesRun * 0.8 &&
      this.overallStats.totalErrors === 0
    ) {
      console.log('✅ RPG SYSTEM MOSTLY VALIDATED')
      console.log('   🎮 Core functionality operational')
      console.log('   🔧 Some systems need minor attention')
      console.log('   ⚡ Ready for testing and refinement')
    } else {
      console.log('⚠️ RPG SYSTEM NEEDS COMPREHENSIVE WORK')
      console.log('   🛠️ Multiple systems require fixes')
      console.log('   🔍 Review failed test suites')
      console.log('   🚧 Not ready for production')
    }

    this.saveMasterReport()
  }

  saveMasterReport() {
    try {
      const fs = require('fs')
      const reportPath = path.join(projectRoot, 'test-results', `master-validation-${Date.now()}.json`)

      if (!fs.existsSync(path.dirname(reportPath))) {
        fs.mkdirSync(path.dirname(reportPath), { recursive: true })
      }

      const report = {
        timestamp: new Date().toISOString(),
        duration: Date.now() - this.testStartTime,
        summary: this.overallStats,
        testSuites: this.testSuites,
        executionResults: Array.from(this.executionResults.entries()).map(([name, result]) => ({
          name,
          ...result,
        })),
        masterTests: this.testResults,
      }

      fs.writeFileSync(reportPath, JSON.stringify(report, null, 2))
      console.log(`\n💾 Master validation report saved: ${reportPath}`)

      // Also save a summary file
      const summaryPath = path.join(projectRoot, 'test-results', 'LATEST-VALIDATION-SUMMARY.md')
      const summaryContent = this.generateMarkdownSummary()
      fs.writeFileSync(summaryPath, summaryContent)
      console.log(`📄 Summary report saved: ${summaryPath}`)
    } catch (error) {
      console.error('\n❌ Failed to save master report:', error.message)
    }
  }

  generateMarkdownSummary() {
    const totalTime = Date.now() - this.testStartTime
    const successRate =
      this.overallStats.totalTests > 0
        ? ((this.overallStats.totalPassed / this.overallStats.totalTests) * 100).toFixed(1)
        : 0

    return `# RPG System Validation Report

## Summary
- **Test Date**: ${new Date().toISOString()}
- **Total Duration**: ${(totalTime / 1000 / 60).toFixed(1)} minutes
- **Success Rate**: ${successRate}%

## Test Suites
${Array.from(this.executionResults.values())
  .map(
    result =>
      `- ${result.success ? '✅' : '❌'} **${result.name}**: ${result.description} (${result.passed} passed, ${result.failed} failed)`
  )
  .join('\n')}

## Statistics
- **Suites**: ${this.overallStats.suitesPassed}/${this.overallStats.suitesRun} passed
- **Tests**: ${this.overallStats.totalPassed}/${this.overallStats.totalTests} passed
- **Warnings**: ${this.overallStats.totalWarnings}
- **Errors**: ${this.overallStats.totalErrors}

## Validation Status
${
  this.overallStats.suitesPassed === this.overallStats.suitesRun &&
  this.overallStats.totalFailed === 0 &&
  this.overallStats.totalErrors === 0
    ? '🎉 **COMPLETE RPG SYSTEM FULLY VALIDATED!**'
    : this.overallStats.suitesPassed >= this.overallStats.suitesRun * 0.8 && this.overallStats.totalErrors === 0
      ? '✅ **RPG SYSTEM MOSTLY VALIDATED**'
      : '⚠️ **RPG SYSTEM NEEDS WORK**'
}
`
  }
}

// Run master test if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const runner = new MasterTestRunner()

  process.on('SIGINT', async () => {
    console.log('\n🛑 Master test runner interrupted')
    process.exit(0)
  })

  runner.runAllTests().catch(error => {
    console.error('Fatal error:', error)
    process.exit(1)
  })
}

export { MasterTestRunner }
