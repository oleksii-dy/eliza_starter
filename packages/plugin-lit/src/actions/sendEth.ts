import {
  Action,
  HandlerCallback,
  IAgentRuntime,
  Memory,
  State,
} from "@elizaos/core";
import { ethers } from "ethers";
import { LitNodeClient } from "@lit-protocol/lit-node-client";
import { LIT_RPC, LIT_ABILITY } from "@lit-protocol/constants";
import {
  LitPKPResource,
  createSiweMessageWithRecaps,
  generateAuthSig,
  LitActionResource,
  AuthSig,
} from "@lit-protocol/auth-helpers";

interface LitState {
  nodeClient: LitNodeClient;
  evmWallet?: ethers.Wallet;
  pkp?: {
    publicKey: string;
    ethAddress: string;
  };
  capacityCredit?: {
    tokenId: string;
  };
}

export const sendEth: Action = {
  name: "SEND_ETH",
  description: "Sends ETH to an address on Sepolia using PKP wallet",
  similes: [
    "send eth",
    "send * eth to *",
    "send ethereum",
    "send * ETH to *",
    "transfer * eth to *",
    "transfer * ETH to *",
  ],
  validate: async (runtime: IAgentRuntime) => true,
  handler: async (
    runtime: IAgentRuntime,
    message: Memory,
    state: State,
    _options: Record<string, unknown>,
    callback?: HandlerCallback
  ): Promise<boolean> => {
    console.log("SEND_ETH handler started");
    try {
      const messageText = message.content.text as string;
      const matches = messageText.match(
        /send ([\d.]+) eth to (0x[a-fA-F0-9]{40})/i
      );

      if (!matches) {
        throw new Error("Could not parse ETH amount and address from message");
      }

      const content = {
        amount: matches[1],
        to: matches[2],
      };

      // Validate Lit environment
      const litState = (state.lit || {}) as LitState;
      if (
        !litState.nodeClient ||
        !litState.pkp ||
        !litState.evmWallet ||
        !litState.capacityCredit?.tokenId
      ) {
        throw new Error(
          "Lit environment not fully initialized - missing nodeClient, pkp, evmWallet, or capacityCredit"
        );
      }

      // Get RPC URL from runtime settings
      const rpcUrl = runtime.getSetting("RPC_URL");
      if (!rpcUrl) {
        throw new Error("No RPC URL provided");
      }

      const provider = new ethers.providers.JsonRpcProvider(rpcUrl);

      // Create transaction
      const nonce = await provider.getTransactionCount(litState.pkp.ethAddress);
      const gasPrice = await provider.getGasPrice();
      const gasLimit = 30000;

      const unsignedTx = {
        to: content.to,
        value: ethers.utils.parseEther(content.amount),
        chainId: 11155111, // Sepolia chainId
        nonce: nonce,
        gasPrice: gasPrice,
        gasLimit: gasLimit,
      };

      const fundingWallet = new ethers.Wallet(
        runtime.getSetting("FUNDING_PRIVATE_KEY"),
        new ethers.providers.JsonRpcProvider(LIT_RPC.CHRONICLE_YELLOWSTONE)
      );

      const { capacityDelegationAuthSig } =
        await litState.nodeClient.createCapacityDelegationAuthSig({
          dAppOwnerWallet: fundingWallet,
          capacityTokenId: litState.capacityCredit.tokenId,
          delegateeAddresses: [litState.pkp.ethAddress],
          uses: "1",
          expiration: new Date(Date.now() + 1000 * 60 * 10).toISOString(), // 10 minutes
        });

      // Get session signatures with capacity delegation
      console.log("Generating session signatures with capacity delegation...");
      const sessionSigs = await litState.nodeClient.getSessionSigs({
        pkpPublicKey: litState.pkp.publicKey,
        chain: "sepolia",
        capabilityAuthSigs: [capacityDelegationAuthSig],
        expiration: new Date(Date.now() + 1000 * 60 * 60 * 24).toISOString(), // 24 hours
        resourceAbilityRequests: [
          {
            resource: new LitPKPResource("*"),
            ability: LIT_ABILITY.PKPSigning,
          },
          {
            resource: new LitActionResource("*"),
            ability: LIT_ABILITY.LitActionExecution,
          },
        ],
        authNeededCallback: async ({
          resourceAbilityRequests,
          expiration,
          uri,
        }) => {
          const toSign = await createSiweMessageWithRecaps({
            uri: uri!,
            expiration: expiration!,
            resources: resourceAbilityRequests!,
            walletAddress: litState.evmWallet.address,
            nonce: await litState.nodeClient.getLatestBlockhash(),
            litNodeClient: litState.nodeClient,
          });

          return await generateAuthSig({
            signer: litState.evmWallet,
            toSign,
          });
        },
      });
      console.log("Session signatures generated");

      console.log("Signing transaction...");
      const sig = await litState.nodeClient.pkpSign({
        pubKey: litState.pkp.publicKey,
        toSign: ethers.utils.arrayify(
          ethers.utils.keccak256(ethers.utils.serializeTransaction(unsignedTx))
        ),
        sessionSigs,
      });

      // Combine signature with transaction
      const signature = {
        r: "0x" + sig.r,
        s: "0x" + sig.s,
        v: sig.recid === 0 ? 27 : 28, // Set v based on recid being 0 or 1
      };

      // Verify signature by recovering the address
      const msgHash = ethers.utils.keccak256(
        ethers.utils.serializeTransaction(unsignedTx)
      );
      const recoveredAddress = ethers.utils.recoverAddress(msgHash, signature);

      // If address doesn't match, try the other v value
      if (
        recoveredAddress.toLowerCase() !== litState.pkp.ethAddress.toLowerCase()
      ) {
        signature.v = signature.v === 27 ? 28 : 27; // Toggle between 27 and 28
        const altRecoveredAddress = ethers.utils.recoverAddress(
          msgHash,
          signature
        );

        if (
          altRecoveredAddress.toLowerCase() !==
          litState.pkp.ethAddress.toLowerCase()
        ) {
          throw new Error("Failed to recover correct address from signature");
        }
      }

      const signedTx = ethers.utils.serializeTransaction(unsignedTx, signature);

      // Send transaction
      console.log("Sending transaction...");
      const sentTx = await provider.sendTransaction(signedTx);
      await sentTx.wait();

      callback?.({
        text: `Successfully sent ${content.amount} ETH to ${content.to}. Transaction hash: ${sentTx.hash}`,
        content: {
          success: true,
          hash: sentTx.hash,
          amount: content.amount,
          to: content.to,
        },
      });

      return true;
    } catch (error) {
      console.error("Error in sendEth:", error);
      callback?.({
        text: `Failed to send ETH: ${
          error instanceof Error ? error.message : "Unknown error"
        }`,
        content: {
          success: false,
          error: error instanceof Error ? error.message : "Unknown error",
        },
      });
      return false;
    }
  },
  examples: [
    [
      {
        user: "{{user1}}",
        content: {
          text: "Send 0.01 ETH to 0x742d35Cc6634C0532925a3b844Bc454e4438f44e",
        },
      },
      {
        user: "{{user2}}",
        content: {
          text: "Successfully sent ETH",
        },
      },
    ],
  ],
};
