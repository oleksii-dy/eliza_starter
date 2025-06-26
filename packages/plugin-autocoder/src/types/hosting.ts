/**
 * Hosting Types for ElizaOS Platform
 * Type definitions for deployment, orchestration, and hosting management
 */

// Core deployment and hosting interfaces
export interface HostingDeployment {
  id: string;
  name: string;
  description?: string;

  // Deployment target
  target: {
    type: 'agent' | 'mcp' | 'plugin' | 'service';
    registryItemId: string;
    version: string;
  };

  // Deployment configuration
  config: DeploymentConfig;

  // Current status
  status: DeploymentStatus;

  // Resource allocation
  resources: ResourceAllocation;

  // Networking configuration
  networking: NetworkingConfig;

  // Environment and runtime
  environment: EnvironmentConfig;

  // Monitoring and health
  health: HealthStatus;

  // Deployment metadata
  metadata: {
    owner: {
      userId: string;
      organizationId?: string;
    };
    tags: string[];
    region: string;
    availability: 'development' | 'staging' | 'production';
    tier: 'free' | 'basic' | 'professional' | 'enterprise';
  };

  // Timestamps
  createdAt: Date;
  updatedAt: Date;
  deployedAt?: Date;
  lastRestartAt?: Date;
}

// Deployment configuration
export interface DeploymentConfig {
  // Container configuration
  container: {
    image?: string;
    tag?: string;
    registry?: string;
    pullPolicy: 'always' | 'if-not-present' | 'never';

    // Runtime settings
    runtime: {
      platform?: string;
      user?: string;
      workingDir?: string;
      entrypoint?: string[];
      command?: string[];
    };

    // Security settings
    security: {
      readOnlyRootFilesystem: boolean;
      runAsNonRoot: boolean;
      allowPrivilegeEscalation: boolean;
      capabilities: {
        add: string[];
        drop: string[];
      };
    };
  };

  // Scaling configuration
  scaling: {
    type: 'manual' | 'horizontal' | 'vertical';
    replicas: number;
    minReplicas: number;
    maxReplicas: number;

    // Auto-scaling triggers
    triggers: ScalingTrigger[];

    // Rolling update strategy
    strategy: {
      type: 'rolling' | 'blue-green' | 'canary';
      maxUnavailable: number | string;
      maxSurge: number | string;
    };
  };

  // Persistence configuration
  persistence: {
    volumes: VolumeConfig[];
    database?: DatabaseConfig;
    cache?: CacheConfig;
  };

  // Configuration and secrets
  configuration: {
    env: Record<string, string>;
    secrets: Record<string, string>;
    configMaps: Record<string, string>;
    files: ConfigFile[];
  };
}

// Resource allocation and limits
export interface ResourceAllocation {
  // Compute resources
  cpu: {
    request: string; // e.g., "100m", "0.5"
    limit: string;
    usage?: {
      current: number;
      average: number;
      peak: number;
    };
  };

  memory: {
    request: string; // e.g., "128Mi", "1Gi"
    limit: string;
    usage?: {
      current: number;
      average: number;
      peak: number;
    };
  };

  storage: {
    ephemeral?: string;
    persistent?: string;
    usage?: {
      total: number;
      used: number;
      available: number;
    };
  };

  // Network resources
  network: {
    bandwidth?: {
      ingress: string;
      egress: string;
    };
    connections?: {
      max: number;
      current: number;
    };
  };

  // Cost estimation
  cost: {
    estimated: {
      hourly: number;
      daily: number;
      monthly: number;
    };
    actual?: {
      hourly: number;
      daily: number;
      monthly: number;
    };
    currency: string;
  };
}

// Networking configuration
export interface NetworkingConfig {
  // External access
  ingress: {
    enabled: boolean;
    className?: string;
    hostname?: string;
    path?: string;
    tls?: {
      enabled: boolean;
      secretName?: string;
      certificate?: string;
    };
  };

  // Service configuration
  service: {
    type: 'ClusterIP' | 'NodePort' | 'LoadBalancer';
    ports: ServicePort[];
    annotations?: Record<string, string>;
  };

  // Network policies
  policies: {
    ingress: NetworkPolicy[];
    egress: NetworkPolicy[];
  };

  // Load balancing
  loadBalancer: {
    algorithm: 'round-robin' | 'least-connections' | 'ip-hash';
    healthCheck: {
      path: string;
      interval: number;
      timeout: number;
      retries: number;
    };
  };
}

// Environment and runtime configuration
export interface EnvironmentConfig {
  // Runtime platform
  platform: {
    type: 'kubernetes' | 'docker' | 'serverless';
    version: string;
    provider: string;
    region: string;
  };

  // Node selection
  nodeSelector?: Record<string, string>;
  affinity?: {
    nodeAffinity?: any;
    podAffinity?: any;
    podAntiAffinity?: any;
  };
  tolerations?: Array<{
    key: string;
    operator: 'Equal' | 'Exists';
    value?: string;
    effect: 'NoSchedule' | 'PreferNoSchedule' | 'NoExecute';
  }>;

  // ElizaOS specific configuration
  elizaos: {
    version: string;
    character?: string;
    plugins: string[];
    mcpServers: string[];

    // Runtime settings
    runtime: {
      model: string;
      provider: string;
      temperature?: number;
      maxTokens?: number;
    };

    // Client configuration
    clients: string[];

    // Database configuration
    database?: {
      type: 'sqlite' | 'postgresql' | 'mysql';
      connection: string;
      migrations: boolean;
    };
  };
}

// Health and monitoring
export interface HealthStatus {
  // Overall status
  status: 'healthy' | 'degraded' | 'unhealthy' | 'unknown';

  // Health checks
  checks: HealthCheck[];

  // Uptime metrics
  uptime: {
    percentage: number;
    totalTime: number;
    downTime: number;
    lastIncident?: Date;
  };

  // Performance metrics
  performance: {
    responseTime: {
      average: number;
      p50: number;
      p95: number;
      p99: number;
    };
    throughput: {
      requestsPerSecond: number;
      requestsPerMinute: number;
    };
    errorRate: {
      percentage: number;
      count: number;
    };
  };

  // Resource health
  resources: {
    cpu: HealthMetric;
    memory: HealthMetric;
    storage: HealthMetric;
    network: HealthMetric;
  };

  // Service dependencies
  dependencies: Array<{
    name: string;
    type: 'database' | 'cache' | 'api' | 'mcp' | 'plugin';
    status: 'healthy' | 'degraded' | 'unhealthy';
    responseTime?: number;
    lastChecked: Date;
  }>;
}

// Deployment status and lifecycle
export interface DeploymentStatus {
  phase: 'pending' | 'building' | 'deploying' | 'running' | 'stopping' | 'stopped' | 'failed' | 'unknown';

  // Detailed status information
  conditions: StatusCondition[];

  // Replica status (for multi-instance deployments)
  replicas: {
    desired: number;
    current: number;
    ready: number;
    available: number;
    unavailable: number;
  };

  // Deployment progress
  progress: {
    percentage: number;
    stage: string;
    message?: string;
    estimatedTimeRemaining?: number;
  };

  // Recent events
  events: DeploymentEvent[];

  // Rollout history
  rollout: {
    revision: number;
    history: RolloutHistoryItem[];
    canRollback: boolean;
  };
}

// Supporting interfaces
export interface ScalingTrigger {
  type: 'cpu' | 'memory' | 'requests' | 'custom';
  metric: string;
  threshold: number;
  scaleUp: {
    increment: number;
    cooldown: number; // seconds
  };
  scaleDown: {
    decrement: number;
    cooldown: number; // seconds
  };
}

export interface VolumeConfig {
  name: string;
  type: 'emptyDir' | 'hostPath' | 'persistentVolume' | 'configMap' | 'secret';
  mountPath: string;
  size?: string;
  storageClass?: string;
  accessModes?: string[];
  readOnly?: boolean;
}

export interface DatabaseConfig {
  type: 'postgresql' | 'mysql' | 'mongodb' | 'redis';
  host: string;
  port: number;
  database: string;
  username: string;
  password: string;
  connectionPool?: {
    min: number;
    max: number;
    idle: number;
  };
  ssl?: boolean;
  backup?: {
    enabled: boolean;
    schedule: string;
    retention: number; // days
  };
}

export interface CacheConfig {
  type: 'redis' | 'memcached';
  host: string;
  port: number;
  database?: number;
  ttl?: number; // seconds
  maxMemory?: string;
  evictionPolicy?: string;
}

export interface ConfigFile {
  path: string;
  content: string;
  mode?: string;
  encoding?: 'utf8' | 'base64';
}

export interface ServicePort {
  name: string;
  port: number;
  targetPort: number | string;
  protocol: 'TCP' | 'UDP';
  nodePort?: number;
}

export interface NetworkPolicy {
  from?: Array<{
    namespaceSelector?: Record<string, string>;
    podSelector?: Record<string, string>;
    ipBlock?: {
      cidr: string;
      except?: string[];
    };
  }>;
  to?: Array<{
    namespaceSelector?: Record<string, string>;
    podSelector?: Record<string, string>;
    ipBlock?: {
      cidr: string;
      except?: string[];
    };
  }>;
  ports?: Array<{
    protocol: 'TCP' | 'UDP';
    port: number | string;
  }>;
}

export interface HealthCheck {
  name: string;
  type: 'http' | 'tcp' | 'exec' | 'grpc';
  endpoint?: string;
  port?: number;
  command?: string[];
  interval: number; // seconds
  timeout: number; // seconds
  retries: number;
  successThreshold: number;
  failureThreshold: number;

  // Status
  status: 'passing' | 'warning' | 'failing' | 'unknown';
  lastCheck: Date;
  lastSuccess?: Date;
  lastFailure?: Date;
  message?: string;
}

export interface HealthMetric {
  status: 'healthy' | 'warning' | 'critical';
  value: number;
  threshold: {
    warning: number;
    critical: number;
  };
  unit: string;
  trend: 'stable' | 'increasing' | 'decreasing';
}

export interface StatusCondition {
  type: string;
  status: 'True' | 'False' | 'Unknown';
  reason: string;
  message: string;
  lastTransitionTime: Date;
  lastUpdateTime: Date;
}

export interface DeploymentEvent {
  type: 'normal' | 'warning' | 'error';
  reason: string;
  message: string;
  timestamp: Date;
  source: {
    component: string;
    host?: string;
  };
  involvedObject: {
    kind: string;
    name: string;
    uid?: string;
  };
}

export interface RolloutHistoryItem {
  revision: number;
  change: string;
  timestamp: Date;
  success: boolean;
  duration: number; // seconds
  rollbackTo?: number;
}

// Hosting management operations
export interface DeploymentRequest {
  name: string;
  description?: string;
  registryItemId: string;
  version: string;
  config: Partial<DeploymentConfig>;
  region?: string;
  tier?: 'free' | 'basic' | 'professional' | 'enterprise';
  tags?: string[];
}

export interface DeploymentUpdateRequest {
  id: string;
  config?: Partial<DeploymentConfig>;
  version?: string;
  scaling?: Partial<DeploymentConfig['scaling']>;
  resources?: Partial<ResourceAllocation>;
}

export interface DeploymentAction {
  type: 'start' | 'stop' | 'restart' | 'pause' | 'resume' | 'scale' | 'rollback' | 'delete';
  parameters?: Record<string, any>;
  reason?: string;
}

// Hosting analytics and monitoring
export interface HostingMetrics {
  // Resource utilization
  resources: {
    cpu: TimeSeries;
    memory: TimeSeries;
    network: {
      ingress: TimeSeries;
      egress: TimeSeries;
    };
    storage: TimeSeries;
  };

  // Performance metrics
  performance: {
    responseTime: TimeSeries;
    throughput: TimeSeries;
    errorRate: TimeSeries;
    availability: TimeSeries;
  };

  // Cost metrics
  cost: {
    hourly: TimeSeries;
    daily: TimeSeries;
    monthly: TimeSeries;
    projected: number;
  };

  // Usage patterns
  usage: {
    peakHours: Array<{ hour: number; value: number }>;
    dailyPattern: Array<{ day: string; value: number }>;
    seasonality: Array<{ period: string; value: number }>;
  };
}

export interface TimeSeries {
  values: Array<{
    timestamp: Date;
    value: number;
  }>;
  aggregation: 'sum' | 'average' | 'min' | 'max' | 'count';
  unit: string;
}

// Hosting regions and infrastructure
export interface HostingRegion {
  id: string;
  name: string;
  displayName: string;
  country: string;
  continent: string;

  // Capabilities
  capabilities: {
    gpu: boolean;
    highMemory: boolean;
    ssd: boolean;
    networkOptimized: boolean;
  };

  // Compliance and certifications
  compliance: string[];

  // Resource availability
  availability: {
    cpu: 'high' | 'medium' | 'low';
    memory: 'high' | 'medium' | 'low';
    storage: 'high' | 'medium' | 'low';
  };

  // Pricing
  pricing: {
    cpu: number; // per vCPU hour
    memory: number; // per GB hour
    storage: number; // per GB month
    network: number; // per GB
    currency: string;
  };

  // Network characteristics
  network: {
    latency: Record<string, number>; // Latency to other regions
    bandwidth: string;
    provider: string;
  };
}

// Multi-tenant hosting
export interface TenantIsolation {
  type: 'none' | 'namespace' | 'cluster' | 'node';

  // Resource quotas
  quotas: {
    cpu: string;
    memory: string;
    storage: string;
    pods: number;
    services: number;
    persistentVolumes: number;
  };

  // Network isolation
  networkPolicies: boolean;

  // Security policies
  securityContext: {
    runAsUser?: number;
    runAsGroup?: number;
    fsGroup?: number;
    seccompProfile?: string;
    seLinuxOptions?: Record<string, string>;
  };
}

// Hosting backup and disaster recovery
export interface BackupConfig {
  enabled: boolean;
  schedule: string; // Cron expression
  retention: {
    daily: number;
    weekly: number;
    monthly: number;
    yearly: number;
  };

  storage: {
    provider: 's3' | 'gcs' | 'azure' | 'local';
    bucket: string;
    region: string;
    encryption: boolean;
  };

  scope: {
    volumes: boolean;
    databases: boolean;
    configuration: boolean;
  };
}
