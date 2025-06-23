import Docker from 'dockerode';
import { Service, elizaLogger } from '@elizaos/core';
import type { IAgentRuntime } from '@elizaos/core';
import type {
  IDockerService,
  ContainerConfig,
  ContainerStatus,
  ContainerCreateRequest,
  ContainerLogOptions,
  ContainerStats,
  ContainerExecuteOptions,
  ContainerExecuteResult,
  DockerImageConfig,
  NetworkConfig,
  ContainerEvent,
  PortStatus,
  ResourceUsage,
} from '../types/container.js';

export class DockerService extends Service implements IDockerService {
  static serviceName = 'docker';
  static serviceType = 'container_management' as const;

  private docker: Docker = new Docker();
  private containers: Map<string, Docker.Container> = new Map();
  private networks: Map<string, Docker.Network> = new Map();
  private eventListeners: Set<(event: ContainerEvent) => void> = new Set();

  capabilityDescription =
    'Provides Docker container management capabilities for sub-agent orchestration';

  constructor(runtime?: IAgentRuntime) {
    super(runtime);
  }

  static async start(runtime: IAgentRuntime): Promise<DockerService> {
    const service = new DockerService(runtime);
    await service.initialize();
    elizaLogger.info('DockerService started successfully');
    return service;
  }

  private async initialize(): Promise<void> {
    try {
      // Initialize Docker client
      const dockerHost = this.runtime?.getSetting('DOCKER_HOST') || undefined;
      const dockerOptions: Docker.DockerOptions = {};

      if (dockerHost) {
        dockerOptions.host = dockerHost;
      }

      this.docker = new Docker(dockerOptions);

      // Test Docker connection
      await this.ping();
      elizaLogger.info('Docker connection established');

      // Setup event monitoring
      await this.setupEventMonitoring();

      // Create default network for sub-agents
      await this.ensureDefaultNetwork();
    } catch (error) {
      elizaLogger.error('Failed to initialize Docker service:', error);
      throw new Error(
        `Docker service initialization failed: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  async ping(): Promise<boolean> {
    try {
      await this.docker.ping();
      return true;
    } catch (error) {
      elizaLogger.error(
        'Docker ping failed:',
        error instanceof Error ? error.message : String(error)
      );
      return false;
    }
  }

  async getVersion(): Promise<any> {
    try {
      return await this.docker.version();
    } catch (error) {
      elizaLogger.error('Failed to get Docker version:', error);
      throw error;
    }
  }

  async createContainer(request: ContainerCreateRequest): Promise<string> {
    try {
      elizaLogger.info(`Creating container: ${request.name}`);

      const config = this.buildContainerConfig(request);
      const container = await this.docker.createContainer(config);

      this.containers.set(container.id, container);

      elizaLogger.info(`Container created successfully: ${container.id}`);
      return container.id;
    } catch (error) {
      elizaLogger.error(`Failed to create container ${request.name}:`, error);
      throw error;
    }
  }

  private buildContainerConfig(request: ContainerCreateRequest): Docker.ContainerCreateOptions {
    const { agentConfig, networkConfig, securityConfig } = request;

    const environment = [
      `AGENT_ID=${agentConfig.agentId}`,
      `AGENT_NAME=${agentConfig.agentName}`,
      `AGENT_ROLE=${agentConfig.role}`,
      `COMMUNICATION_PORT=${agentConfig.communicationPort}`,
      `HEALTH_PORT=${agentConfig.healthPort}`,
      ...Object.entries(agentConfig.environment).map(([key, value]) => `${key}=${value}`),
    ];

    const labels = {
      'eliza.agent.id': agentConfig.agentId,
      'eliza.agent.name': agentConfig.agentName,
      'eliza.agent.role': agentConfig.role,
      'eliza.container.type': 'sub-agent',
      'eliza.task.id': agentConfig.taskContext?.taskId || '',
    };

    const portBindings: { [key: string]: any } = {};
    const exposedPorts: { [key: string]: {} } = {};

    // Bind communication and health ports
    const commPortKey = `${agentConfig.communicationPort}/tcp`;
    const healthPortKey = `${agentConfig.healthPort}/tcp`;

    portBindings[commPortKey] = [{ HostPort: agentConfig.communicationPort.toString() }];
    portBindings[healthPortKey] = [{ HostPort: agentConfig.healthPort.toString() }];
    exposedPorts[commPortKey] = {};
    exposedPorts[healthPortKey] = {};

    const config: Docker.ContainerCreateOptions = {
      Image: request.image,
      name: request.name,
      Env: environment,
      Labels: labels,
      ExposedPorts: exposedPorts,
      WorkingDir: '/workspace',
      User: 'eliza',
      HostConfig: {
        PortBindings: portBindings,
        NetworkMode: networkConfig?.name || 'eliza-network',
        AutoRemove: false,
        RestartPolicy: { Name: 'unless-stopped' },
        Memory: 2 * 1024 * 1024 * 1024, // 2GB default
        CpuShares: 1024, // Default CPU shares
        Binds: [
          '/tmp:/tmp:ro', // Read-only temp access
        ],
        // Security settings
        ReadonlyRootfs: securityConfig?.readOnlyRootfs || false,
        SecurityOpt: securityConfig?.securityOpts || [],
        CapAdd: securityConfig?.capAdd || [],
        CapDrop: securityConfig?.capDrop || ['ALL'],
      },
      NetworkingConfig: networkConfig
        ? {
            EndpointsConfig: {
              [networkConfig.name]: {
                Aliases: networkConfig.aliases || [request.name],
              },
            },
          }
        : undefined,
      Healthcheck: {
        Test: [`CMD-SHELL`, `curl -f http://localhost:${agentConfig.healthPort}/health || exit 1`],
        Interval: 30000000000, // 30 seconds in nanoseconds
        Timeout: 10000000000, // 10 seconds in nanoseconds
        Retries: 3,
        StartPeriod: 60000000000, // 60 seconds in nanoseconds
      },
    };

    return config;
  }

  async startContainer(containerId: string): Promise<void> {
    try {
      const container = this.containers.get(containerId) || this.docker.getContainer(containerId);
      await container.start();
      this.containers.set(containerId, container);
      elizaLogger.info(`Container started: ${containerId}`);
    } catch (error) {
      elizaLogger.error(`Failed to start container ${containerId}:`, error);
      throw error;
    }
  }

  async stopContainer(containerId: string, timeout: number = 30): Promise<void> {
    try {
      const container = this.containers.get(containerId) || this.docker.getContainer(containerId);
      await container.stop({ t: timeout });
      elizaLogger.info(`Container stopped: ${containerId}`);
    } catch (error) {
      elizaLogger.error(`Failed to stop container ${containerId}:`, error);
      throw error;
    }
  }

  async removeContainer(containerId: string, force: boolean = false): Promise<void> {
    try {
      const container = this.containers.get(containerId) || this.docker.getContainer(containerId);
      await container.remove({ force });
      this.containers.delete(containerId);
      elizaLogger.info(`Container removed: ${containerId}`);
    } catch (error) {
      elizaLogger.error(`Failed to remove container ${containerId}:`, error);
      throw error;
    }
  }

  async getContainerStatus(containerId: string): Promise<ContainerStatus> {
    try {
      const container = this.containers.get(containerId) || this.docker.getContainer(containerId);
      const inspect = await container.inspect();

      return this.parseContainerStatus(inspect);
    } catch (error) {
      elizaLogger.error(`Failed to get container status ${containerId}:`, error);
      throw error;
    }
  }

  private parseContainerStatus(inspect: Docker.ContainerInspectInfo): ContainerStatus {
    const state = inspect.State;
    const config = inspect.Config;
    const networkSettings = inspect.NetworkSettings;

    let containerState: ContainerStatus['state'] = 'error';
    if (state.Running) containerState = 'running';
    else if (state.Paused) containerState = 'paused';
    else if (state.ExitCode === 0) containerState = 'exited';
    else if (state.ExitCode !== 0) containerState = 'error';
    else containerState = 'stopped';

    let health: ContainerStatus['health'] = 'none';
    if (state.Health) {
      switch (state.Health.Status) {
        case 'healthy':
          health = 'healthy';
          break;
        case 'unhealthy':
          health = 'unhealthy';
          break;
        case 'starting':
          health = 'starting';
          break;
        default:
          health = 'none';
      }
    }

    const ports: PortStatus[] = [];
    if (networkSettings.Ports) {
      for (const [port, bindings] of Object.entries(networkSettings.Ports)) {
        if (bindings) {
          for (const binding of bindings) {
            const [containerPort, protocol] = port.split('/');
            ports.push({
              containerPort: parseInt(containerPort),
              hostPort: parseInt(binding.HostPort),
              protocol,
              hostIp: binding.HostIp,
            });
          }
        }
      }
    }

    return {
      id: inspect.Id,
      name: inspect.Name.replace(/^\//, ''),
      state: containerState,
      health,
      startedAt: state.StartedAt ? new Date(state.StartedAt) : undefined,
      finishedAt: state.FinishedAt ? new Date(state.FinishedAt) : undefined,
      exitCode: state.ExitCode,
      error: state.Error || undefined,
      ports,
    };
  }

  async listContainers(filters?: Record<string, string>): Promise<ContainerStatus[]> {
    try {
      const options: Docker.ContainerListOptions = {
        all: true,
        filters: filters ? JSON.stringify(filters) : undefined,
      };

      const containers = await this.docker.listContainers(options);
      const statuses: ContainerStatus[] = [];

      for (const container of containers) {
        const fullInfo = await this.docker.getContainer(container.Id).inspect();
        statuses.push(this.parseContainerStatus(fullInfo));
      }

      return statuses;
    } catch (error) {
      elizaLogger.error('Failed to list containers:', error);
      throw error;
    }
  }

  async getContainerLogs(
    containerId: string,
    options?: ContainerLogOptions
  ): Promise<NodeJS.ReadableStream> {
    try {
      const container = this.containers.get(containerId) || this.docker.getContainer(containerId);

      const logOptions: any = {
        follow: options?.follow || false,
        stdout: options?.stdout !== false,
        stderr: options?.stderr !== false,
        timestamps: options?.timestamps || false,
      };

      if (options?.tail) logOptions.tail = options.tail;
      if (options?.since) logOptions.since = Math.floor(options.since.getTime() / 1000);

      return (await container.logs(logOptions)) as any;
    } catch (error) {
      elizaLogger.error(`Failed to get container logs ${containerId}:`, error);
      throw error;
    }
  }

  async getContainerStats(containerId: string): Promise<ContainerStats> {
    try {
      const container = this.containers.get(containerId) || this.docker.getContainer(containerId);
      const stats = await container.stats({ stream: false });

      return this.parseContainerStats(containerId, stats);
    } catch (error) {
      elizaLogger.error(`Failed to get container stats ${containerId}:`, error);
      throw error;
    }
  }

  private parseContainerStats(containerId: string, stats: any): ContainerStats {
    const cpuStats = stats.cpu_stats;
    const precpuStats = stats.precpu_stats;
    const memoryStats = stats.memory_stats;
    const networkStats = stats.networks;
    const blkioStats = stats.blkio_stats;

    // Calculate CPU percentage
    let cpuPercent = 0;
    if (cpuStats.cpu_usage && precpuStats.cpu_usage) {
      const cpuDelta = cpuStats.cpu_usage.total_usage - precpuStats.cpu_usage.total_usage;
      const systemDelta = cpuStats.system_cpu_usage - precpuStats.system_cpu_usage;
      const numberCpus = cpuStats.online_cpus || 1;

      if (systemDelta > 0 && cpuDelta > 0) {
        cpuPercent = (cpuDelta / systemDelta) * numberCpus * 100;
      }
    }

    // Calculate memory percentage
    const memoryUsage = memoryStats.usage || 0;
    const memoryLimit = memoryStats.limit || 0;
    const memoryPercent = memoryLimit > 0 ? (memoryUsage / memoryLimit) * 100 : 0;

    // Calculate network stats
    let networkRx = 0;
    let networkTx = 0;
    if (networkStats) {
      for (const network of Object.values(networkStats) as any[]) {
        networkRx += network.rx_bytes || 0;
        networkTx += network.tx_bytes || 0;
      }
    }

    // Calculate block I/O stats
    let blockRead = 0;
    let blockWrite = 0;
    if (blkioStats.io_service_bytes_recursive) {
      for (const stat of blkioStats.io_service_bytes_recursive) {
        if (stat.op === 'Read') blockRead += stat.value;
        if (stat.op === 'Write') blockWrite += stat.value;
      }
    }

    return {
      id: containerId,
      name: stats.name || containerId.slice(0, 12),
      cpu: {
        totalUsage: cpuStats.cpu_usage?.total_usage || 0,
        systemUsage: cpuStats.system_cpu_usage || 0,
        usagePercent: cpuPercent,
      },
      memory: {
        usage: memoryUsage,
        limit: memoryLimit,
        usagePercent: memoryPercent,
      },
      network: {
        rxBytes: networkRx,
        txBytes: networkTx,
      },
      blockIO: {
        readBytes: blockRead,
        writeBytes: blockWrite,
      },
      timestamp: new Date(),
    };
  }

  async executeInContainer(
    containerId: string,
    options: ContainerExecuteOptions
  ): Promise<ContainerExecuteResult> {
    try {
      const container = this.containers.get(containerId) || this.docker.getContainer(containerId);

      const execOptions: Docker.ExecCreateOptions = {
        Cmd: options.command,
        AttachStdout: options.attachStdout !== false,
        AttachStderr: options.attachStderr !== false,
        AttachStdin: options.attachStdin || false,
        Tty: options.tty || false,
        WorkingDir: options.workingDir,
        User: options.user,
        Env: options.environment
          ? Object.entries(options.environment).map(([k, v]) => `${k}=${v}`)
          : undefined,
        Privileged: options.privileged || false,
      };

      const startTime = Date.now();
      const exec = await container.exec(execOptions);
      const stream = await exec.start({ hijack: true, stdin: true });

      let stdout = '';
      let stderr = '';

      return new Promise((resolve, reject) => {
        container.modem.demuxStream(
          stream,
          (chunk: Buffer) => {
            stdout += chunk.toString();
          }, // stdout
          (chunk: Buffer) => {
            stderr += chunk.toString();
          } // stderr
        );

        stream.on('end', async () => {
          try {
            const inspect = await exec.inspect();
            const duration = Date.now() - startTime;

            resolve({
              exitCode: inspect.ExitCode || 0,
              stdout,
              stderr,
              duration,
            });
          } catch (error) {
            reject(error);
          }
        });

        stream.on('error', reject);
      });
    } catch (error) {
      elizaLogger.error(`Failed to execute in container ${containerId}:`, error);
      throw error;
    }
  }

  async attachToContainer(containerId: string): Promise<NodeJS.ReadWriteStream> {
    try {
      const container = this.containers.get(containerId) || this.docker.getContainer(containerId);

      const stream = await container.attach({
        stream: true,
        stdin: true,
        stdout: true,
        stderr: true,
      });

      return stream;
    } catch (error) {
      elizaLogger.error(`Failed to attach to container ${containerId}:`, error);
      throw error;
    }
  }

  async buildImage(config: DockerImageConfig): Promise<string> {
    try {
      elizaLogger.info(`Building image: ${config.name}:${config.tag}`);

      const buildOptions = {
        t: `${config.name}:${config.tag}`,
        buildargs: config.buildArgs,
        labels: config.labels,
        dockerfile: config.dockerfile || 'Dockerfile',
      };

      const stream = await this.docker.buildImage(config.buildContext || '.', buildOptions);

      return new Promise((resolve, reject) => {
        this.docker.modem.followProgress(
          stream,
          (err: any, res: any) => {
            if (err) {
              reject(err);
            } else {
              const imageId = res[res.length - 1]?.aux?.ID || `${config.name}:${config.tag}`;
              elizaLogger.info(`Image built successfully: ${imageId}`);
              resolve(imageId);
            }
          },
          (event: any) => {
            if (event.stream) {
              elizaLogger.debug(`Build: ${event.stream.trim()}`);
            }
          }
        );
      });
    } catch (error) {
      elizaLogger.error(`Failed to build image ${config.name}:`, error);
      throw error;
    }
  }

  async pullImage(name: string, tag: string = 'latest'): Promise<void> {
    try {
      elizaLogger.info(`Pulling image: ${name}:${tag}`);

      const stream = await this.docker.pull(`${name}:${tag}`);

      return new Promise((resolve, reject) => {
        this.docker.modem.followProgress(stream, (err: any) => {
          if (err) {
            reject(err);
          } else {
            elizaLogger.info(`Image pulled successfully: ${name}:${tag}`);
            resolve();
          }
        });
      });
    } catch (error) {
      elizaLogger.error(`Failed to pull image ${name}:${tag}:`, error);
      throw error;
    }
  }

  async listImages(): Promise<any[]> {
    try {
      return await this.docker.listImages();
    } catch (error) {
      elizaLogger.error('Failed to list images:', error);
      throw error;
    }
  }

  async removeImage(imageId: string, force: boolean = false): Promise<void> {
    try {
      const image = this.docker.getImage(imageId);
      await image.remove({ force });
      elizaLogger.info(`Image removed: ${imageId}`);
    } catch (error) {
      elizaLogger.error(`Failed to remove image ${imageId}:`, error);
      throw error;
    }
  }

  async createNetwork(config: NetworkConfig): Promise<string> {
    try {
      elizaLogger.info(`Creating network: ${config.name}`);

      const networkOptions: Docker.NetworkCreateOptions = {
        Name: config.name,
        IPAM: config.subnet
          ? {
              Config: [
                {
                  Subnet: config.subnet,
                  Gateway: config.gateway,
                },
              ],
            }
          : undefined,
        Options: config.isolated
          ? {
              'com.docker.network.bridge.enable_icc': 'false',
            }
          : undefined,
      };

      const network = await this.docker.createNetwork(networkOptions);
      this.networks.set(network.id, network);

      elizaLogger.info(`Network created: ${network.id}`);
      return network.id;
    } catch (error) {
      elizaLogger.error(`Failed to create network ${config.name}:`, error);
      throw error;
    }
  }

  async removeNetwork(networkId: string): Promise<void> {
    try {
      const network = this.networks.get(networkId) || this.docker.getNetwork(networkId);
      await network.remove();
      this.networks.delete(networkId);
      elizaLogger.info(`Network removed: ${networkId}`);
    } catch (error) {
      elizaLogger.error(`Failed to remove network ${networkId}:`, error);
      throw error;
    }
  }

  async listNetworks(): Promise<any[]> {
    try {
      return await this.docker.listNetworks();
    } catch (error) {
      elizaLogger.error('Failed to list networks:', error);
      throw error;
    }
  }

  private async setupEventMonitoring(): Promise<void> {
    try {
      const stream = await this.docker.getEvents({
        filters: JSON.stringify({
          label: ['eliza.container.type=sub-agent'],
        }),
      });

      stream.on('data', (chunk: Buffer) => {
        try {
          const events = chunk
            .toString()
            .split('\n')
            .filter((line) => line.trim());
          for (const eventLine of events) {
            const event = JSON.parse(eventLine);
            this.handleDockerEvent(event);
          }
        } catch (error) {
          elizaLogger.error('Error parsing Docker event:', error);
        }
      });

      stream.on('error', (error: Error) => {
        elizaLogger.error('Docker events stream error:', error);
      });

      elizaLogger.info('Docker event monitoring started');
    } catch (error) {
      elizaLogger.warn('Failed to setup Docker event monitoring:', error);
    }
  }

  private handleDockerEvent(dockerEvent: any): void {
    const event: ContainerEvent = {
      type: dockerEvent.Action,
      containerId: dockerEvent.Actor.ID,
      containerName: dockerEvent.Actor.Attributes?.name || dockerEvent.Actor.ID.slice(0, 12),
      timestamp: new Date(dockerEvent.time * 1000),
      data: dockerEvent.Actor.Attributes,
    };

    // Notify all listeners
    for (const listener of this.eventListeners) {
      try {
        listener(event);
      } catch (error) {
        elizaLogger.error('Error in container event listener:', error);
      }
    }
  }

  addEventListener(listener: (event: ContainerEvent) => void): void {
    this.eventListeners.add(listener);
  }

  removeEventListener(listener: (event: ContainerEvent) => void): void {
    this.eventListeners.delete(listener);
  }

  private async ensureDefaultNetwork(): Promise<void> {
    try {
      const networks = await this.listNetworks();
      const existingNetwork = networks.find((net) => net.Name === 'eliza-network');

      if (!existingNetwork) {
        await this.createNetwork({
          name: 'eliza-network',
          subnet: '172.20.0.0/16',
          gateway: '172.20.0.1',
        });
        elizaLogger.info('Created default Eliza network');
      } else {
        elizaLogger.info('Default Eliza network already exists');
      }
    } catch (error) {
      elizaLogger.warn('Failed to ensure default network:', error);
    }
  }

  async stop(): Promise<void> {
    try {
      // Stop monitoring events
      this.eventListeners.clear();

      // Stop all managed containers
      for (const [id, container] of this.containers) {
        try {
          await container.stop({ t: 10 });
          elizaLogger.info(`Stopped container: ${id}`);
        } catch (error) {
          elizaLogger.warn(`Failed to stop container ${id}:`, error);
        }
      }

      this.containers.clear();
      this.networks.clear();

      elizaLogger.info('DockerService stopped');
    } catch (error) {
      elizaLogger.error('Error stopping DockerService:', error);
      throw error;
    }
  }
}
