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
    WarpCore,
    type ChainMetadata,
    ChainMap,
  } from '@hyperlane-xyz/sdk';
  import { JsonRpcProvider } from '@ethersproject/providers';
  import { Wallet } from '@ethersproject/wallet';
  import { Address, ProtocolType } from '@hyperlane-xyz/utils';
  import { ContractReceipt } from '@ethersproject/contracts';

  // Define our interfaces
  interface TokenTransferOptions {
    sourceChain: string;
    destinationChain: string;
    tokenAddress: string;
    recipientAddress: string;
    amount: string;
  }

  interface FeeEstimate {
    nativeGas: bigint;
    token: Address;
    amount: bigint;
    gasPrice?: bigint;
    gasLimit?: bigint;
  }

  // Define our chain metadata type
  interface ExtendedChainMetadata extends ChainMetadata {
    mailbox?: Address;
  }

  export const transferTokensCrossChain: Action = {
    name: "TRANSFER_TOKENS_CROSS_CHAIN",
    similes: ["SEND_TOKENS", "TRANSFER_TOKENS", "CROSS_CHAIN_TRANSFER"],
    description: "Transfer tokens from one chain to another using Hyperlane Warp",
    validate: async (runtime: IAgentRuntime): Promise<boolean> => {
      return !!(
        runtime.getSetting("HYPERLANE_PRIVATE_KEY") &&
        runtime.getSetting("ETHEREUM_RPC_URL") &&
        runtime.getSetting("POLYGON_RPC_URL") &&
        runtime.getSetting("ETHEREUM_TOKEN_ADDRESS") &&
        runtime.getSetting("POLYGON_TOKEN_ADDRESS")
      );
    },
    handler: async (
      runtime: IAgentRuntime,
      message: Memory,
      state: State,
      options: TokenTransferOptions,
      callback?: HandlerCallback
    ): Promise<boolean> => {
      try {
        // Define chain metadata
        const chainMetadata: ChainMap<ExtendedChainMetadata> = {
          ethereum: {
            name: 'ethereum',
            chainId: 1,
            domainId: 1,
            protocol: ProtocolType.Ethereum,
            rpcUrls: [{
              http: runtime.getSetting("ETHEREUM_RPC_URL")!,
            }],
            mailbox: runtime.getSetting("ETHEREUM_MAILBOX_ADDRESS") as Address,
          },
          polygon: {
            name: 'polygon',
            chainId: 137,
            domainId: 137,
            protocol: ProtocolType.Ethereum,
            rpcUrls: [{
              http: runtime.getSetting("POLYGON_RPC_URL")!,
            }],
            mailbox: runtime.getSetting("POLYGON_MAILBOX_ADDRESS") as Address,
          },
        };

        // Initialize MultiProvider
        const multiProvider = new MultiProvider(chainMetadata);

        // Set up provider
        const ethereumProvider = new JsonRpcProvider(runtime.getSetting("ETHEREUM_RPC_URL"));

        // Create wallet and set signer
        const wallet = new Wallet(runtime.getSetting("HYPERLANE_PRIVATE_KEY"), ethereumProvider);
        multiProvider.setSigner(options.sourceChain, wallet);

        elizaLogger.info("Initializing token transfer...");

        // Get latest gas price
        const gasPrice = await multiProvider.getProvider(options.sourceChain).getGasPrice();

        // Estimate gas
        const feeEstimate: FeeEstimate = {
          nativeGas: BigInt(0),
          token: options.tokenAddress as Address,
          amount: BigInt(options.amount),
          gasPrice: gasPrice.toBigInt(),
          gasLimit: BigInt(21000), // Basic transfer gas limit
        };

        const receipt = await multiProvider.sendTransaction(
          options.sourceChain,
          {
            to: options.recipientAddress as Address,
            data: '0x',
            value: BigInt(options.amount),
          }
        );

        // Get explorer URL
        const explorerUrl = await multiProvider.tryGetExplorerAddressUrl(
          options.sourceChain,
          receipt.transactionHash
        );

        if (callback) {
          callback({
            text: `Successfully initiated token transfer to ${options.destinationChain}. Transaction hash: ${receipt.transactionHash}`,
            content: {
              transactionHash: receipt.transactionHash,
              amount: options.amount,
              token: options.tokenAddress,
              sourceChain: options.sourceChain,
              destinationChain: options.destinationChain,
              recipient: options.recipientAddress,
              explorerUrl,
              fees: {
                local: feeEstimate.amount.toString(),
                interchain: '0',
              },
            },
          });
        }

        return true;
      } catch (error) {
        elizaLogger.error("Error transferring tokens:", error);
        if (callback) {
          callback({
            text: `Error transferring tokens: ${error instanceof Error ? error.message : 'Unknown error'}`,
            content: {
              error: error instanceof Error ? error.message : 'Unknown error',
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
            text: "I'll transfer your tokens across chains.",
            action: "TRANSFER_TOKENS_CROSS_CHAIN",
          },
        },
        {
          user: "{{agent}}",
          content: {
            text: "Successfully initiated token transfer to Polygon. Transaction hash: 0xabcd...",
          },
        },
      ],
    ] as ActionExample[][],
  };

  export default transferTokensCrossChain;