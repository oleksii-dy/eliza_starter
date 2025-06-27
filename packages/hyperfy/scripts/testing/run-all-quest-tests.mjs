#!/usr/bin/env node

/**
 * Comprehensive Test Runner for Quest System
 * Runs all tests in sequence and generates combined report
 */

import path from 'path'
import { fileURLToPath } from 'url'
import { spawn } from 'child_process'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const projectRoot = path.join(__dirname, '../..')

class QuestTestRunner {
  constructor() {
    this.allResults = []
    this.testSuites = [
      {
        name: 'Navigation System Tests',
        file: './navigation-system-test.mjs',
        timeout: 30000,
      },
      {
        name: 'Agent Behavior Tests',
        file: './agent-behavior-test.mjs',
        timeout: 30000,
      },
      {
        name: 'Quest System Integration',
        file: './quest-system-validation.mjs',
        timeout: 120000,
      },
      {
        name: 'Performance Tests',
        file: './performance-test.mjs',
        timeout: 180000,
      },
    ]
  }

  async runAllTests() {
    console.log('🧪 Quest System Complete Test Suite')
    console.log('====================================\n')
    console.log(`Running ${this.testSuites.length} test suites...\n`)

    const startTime = Date.now()

    // Run each test suite
    for (const suite of this.testSuites) {
      await this.runTestSuite(suite)
      console.log('') // Spacing between suites
    }

    // Generate comprehensive report
    this.generateFinalReport(startTime)
  }

  async runTestSuite(suite) {
    console.log(`🚀 Running: ${suite.name}`)
    console.log('─'.repeat(50))

    const result = {
      name: suite.name,
      status: 'RUNNING',
      startTime: Date.now(),
      endTime: null,
      output: '',
      error: null,
      passed: 0,
      failed: 0,
      warnings: 0,
    }

    try {
      const suiteResult = await this.executeTest(suite)
      result.status = suiteResult.success ? 'PASSED' : 'FAILED'
      result.output = suiteResult.output
      result.error = suiteResult.error

      // Parse test counts from output
      const passedMatch = suiteResult.output.match(/✅ Passed:\s*(\d+)/)
      const failedMatch = suiteResult.output.match(/❌ Failed:\s*(\d+)/)
      const warningMatch = suiteResult.output.match(/⚠️\s*Warnings:\s*(\d+)/)

      result.passed = passedMatch ? parseInt(passedMatch[1]) : 0
      result.failed = failedMatch ? parseInt(failedMatch[1]) : 0
      result.warnings = warningMatch ? parseInt(warningMatch[1]) : 0
    } catch (error) {
      result.status = 'ERROR'
      result.error = error.message
    }

    result.endTime = Date.now()
    result.duration = result.endTime - result.startTime

    this.allResults.push(result)

    // Display suite result
    const emoji =
      {
        PASSED: '✅',
        FAILED: '❌',
        ERROR: '🚨',
      }[result.status] || '📝'

    console.log(`${emoji} ${suite.name}: ${result.status} (${result.duration}ms)`)
    if (result.passed > 0 || result.failed > 0 || result.warnings > 0) {
      console.log(`   📊 ${result.passed} passed, ${result.failed} failed, ${result.warnings} warnings`)
    }
    if (result.error) {
      console.log(`   ⚠️ Error: ${result.error}`)
    }
  }

  async executeTest(suite) {
    return new Promise((resolve, reject) => {
      const testPath = path.resolve(__dirname, suite.file)
      const child = spawn('node', [testPath], {
        cwd: __dirname,
        stdio: ['pipe', 'pipe', 'pipe'],
      })

      let output = ''
      let errorOutput = ''

      child.stdout.on('data', data => {
        const text = data.toString()
        output += text
        // Optionally show real-time output
        // process.stdout.write(text);
      })

      child.stderr.on('data', data => {
        const text = data.toString()
        errorOutput += text
      })

      child.on('close', code => {
        resolve({
          success: code === 0,
          output: output,
          error: code !== 0 ? errorOutput : null,
        })
      })

      child.on('error', error => {
        reject(error)
      })

      // Set timeout
      setTimeout(() => {
        child.kill('SIGKILL')
        reject(new Error(`Test suite timeout after ${suite.timeout}ms`))
      }, suite.timeout)
    })
  }

  generateFinalReport(startTime) {
    const totalTime = Date.now() - startTime

    console.log('\n🏆 FINAL TEST REPORT')
    console.log('='.repeat(50))
    console.log(`Total Duration: ${(totalTime / 1000).toFixed(1)}s\n`)

    // Overall statistics
    const totalPassed = this.allResults.reduce((sum, r) => sum + r.passed, 0)
    const totalFailed = this.allResults.reduce((sum, r) => sum + r.failed, 0)
    const totalWarnings = this.allResults.reduce((sum, r) => sum + r.warnings, 0)
    const suitesErrored = this.allResults.filter(r => r.status === 'ERROR').length
    const suitesFailed = this.allResults.filter(r => r.status === 'FAILED').length
    const suitesPassed = this.allResults.filter(r => r.status === 'PASSED').length

    console.log('📊 Test Suite Summary:')
    console.log(`   ✅ Suites Passed: ${suitesPassed}`)
    console.log(`   ❌ Suites Failed: ${suitesFailed}`)
    console.log(`   🚨 Suites Errored: ${suitesErrored}`)
    console.log(`   📈 Total Tests: ${totalPassed + totalFailed} (${totalPassed} passed, ${totalFailed} failed)`)
    console.log(`   ⚠️  Total Warnings: ${totalWarnings}\n`)

    // Individual suite results
    console.log('📋 Suite Details:')
    this.allResults.forEach(result => {
      const emoji =
        {
          PASSED: '✅',
          FAILED: '❌',
          ERROR: '🚨',
        }[result.status] || '📝'

      const duration = `${(result.duration / 1000).toFixed(1)}s`
      console.log(`   ${emoji} ${result.name} (${duration})`)

      if (result.passed > 0 || result.failed > 0 || result.warnings > 0) {
        console.log(`      📊 ${result.passed} passed, ${result.failed} failed, ${result.warnings} warnings`)
      }

      if (result.error) {
        console.log(`      ⚠️ ${result.error}`)
      }
    })

    // Overall assessment
    console.log('\n🎯 Overall Assessment:')

    if (suitesErrored === 0 && suitesFailed === 0 && totalFailed === 0) {
      console.log('🎉 EXCELLENT: All tests passed successfully!')
      console.log('   ✨ Quest system is fully functional and ready for production')
    } else if (suitesErrored === 0 && suitesFailed <= 1 && totalFailed <= 3) {
      console.log('✅ GOOD: Quest system is working well with minor issues')
      console.log('   🔧 Address the failed tests for optimal performance')
    } else if (suitesErrored <= 1 && suitesFailed <= 2) {
      console.log('⚠️ FAIR: Quest system has some significant issues')
      console.log('   🛠️ Review and fix the failing components')
    } else {
      console.log('❌ POOR: Quest system has major issues')
      console.log('   🚨 Significant debugging and fixes required')
    }

    // Key functionality status
    console.log('\n🔍 Key Functionality Status:')
    const functionalities = [
      { name: 'Navigation System', suite: 'Navigation System Tests' },
      { name: 'Agent Behavior', suite: 'Agent Behavior Tests' },
      { name: 'Quest Integration', suite: 'Quest System Integration' },
      { name: 'Performance', suite: 'Performance Tests' },
    ]

    functionalities.forEach(func => {
      const suiteResult = this.allResults.find(r => r.name === func.suite)
      const status = suiteResult ? suiteResult.status : 'NOT_RUN'
      const emoji =
        {
          PASSED: '✅',
          FAILED: '❌',
          ERROR: '🚨',
          NOT_RUN: '⭕',
        }[status] || '📝'

      console.log(`   ${emoji} ${func.name}: ${status}`)
    })

    // Recommendations
    console.log('\n💡 Recommendations:')

    if (totalWarnings > 5) {
      console.log('   ⚠️ High warning count - review system configuration')
    }

    if (suitesFailed > 0) {
      console.log('   🔧 Fix failing test suites before deployment')
    }

    if (suitesErrored > 0) {
      console.log('   🚨 Resolve test execution errors')
    }

    const performanceResult = this.allResults.find(r => r.name === 'Performance Tests')
    if (performanceResult && performanceResult.status !== 'PASSED') {
      console.log('   ⚡ Optimize system performance')
    }

    if (suitesErrored === 0 && suitesFailed === 0 && totalFailed === 0) {
      console.log('   🚀 System is ready for deployment!')
      console.log('   🎮 Quest system fully validated and operational')
    }

    // Save detailed report
    this.saveDetailedReport()
  }

  saveDetailedReport() {
    try {
      const fs = require('fs')
      const reportPath = path.join(projectRoot, 'test-results', `quest-complete-report-${Date.now()}.json`)

      if (!fs.existsSync(path.dirname(reportPath))) {
        fs.mkdirSync(path.dirname(reportPath), { recursive: true })
      }

      const report = {
        timestamp: new Date().toISOString(),
        suites: this.allResults,
        summary: {
          totalPassed: this.allResults.reduce((sum, r) => sum + r.passed, 0),
          totalFailed: this.allResults.reduce((sum, r) => sum + r.failed, 0),
          totalWarnings: this.allResults.reduce((sum, r) => sum + r.warnings, 0),
          suitesPassed: this.allResults.filter(r => r.status === 'PASSED').length,
          suitesFailed: this.allResults.filter(r => r.status === 'FAILED').length,
          suitesErrored: this.allResults.filter(r => r.status === 'ERROR').length,
        },
      }

      fs.writeFileSync(reportPath, JSON.stringify(report, null, 2))
      console.log(`\n💾 Detailed report saved: ${reportPath}`)
    } catch (error) {
      console.error('\n❌ Failed to save detailed report:', error.message)
    }
  }
}

// Run all tests if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const runner = new QuestTestRunner()

  process.on('SIGINT', () => {
    console.log('\n🛑 Test run interrupted')
    process.exit(0)
  })

  runner.runAllTests().catch(error => {
    console.error('Fatal error:', error)
    process.exit(1)
  })
}

export { QuestTestRunner }
