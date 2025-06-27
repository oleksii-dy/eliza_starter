import { describe, it, expect, mock, beforeEach, afterEach, spyOn } from 'bun:test';
import { TestTimeoutManager } from '../../../../src/utils/testing/timeout-manager';

// Mock logger
const mockLogger = {
  error: mock(() => {}),
};

// Replace the @elizaos/core module
mock.module('@elizaos/core', () => ({
  logger: mockLogger,
}));

// Timer mocking utilities
const timerCallbacks: Map<
  NodeJS.Timeout,
  { callback: Function; delay: number; startTime: number }
> = new Map();
let currentTime = 0;
let nextTimerId = 1;

// Mock setTimeout
const originalSetTimeout = global.setTimeout;
const mockSetTimeout = mock((callback: Function, delay: number) => {
  const timerId = nextTimerId++ as unknown as NodeJS.Timeout;
  timerCallbacks.set(timerId, { callback, delay, startTime: currentTime });
  return timerId;
});

// Mock clearTimeout
const originalClearTimeout = global.clearTimeout;
const mockClearTimeout = mock((timerId: NodeJS.Timeout) => {
  timerCallbacks.delete(timerId);
});

// Mock Date.now
const originalDateNow = Date.now;
const mockDateNow = mock(() => currentTime);

// Helper to advance time and trigger callbacks
function advanceTimersByTime(ms: number) {
  const targetTime = currentTime + ms;

  // Collect timers that should fire
  const timersToFire: Array<
    [NodeJS.Timeout, { callback: Function; delay: number; startTime: number }]
  > = [];

  for (const [timerId, timer] of timerCallbacks.entries()) {
    const fireTime = timer.startTime + timer.delay;
    if (fireTime <= targetTime && fireTime > currentTime) {
      timersToFire.push([timerId, timer]);
    }
  }

  // Update current time BEFORE firing callbacks
  currentTime = targetTime;

  // Now fire the callbacks
  for (const [timerId, timer] of timersToFire) {
    timer.callback();
    timerCallbacks.delete(timerId);
  }
}

describe('TestTimeoutManager', () => {
  let manager: TestTimeoutManager;
  let mockExit: any;

  beforeEach(() => {
    // Reset mocks
    mockLogger.error.mockClear();
    timerCallbacks.clear();
    currentTime = 0;
    nextTimerId = 1;

    // Install mocks
    global.setTimeout = mockSetTimeout as any;
    global.clearTimeout = mockClearTimeout as any;
    Date.now = mockDateNow as any;

    manager = new TestTimeoutManager();
    mockExit = spyOn(process, 'exit').mockImplementation(() => undefined as never);
  });

  afterEach(() => {
    manager.clearAll();

    // Restore original functions
    global.setTimeout = originalSetTimeout;
    global.clearTimeout = originalClearTimeout;
    Date.now = originalDateNow;

    mockExit.mockRestore();
  });

  describe('getInstance', () => {
    it('should return singleton instance', () => {
      const instance1 = TestTimeoutManager.getInstance();
      const instance2 = TestTimeoutManager.getInstance();

      expect(instance1).toBe(instance2);
    });
  });

  describe('startTimeout', () => {
    it('should start timeout with default duration', () => {
      manager.startTimeout('test1');

      // Fast forward just before timeout
      advanceTimersByTime(29999);
      expect(mockLogger.error).not.toHaveBeenCalled();

      // Fast forward to trigger timeout
      advanceTimersByTime(1);

      expect(mockLogger.error).toHaveBeenCalledWith(
        'Test "test1" exceeded timeout of 30000ms (elapsed: 30000ms)'
      );
      expect(mockExit).toHaveBeenCalledWith(1);
    });

    it('should start timeout with custom duration', () => {
      manager.startTimeout('test2', 5000);

      // Fast forward just before timeout
      advanceTimersByTime(4999);
      expect(mockLogger.error).not.toHaveBeenCalled();

      // Fast forward to trigger timeout
      advanceTimersByTime(1);
      expect(mockLogger.error).toHaveBeenCalledWith(
        'Test "test2" exceeded timeout of 5000ms (elapsed: 5000ms)'
      );
    });

    it('should clear existing timeout when starting new one with same name', () => {
      manager.startTimeout('test3', 5000);

      // Fast forward partway
      advanceTimersByTime(3000);

      // Start new timeout with same name
      manager.startTimeout('test3', 5000);

      // Fast forward 3 more seconds (total 6 seconds from beginning)
      advanceTimersByTime(3000);

      // Should not have timed out yet because it was reset
      expect(mockLogger.error).not.toHaveBeenCalled();

      // Fast forward to trigger the new timeout
      advanceTimersByTime(2000);
      expect(mockLogger.error).toHaveBeenCalled();
    });
  });

  describe('clearTimeout', () => {
    it('should clear timeout and prevent it from firing', () => {
      manager.startTimeout('test4', 5000);

      // Fast forward partway
      advanceTimersByTime(3000);

      // Clear the timeout
      manager.clearTimeout('test4');

      // Fast forward past the original timeout
      advanceTimersByTime(5000);

      // Should not have fired
      expect(mockLogger.error).not.toHaveBeenCalled();
    });

    it('should handle clearing non-existent timeout gracefully', () => {
      expect(() => manager.clearTimeout('non-existent')).not.toThrow();
    });
  });

  describe('clearAll', () => {
    it('should clear all timeouts', () => {
      manager.startTimeout('test5', 5000);
      manager.startTimeout('test6', 10000);
      manager.startTimeout('test7', 15000);

      manager.clearAll();

      // Fast forward past all timeouts
      advanceTimersByTime(20000);

      // None should have fired
      expect(mockLogger.error).not.toHaveBeenCalled();
    });
  });

  describe('elapsed time tracking', () => {
    it('should track elapsed time correctly', () => {
      const startTime = 0;
      currentTime = startTime;

      manager.startTimeout('test8', 10000);

      // Fast forward 7 seconds
      advanceTimersByTime(7000);

      // Trigger timeout by advancing remaining time
      advanceTimersByTime(3000);

      expect(mockLogger.error).toHaveBeenCalledWith(
        'Test "test8" exceeded timeout of 10000ms (elapsed: 10000ms)'
      );
    });
  });

  describe('process.exit behavior', () => {
    it('should call process.exit with code 1 on timeout', () => {
      manager.startTimeout('test9', 1000);

      advanceTimersByTime(1000);

      expect(mockExit).toHaveBeenCalledWith(1);
    });
  });
});
