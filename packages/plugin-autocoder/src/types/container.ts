import type { UUID } from '@elizaos/core';

export interface ContainerConfig {
  id: string;
  name: string;
  image: string;
  environment: Record<string, string>;
  volumes: VolumeMount[];
  ports: PortMapping[];
  network: string;
  labels: Record<string, string>;
  workingDir?: string;
  user?: string;
  healthCheck?: HealthCheckConfig;
  resources?: ResourceLimits;
}

export interface VolumeMount {
  hostPath: string;
  containerPath: string;
  readOnly?: boolean;
  type?: 'bind' | 'volume' | 'tmpfs';
}

export interface PortMapping {
  hostPort: number;
  containerPort: number;
  protocol: 'tcp' | 'udp';
  hostIp?: string;
}

export interface HealthCheckConfig {
  command: string[];
  interval: number; // milliseconds
  timeout: number; // milliseconds
  retries: number;
  startPeriod?: number; // milliseconds
}

export interface ResourceLimits {
  memory?: number; // bytes
  cpuShares?: number;
  cpuQuota?: number;
  cpuPeriod?: number;
  blkioWeight?: number;
}

export interface ContainerStatus {
  id: string;
  name: string;
  state: 'creating' | 'running' | 'stopped' | 'paused' | 'error' | 'exited';
  health: 'healthy' | 'unhealthy' | 'starting' | 'none';
  startedAt?: Date;
  finishedAt?: Date;
  exitCode?: number;
  error?: string;
  ports?: PortStatus[];
  resources?: ResourceUsage;
}

export interface PortStatus {
  containerPort: number;
  hostPort: number;
  protocol: string;
  hostIp: string;
}

export interface ResourceUsage {
  cpuPercent?: number;
  memoryUsage?: number;
  memoryLimit?: number;
  networkRx?: number;
  networkTx?: number;
  blockRead?: number;
  blockWrite?: number;
}

export interface ContainerLogOptions {
  follow?: boolean;
  tail?: number;
  since?: Date;
  timestamps?: boolean;
  stdout?: boolean;
  stderr?: boolean;
}

export interface ContainerStats {
  id: string;
  name: string;
  cpu: {
    totalUsage: number;
    systemUsage: number;
    usagePercent: number;
  };
  memory: {
    usage: number;
    limit: number;
    usagePercent: number;
  };
  network: {
    rxBytes: number;
    txBytes: number;
  };
  blockIO: {
    readBytes: number;
    writeBytes: number;
  };
  timestamp: Date;
}

export interface SubAgentConfig {
  agentId: UUID;
  containerId: string;
  agentName: string;
  role: 'coder' | 'reviewer' | 'tester';
  capabilities: string[];
  communicationPort: number;
  healthPort: number;
  environment: Record<string, string>;
  taskContext?: TaskContext;
}

export interface TaskContext {
  taskId: UUID;
  description: string;
  requirements: string[];
  acceptanceCriteria: string[];
  timeoutMs: number;
  priority: 'low' | 'medium' | 'high' | 'critical';
  assignedAt: Date;
  deadline?: Date;
}

export interface ContainerCreateRequest {
  name: string;
  image: string;
  agentConfig: SubAgentConfig;
  networkConfig?: NetworkConfig;
  securityConfig?: SecurityConfig;
}

export interface NetworkConfig {
  name: string;
  subnet?: string;
  gateway?: string;
  isolated?: boolean;
  aliases?: string[];
}

export interface SecurityConfig {
  readOnlyRootfs?: boolean;
  noNewPrivileges?: boolean;
  capAdd?: string[];
  capDrop?: string[];
  securityOpts?: string[];
  apparmorProfile?: string;
  selinuxLabel?: string;
}

export interface ContainerEvent {
  type: 'create' | 'start' | 'stop' | 'die' | 'destroy' | 'health_status';
  containerId: string;
  containerName: string;
  timestamp: Date;
  data?: any;
  error?: string;
}

export interface DockerImageConfig {
  name: string;
  tag: string;
  dockerfile?: string;
  buildContext?: string;
  buildArgs?: Record<string, string>;
  labels?: Record<string, string>;
}

export interface ContainerExecuteOptions {
  command: string[];
  workingDir?: string;
  user?: string;
  environment?: Record<string, string>;
  attachStdout?: boolean;
  attachStderr?: boolean;
  attachStdin?: boolean;
  tty?: boolean;
  privileged?: boolean;
}

export interface ContainerExecuteResult {
  exitCode: number;
  stdout: string;
  stderr: string;
  duration: number;
}

// Service-level interfaces
export interface IContainerManager {
  createContainer(request: ContainerCreateRequest): Promise<string>;
  startContainer(containerId: string): Promise<void>;
  stopContainer(containerId: string, timeout?: number): Promise<void>;
  removeContainer(containerId: string, force?: boolean): Promise<void>;
  getContainerStatus(containerId: string): Promise<ContainerStatus>;
  listContainers(filters?: Record<string, string>): Promise<ContainerStatus[]>;
  getContainerLogs(
    containerId: string,
    _options?: ContainerLogOptions
  ): Promise<NodeJS.ReadableStream>;
  getContainerStats(containerId: string): Promise<ContainerStats>;
  executeInContainer(
    containerId: string,
    _options: ContainerExecuteOptions
  ): Promise<ContainerExecuteResult>;
  attachToContainer(containerId: string): Promise<NodeJS.ReadWriteStream>;
}

export interface IDockerService extends IContainerManager {
  ping(): Promise<boolean>;
  getVersion(): Promise<any>;
  buildImage(config: DockerImageConfig): Promise<string>;
  pullImage(name: string, tag?: string): Promise<void>;
  listImages(): Promise<any[]>;
  removeImage(imageId: string, force?: boolean): Promise<void>;
  createNetwork(config: NetworkConfig): Promise<string>;
  removeNetwork(networkId: string): Promise<void>;
  listNetworks(): Promise<any[]>;
}
