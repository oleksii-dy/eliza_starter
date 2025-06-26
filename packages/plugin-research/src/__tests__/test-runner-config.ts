/**
 * Test Runner Configuration for Plugin Research
 * Handles long-running tests with proper timeout and monitoring
 */

export interface TestConfig {
  maxTimeout: number;
  progressInterval: number;
  enableReporting: boolean;
  reportPath: string;
}

export interface TestProgress {
  testName: string;
  startTime: number;
  status: 'running' | 'completed' | 'failed' | 'timeout';
  progress?: number;
  message?: string;
  error?: string;
}

export class LongRunningTestManager {
  private activeTests = new Map<string, TestProgress>();
  private reportInterval?: NodeJS.Timeout;

  constructor(private config: TestConfig) {
    if (config.enableReporting) {
      this.startProgressReporting();
    }
  }

  startTest(testName: string): string {
    const testId = `${testName}-${Date.now()}`;
    this.activeTests.set(testId, {
      testName,
      startTime: Date.now(),
      status: 'running',
      progress: 0,
    });

    console.log(`🚀 Starting long-running test: ${testName}`);
    return testId;
  }

  updateProgress(testId: string, progress: number, message?: string) {
    const test = this.activeTests.get(testId);
    if (test) {
      test.progress = progress;
      test.message = message;
      console.log(
        `📊 ${test.testName}: ${progress}% - ${message || 'Processing...'}`
      );
    }
  }

  completeTest(testId: string, success: boolean, error?: string) {
    const test = this.activeTests.get(testId);
    if (test) {
      test.status = success ? 'completed' : 'failed';
      test.error = error;
      const duration = Date.now() - test.startTime;

      console.log(
        success
          ? `✅ Test completed: ${test.testName} (${Math.round(duration / 1000)}s)`
          : `❌ Test failed: ${test.testName} - ${error} (${Math.round(duration / 1000)}s)`
      );

      this.activeTests.delete(testId);
    }
  }

  private startProgressReporting() {
    this.reportInterval = setInterval(() => {
      if (this.activeTests.size > 0) {
        console.log('\n📈 Active Tests Progress Report:');
        for (const [id, test] of this.activeTests) {
          const elapsed = Math.round((Date.now() - test.startTime) / 1000);
          console.log(
            `  - ${test.testName}: ${test.progress || 0}% (${elapsed}s elapsed)`
          );
        }
        console.log('');
      }
    }, this.config.progressInterval);
  }

  async createTimeoutWrapper<T>(
    testId: string,
    testFunction: () => Promise<T>,
    timeout: number = this.config.maxTimeout
  ): Promise<T> {
    return new Promise((resolve, reject) => {
      const timeoutId = setTimeout(() => {
        this.completeTest(testId, false, 'Test timeout');
        reject(new Error(`Test timed out after ${timeout}ms`));
      }, timeout);

      testFunction()
        .then((result) => {
          clearTimeout(timeoutId);
          this.completeTest(testId, true);
          resolve(result);
        })
        .catch((error) => {
          clearTimeout(timeoutId);
          this.completeTest(testId, false, error.message);
          reject(error);
        });
    });
  }

  cleanup() {
    if (this.reportInterval) {
      clearInterval(this.reportInterval);
    }

    // Mark any remaining tests as interrupted
    for (const [id, test] of this.activeTests) {
      this.completeTest(id, false, 'Test interrupted during cleanup');
    }
  }
}

// Default configuration for research tests
export const RESEARCH_TEST_CONFIG: TestConfig = {
  maxTimeout: 15 * 60 * 1000, // 15 minutes for long E2E tests
  progressInterval: 30 * 1000, // Progress reports every 30 seconds
  enableReporting: true,
  reportPath: './test-reports',
};

// Quick test configuration for unit tests
export const QUICK_TEST_CONFIG: TestConfig = {
  maxTimeout: 30 * 1000, // 30 seconds for unit tests
  progressInterval: 10 * 1000, // Progress reports every 10 seconds
  enableReporting: false,
  reportPath: './test-reports',
};
