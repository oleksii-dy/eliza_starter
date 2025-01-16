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
    HyperlaneCore,
    MultiProvider,
    ChainMap,
    type ChainMetadata,
  } from '@hyperlane-xyz/sdk';
  import { JsonRpcProvider } from '@ethersproject/providers';
  import { Wallet } from '@ethersproject/wallet';
  import { Address } from '@hyperlane-xyz/utils';
  import { ProtocolType } from '@hyperlane-xyz/utils';
  import { Signer } from "@ethersproject/abstract-signer";

  export const sendCrossChainMessage: Action = {
    name: "SEND_CROSS_CHAIN_MESSAGE",
    similes: ["SEND_MESSAGE", "TRANSFER_MESSAGE", "CROSS_CHAIN_SEND"],
    description: "Send a message from one chain to another using Hyperlane",
    validate: async (runtime: IAgentRuntime) => {
      return !!(
        runtime.getSetting("HYPERLANE_PRIVATE_KEY") &&
        runtime.getSetting("ETHEREUM_RPC_URL") &&
        runtime.getSetting("POLYGON_RPC_URL")
      );
    },
    handler: async (
      runtime: IAgentRuntime,
      message: Memory,
      state: State,
      options: Record<string, unknown>,
      callback?: HandlerCallback
    ) => {
      try {
        // Initialize chain metadata
        const chainMetadata: ChainMap<ChainMetadata> = {
          ethereum: {
            name: 'ethereum',
            chainId: 1,
            domainId: 1,
            protocol: ProtocolType.Ethereum,
            rpcUrls: [
              {
                //@ts-ignore
                http: runtime.getSetting("ETHEREUM_RPC_URL"),
                pagination: {
                  maxBlockRange: 2000,
                  minBlockNumber: 0,
                },
                retry: {
                  maxRequests: 5,
                  baseRetryMs: 1000,
                },
              },
            ],
            blockExplorers: [
              {
                name: 'Etherscan',
                url: 'https://etherscan.io',
                apiUrl: 'https://api.etherscan.io',
              },
            ],
          },
          polygon: {
            name: 'polygon',
            chainId: 137,
            domainId: 137,
            protocol: ProtocolType.Ethereum,
            rpcUrls: [
              {
                //@ts-ignore
                http: runtime.getSetting("POLYGON_RPC_URL"),
                pagination: {
                  maxBlockRange: 2000,
                  minBlockNumber: 0,
                },
                retry: {
                  maxRequests: 5,
                  baseRetryMs: 1000,
                },
              },
            ],
            blockExplorers: [
              {
                name: 'Polygonscan',
                url: 'https://polygonscan.com',
                apiUrl: 'https://api.polygonscan.com',
              },
            ],
          },
        };

        // Initialize MultiProvider
        const multiProvider = new MultiProvider(chainMetadata);

        // Set up provider
        //@ts-ignore
        const ethereumProvider = new JsonRpcProvider(runtime.getSetting("ETHEREUM_RPC_URL"));

        // Create wallet
        //@ts-ignore
        const wallet = new Wallet(runtime.getSetting("HYPERLANE_PRIVATE_KEY"), ethereumProvider);

        // Create compatible signer
        const signer = {
          _isSigner: true,
          provider: ethereumProvider,
          getAddress: async () => wallet.address,
          signMessage: (message: string) => wallet.signMessage(message),
          signTransaction: (transaction: any) => wallet.signTransaction(transaction),
          connect: (provider: JsonRpcProvider) => wallet.connect(provider),
          getBalance: (blockTag?: string | number) => wallet.getBalance(blockTag),
          getTransactionCount: (blockTag?: string | number) => wallet.getTransactionCount(blockTag),
          estimateGas: (transaction: any) => wallet.estimateGas(transaction),
          call: (transaction: any, blockTag?: string | number) => wallet.call(transaction, blockTag),
          sendTransaction: (transaction: any) => wallet.sendTransaction(transaction),
          getChainId: () => wallet.getChainId(),
        }as unknown as Signer;

        multiProvider.setSigner('ethereum', signer);

        // Define Hyperlane addresses
        const hyperlaneAddresses = {
          ethereum: {
            mailbox: runtime.getSetting("ETHEREUM_MAILBOX_ADDRESS") as Address,
            validatorAnnounce: runtime.getSetting("ETHEREUM_VALIDATOR_ANNOUNCE") as Address,
            proxyAdmin: runtime.getSetting("ETHEREUM_PROXY_ADMIN") as Address,
          },
          polygon: {
            mailbox: runtime.getSetting("POLYGON_MAILBOX_ADDRESS") as Address,
            validatorAnnounce: runtime.getSetting("POLYGON_VALIDATOR_ANNOUNCE") as Address,
            proxyAdmin: runtime.getSetting("POLYGON_PROXY_ADMIN") as Address,
          },
        };

        // Initialize HyperlaneCore
        const core = HyperlaneCore.fromAddressesMap(hyperlaneAddresses, multiProvider);

        elizaLogger.info("Sending cross-chain message...");

        const sourceChain = options.sourceChain as string || 'ethereum';
        const targetChain = options.targetChain as string || 'polygon';
        const recipientAddress = options.recipientAddress as string;
        const messageContent = options.message as string;

        // Send message
        const { dispatchTx, message: dispatchedMessage } = await core.sendMessage(
          sourceChain,
          targetChain,
          recipientAddress as Address,
          messageContent
        );

        elizaLogger.info("Message dispatched:", dispatchTx.transactionHash);

        // Get explorer URL
        const explorerUrl = await multiProvider.tryGetExplorerAddressUrl(
          sourceChain,
          dispatchTx.transactionHash
        );

        // Wait for message processing
        await core.waitForMessageProcessed(dispatchTx);
        elizaLogger.info("Message processed on destination chain");

        if (callback) {
          callback({
            text: `Successfully sent message across chains. Transaction hash: ${dispatchTx.transactionHash}`,
            content: {
              transactionHash: dispatchTx.transactionHash,
              messageId: dispatchedMessage.id,
              explorerUrl,
            },
          });
        }

        return true;
      } catch (error) {
        elizaLogger.error("Error sending cross-chain message:", error);
        if (callback) {
          callback({
            text: `Error sending cross-chain message: ${error.message}`,
            content: { error: error.message },
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
            text: "Send a message from Ethereum to Polygon",
            options: {
              sourceChain: "ethereum",
              targetChain: "polygon",
              recipientAddress: "0x1234...",
              message: "Hello Cross Chain!"
            }
          },
        },
        {
          user: "{{agent}}",
          content: {
            text: "I'll send your message across chains.",
            action: "SEND_CROSS_CHAIN_MESSAGE",
          },
        },
        {
          user: "{{agent}}",
          content: {
            text: "Successfully sent message across chains. Transaction hash: 0xabcd...",
          },
        },
      ],
    ] as ActionExample[][],
  };

  export default sendCrossChainMessage;