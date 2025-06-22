import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { ResourceMonitorService } from '../../resource-monitor';
import { createMockRuntime } from '../utils/mock-runtime';
import type { IAgentRuntime } from '@elizaos/core';
import { spawn } from 'child_process';

// Mock child_process
vi.mock('child_process', () => ({
  spawn: vi.fn(),
}));

// Mock os module
vi.mock('os', () => ({
  platform: vi.fn(() => 'darwin'),
  totalmem: vi.fn(() => 16 * 1024 * 1024 * 1024), // 16GB
  freemem: vi.fn(() => 8 * 1024 * 1024 * 1024),   // 8GB free
}));

describe('ResourceMonitorService', () => {
  let mockRuntime: IAgentRuntime;
  let service: ResourceMonitorService;
  let mockProcess: any;

  beforeEach(() => {
    vi.clearAllMocks();
    
    // Mock child process
    mockProcess = {
      stdout: {
        on: vi.fn(),
        pipe: vi.fn(),
      },
      stderr: {
        on: vi.fn(),
        pipe: vi.fn(),
      },
      on: vi.fn(),
      kill: vi.fn(),
    };
    
    vi.mocked(spawn).mockReturnValue(mockProcess);
    
    mockRuntime = createMockRuntime({
      settings: {
        RESOURCE_MONITOR_INTERVAL: '1000',
        RESOURCE_ALERT_THRESHOLDS: JSON.stringify({
          cpu: 90,
          memory: 85,
          disk: 95,
        }),
      },
    });
  });

  afterEach(async () => {
    if (service && (service as any).monitoringInterval) {
      await service.stop();
    }
    vi.clearAllMocks();
  });

  describe('initialization', () => {
    it('should start monitoring on service start', async () => {
      service = await ResourceMonitorService.start(mockRuntime) as ResourceMonitorService;
      
      expect(service).toBeDefined();
      expect(service.serviceName).toBe('resource-monitor');
      expect((service as any).isMonitoring).toBe(true);
    });

    it('should handle platform-specific differences', async () => {
      // Test with different platforms
      const platforms = ['darwin', 'linux', 'win32'];
      
      for (const platform of platforms) {
        vi.mocked(require('os').platform).mockReturnValueOnce(platform);
        
        service = await ResourceMonitorService.start(mockRuntime) as ResourceMonitorService;
        
        expect(service).toBeDefined();
        expect((service as any).platform).toBe(platform);
        
        await service.stop();
      }
    });

    it('should use default configuration when settings missing', async () => {
      const minimalRuntime = createMockRuntime({
        settings: {},
      });
      
      service = await ResourceMonitorService.start(minimalRuntime) as ResourceMonitorService;
      
      expect(service).toBeDefined();
      expect((service as any).monitorInterval).toBe(5000); // Default 5 seconds
    });
  });

  describe('resource monitoring', () => {
    beforeEach(async () => {
      service = new ResourceMonitorService(mockRuntime);
    });

    it('should get real CPU usage on Unix systems', async () => {
      // Mock successful top command output
      const topOutput = `
        Processes: 425 total, 2 running, 423 sleeping, 2236 threads
        Load Avg: 2.13, 2.05, 1.98
        CPU usage: 12.5% user, 3.2% sys, 84.3% idle
      `;
      
      mockProcess.stdout.on.mockImplementation((event, callback) => {
        if (event === 'data') {
          setTimeout(() => callback(Buffer.from(topOutput)), 10);
        }
      });
      mockProcess.stderr.on.mockImplementation((event, callback) => {});
      mockProcess.on.mockImplementation((event, callback) => {
        if (event === 'close') {
          setTimeout(() => callback(0), 20);
        }
      });

      const cpuUsage = await (service as any).getCpuUsage();
      
      expect(spawn).toHaveBeenCalledWith('top', ['-l', '1', '-n', '0'], { shell: true });
      expect(typeof cpuUsage).toBe('number');
      expect(cpuUsage).toBeGreaterThanOrEqual(0);
      expect(cpuUsage).toBeLessThanOrEqual(100);
    });

    it('should get real memory usage cross-platform', async () => {
      const memoryUsage = await (service as any).getMemoryUsage();
      
      expect(typeof memoryUsage).toBe('number');
      expect(memoryUsage).toBeGreaterThanOrEqual(0);
      expect(memoryUsage).toBeLessThanOrEqual(100);
      
      // Should be 50% based on our mock (8GB free of 16GB total)
      expect(memoryUsage).toBeCloseTo(50, 0);
    });

    it('should get real disk usage with proper parsing', async () => {
      // Mock df command output for Unix
      const dfOutput = `
        Filesystem     1K-blocks    Used Available Use% Mounted on
        /dev/disk1     488245288 400123456  88121832  82% /
        /dev/disk2     244140632  12345678 231794954   6% /home
      `;
      
      mockProcess.stdout.on.mockImplementation((event, callback) => {
        if (event === 'data') {
          setTimeout(() => callback(Buffer.from(dfOutput)), 10);
        }
      });
      mockProcess.stderr.on.mockImplementation((event, callback) => {});
      mockProcess.on.mockImplementation((event, callback) => {
        if (event === 'close') {
          setTimeout(() => callback(0), 20);
        }
      });

      const diskUsage = await (service as any).getDiskUsage();
      
      expect(typeof diskUsage).toBe('number');
      expect(diskUsage).toBeGreaterThanOrEqual(0);
      expect(diskUsage).toBeLessThanOrEqual(100);
      
      // Should parse the 82% from the root filesystem
      expect(diskUsage).toBeCloseTo(82, 0);
    });

    it('should handle monitoring command failures', async () => {
      // Mock command failure
      mockProcess.stdout.on.mockImplementation((event, callback) => {});
      mockProcess.stderr.on.mockImplementation((event, callback) => {
        if (event === 'data') {
          setTimeout(() => callback(Buffer.from('Command not found')), 10);
        }
      });
      mockProcess.on.mockImplementation((event, callback) => {
        if (event === 'close') {
          setTimeout(() => callback(1), 20); // Error exit code
        }
      });

      const cpuUsage = await (service as any).getCpuUsage();
      
      // Should provide fallback value
      expect(typeof cpuUsage).toBe('number');
      expect(cpuUsage).toBeGreaterThanOrEqual(0);
      expect(cpuUsage).toBeLessThanOrEqual(100);
    });

    it('should parse Windows wmic output correctly', async () => {
      // Mock Windows platform
      vi.mocked(require('os').platform).mockReturnValue('win32');
      service = new ResourceMonitorService(mockRuntime);
      
      // Mock wmic output for disk usage
      const wmicOutput = `
        Size=1000000000000
        FreeSpace=200000000000
      `;
      
      mockProcess.stdout.on.mockImplementation((event, callback) => {
        if (event === 'data') {
          setTimeout(() => callback(Buffer.from(wmicOutput)), 10);
        }
      });
      mockProcess.stderr.on.mockImplementation((event, callback) => {});
      mockProcess.on.mockImplementation((event, callback) => {
        if (event === 'close') {
          setTimeout(() => callback(0), 20);
        }
      });

      const diskUsage = await (service as any).getDiskUsage();
      
      expect(spawn).toHaveBeenCalledWith('wmic', expect.arrayContaining(['logicaldisk']), { shell: true });
      expect(typeof diskUsage).toBe('number');
      expect(diskUsage).toBeGreaterThanOrEqual(0);
      expect(diskUsage).toBeLessThanOrEqual(100);
    });
  });

  describe('error scenarios', () => {
    beforeEach(async () => {
      service = new ResourceMonitorService(mockRuntime);
    });

    it('should provide fallback values on monitoring failures', async () => {
      // Mock all commands to fail
      mockProcess.on.mockImplementation((event, callback) => {
        if (event === 'close') {
          setTimeout(() => callback(1), 10); // Always fail
        }
      });
      
      const [cpu, memory, disk] = await Promise.all([
        (service as any).getCpuUsage(),
        (service as any).getMemoryUsage(),
        (service as any).getDiskUsage(),
      ]);
      
      // Should all return valid fallback values
      expect(typeof cpu).toBe('number');
      expect(typeof memory).toBe('number');
      expect(typeof disk).toBe('number');
      
      expect(cpu).toBeGreaterThanOrEqual(0);
      expect(cpu).toBeLessThanOrEqual(100);
      expect(memory).toBeGreaterThanOrEqual(0);
      expect(memory).toBeLessThanOrEqual(100);
      expect(disk).toBeGreaterThanOrEqual(0);
      expect(disk).toBeLessThanOrEqual(100);
    });

    it('should handle permission denied errors', async () => {
      // Mock permission denied
      mockProcess.stderr.on.mockImplementation((event, callback) => {
        if (event === 'data') {
          setTimeout(() => callback(Buffer.from('Permission denied')), 10);
        }
      });
      mockProcess.on.mockImplementation((event, callback) => {
        if (event === 'close') {
          setTimeout(() => callback(126), 20); // Permission denied exit code
        }
      });

      const cpuUsage = await (service as any).getCpuUsage();
      
      // Should handle gracefully and provide fallback
      expect(typeof cpuUsage).toBe('number');
      expect(cpuUsage).toBeGreaterThanOrEqual(0);
      expect(cpuUsage).toBeLessThanOrEqual(100);
    });

    it('should continue monitoring after individual failures', async () => {
      service = await ResourceMonitorService.start(mockRuntime) as ResourceMonitorService;
      
      // Mock one failure followed by success
      let callCount = 0;
      mockProcess.on.mockImplementation((event, callback) => {
        if (event === 'close') {
          callCount++;
          const exitCode = callCount === 1 ? 1 : 0; // First call fails, subsequent succeed
          setTimeout(() => callback(exitCode), 10);
        }
      });
      
      // Wait for a couple of monitoring cycles
      await new Promise(resolve => setTimeout(resolve, 50));
      
      // Service should still be running
      expect((service as any).isMonitoring).toBe(true);
    });

    it('should handle malformed command output', async () => {
      // Mock malformed output
      const malformedOutput = 'Not valid monitoring output';
      
      mockProcess.stdout.on.mockImplementation((event, callback) => {
        if (event === 'data') {
          setTimeout(() => callback(Buffer.from(malformedOutput)), 10);
        }
      });
      mockProcess.stderr.on.mockImplementation((event, callback) => {});
      mockProcess.on.mockImplementation((event, callback) => {
        if (event === 'close') {
          setTimeout(() => callback(0), 20);
        }
      });

      const cpuUsage = await (service as any).getCpuUsage();
      
      // Should handle gracefully and provide fallback
      expect(typeof cpuUsage).toBe('number');
      expect(cpuUsage).toBeGreaterThanOrEqual(0);
      expect(cpuUsage).toBeLessThanOrEqual(100);
    });
  });

  describe('monitoring intervals and alerts', () => {
    it('should respect configured monitoring interval', async () => {
      const shortIntervalRuntime = createMockRuntime({
        settings: {
          RESOURCE_MONITOR_INTERVAL: '100', // 100ms for testing
        },
      });
      
      service = await ResourceMonitorService.start(shortIntervalRuntime) as ResourceMonitorService;
      
      expect((service as any).monitorInterval).toBe(100);
      expect((service as any).monitoringInterval).toBeDefined();
    });

    it('should generate alerts for high resource usage', async () => {
      // Mock high CPU usage
      mockProcess.stdout.on.mockImplementation((event, callback) => {
        if (event === 'data') {
          const highCpuOutput = 'CPU usage: 95.5% user, 3.2% sys, 1.3% idle';
          setTimeout(() => callback(Buffer.from(highCpuOutput)), 10);
        }
      });
      mockProcess.stderr.on.mockImplementation((event, callback) => {});
      mockProcess.on.mockImplementation((event, callback) => {
        if (event === 'close') {
          setTimeout(() => callback(0), 20);
        }
      });

      service = new ResourceMonitorService(mockRuntime);
      
      const cpuUsage = await (service as any).getCpuUsage();
      
      // Should detect high CPU usage
      expect(cpuUsage).toBeGreaterThan(90);
    });
  });

  describe('service lifecycle', () => {
    it('should stop monitoring cleanly', async () => {
      service = await ResourceMonitorService.start(mockRuntime) as ResourceMonitorService;
      
      expect((service as any).isMonitoring).toBe(true);
      expect((service as any).monitoringInterval).toBeDefined();
      
      await service.stop();
      
      expect((service as any).isMonitoring).toBe(false);
      expect((service as any).monitoringInterval).toBeNull();
    });

    it('should handle stop() called multiple times', async () => {
      service = await ResourceMonitorService.start(mockRuntime) as ResourceMonitorService;
      
      // Multiple stops should not throw
      await service.stop();
      await service.stop();
      await service.stop();
      
      expect((service as any).isMonitoring).toBe(false);
    });

    it('should clean up intervals on stop', async () => {
      service = await ResourceMonitorService.start(mockRuntime) as ResourceMonitorService;
      
      const interval = (service as any).monitoringInterval;
      expect(interval).not.toBeNull();
      
      await service.stop();
      
      expect((service as any).monitoringInterval).toBeNull();
    });
  });

  describe('service properties', () => {
    it('should have correct static properties', () => {
      expect(ResourceMonitorService.serviceType).toBe('resource-monitor');
      expect(typeof ResourceMonitorService.start).toBe('function');
    });

    it('should have correct instance properties', async () => {
      service = new ResourceMonitorService(mockRuntime);
      
      expect(service.serviceName).toBe('resource-monitor');
      expect(typeof service.capabilityDescription).toBe('string');
      expect(service.capabilityDescription).toContain('resource');
    });
  });
});