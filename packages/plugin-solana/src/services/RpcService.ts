import { IAgentRuntime, logger, Service } from '@elizaos/core';
import { Connection, ConnectionConfig } from '@solana/web3.js';
import axios from 'axios';

export interface RpcEndpoint {
  url: string;
  weight?: number; // For weighted load balancing
  maxRequestsPerSecond?: number;
  healthy?: boolean;
  lastHealthCheck?: number;
  failureCount?: number;
}

export interface RpcServiceConfig {
  endpoints: RpcEndpoint[];
  healthCheckInterval?: number;
  maxFailures?: number;
  requestTimeout?: number;
  circuitBreakerThreshold?: number;
  circuitBreakerTimeout?: number;
}

interface CircuitBreaker {
  isOpen: boolean;
  failures: number;
  lastFailureTime: number;
  openedAt?: number;
}

export class RpcService extends Service {
  static serviceName = 'rpc-service';
  static serviceType = 'rpc-service';
  capabilityDescription =
    'Advanced RPC connection management with failover, load balancing, and circuit breakers';

  private endpoints: RpcEndpoint[];
  private connections: Map<string, Connection> = new Map();
  private currentEndpointIndex: number = 0;
  private healthCheckInterval: number;
  private maxFailures: number;
  private requestTimeout: number;
  private circuitBreakers: Map<string, CircuitBreaker> = new Map();
  private circuitBreakerThreshold: number;
  private circuitBreakerTimeout: number;
  private healthCheckTimer?: NodeJS.Timeout;

  constructor(runtime: IAgentRuntime) {
    super(runtime);

    // Load configuration
    const config = this.loadConfig(runtime);
    this.endpoints = config.endpoints;
    this.healthCheckInterval = config.healthCheckInterval || 30000; // 30 seconds
    this.maxFailures = config.maxFailures || 3;
    this.requestTimeout = config.requestTimeout || 60000; // 60 seconds
    this.circuitBreakerThreshold = config.circuitBreakerThreshold || 5;
    this.circuitBreakerTimeout = config.circuitBreakerTimeout || 60000; // 1 minute

    // Initialize connections and circuit breakers
    this.initializeConnections();

    logger.info(`RpcService initialized with ${this.endpoints.length} endpoints`);
  }

  private loadConfig(runtime: IAgentRuntime): RpcServiceConfig {
    const endpoints: RpcEndpoint[] = [];

    try {
      // Primary RPC URL
      const primaryRpc = runtime.getSetting('SOLANA_RPC_URL');
      if (primaryRpc) {
        endpoints.push({ url: primaryRpc, weight: 10 });
      }

      // Fallback RPCs
      const fallbackRpcs = runtime.getSetting('SOLANA_FALLBACK_RPCS');
      if (fallbackRpcs) {
        const rpcs = fallbackRpcs.split(',').map((url: string) => url.trim());
        rpcs.forEach((url: string) => endpoints.push({ url, weight: 5 }));
      }
    } catch (error) {
      logger.warn('Error loading RPC configuration, using defaults:', error);
    }

    // Default public RPCs as last resort
    if (endpoints.length === 0) {
      endpoints.push(
        { url: 'https://api.mainnet-beta.solana.com', weight: 1 },
        { url: 'https://rpc.ankr.com/solana', weight: 1 }
      );
    }

    return { endpoints };
  }

  private initializeConnections(): void {
    for (const endpoint of this.endpoints) {
      const config: ConnectionConfig = {
        commitment: 'confirmed',
        wsEndpoint: this.getWsEndpoint(endpoint.url),
        httpHeaders: this.getHttpHeaders(endpoint.url),
        disableRetryOnRateLimit: false,
        confirmTransactionInitialTimeout: this.requestTimeout,
      };

      const connection = new Connection(endpoint.url, config);
      this.connections.set(endpoint.url, connection);

      // Initialize circuit breaker
      this.circuitBreakers.set(endpoint.url, {
        isOpen: false,
        failures: 0,
        lastFailureTime: 0,
      });

      // Mark as healthy initially
      endpoint.healthy = true;
      endpoint.lastHealthCheck = Date.now();
      endpoint.failureCount = 0;
    }
  }

  private getWsEndpoint(httpEndpoint: string): string {
    return httpEndpoint.replace('https://', 'wss://').replace('http://', 'ws://');
  }

  private getHttpHeaders(endpoint: string): Record<string, string> {
    const headers: Record<string, string> = {};

    // Add API keys if available
    if (endpoint.includes('helius')) {
      const apiKey = this.runtime.getSetting('HELIUS_API_KEY');
      if (apiKey) {
        headers['Authorization'] = `Bearer ${apiKey}`;
      }
    } else if (endpoint.includes('quicknode')) {
      const apiKey = this.runtime.getSetting('QUICKNODE_API_KEY');
      if (apiKey) {
        headers['Authorization'] = `Bearer ${apiKey}`;
      }
    }

    return headers;
  }

  static async start(runtime: IAgentRuntime): Promise<RpcService> {
    const service = new RpcService(runtime);
    await service.startHealthChecks();
    return service;
  }

  async stop(): Promise<void> {
    // Stop health checks
    if (this.healthCheckTimer) {
      clearInterval(this.healthCheckTimer);
    }

    // Close all connections
    for (const connection of this.connections.values()) {
      // Solana Connection doesn't have a close method, but we can clear the map
    }
    this.connections.clear();

    logger.info('RpcService stopped');
  }

  private async startHealthChecks(): Promise<void> {
    // Initial health check
    await this.checkAllEndpoints();

    // Periodic health checks
    this.healthCheckTimer = setInterval(() => {
      this.checkAllEndpoints().catch((err) => logger.error('Health check failed:', err));
    }, this.healthCheckInterval);
  }

  private async checkAllEndpoints(): Promise<void> {
    const checks = this.endpoints.map((endpoint) => this.checkEndpointHealth(endpoint));
    await Promise.allSettled(checks);

    // Log health status
    const healthyCount = this.endpoints.filter((e) => e.healthy).length;
    logger.info(`RPC health check: ${healthyCount}/${this.endpoints.length} endpoints healthy`);
  }

  private async checkEndpointHealth(endpoint: RpcEndpoint): Promise<void> {
    const breaker = this.circuitBreakers.get(endpoint.url);
    if (!breaker) {
      return;
    }

    // Check if circuit breaker should be reset
    if (breaker.isOpen && Date.now() - (breaker.openedAt || 0) > this.circuitBreakerTimeout) {
      breaker.isOpen = false;
      breaker.failures = 0;
      logger.info(`Circuit breaker reset for ${endpoint.url}`);
    }

    if (breaker.isOpen) {
      endpoint.healthy = false;
      return;
    }

    try {
      const connection = this.connections.get(endpoint.url);
      if (!connection) {
        return;
      }

      // Simple health check - get slot
      const start = Date.now();
      const slot = await Promise.race([
        connection.getSlot(),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error('Health check timeout')), 5000)
        ),
      ]);

      const latency = Date.now() - start;

      endpoint.healthy = true;
      endpoint.lastHealthCheck = Date.now();
      endpoint.failureCount = 0;
      breaker.failures = 0;

      logger.debug(`${endpoint.url} healthy - slot: ${slot}, latency: ${latency}ms`);
    } catch (error) {
      endpoint.healthy = false;
      endpoint.failureCount = (endpoint.failureCount || 0) + 1;
      breaker.failures++;
      breaker.lastFailureTime = Date.now();

      // Open circuit breaker if threshold reached
      if (breaker.failures >= this.circuitBreakerThreshold) {
        breaker.isOpen = true;
        breaker.openedAt = Date.now();
        logger.error(`Circuit breaker opened for ${endpoint.url}`);
      }

      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger.warn(`${endpoint.url} unhealthy: ${errorMessage}`);
    }
  }

  /**
   * Get a connection using round-robin with health checks
   */
  getConnection(): Connection {
    const healthyEndpoints = this.endpoints.filter((e) => e.healthy);

    if (healthyEndpoints.length === 0) {
      // All endpoints unhealthy, try to use the least failed one
      logger.error('All RPC endpoints unhealthy!');
      const leastFailed = this.endpoints.reduce((prev, curr) =>
        (prev.failureCount || 0) < (curr.failureCount || 0) ? prev : curr
      );
      return this.connections.get(leastFailed.url)!;
    }

    // Weighted round-robin selection
    const totalWeight = healthyEndpoints.reduce((sum, e) => sum + (e.weight || 1), 0);
    let random = Math.random() * totalWeight;

    for (const endpoint of healthyEndpoints) {
      random -= endpoint.weight || 1;
      if (random <= 0) {
        return this.connections.get(endpoint.url)!;
      }
    }

    // Fallback to first healthy endpoint
    return this.connections.get(healthyEndpoints[0].url)!;
  }

  /**
   * Get all healthy connections for parallel requests
   */
  getHealthyConnections(): Connection[] {
    return this.endpoints
      .filter((e) => e.healthy)
      .map((e) => this.connections.get(e.url)!)
      .filter((c) => c !== undefined);
  }

  /**
   * Execute a request with automatic failover
   */
  async executeWithFailover<T>(operation: (connection: Connection) => Promise<T>): Promise<T> {
    const endpoints = [...this.endpoints].sort(
      (a, b) => (a.failureCount || 0) - (b.failureCount || 0)
    );

    let lastError: Error | undefined;

    for (const endpoint of endpoints) {
      if (!endpoint.healthy) {
        continue;
      }

      const connection = this.connections.get(endpoint.url);
      if (!connection) {
        continue;
      }

      try {
        const result = await Promise.race([
          operation(connection),
          new Promise<never>((_, reject) =>
            setTimeout(() => reject(new Error('Request timeout')), this.requestTimeout)
          ),
        ]);

        // Success - reset failure count
        endpoint.failureCount = 0;
        return result;
      } catch (error: any) {
        lastError = error;
        endpoint.failureCount = (endpoint.failureCount || 0) + 1;

        logger.warn(`Request failed on ${endpoint.url}: ${error.message}`);

        // Mark unhealthy if too many failures
        if (endpoint.failureCount >= this.maxFailures) {
          endpoint.healthy = false;
          logger.error(
            `Marking ${endpoint.url} as unhealthy after ${endpoint.failureCount} failures`
          );
        }
      }
    }

    throw lastError || new Error('All RPC endpoints failed');
  }

  /**
   * Get current RPC status
   */
  getStatus(): {
    healthy: boolean;
    currentEndpoint: string;
    endpointCount: number;
    endpoints: Array<{
      url: string;
      healthy: boolean;
      failureCount: number;
      lastHealthCheck: number;
      circuitBreakerOpen: boolean;
    }>;
  } {
    const healthyEndpoints = this.endpoints.filter((e) => e.healthy);
    const currentEndpoint =
      healthyEndpoints.length > 0 ? healthyEndpoints[0].url : this.endpoints[0]?.url || '';

    return {
      healthy: healthyEndpoints.length > 0,
      currentEndpoint,
      endpointCount: this.endpoints.length,
      endpoints: this.endpoints.map((e) => ({
        url: e.url,
        healthy: e.healthy || false,
        failureCount: e.failureCount || 0,
        lastHealthCheck: e.lastHealthCheck || 0,
        circuitBreakerOpen: this.circuitBreakers.get(e.url)?.isOpen || false,
      })),
    };
  }

  /**
   * Manually trigger endpoint recovery
   */
  async recoverEndpoint(url: string): Promise<boolean> {
    const endpoint = this.endpoints.find((e) => e.url === url);
    const breaker = this.circuitBreakers.get(url);

    if (!endpoint || !breaker) {
      return false;
    }

    // Reset circuit breaker
    breaker.isOpen = false;
    breaker.failures = 0;

    // Check health
    await this.checkEndpointHealth(endpoint);

    return endpoint.healthy || false;
  }
}
