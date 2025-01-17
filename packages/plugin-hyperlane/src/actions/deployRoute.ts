import {
    Action,
    ActionExample,
    IAgentRuntime,
    Memory,
    State,
    HandlerCallback,
    elizaLogger,
  } from "@elizaos/core";
  import {
    MultiProvider,
    ChainMap,
    ChainMetadata,
    HypERC20Deployer,
    HyperlaneProxyFactoryDeployer,
    WarpRouteDeployConfig,
    TokenType,
    IsmType,
    HookType,
    type MultisigIsmConfig,
    EvmIsmModule,
    EvmHookModule,
    ContractVerifier,
    HookConfig,
  } from '@hyperlane-xyz/sdk';
  import { JsonRpcProvider } from '@ethersproject/providers';
  import { Wallet } from '@ethersproject/wallet';
  import { Address, ProtocolType } from '@hyperlane-xyz/utils';
  import { chainData } from "../chainMetadata";
  import pino from 'pino';

  // Create pino logger
  const logger = pino({
    level: 'info',
    transport: {
      target: 'pino-pretty'
    }
  });

  interface WarpRouteDeployRequest {
    sourceChain: string;
    destinationChain: string;
    tokenName: string;
    tokenSymbol: string;
    decimals: number;
    collateralToken?: string; // Optional existing token address to use as collateral
  }

  export const deployWarpRoute: Action = {
    name: "DEPLOY_WARP_ROUTE",
    similes: ["CREATE_WARP_ROUTE", "DEPLOY_TOKEN_ROUTE", "SETUP_WARP_ROUTE"],
    description: "Deploy a new Warp Route for cross-chain token transfers",

    validate: async (runtime: IAgentRuntime): Promise<boolean> => {
      const requiredSettings = [
        "HYPERLANE_PRIVATE_KEY",
        "ETHEREUM_RPC_URL",
        "POLYGON_RPC_URL",
        "ETHEREUM_MAILBOX_ADDRESS",
        "POLYGON_MAILBOX_ADDRESS",
        "ISM_FACTORY_ADDRESS",
      ];

      for (const setting of requiredSettings) {
        if (!runtime.getSetting(setting)) {
          elizaLogger.error(`Missing required setting: ${setting}`);
          return false;
        }
      }

      return true;
    },

    handler: async (
      runtime: IAgentRuntime,
      message: Memory,
      state: State ,
      options: WarpRouteDeployRequest,
      callback?: HandlerCallback
    ): Promise<boolean> => {
      try {
        elizaLogger.info("Initializing Warp Route deployment...");

        // Initialize chain metadata
        const chainMetadata: ChainMap<ChainMetadata> = {
          [options.sourceChain]: {
            name: options.sourceChain,
            chainId: chainData[options.sourceChain].chainId,
            domainId: chainData[options.sourceChain].domainId,
            protocol: ProtocolType.Ethereum,
            rpcUrls: [{
              http: runtime.getSetting(`${options.sourceChain.toUpperCase()}_RPC_URL`) || '',
              concurrency: 1
            }],
            blocks: {
              confirmations: 1,
              reorgPeriod: 1,
              estimateBlockTime: 12,
            },
            transactionOverrides: {},
          },
          [options.destinationChain]: {
            name: options.destinationChain,
            chainId: chainData[options.destinationChain].chainId,
            domainId: chainData[options.destinationChain].domainId,
            protocol: ProtocolType.Ethereum,
            rpcUrls: [{
              http: runtime.getSetting(`${options.destinationChain.toUpperCase()}_RPC_URL`) || '',
              concurrency: 1
            }],
            blocks: {
              confirmations: 1,
              reorgPeriod: 1,
              estimateBlockTime: 12,
            },
            transactionOverrides: {},
          },
        };

        // Initialize contract addresses map
        const contractAddresses = {
          [options.sourceChain]: {
            mailbox: runtime.getSetting(`${options.sourceChain.toUpperCase()}_MAILBOX_ADDRESS`) as Address,
            interchainGasPaymaster: runtime.getSetting(`${options.sourceChain.toUpperCase()}_IGP_ADDRESS`) as Address,
            validatorAnnounce: runtime.getSetting(`${options.sourceChain.toUpperCase()}_VALIDATOR_ANNOUNCE`) as Address,
          },
          [options.destinationChain]: {
            mailbox: runtime.getSetting(`${options.destinationChain.toUpperCase()}_MAILBOX_ADDRESS`) as Address,
            interchainGasPaymaster: runtime.getSetting(`${options.destinationChain.toUpperCase()}_IGP_ADDRESS`) as Address,
            validatorAnnounce: runtime.getSetting(`${options.destinationChain.toUpperCase()}_VALIDATOR_ANNOUNCE`) as Address,
          },
        };

        // Initialize providers
        const providers: ChainMap<JsonRpcProvider> = {
            //@ts-ignore
          [options.sourceChain]: new JsonRpcProvider(runtime.getSetting(`${options.sourceChain.toUpperCase()}_RPC_URL`)),
          //@ts-ignore
          [options.destinationChain]: new JsonRpcProvider(runtime.getSetting(`${options.destinationChain.toUpperCase()}_RPC_URL`)),
        };

        // Initialize multiProvider with proper chain metadata and addresses
        const multiProvider = new MultiProvider(chainMetadata)

        // Set providers
        Object.entries(providers).forEach(([chain, provider]) => {
          multiProvider.setProvider(chain, provider);
        });

        // Set up wallet and signer
        //@ts-ignore
        const wallet = new Wallet(runtime.getSetting("HYPERLANE_PRIVATE_KEY"));
        multiProvider.setSharedSigner(wallet);

        // Create ISM factory deployer
        const ismFactoryDeployer = new HyperlaneProxyFactoryDeployer(
          multiProvider,
          undefined, // No contract verifier
          true // Enable concurrent deployment
        );

        elizaLogger.info("Setting up deployment configuration...");

        // Create route configuration
        const deployConfig: WarpRouteDeployConfig = {
            [options.sourceChain]: {
                type: options.collateralToken ? TokenType.collateralFiat : TokenType.native,
                token: options.collateralToken || '',
                name: options.tokenName,
                symbol: options.tokenSymbol,
                decimals: options.decimals,
                owner: await wallet.getAddress(),
                mailbox: runtime.getSetting(`${options.sourceChain.toUpperCase()}_MAILBOX_ADDRESS`) as Address,
            },
            [options.destinationChain]: {
                type: TokenType.synthetic,
                name: options.tokenName,
                symbol: options.tokenSymbol,
                decimals: options.decimals,
                owner: await wallet.getAddress(),
                mailbox: runtime.getSetting(`${options.destinationChain.toUpperCase()}_MAILBOX_ADDRESS`) as Address,
            },
        };
        elizaLogger.info("Deploying ISM and Hook modules...");

        // Get factory addresses from the deployer
        const factoryAddresses = {
          [options.sourceChain]: {
            staticMerkleRootMultisigIsmFactory: runtime.getSetting("ISM_FACTORY_ADDRESS") as Address,
            staticMessageIdMultisigIsmFactory: runtime.getSetting("ISM_FACTORY_ADDRESS") as Address,
            staticAggregationIsmFactory: runtime.getSetting("ISM_FACTORY_ADDRESS") as Address,
            domainRoutingIsmFactory: runtime.getSetting("ISM_FACTORY_ADDRESS") as Address,
          },
          [options.destinationChain]: {
            staticMerkleRootMultisigIsmFactory: runtime.getSetting("ISM_FACTORY_ADDRESS") as Address,
            staticMessageIdMultisigIsmFactory: runtime.getSetting("ISM_FACTORY_ADDRESS") as Address,
            aggregationIsmFactory: runtime.getSetting("ISM_FACTORY_ADDRESS") as Address,
            domainRoutingIsmFactory: runtime.getSetting("ISM_FACTORY_ADDRESS") as Address,
            staticAggregationIsmFactory: runtime.getSetting("ISM_FACTORY_ADDRESS") as Address,
          },
        };

        // Deploy ISM module with proper configuration

        elizaLogger.info("Deploying token contracts and Warp Routes...");

        // Deploy tokens and routes
        const deployer = new HypERC20Deployer(multiProvider);
        const deployedContracts = await deployer.deploy(deployConfig);

        elizaLogger.info("Warp Route deployment completed successfully", {
          sourceChainContracts: deployedContracts[options.sourceChain],
          destChainContracts: deployedContracts[options.destinationChain],
        });

        // Format response
        const response = {
          success: true,
          contracts: {
            [options.sourceChain]: {
              token: deployedContracts[options.sourceChain].router,
              router: deployedContracts[options.sourceChain].router,
            },
            [options.destinationChain]: {
              token: deployedContracts[options.destinationChain].router,
              router: deployedContracts[options.destinationChain].router,
            },
          },
        };

        if (callback) {
          callback({
            text: `Successfully deployed Warp Route between ${options.sourceChain} and ${options.destinationChain}`,
            content: response,
          });
        }

        return true;

      } catch (error) {
        elizaLogger.error("Warp Route deployment failed:", error);

        if (callback) {
          callback({
            text: `Warp Route deployment failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
            content: {
              success: false,
              error: error instanceof Error ? error.message : 'Unknown error occurred',
            },
          });
        }

        return false;
      }
    },

    examples: [
      [
        {
          user: "{{user1}}",
          content: {
            text: "Deploy a new Warp Route for my token between Ethereum and Polygon",
            options: {
              sourceChain: "ethereum",
              destinationChain: "polygon",
              tokenName: "My Wrapped Token",
              tokenSymbol: "MWT",
              decimals: 18,
            }
          },
        },
        {
          user: "{{agent}}",
          content: {
            text: "I'll deploy a new Warp Route for your token.",
            action: "DEPLOY_WARP_ROUTE",
          },
        },
      ],
    ] as ActionExample[][],
  };

  export default deployWarpRoute;