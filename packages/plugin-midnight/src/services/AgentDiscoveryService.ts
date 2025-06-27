import { Service, IAgentRuntime, logger, UUID, asUUID } from '@elizaos/core';
import { Observable, BehaviorSubject } from 'rxjs';
import { map, shareReplay } from 'rxjs/operators';
import pino from 'pino';
import {
  type AgentProfile,
  type AgentService,
  type MidnightActionResult,
  MidnightNetworkError,
} from '../types/index';
import { MidnightNetworkService } from './MidnightNetworkService';

/**
 * Service for discovering and managing agent profiles on the Midnight Network
 */
export class AgentDiscoveryService extends Service {
  static serviceType = 'agent-discovery';
  serviceType = 'agent-discovery';
  capabilityDescription = 'Agent discovery and reputation service on Midnight Network';

  private midnightService?: MidnightNetworkService;
  private logger: pino.Logger;

  // Reactive state management
  private agentProfiles$ = new BehaviorSubject<AgentProfile[]>([]);
  private ownProfile$ = new BehaviorSubject<AgentProfile | null>(null);

  private discoveryContract?: string;
  private reputationContract?: string;

  constructor(runtime: IAgentRuntime) {
    super(runtime);
    this.logger = pino({ name: 'AgentDiscoveryService' });
  }

  static async start(runtime: IAgentRuntime): Promise<AgentDiscoveryService> {
    const service = new AgentDiscoveryService(runtime);
    await service.initialize();
    return service;
  }

  async initialize(): Promise<void> {
    try {
      logger.info('Initializing Agent Discovery Service...');

      // Get midnight network service
      const midnightService = this.runtime.getService<MidnightNetworkService>('midnight-network');
      if (!midnightService) {
        throw new MidnightNetworkError(
          'Midnight Network Service not available',
          'SERVICE_NOT_FOUND'
        );
      }
      this.midnightService = midnightService;

      // Deploy or connect to discovery contracts
      await this.initializeContracts();

      // Load existing agent profiles
      await this.loadExistingProfiles();

      // Register own agent profile
      await this.registerOwnProfile();

      // Start discovery monitoring
      await this.startDiscoveryMonitoring();

      logger.info('Agent Discovery Service initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize Agent Discovery Service:', error);
      throw error;
    }
  }

  private async initializeContracts(): Promise<void> {
    if (!this.midnightService) {
      return;
    }

    try {
      // Deploy or get discovery contract
      const discoveryDeployment = await this.midnightService.deployContract(
        {} as any, // Mock discovery contract
        [],
        'discovery'
      );
      this.discoveryContract = discoveryDeployment.address;

      // Deploy or get reputation contract
      const reputationDeployment = await this.midnightService.deployContract(
        {} as any, // Mock reputation contract
        [],
        'reputation'
      );
      this.reputationContract = reputationDeployment.address;

      this.logger.info('Discovery contracts initialized', {
        discoveryContract: this.discoveryContract,
        reputationContract: this.reputationContract,
      });
    } catch (error) {
      this.logger.error('Failed to initialize discovery contracts:', error);
      throw error;
    }
  }

  private async loadExistingProfiles(): Promise<void> {
    try {
      // Load agent profiles from private state
      const profiles = (await this.midnightService?.getPrivateState('agent_profiles')) || [];
      this.agentProfiles$.next(profiles);

      // Load own profile
      const ownProfile = await this.midnightService?.getPrivateState('own_profile');
      if (ownProfile) {
        this.ownProfile$.next(ownProfile);
      }

      this.logger.info('Loaded existing agent profiles', {
        profileCount: profiles.length,
        hasOwnProfile: !!ownProfile,
      });
    } catch (error) {
      this.logger.error('Failed to load existing agent profiles:', error);
    }
  }

  private async registerOwnProfile(): Promise<void> {
    if (!this.midnightService) {
      return;
    }

    try {
      // Check if we already have a profile
      let ownProfile = this.ownProfile$.value;

      if (!ownProfile) {
        // Create new profile
        const walletInfo = await this.midnightService.getWalletInfo();

        ownProfile = {
          id: this.runtime.agentId,
          name: this.runtime.character?.name || 'Unknown Agent',
          publicKey: walletInfo.address.publicKey,
          contractAddress: this.discoveryContract || '',
          capabilities: this.extractCapabilities(),
          reputation: 100, // Starting reputation
          isOnline: true,
          lastSeen: new Date(),
          services: this.extractServices(),
        };

        this.ownProfile$.next(ownProfile);
        await this.midnightService.setPrivateState('own_profile', ownProfile);
      }

      // Update online status
      ownProfile.isOnline = true;
      ownProfile.lastSeen = new Date();
      this.ownProfile$.next(ownProfile);

      // Register with discovery contract
      await this.publishProfileToNetwork(ownProfile);

      this.logger.info('Own agent profile registered', { agentId: this.runtime.agentId });
    } catch (error) {
      this.logger.error('Failed to register own profile:', error);
    }
  }

  private extractCapabilities(): string[] {
    // Extract capabilities from runtime character and plugins
    const capabilities = ['messaging', 'payments'];

    if (this.runtime.character?.plugins) {
      capabilities.push(...this.runtime.character.plugins);
    }

    return capabilities;
  }

  private extractServices(): AgentService[] {
    // Extract available services from the agent
    const services: AgentService[] = [
      {
        id: 'secure-messaging',
        name: 'Secure Messaging',
        description: 'Send and receive encrypted messages using zero-knowledge proofs',
        pricePerRequest: BigInt(1000), // 0.001 MIDNIGHT
        currency: 'MIDNIGHT',
        responseTimeMs: 5000,
        successRate: 0.99,
      },
      {
        id: 'payment-processing',
        name: 'Payment Processing',
        description: 'Process secure payments with privacy protection',
        pricePerRequest: BigInt(5000), // 0.005 MIDNIGHT
        currency: 'MIDNIGHT',
        responseTimeMs: 10000,
        successRate: 0.98,
      },
    ];

    return services;
  }

  private async publishProfileToNetwork(profile: AgentProfile): Promise<void> {
    if (!this.midnightService || !this.discoveryContract) {
      return;
    }

    try {
      // Generate ZK proof for profile authenticity
      const _profileProof = await this.midnightService.generateProof('profile_register', {
        agentId: profile.id,
        publicKey: profile.publicKey,
        capabilities: profile.capabilities,
        timestamp: Date.now(),
      });

      // Submit to discovery contract
      this.logger.debug('Publishing profile to network', {
        contractAddress: this.discoveryContract,
        agentId: profile.id,
      });

      // In real implementation, this would call the contract method
      // await this.discoveryContract.registerAgent(profile, profileProof);
    } catch (error) {
      this.logger.error('Failed to publish profile to network:', error);
    }
  }

  private async startDiscoveryMonitoring(): Promise<void> {
    if (!this.midnightService || !this.discoveryContract) {
      return;
    }

    try {
      // Subscribe to discovery contract events
      this.midnightService.subscribeToContract(this.discoveryContract).subscribe({
        next: (contractState) => {
          this.handleDiscoveryContractChange(contractState);
        },
        error: (error) => {
          this.logger.error('Discovery contract subscription error:', error);
        },
      });

      // Start periodic discovery
      setInterval(() => {
        this.discoverNewAgents();
      }, 60000); // Every minute
    } catch (error) {
      this.logger.error('Failed to start discovery monitoring:', error);
    }
  }

  private async handleDiscoveryContractChange(_contractState: any): Promise<void> {
    this.logger.debug('Discovery contract state changed');

    // Parse new agent registrations from contract state
    // This would decode agent profiles from the contract
  }

  private async discoverNewAgents(): Promise<void> {
    try {
      // Query discovery contract for new agents
      // This would call contract methods to get agent list
      this.logger.debug('Discovering new agents...');

      // Mock discovery - would query actual contract
      const newAgents = await this.queryDiscoveryContract();

      if (newAgents.length > 0) {
        const currentProfiles = this.agentProfiles$.value;
        const updatedProfiles = [...currentProfiles];

        for (const agent of newAgents) {
          if (!currentProfiles.find((p) => p.id === agent.id)) {
            updatedProfiles.push(agent);
            this.logger.info('Discovered new agent', { agentId: agent.id, name: agent.name });
          }
        }

        this.agentProfiles$.next(updatedProfiles);
        await this.midnightService?.setPrivateState('agent_profiles', updatedProfiles);
      }
    } catch (error) {
      this.logger.error('Failed to discover new agents:', error);
    }
  }

  private async queryDiscoveryContract(): Promise<AgentProfile[]> {
    // Mock implementation - would query actual discovery contract
    const mockAgents: AgentProfile[] = [
      {
        id: asUUID(`agent_${Math.random().toString(36).substr(2, 9)}`),
        name: `Agent_${Math.random().toString(36).substr(2, 6)}`,
        publicKey: `0x${Math.random().toString(16).substr(2, 64)}`,
        contractAddress: this.discoveryContract || '',
        capabilities: ['messaging', 'payments'],
        reputation: Math.floor(Math.random() * 100) + 1,
        isOnline: Math.random() > 0.3,
        lastSeen: new Date(Date.now() - Math.random() * 86400000), // Random within last day
        services: [
          {
            id: 'messaging',
            name: 'Messaging Service',
            description: 'Secure messaging capabilities',
            pricePerRequest: BigInt(Math.floor(Math.random() * 5000) + 1000),
            currency: 'MIDNIGHT',
            responseTimeMs: Math.floor(Math.random() * 10000) + 1000,
            successRate: 0.9 + Math.random() * 0.1,
          },
        ],
      },
    ];

    return mockAgents.filter(() => Math.random() > 0.7); // Randomly return some agents
  }

  /**
   * Discover agents with specific capabilities
   */
  async discoverAgents(capabilities?: string[]): Promise<MidnightActionResult> {
    try {
      this.logger.info('Discovering agents', { capabilities });

      // Force discovery update
      await this.discoverNewAgents();

      let agents = this.agentProfiles$.value;

      // Filter by capabilities if specified
      if (capabilities && capabilities.length > 0) {
        agents = agents.filter((agent) =>
          capabilities.some((cap) => agent.capabilities.includes(cap))
        );
      }

      // Sort by reputation and online status
      agents.sort((a, b) => {
        if (a.isOnline !== b.isOnline) {
          return a.isOnline ? -1 : 1;
        }
        return b.reputation - a.reputation;
      });

      this.logger.info('Agent discovery completed', {
        totalAgents: agents.length,
        onlineAgents: agents.filter((a) => a.isOnline).length,
      });

      return {
        success: true,
        data: { agents },
        message: `Discovered ${agents.length} agents`,
      };
    } catch (error) {
      this.logger.error('Failed to discover agents:', error);
      return {
        success: false,
        data: { error: error instanceof Error ? error.message : 'Unknown error' },
        message: 'Failed to discover agents',
      };
    }
  }

  /**
   * Update own agent reputation
   */
  async updateReputation(delta: number): Promise<void> {
    const profile = this.ownProfile$.value;
    if (!profile) {
      return;
    }

    profile.reputation = Math.max(0, Math.min(100, profile.reputation + delta));
    this.ownProfile$.next(profile);

    if (this.midnightService) {
      await this.midnightService.setPrivateState('own_profile', profile);
      await this.publishProfileToNetwork(profile);
    }

    this.logger.info('Reputation updated', { newReputation: profile.reputation, delta });
  }

  /**
   * Get discovered agent profiles
   */
  getAgentProfiles(): Observable<AgentProfile[]> {
    return this.agentProfiles$.asObservable();
  }

  /**
   * Get online agents only
   */
  getOnlineAgents(): Observable<AgentProfile[]> {
    return this.agentProfiles$.pipe(
      map((agents) => agents.filter((agent) => agent.isOnline)),
      shareReplay(1)
    );
  }

  /**
   * Get own agent profile
   */
  getOwnProfile(): Observable<AgentProfile | null> {
    return this.ownProfile$.asObservable();
  }

  /**
   * Find agent by ID
   */
  findAgentById(agentId: UUID): AgentProfile | null {
    return this.agentProfiles$.value.find((agent) => agent.id === agentId) || null;
  }

  /**
   * Get agents with specific service
   */
  getAgentsWithService(serviceId: string): AgentProfile[] {
    return this.agentProfiles$.value.filter((agent) =>
      agent.services.some((service) => service.id === serviceId)
    );
  }

  async stop(): Promise<void> {
    this.logger.info('Stopping Agent Discovery Service...');

    // Mark agent as offline
    const profile = this.ownProfile$.value;
    if (profile && this.midnightService) {
      profile.isOnline = false;
      await this.publishProfileToNetwork(profile);
    }

    this.logger.info('Agent Discovery Service stopped');
  }
}
