import {
  type Plugin,
  type IAgentRuntime,
  type Action,
  type Provider,
  type ProviderResult,
  logger,
  type Service,
  elizaLogger,
  type Content,
  type Memory,
  type HandlerCallback,
  type State,
} from '@elizaos/core';
import { z } from 'zod';
import { ethers } from 'ethers';

// Import all action files
import { transferPolygonAction } from './actions/transfer.js';
import { delegateL1Action } from './actions/delegateL1.js';
import { getCheckpointStatusAction } from './actions/getCheckpointStatus.js';
import { proposeGovernanceAction } from './actions/proposeGovernance.js';
import { voteGovernanceAction } from './actions/voteGovernance.js';
import { getValidatorInfoAction } from './actions/getValidatorInfo.js';
import { getDelegatorInfoAction } from './actions/getDelegatorInfo.js';
import { withdrawRewardsAction } from './actions/withdrawRewardsL1.js';
import { bridgeDepositAction } from './actions/bridgeDeposit.js';
import { getPolygonGasEstimatesAction } from './actions/getPolygonGasEstimates.js';
import { undelegateL1Action } from './actions/undelegateL1.js';
import { restakeRewardsL1Action } from './actions/restakeRewardsL1.js';
import { isL2BlockCheckpointedAction } from './actions/isL2BlockCheckpointed.js';
import { heimdallVoteAction } from './actions/heimdallVoteAction.js';
import { heimdallSubmitProposalAction } from './actions/heimdallSubmitProposalAction.js';
import { heimdallTransferTokensAction } from './actions/heimdallTransferTokensAction.js';
import { getGovernanceInfoAction } from './actions/getGovernanceInfo.js';
import { getNativeBalanceAction, getERC20BalanceAction } from './actions/getBalanceInfo.js';
import {
  getBlockInfoAction,
  getBlockNumberAction,
  getBlockDetailsAction,
} from './actions/getBlockInfo.js';

import {
  WalletProvider,
  initWalletProvider,
  polygonWalletProvider,
} from './providers/PolygonWalletProvider.js';
import {
  PolygonRpcService,
  type ValidatorInfo,
  type DelegatorInfo,
  ValidatorStatus,
} from './services/PolygonRpcService.js';
import { HeimdallService } from './services/HeimdallService.js';
import { getGasPriceEstimates, type GasPriceEstimates } from './services/GasService.js';
import { parseBigIntString } from './utils.js'; // Import from utils
import { ConfigService } from './services/ConfigService.js';

// --- Configuration Schema --- //
const configSchema = z.object({
  POLYGON_RPC_URL: z.string().url('Invalid Polygon RPC URL').min(1),
  ETHEREUM_RPC_URL: z.string().url('Invalid Ethereum RPC URL').min(1),
  PRIVATE_KEY: z.string().min(1, 'Private key is required'),
  POLYGONSCAN_KEY: z.string().min(1, 'PolygonScan API Key is required'),
  HEIMDALL_RPC_URL: z.string().url('Invalid Heimdall RPC URL').min(1).optional(),
  GOVERNOR_ADDRESS: z.string().optional(),
  TOKEN_ADDRESS: z.string().optional(),
  TIMELOCK_ADDRESS: z.string().optional(),
});

// Infer the type from the schema
type PolygonPluginConfig = z.infer<typeof configSchema>;

// --- Define Actions --- //
const polygonActions: Action[] = [
  transferPolygonAction,
  getValidatorInfoAction,
  getDelegatorInfoAction,
  bridgeDepositAction,
  getCheckpointStatusAction,
  proposeGovernanceAction,
  voteGovernanceAction,
  getPolygonGasEstimatesAction,
  delegateL1Action,
  undelegateL1Action,
  withdrawRewardsAction,
  restakeRewardsL1Action,
  isL2BlockCheckpointedAction,
  heimdallVoteAction,
  heimdallSubmitProposalAction,
  heimdallTransferTokensAction,
  getGovernanceInfoAction,
  getNativeBalanceAction,
  getERC20BalanceAction,
  getBlockInfoAction,
  getBlockNumberAction,
  getBlockDetailsAction,
];

// --- Define Providers --- //

/**
 * Provider to fetch and display Polygon-specific info like address, balance, gas.
 */
const polygonProviderInfo: Provider = {
  name: 'Polygon Provider Info',
  async get(runtime: IAgentRuntime, _message: Memory, state: State): Promise<ProviderResult> {
    try {
      // Get ConfigService instance
      const configService = runtime.getService<ConfigService>(ConfigService.serviceType);
      if (!configService) {
        throw new Error('ConfigService not available');
      }

      // 1. Initialize WalletProvider to get address
      const polygonWalletProviderInstance = await initWalletProvider(runtime);
      if (!polygonWalletProviderInstance) {
        // Renamed to avoid conflict
        throw new Error(
          'Failed to initialize PolygonWalletProvider - check PRIVATE_KEY configuration'
        );
      }
      const agentAddress = polygonWalletProviderInstance.getAddress();
      if (!agentAddress) throw new Error('Could not determine agent address from provider');

      // 2. Get PolygonRpcService instance (should be already started)
      const polygonRpcService = runtime.getService<PolygonRpcService>(
        PolygonRpcService.serviceType
      );
      if (!polygonRpcService) {
        throw new Error('PolygonRpcService not available or not started');
      }

      // 3. Get L2 (Polygon) MATIC balance
      const maticBalanceWei = await polygonRpcService.getBalance(agentAddress, 'L2');
      const maticBalanceFormatted = ethers.formatEther(maticBalanceWei);

      // 4. Get Gas price info
      const gasEstimates = await getGasPriceEstimates(runtime);

      const agentName = state?.agentName || 'The agent';

      // 5. Format the text output
      let text = `${agentName}'s Polygon Status:\\n`;
      text += `  Wallet Address: ${agentAddress}\\n`;
      text += `  MATIC Balance: ${maticBalanceFormatted} MATIC\\n`;
      text += '  Current Gas Prices (Max Priority Fee Per Gas - Gwei):\\n';
      const safeLowGwei = gasEstimates.safeLow?.maxPriorityFeePerGas
        ? ethers.formatUnits(gasEstimates.safeLow.maxPriorityFeePerGas, 'gwei')
        : 'N/A';
      const averageGwei = gasEstimates.average?.maxPriorityFeePerGas
        ? ethers.formatUnits(gasEstimates.average.maxPriorityFeePerGas, 'gwei')
        : 'N/A';
      const fastGwei = gasEstimates.fast?.maxPriorityFeePerGas
        ? ethers.formatUnits(gasEstimates.fast.maxPriorityFeePerGas, 'gwei')
        : 'N/A';
      const baseFeeGwei = gasEstimates.estimatedBaseFee
        ? ethers.formatUnits(gasEstimates.estimatedBaseFee, 'gwei')
        : 'N/A';

      text += `    - Safe Low: ${safeLowGwei}\\n`;
      text += `    - Average:  ${averageGwei}\\n`; // Adjusted name to average
      text += `    - Fast:     ${fastGwei}\\n`;
      text += `  Estimated Base Fee (Gwei): ${baseFeeGwei}\\n`;

      return {
        text,
        data: {
          address: agentAddress,
          maticBalance: maticBalanceFormatted,
          gasEstimates: {
            safeLowGwei,
            averageGwei,
            fastGwei,
            baseFeeGwei,
          },
        },
        values: {
          // Provide raw values or formatted strings as needed
          address: agentAddress,
          maticBalance: maticBalanceFormatted,
          gas_safe_low_gwei: safeLowGwei,
          gas_average_gwei: averageGwei, // Changed key name
          gas_fast_gwei: fastGwei,
          gas_base_fee_gwei: baseFeeGwei,
        },
      };
    } catch (error) {
      logger.error('Error getting Polygon provider info:', error);
      const errorMessage = error instanceof Error ? error.message : String(error);

      // Create a more user-friendly message based on the error
      const userMessage = errorMessage.includes('private key')
        ? 'There was an issue with the wallet configuration. Please ensure PRIVATE_KEY is correctly set.'
        : `Error getting Polygon provider info: ${errorMessage}`;

      return {
        text: userMessage,
        data: { error: errorMessage },
        values: { error: errorMessage },
      };
    }
  },
};

const polygonProviders: Provider[] = [polygonWalletProvider, polygonProviderInfo];

// --- Define Services --- //
const polygonServices: (typeof Service)[] = [ConfigService, PolygonRpcService, HeimdallService];

// --- Plugin Definition --- //
export const polygonPlugin: Plugin = {
  name: '@elizaos/plugin-polygon',
  description: 'Plugin for interacting with the Polygon PoS network and staking.',

  // Configuration will be loaded via ConfigService from .env files
  config: {},

  // Initialization logic
  async init(config: Record<string, unknown>, runtime: IAgentRuntime) {
    logger.info(`Initializing plugin: ${this.name}`);
    try {
      // Initialize and register ConfigService using the Service pattern
      const configService = await ConfigService.start(runtime);
      runtime.registerService(ConfigService);

      // Get configuration from ConfigService
      const polygonConfig = configService.getPolygonConfig();

      // Validate configuration using the schema
      try {
        await configSchema.parseAsync({
          POLYGON_RPC_URL: polygonConfig.polygonRpcUrl,
          ETHEREUM_RPC_URL: polygonConfig.ethereumRpcUrl,
          PRIVATE_KEY: polygonConfig.privateKey,
          POLYGONSCAN_KEY: polygonConfig.polygonscanKey,
          HEIMDALL_RPC_URL: polygonConfig.heimdallRpcUrl,
          GOVERNOR_ADDRESS: polygonConfig.governorAddress,
          // TOKEN_ADDRESS: polygonConfig.tokenAddress,
          // TIMELOCK_ADDRESS: polygonConfig.timelockAddress
        });
        logger.info('Polygon plugin configuration validated successfully.');
      } catch (validationError) {
        if (validationError instanceof z.ZodError) {
          logger.error('Invalid Polygon plugin configuration:', validationError.errors);
          throw new Error(
            `Invalid Polygon plugin configuration: ${validationError.errors.map((e) => `${e.path.join('.')}: ${e.message}`).join('; ')}`
          );
        }
        throw validationError;
      }
    } catch (error) {
      logger.error('Error during Polygon plugin initialization:', error);
      throw error;
    }
  },

  // Register components
  actions: polygonActions,
  providers: polygonProviders,
  services: polygonServices,

  // Optional lifecycle methods, models, tests, routes, events
  models: {},
  tests: [],
  routes: [],
  events: {},
};

// Default export for ElizaOS to load
export default polygonPlugin;
