/**
 * Port allocation utility for CLI tests
 * Prevents port conflicts by managing a pool of available ports
 */

import { createServer } from 'node:net';

export class PortAllocator {
  private static instance: PortAllocator;
  private usedPorts = new Set<number>();
  private readonly basePort = 3000;
  private readonly maxPort = 3999;

  private constructor() {}

  static getInstance(): PortAllocator {
    if (!PortAllocator.instance) {
      PortAllocator.instance = new PortAllocator();
    }
    return PortAllocator.instance;
  }

  /**
   * Allocate a free port for testing
   */
  async allocatePort(): Promise<number> {
    for (let port = this.basePort; port <= this.maxPort; port++) {
      if (!this.usedPorts.has(port) && await this.isPortAvailable(port)) {
        this.usedPorts.add(port);
        return port;
      }
    }
    throw new Error('No available ports in range');
  }

  /**
   * Release a port back to the pool
   */
  releasePort(port: number): void {
    this.usedPorts.delete(port);
  }

  /**
   * Check if a port is available
   */
  private async isPortAvailable(port: number): Promise<boolean> {
    return new Promise((resolve) => {
      const server = createServer();

      server.listen(port, () => {
        server.close(() => {
          resolve(true);
        });
      });

      server.on('error', () => {
        resolve(false);
      });
    });
  }

  /**
   * Get a deterministic port for a test (useful for consistent test behavior)
   */
  getDeterministicPort(testName: string): number {
    // Simple hash to get consistent port per test name
    let hash = 0;
    for (let i = 0; i < testName.length; i++) {
      const char = testName.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }

    // Map to port range
    const port = this.basePort + (Math.abs(hash) % (this.maxPort - this.basePort));
    return port;
  }

  /**
   * Clean up all allocated ports
   */
  cleanup(): void {
    this.usedPorts.clear();
  }
}

/**
 * Convenience functions for tests
 */
export const portAllocator = PortAllocator.getInstance();

export async function getTestPort(): Promise<number> {
  return await portAllocator.allocatePort();
}

export function releaseTestPort(port: number): void {
  portAllocator.releasePort(port);
}

export function getNamedTestPort(testName: string): number {
  return portAllocator.getDeterministicPort(testName);
}
