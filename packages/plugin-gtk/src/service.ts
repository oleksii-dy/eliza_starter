import { 
  type IAgentRuntime, 
  Service, 
  elizaLogger,
} from '@elizaos/core';
import { 
  APIClientWrapper
} from "@sifchain/gtk-api";
import { DirectSecp256k1HdWallet } from "@cosmjs/proto-signing";
import { GTK_SERVICE_NAME } from './constants';

/**
 * GTK Service to handle client instance management
 */
export class GTKService extends Service {
  static serviceType = GTK_SERVICE_NAME;
  capabilityDescription = 'This service provides margin trading capabilities through the Sifchain ecosystem.';
  private apiClient: APIClientWrapper | null = null;
  
  constructor(protected runtime: IAgentRuntime) {
    super(runtime);
  }

  static async start(runtime: IAgentRuntime) {
    elizaLogger.info(`Starting GTK service`);
    const service = new GTKService(runtime);
    await service.initClient();
    return service;
  }

  static async stop(runtime: IAgentRuntime) {
    elizaLogger.info('Stopping GTK service');
    const service = runtime.getService(GTKService.serviceType);
    if (!service) {
      throw new Error('GTK service not found');
    }
    service.stop();
  }

  async stop() {
    elizaLogger.info('GTK service stopped');
    this.apiClient = null;
  }

  async initClient() {
    try {
      const mnemonic = process.env.MNEMONIC;
      const network = process.env.NETWORK || 'mainnet';

      if (!mnemonic) {
        throw new Error('Mnemonic is required to initialize GTK client');
      }

      elizaLogger.info('Initializing GTK client...');
      const wallet = await DirectSecp256k1HdWallet.fromMnemonic(mnemonic, {
        prefix: "sif"
      });
      this.apiClient = await APIClientWrapper.create(wallet, "mainnet");
      elizaLogger.info('GTK client initialized successfully');
    } catch (error) {
      elizaLogger.error('Failed to initialize GTK client:', error);
      throw error;
    }
  }

  getClient(): APIClientWrapper {
    if (!this.apiClient) {
      throw new Error('GTK client not initialized');
    }
    return this.apiClient;
  }
}
