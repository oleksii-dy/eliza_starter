import Docker from 'dockerode';
import { Service, elizaLogger } from '@elizaos/core';
import type { IAgentRuntime } from '@elizaos/core';
import type {
  IDockerService,
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
} from '../types/container.js';

export class DockerService extends Service implements IDockerService {
  static _serviceName = 'docker';
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
      const dockerOptions: Docker.DockerOptions = { /* empty */ };

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
    } catch (_error) {
      elizaLogger.error('Failed to initialize Docker service:', _error);
      throw new Error(
        `Docker service initialization failed: ${_error instanceof Error ? _error.message : String(_error)}`
      );
    }
  }

  async ping(): Promise<boolean> {
    try {
      await this.docker.ping();
      return true;
    } catch (_error) {
      elizaLogger.error(
        'Docker ping failed:',
        _error instanceof Error ? _error.message : String(_error)
      );
      return false;
    }
  }

  async getVersion(): Promise<any> {
    try {
      return await this.docker.version();
    } catch (_error) {
      elizaLogger.error('Failed to get Docker version:', _error);
      throw _error;
    }
  }

  async createContainer(_request: ContainerCreateRequest): Promise<string> {
    try {
      elizaLogger.info(`Creating container: ${_request.name}`);

      const _config = this.buildContainerConfig(_request);
      const container = await this.docker.createContainer(_config);

      this.containers.set(container.id, container);

      elizaLogger.info(`Container created successfully: ${container.id}`);
      return container.id;
    } catch (_error) {
      elizaLogger.error(`Failed to create container ${_request.name}:`, _error);
      throw _error;
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

    const portBindings: { [key: string]: any } = { /* empty */ };
    const exposedPorts: { [key: string]: { /* empty */ } } = { /* empty */ };

    // Bind communication and health ports
    const commPortKey = `${agentConfig.communicationPort}/tcp`;
    const healthPortKey = `${agentConfig.healthPort}/tcp`;

    portBindings[commPortKey] = [{ HostPort: agentConfig.communicationPort.toString() }];
    portBindings[healthPortKey] = [{ HostPort: agentConfig.healthPort.toString() }];
    exposedPorts[commPortKey] = { /* empty */ };
    exposedPorts[healthPortKey] = { /* empty */ };

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
        Test: ['CMD-SHELL', `curl -f http://localhost:${agentConfig.healthPort}/health || exit 1`],
        Interval: 30000000000, // 30 seconds in nanoseconds
        Timeout: 10000000000, // 10 seconds in nanoseconds
        Retries: 3,
        StartPeriod: 60000000000, // 60 seconds in nanoseconds
      },
    };

    return config;
  }

  async startContainer(_containerId: string): Promise<void> {
    try {
      const container = this.containers.get(_containerId) || this.docker.getContainer(_containerId);
      await container.start();
      this.containers.set(_containerId, container);
      elizaLogger.info(`Container started: ${_containerId}`);
    } catch (_error) {
      elizaLogger.error(`Failed to start container ${_containerId}:`, _error);
      throw _error;
    }
  }

  async stopContainer(_containerId: string, timeout: number = 30): Promise<void> {
    try {
      const container = this.containers.get(_containerId) || this.docker.getContainer(_containerId);
      await container.stop({ t: timeout });
      elizaLogger.info(`Container stopped: ${_containerId}`);
    } catch (_error) {
      elizaLogger.error(`Failed to stop container ${_containerId}:`, _error);
      throw _error;
    }
  }

  async removeContainer(_containerId: string, force: boolean = false): Promise<void> {
    try {
      const container = this.containers.get(_containerId) || this.docker.getContainer(_containerId);
      await container.remove({ force });
      this.containers.delete(_containerId);
      elizaLogger.info(`Container removed: ${_containerId}`);
    } catch (_error) {
      elizaLogger.error(`Failed to remove container ${_containerId}:`, _error);
      throw _error;
    }
  }

  async getContainerStatus(_containerId: string): Promise<ContainerStatus> {
    try {
      const container = this.containers.get(_containerId) || this.docker.getContainer(_containerId);
      const inspect = await container.inspect();

      return this.parseContainerStatus(inspect);
    } catch (_error) {
      elizaLogger.error(`Failed to get container status ${_containerId}:`, _error);
      throw _error;
    }
  }

  private parseContainerStatus(inspect: Docker.ContainerInspectInfo): ContainerStatus {
    const state = inspect.State;
    const _config = inspect.Config;
    const networkSettings = inspect.NetworkSettings;

    let containerState: ContainerStatus['state'] = 'error';
    if (state.Running) {containerState = 'running';}
    else if (state.Paused) {containerState = 'paused';}
    else if (state.ExitCode === 0) {containerState = 'exited';}
    else if (state.ExitCode !== 0) {containerState = 'error';}
    else {containerState = 'stopped';}

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
              containerPort: parseInt(containerPort, 10),
              hostPort: parseInt(binding.HostPort, 10),
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
      const _options: Docker.ContainerListOptions = {
        all: true,
        filters: filters ? JSON.stringify(filters) : undefined,
      };

      const containers = await this.docker.listContainers(_options);
      const statuses: ContainerStatus[] = [];

      for (const container of containers) {
        const fullInfo = await this.docker.getContainer(container.Id).inspect();
        statuses.push(this.parseContainerStatus(fullInfo));
      }

      return statuses;
    } catch (_error) {
      elizaLogger.error('Failed to list containers:', _error);
      throw _error;
    }
  }

  async getContainerLogs(_containerId: string,
    _options?: ContainerLogOptions
  ): Promise<NodeJS.ReadableStream> {
    try {
      const container = this.containers.get(_containerId) || this.docker.getContainer(_containerId);

      const logOptions: any = {
        follow: _options?.follow || false,
        stdout: _options?.stdout !== false,
        stderr: _options?.stderr !== false,
        timestamps: _options?.timestamps || false,
      };

      if (_options?.tail) {logOptions.tail = _options.tail;}
      if (_options?.since) {logOptions.since = Math.floor(_options.since.getTime() / 1000);}

      return (await container.logs(logOptions)) as any;
    } catch (_error) {
      elizaLogger.error(`Failed to get container logs ${_containerId}:`, _error);
      throw _error;
    }
  }

  async getContainerStats(_containerId: string): Promise<ContainerStats> {
    try {
      const container = this.containers.get(_containerId) || this.docker.getContainer(_containerId);
      const _stats = await container.stats({ stream: false });

      return this.parseContainerStats(_containerId, _stats);
    } catch (_error) {
      elizaLogger.error(`Failed to get container stats ${_containerId}:`, _error);
      throw _error;
    }
  }

  private parseContainerStats(_containerId: string, stats: any): ContainerStats {
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
        if (stat.op === 'Read') {blockRead += stat.value;}
        if (stat.op === 'Write') {blockWrite += stat.value;}
      }
    }

    return {
      id: _containerId,
      name: stats.name || _containerId.slice(0, 12),
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

  async executeInContainer(_containerId: string,
    _options: ContainerExecuteOptions
  ): Promise<ContainerExecuteResult> {
    try {
      const container = this.containers.get(_containerId) || this.docker.getContainer(_containerId);

      const execOptions: Docker.ExecCreateOptions = {
        Cmd: _options.command,
        AttachStdout: _options.attachStdout !== false,
        AttachStderr: _options.attachStderr !== false,
        AttachStdin: _options.attachStdin || false,
        Tty: _options.tty || false,
        WorkingDir: _options.workingDir,
        User: _options.user,
        Env: _options.environment
          ? Object.entries(_options.environment).map(([k, v]) => `${k}=${v}`)
          : undefined,
        Privileged: _options.privileged || false,
      };

      const _startTime = Date.now();
      const exec = await container.exec(execOptions);
      const stream = await exec.start({ hijack: true, stdin: true });

      let _stdout = '';
      let _stderr = '';

      return new Promise((resolve, reject) => {
        container.modem.demuxStream(
          stream,
          (chunk: Buffer) => {
            _stdout += chunk.toString();
          }, // stdout
          (chunk: Buffer) => {
            _stderr += chunk.toString();
          } // stderr
        );

        stream.on('end', async () => {
          try {
            const inspect = await exec.inspect();
            const duration = Date.now() - _startTime;

            resolve({
              exitCode: inspect.ExitCode || 0,
              stdout: _stdout,
              stderr: _stderr,
              duration,
            });
          } catch (_error) {
            reject(_error);
          }
        });

        stream.on('error', reject);
      });
    } catch (_error) {
      elizaLogger.error(`Failed to execute in container ${_containerId}:`, _error);
      throw _error;
    }
  }

  async attachToContainer(_containerId: string): Promise<NodeJS.ReadWriteStream> {
    try {
      const container = this.containers.get(_containerId) || this.docker.getContainer(_containerId);

      const stream = await container.attach({
        stream: true,
        stdin: true,
        stdout: true,
        stderr: true,
      });

      return stream;
    } catch (_error) {
      elizaLogger.error(`Failed to attach to container ${_containerId}:`, _error);
      throw _error;
    }
  }

  async buildImage(_config: DockerImageConfig): Promise<string> {
    try {
      elizaLogger.info(`Building image: ${_config.name}:${_config.tag}`);

      const buildOptions = {
        t: `${_config.name}:${_config.tag}`,
        buildargs: _config.buildArgs,
        labels: _config.labels,
        dockerfile: _config.dockerfile || 'Dockerfile',
      };

      const stream = await this.docker.buildImage(_config.buildContext || '.', buildOptions);

      return new Promise((resolve, reject) => {
        this.docker.modem.followProgress(
          stream,
          (err: any, res: any) => {
            if (err) {
              reject(err);
            } else {
              const imageId = res[res.length - 1]?.aux?.ID || `${_config.name}:${_config.tag}`;
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
    } catch (_error) {
      elizaLogger.error(`Failed to build image ${_config.name}:`, _error);
      throw _error;
    }
  }

  async pullImage(_name: string, tag: string = 'latest'): Promise<void> {
    try {
      elizaLogger.info(`Pulling image: ${_name}:${tag}`);

      const stream = await this.docker.pull(`${_name}:${tag}`);

      return new Promise((resolve, reject) => {
        this.docker.modem.followProgress(stream, (err: any) => {
          if (err) {
            reject(err);
          } else {
            elizaLogger.info(`Image pulled successfully: ${_name}:${tag}`);
            resolve();
          }
        });
      });
    } catch (_error) {
      elizaLogger.error(`Failed to pull image ${_name}:${tag}:`, _error);
      throw _error;
    }
  }

  async listImages(): Promise<any[]> {
    try {
      return await this.docker.listImages();
    } catch (_error) {
      elizaLogger.error('Failed to list images:', _error);
      throw _error;
    }
  }

  async removeImage(_imageId: string, force: boolean = false): Promise<void> {
    try {
      const image = this.docker.getImage(_imageId);
      await image.remove({ force });
      elizaLogger.info(`Image removed: ${_imageId}`);
    } catch (_error) {
      elizaLogger.error(`Failed to remove image ${_imageId}:`, _error);
      throw _error;
    }
  }

  async createNetwork(_config: NetworkConfig): Promise<string> {
    try {
      elizaLogger.info(`Creating network: ${_config.name}`);

      const networkOptions: Docker.NetworkCreateOptions = {
        Name: _config.name,
        IPAM: _config.subnet
          ? {
            Config: [
              {
                Subnet: _config.subnet,
                Gateway: _config.gateway,
              },
            ],
          }
          : undefined,
        Options: _config.isolated
          ? {
            'com.docker.network.bridge.enable_icc': 'false',
          }
          : undefined,
      };

      const network = await this.docker.createNetwork(networkOptions);
      this.networks.set(network.id, network);

      elizaLogger.info(`Network created: ${network.id}`);
      return network.id;
    } catch (_error) {
      elizaLogger.error(`Failed to create network ${_config.name}:`, _error);
      throw _error;
    }
  }

  async removeNetwork(_networkId: string): Promise<void> {
    try {
      const network = this.networks.get(_networkId) || this.docker.getNetwork(_networkId);
      await network.remove();
      this.networks.delete(_networkId);
      elizaLogger.info(`Network removed: ${_networkId}`);
    } catch (_error) {
      elizaLogger.error(`Failed to remove network ${_networkId}:`, _error);
      throw _error;
    }
  }

  async listNetworks(): Promise<any[]> {
    try {
      return await this.docker.listNetworks();
    } catch (_error) {
      elizaLogger.error('Failed to list networks:', _error);
      throw _error;
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
        } catch (_error) {
          elizaLogger.error('Error parsing Docker event:', _error);
        }
      });

      stream.on('error', (_error: Error) => {
        elizaLogger.error('Docker events stream error:', _error);
      });

      elizaLogger.info('Docker event monitoring started');
    } catch (_error) {
      elizaLogger.warn('Failed to setup Docker event monitoring:', _error);
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
      } catch (_error) {
        elizaLogger.error('Error in container event listener:', _error);
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
    } catch (_error) {
      elizaLogger.warn('Failed to ensure default network:', _error);
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
        } catch (_error) {
          elizaLogger.warn(`Failed to stop container ${id}:`, _error);
        }
      }

      this.containers.clear();
      this.networks.clear();

      elizaLogger.info('DockerService stopped');
    } catch (_error) {
      elizaLogger.error('Error stopping DockerService:', _error);
      throw _error;
    }
  }
}
