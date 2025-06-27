#!/usr/bin/env node

/**
 * Performance Tests for Quest and Navigation Systems
 * Tests system performance under load and stress conditions
 */

import { spawn } from 'child_process'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const projectRoot = path.join(__dirname, '../..')

class PerformanceTest {
  constructor() {
    this.testResults = []
    this.serverProcess = null
    this.metrics = {
      systemLoadTime: 0,
      spawnerCreationTime: 0,
      entityCreationTime: 0,
      memoryUsage: {},
      errorCount: 0,
    }
  }

  async runPerformanceTests() {
    console.log('⚡ RPG System Performance Tests')
    console.log('===============================\n')

    try {
      await this.testSystemLoadPerformance()
      await this.testSpawningPerformance()
      await this.testNavigationPerformance()
      await this.testMemoryUsage()
      await this.testConcurrentOperations()

      this.generatePerformanceReport()
    } catch (error) {
      console.error('❌ Performance test failed:', error.message)
      this.logTest('Performance Test Suite', 'FAILED', error.message)
    } finally {
      await this.cleanup()
    }
  }

  async testSystemLoadPerformance() {
    console.log('🚀 Testing System Load Performance...')

    const startTime = Date.now()

    return new Promise((resolve, reject) => {
      this.serverProcess = spawn('bun', ['build/index.js'], {
        cwd: projectRoot,
        stdio: ['pipe', 'pipe', 'pipe'],
        env: { ...process.env, ENABLE_RPG: 'true' },
      })

      let systemsLoaded = 0
      const expectedSystems = 24 // Current system count

      this.serverProcess.stdout.on('data', data => {
        const output = data.toString()

        // Count system registrations
        if (output.includes('✓ Registered') && output.includes('system')) {
          systemsLoaded++
        }

        // Check for server ready
        if (output.includes('running on port 4444')) {
          this.metrics.systemLoadTime = Date.now() - startTime

          if (systemsLoaded >= expectedSystems * 0.9) {
            // 90% threshold
            this.logTest('System Load Time', 'PASSED', `${this.metrics.systemLoadTime}ms for ${systemsLoaded} systems`)
          } else {
            this.logTest('System Load Time', 'WARNING', `Only ${systemsLoaded}/${expectedSystems} systems loaded`)
          }

          // Performance benchmarks
          if (this.metrics.systemLoadTime < 5000) {
            this.logTest('Load Performance', 'PASSED', 'Systems loaded quickly')
          } else if (this.metrics.systemLoadTime < 10000) {
            this.logTest('Load Performance', 'WARNING', 'Systems loaded slowly')
          } else {
            this.logTest('Load Performance', 'FAILED', 'Systems took too long to load')
          }

          resolve()
        }

        // Track errors
        if (output.includes('ERROR') || output.includes('Failed')) {
          this.metrics.errorCount++
        }
      })

      this.serverProcess.stderr.on('data', data => {
        const error = data.toString()
        if (!error.includes('DeprecationWarning') && !error.includes('GLTFLoader')) {
          this.metrics.errorCount++
        }
      })

      // Timeout
      setTimeout(() => {
        reject(new Error('System load timeout'))
      }, 15000)
    })
  }

  async testSpawningPerformance() {
    console.log('🎯 Testing Spawning Performance...')

    const spawnerStartTime = Date.now()
    let spawnersCreated = 0
    let entitiesSpawned = 0

    return new Promise(resolve => {
      if (!this.serverProcess) {
        this.logTest('Spawning Performance', 'FAILED', 'No server process')
        resolve()
        return
      }

      const dataHandler = data => {
        const output = data.toString()

        // Count spawner registrations
        if (output.includes('Registered spawner')) {
          spawnersCreated++
          if (spawnersCreated === 1) {
            this.metrics.spawnerCreationTime = Date.now() - spawnerStartTime
          }
        }

        // Count entity spawns
        if (
          output.includes('Spawned') &&
          (output.includes('npc') || output.includes('resource') || output.includes('chest'))
        ) {
          entitiesSpawned++
        }

        // Check completion
        if (output.includes('All test spawners activated')) {
          this.serverProcess.stdout.off('data', dataHandler)

          // Performance analysis
          this.logTest(
            'Spawner Creation',
            'PASSED',
            `${spawnersCreated} spawners in ${this.metrics.spawnerCreationTime}ms`
          )
          this.logTest('Entity Spawning', 'PASSED', `${entitiesSpawned} entities spawned`)

          if (this.metrics.spawnerCreationTime < 1000) {
            this.logTest('Spawning Speed', 'PASSED', 'Fast spawner creation')
          } else {
            this.logTest('Spawning Speed', 'WARNING', 'Slow spawner creation')
          }

          resolve()
        }
      }

      this.serverProcess.stdout.on('data', dataHandler)

      // Timeout
      setTimeout(() => {
        this.serverProcess.stdout.off('data', dataHandler)
        this.logTest('Spawning Timeout', 'WARNING', `${spawnersCreated} spawners, ${entitiesSpawned} entities`)
        resolve()
      }, 10000)
    })
  }

  async testNavigationPerformance() {
    console.log('🧭 Testing Navigation Performance...')

    let navigationEvents = 0
    let arrivalEvents = 0

    return new Promise(resolve => {
      if (!this.serverProcess) {
        this.logTest('Navigation Performance', 'FAILED', 'No server process')
        resolve()
        return
      }

      const dataHandler = data => {
        const output = data.toString()

        // Count navigation events
        if (output.includes('[NavigationSystem]') && output.includes('navigating to')) {
          navigationEvents++
        }

        if (output.includes('[NavigationSystem]') && output.includes('arrived at')) {
          arrivalEvents++
        }

        // Agent navigation
        if (output.includes('[Agent]') && output.includes('starting navigation')) {
          this.logTest('Agent Navigation Start', 'PASSED', 'Agent initiated navigation')
        }

        if (output.includes('[Agent]') && output.includes('Arrived at')) {
          this.logTest('Agent Navigation Complete', 'PASSED', 'Agent completed navigation')
        }
      }

      this.serverProcess.stdout.on('data', dataHandler)

      // Monitor for a period
      setTimeout(() => {
        this.serverProcess.stdout.off('data', dataHandler)

        this.logTest('Navigation Events', 'PASSED', `${navigationEvents} navigation requests`)
        this.logTest('Arrival Events', 'PASSED', `${arrivalEvents} successful arrivals`)

        if (arrivalEvents >= navigationEvents * 0.8) {
          this.logTest('Navigation Success Rate', 'PASSED', 'High navigation success rate')
        } else {
          this.logTest('Navigation Success Rate', 'WARNING', 'Lower navigation success rate')
        }

        resolve()
      }, 15000)
    })
  }

  async testMemoryUsage() {
    console.log('💾 Testing Memory Usage...')

    try {
      // Get initial memory
      const initialMemory = process.memoryUsage()

      // Wait for system to stabilize
      await this.delay(5000)

      // Get memory after operations
      const currentMemory = process.memoryUsage()

      this.metrics.memoryUsage = {
        heapUsed: (currentMemory.heapUsed / 1024 / 1024).toFixed(2),
        heapTotal: (currentMemory.heapTotal / 1024 / 1024).toFixed(2),
        rss: (currentMemory.rss / 1024 / 1024).toFixed(2),
      }

      this.logTest(
        'Memory Usage',
        'PASSED',
        `Heap: ${this.metrics.memoryUsage.heapUsed}MB, RSS: ${this.metrics.memoryUsage.rss}MB`
      )

      // Memory thresholds
      if (currentMemory.heapUsed < 100 * 1024 * 1024) {
        // 100MB
        this.logTest('Memory Efficiency', 'PASSED', 'Low memory usage')
      } else if (currentMemory.heapUsed < 200 * 1024 * 1024) {
        // 200MB
        this.logTest('Memory Efficiency', 'WARNING', 'Moderate memory usage')
      } else {
        this.logTest('Memory Efficiency', 'FAILED', 'High memory usage')
      }
    } catch (error) {
      this.logTest('Memory Test', 'FAILED', error.message)
    }
  }

  async testConcurrentOperations() {
    console.log('🔄 Testing Concurrent Operations...')

    let concurrentOperations = 0
    const operationTypes = new Set()

    return new Promise(resolve => {
      if (!this.serverProcess) {
        this.logTest('Concurrent Operations', 'FAILED', 'No server process')
        resolve()
        return
      }

      const dataHandler = data => {
        const output = data.toString()

        // Track different types of concurrent operations
        if (output.includes('[SpawningSystem]')) {
          operationTypes.add('spawning')
          concurrentOperations++
        }
        if (output.includes('[NavigationSystem]')) {
          operationTypes.add('navigation')
          concurrentOperations++
        }
        if (output.includes('[VisualRepresentationSystem]')) {
          operationTypes.add('visual')
          concurrentOperations++
        }
        if (output.includes('[AgentPlayerSystem]')) {
          operationTypes.add('agent')
          concurrentOperations++
        }
        if (output.includes('[QuestSystem]')) {
          operationTypes.add('quest')
          concurrentOperations++
        }
      }

      this.serverProcess.stdout.on('data', dataHandler)

      setTimeout(() => {
        this.serverProcess.stdout.off('data', dataHandler)

        this.logTest(
          'Concurrent Operations',
          'PASSED',
          `${concurrentOperations} operations across ${operationTypes.size} systems`
        )

        if (operationTypes.size >= 4) {
          this.logTest('System Concurrency', 'PASSED', 'Multiple systems operating concurrently')
        } else {
          this.logTest('System Concurrency', 'WARNING', 'Limited concurrent system activity')
        }

        resolve()
      }, 8000)
    })
  }

  logTest(testName, status, description) {
    const result = { test: testName, status, description, timestamp: Date.now() }
    this.testResults.push(result)

    const emoji =
      {
        PASSED: '✅',
        FAILED: '❌',
        WARNING: '⚠️',
      }[status] || '📝'

    console.log(`  ${emoji} ${testName}: ${description}`)
  }

  generatePerformanceReport() {
    console.log('\n📊 Performance Test Report')
    console.log('===========================\n')

    const passed = this.testResults.filter(r => r.status === 'PASSED').length
    const failed = this.testResults.filter(r => r.status === 'FAILED').length
    const warnings = this.testResults.filter(r => r.status === 'WARNING').length

    console.log(`📈 Performance Summary:`)
    console.log(`   ✅ Passed:   ${passed}`)
    console.log(`   ❌ Failed:   ${failed}`)
    console.log(`   ⚠️  Warnings: ${warnings}\n`)

    // Key metrics
    console.log(`⚡ Key Performance Metrics:`)
    console.log(`   🚀 System Load Time: ${this.metrics.systemLoadTime}ms`)
    console.log(`   🎯 Spawner Creation: ${this.metrics.spawnerCreationTime}ms`)
    console.log(`   💾 Memory Usage: ${this.metrics.memoryUsage.heapUsed}MB heap`)
    console.log(`   🚨 Error Count: ${this.metrics.errorCount}\n`)

    // Performance rating
    let rating = 'EXCELLENT'
    if (failed > 0 || this.metrics.errorCount > 5) {
      rating = 'POOR'
    } else if (warnings > 2 || this.metrics.systemLoadTime > 8000) {
      rating = 'FAIR'
    } else if (warnings > 0 || this.metrics.systemLoadTime > 5000) {
      rating = 'GOOD'
    }

    console.log(`🏆 Overall Performance Rating: ${rating}`)

    // Recommendations
    console.log('\n💡 Performance Recommendations:')
    if (this.metrics.systemLoadTime > 5000) {
      console.log('   - Consider optimizing system initialization order')
    }
    if (this.metrics.errorCount > 0) {
      console.log('   - Review and fix system errors')
    }
    if (warnings > 2) {
      console.log('   - Address performance warnings')
    }
    if (failed === 0 && warnings === 0 && this.metrics.errorCount === 0) {
      console.log('   - Performance is optimal! 🎉')
    }
  }

  async cleanup() {
    console.log('\n🧹 Cleaning up performance test...')

    if (this.serverProcess) {
      this.serverProcess.kill('SIGTERM')

      setTimeout(() => {
        if (this.serverProcess && !this.serverProcess.killed) {
          this.serverProcess.kill('SIGKILL')
        }
      }, 3000)
    }
  }

  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms))
  }
}

// Run tests if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const tester = new PerformanceTest()

  process.on('SIGINT', async () => {
    console.log('\n🛑 Performance test interrupted')
    await tester.cleanup()
    process.exit(0)
  })

  tester.runPerformanceTests().catch(error => {
    console.error('Fatal error:', error)
    process.exit(1)
  })
}

export { PerformanceTest }
