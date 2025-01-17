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
    MultiProtocolProvider,
    ChainMap,
    ChainMetadata,
    TokenType,
    WarpCore,
    MultiProvider,
    Token,
    TokenAmount,
    type FeeConstantConfig,
    type RouteBlacklist,
    type ChainName,
    TypedProvider,
  } from '@hyperlane-xyz/sdk';
  import { Provider } from 'ethers';
  import { Wallet } from '@ethersproject/wallet';
  import { Address, ProtocolType, Numberish } from '@hyperlane-xyz/utils';
  import { Logger } from 'pino';

  // Create pino logger
  const logger = new Logger({
    level: 'info',
    transport: {
      target: 'pino-pretty'
    }
  });

  interface TokenTransferRequest {
    sourceChain: ChainName;
    destinationChain: ChainName;
    tokenAddress: string;
    recipientAddress: string;
    amount: string;
    feeLimitMultiplier?: number; // Optional fee limit multiplier
  }

  interface TokenTransferResponse {
    success: boolean;
    transactionHash?: string;
    explorerUrl?: string;
    error?: string;
    fees?: {
      local?: string;
      interchain?: string;
    };
  }

  export const transferTokensViaWarp: Action = {
    name: "TRANSFER_TOKENS_VIA_WARP",
    similes: ["WARP_TRANSFER", "TRANSFER_TOKENS", "CROSS_CHAIN_TRANSFER"],
    description: "Transfer tokens using Hyperlane's Warp Routes",

    validate: async (runtime: IAgentRuntime): Promise<boolean> => {
      const requiredSettings = [
        "HYPERLANE_PRIVATE_KEY",
        "ETHEREUM_RPC_URL",
        "POLYGON_RPC_URL",
        "ETHEREUM_TOKEN_ADDRESS",
        "POLYGON_TOKEN_ADDRESS",
        "ETHEREUM_WARP_ROUTER",
        "POLYGON_WARP_ROUTER",
        "ETHEREUM_MAILBOX_ADDRESS",
        "POLYGON_MAILBOX_ADDRESS",
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
      state: State,
      options: TokenTransferRequest,
      callback?: HandlerCallback
    ): Promise<boolean> => {
      try {
        // Validate input parameters
        if (!options.sourceChain || !options.destinationChain) {
          throw new Error("Source and destination chains are required");
        }
        if (!options.tokenAddress || !options.recipientAddress) {
          throw new Error("Token address and recipient address are required");
        }
        if (!options.amount || isNaN(Number(options.amount))) {
          throw new Error("Valid amount is required");
        }

        elizaLogger.info("Initializing cross-chain token transfer...", {
          sourceChain: options.sourceChain,
          destinationChain: options.destinationChain,
          amount: options.amount,
        });

        // Initialize chain metadata
        const chainMetadata: ChainMap<ChainMetadata> = {
          ethereum: {
            name: 'ethereum',
            chainId: 1,
            domainId: 1,
            protocol: ProtocolType.Ethereum,
            rpcUrls: [{ http: runtime.getSetting("ETHEREUM_RPC_URL") }],
          },
          polygon: {
            name: 'polygon',
            chainId: 137,
            domainId: 137,
            protocol: ProtocolType.Ethereum,
            rpcUrls: [{ http: runtime.getSetting("POLYGON_RPC_URL") }],
          },
        };

        // Initialize providers with retry logic
        const createProvider = (url: string): Provider => {
          const provider = new providers.JsonRpcProvider(url);
          provider.getNetwork = async () => {
            try {
              return await provider.getNetwork();
            } catch (error) {
              elizaLogger.error("Network fetch failed, retrying...");
              await new Promise(resolve => setTimeout(resolve, 1000));
              return provider.getNetwork();
            }
          };
          return provider;
        };

        const providers: ChainMap<TypedProvider> = {
            //@ts-ignore
          ethereum: createProvider(runtime.getSetting("ETHEREUM_RPC_URL")),
            //@ts-ignore
          polygon: createProvider(runtime.getSetting("POLYGON_RPC_URL")),
        };

        // Initialize MultiProtocolProvider
        const multiProvider = new MultiProtocolProvider(chainMetadata);

        // Add providers
        Object.entries(providers).forEach(([chain, provider]) => {
          multiProvider.setProvider(chain, provider);
        });

        // Add signer
        const sourceChainProvider = multiProvider.getProvider(options.sourceChain);
            //@ts-ignore
        const wallet = new Wallet(runtime.getSetting("HYPERLANE_PRIVATE_KEY"), sourceChainProvider);

        const signer = {
          _isSigner: true,
          provider: providers[options.sourceChain],
          getAddress: async () => wallet.address,
          signMessage: async (message: string | Uint8Array) => wallet.signMessage(message),
          signTransaction: async (transaction: any) => wallet.signTransaction(transaction),
            //@ts-ignore
          connect: (provider: Provider) => wallet.connect(provider),
          getBalance: (blockTag?: any) => wallet.getBalance(blockTag),
          getTransactionCount: (blockTag?: any) => wallet.getTransactionCount(blockTag),
          estimateGas: (transaction: any) => wallet.estimateGas(transaction),
          call: (transaction: any, blockTag?: any) => wallet.call(transaction, blockTag),
          sendTransaction: (transaction: any) => wallet.sendTransaction(transaction),
          _signTypedData: (domain: any, types: any, value: any) => wallet._signTypedData(domain, types, value),
        };



        // Initialize WarpCore with initial configuration and fees
        const warpCore = new WarpCore(
          multiProvider,
          [],
          {
            logger,
            localFeeConstants: [
              {
                amount: BigInt(0),
                origin: options.sourceChain,
                destination: options.destinationChain,
                addressOrDenom: options.tokenAddress,
              }
            ],
            interchainFeeConstants: [
              {
                amount: BigInt(0),
                origin: options.sourceChain,
                destination: options.destinationChain,
                addressOrDenom: options.tokenAddress,
              }
            ],
            routeBlacklist: [] as RouteBlacklist,
          }
        );

        // Get token and create token amount
        const token = warpCore.findToken(options.sourceChain, options.tokenAddress);
        if (!token) {
          throw new Error('Source token not found');
        }

        // Create token amount for the transfer
        const tokenamount = new TokenAmount(BigInt(options.amount), token);

        // Get fee estimates
        const feeEstimate = await warpCore.estimateTransferRemoteFees({
          originToken: token,
          destination: options.destinationChain,
          sender: await wallet.getAddress(),
        });

        // Calculate total fees with multiplier
        const multiplier = options.feeLimitMultiplier || 1.1; // Default 10% buffer
        const totalFees = BigInt(0); // Initialize with default

        // Execute transfer with fee logging
        elizaLogger.info("Initiating token transfer with fees...", {
          amount: tokenamount.getDecimalFormattedAmount(),
          estimatedFees: feeEstimate,
        });

        // Get and execute transfer transactions
        const transferTxs = await warpCore.getTransferRemoteTxs({
          originTokenAmount: tokenamount,
          destination: options.destinationChain,
          recipient: options.recipientAddress as Address,
          sender: await wallet.getAddress(),
        });

        // Find token
        const sourceToken = warpCore.findToken(options.sourceChain, options.tokenAddress);
        if (!sourceToken) {
          throw new Error('Source token not found');
        }

        elizaLogger.info("Found source token:", {
          chain: options.sourceChain,
          address: options.tokenAddress,
        });

        // Create TokenAmount using proper constructor
        const amount = BigInt(options.amount);
        const tokenAmount = new TokenAmount(amount, sourceToken);

        // Validate transfer
        const validationError = await warpCore.validateTransfer({
          originTokenAmount: tokenAmount,
          destination: options.destinationChain,
          recipient: options.recipientAddress as Address,
          sender: await signer.getAddress(),
        });

        if (validationError) {
          throw new Error(`Transfer validation failed: ${JSON.stringify(validationError)}`);
        }

        // Check if approval is needed
        const needsApproval = await warpCore.isApproveRequired({
          originTokenAmount: tokenAmount,
          owner: await signer.getAddress(),
        });

        // Handle approval if needed
        if (needsApproval) {
          elizaLogger.info("Token approval required, processing approval...");
          try {
            const approvalTxs = await warpCore.getTransferRemoteTxs({
              originTokenAmount: tokenAmount,
              destination: options.destinationChain,
              recipient: options.recipientAddress as Address,
              sender: await signer.getAddress(),
            });

            for (const tx of approvalTxs) {
              const transaction = await signer.sendTransaction(tx);
              const receipt = await transaction.wait();
              elizaLogger.info(`Approval transaction confirmed: ${receipt.transactionHash}`);
            }
          } catch (error) {
            throw new Error(`Token approval failed: ${error.message}`);
          }
        }

        // Get transfer transactions
        elizaLogger.info("Initiating token transfer...");
         await warpCore.getTransferRemoteTxs({
          originTokenAmount: tokenAmount,
          destination: options.destinationChain,
          recipient: options.recipientAddress as Address,
          sender: await signer.getAddress(),
        });

        let lastReceipt;
        // Execute transfer transactions
        for (const tx of transferTxs) {
          const transaction = await signer.sendTransaction(tx);
          lastReceipt = await transaction.wait();
          elizaLogger.info(`Transfer transaction confirmed: ${lastReceipt.hash}`);
        }

        // Get explorer URL
        const explorerUrl = lastReceipt
          ? await multiProvider.tryGetExplorerAddressUrl(
              options.sourceChain,
              lastReceipt.hash
            )
          : undefined;

        const response: TokenTransferResponse = {
          success: true,
          transactionHash: lastReceipt?.hash,
          explorerUrl,
        };

        // Call callback if provided
        if (callback) {
          callback({
            text: `Successfully transferred ${options.amount} tokens to ${options.destinationChain}${
              explorerUrl ? `. View at: ${explorerUrl}` : ''
            }`,
            content: response,
          });
        }

        elizaLogger.info("Token transfer completed successfully");
        return true;

      } catch (error) {
        elizaLogger.error("Token transfer failed:", error);

        const errorResponse: TokenTransferResponse = {
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error occurred',
        };

        if (callback) {
          callback({
            text: `Token transfer failed: ${errorResponse.error}`,
            content: errorResponse,
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
            text: "Transfer 100 tokens from Ethereum to Polygon",
            options: {
              sourceChain: "ethereum",
              destinationChain: "polygon",
              tokenAddress: "0x1234...",
              recipientAddress: "0x5678...",
              amount: "100000000000000000000" // 100 tokens with 18 decimals
            }
          },
        },
        {
          user: "{{agent}}",
          content: {
            text: "I'll transfer your tokens using Hyperlane Warp.",
            action: "TRANSFER_TOKENS_VIA_WARP",
          },
        },
        {
          user: "{{agent}}",
          content: {
            text: "Successfully transferred 100 tokens to Polygon. View at: https://etherscan.io/tx/0x...",
          },
        },
      ],
    ] as ActionExample[][],
  };

  export default transferTokensViaWarp;