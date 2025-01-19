import { Action, HandlerCallback, IAgentRuntime, Memory, State } from "@elizaos/core";
import { ethers } from "ethers";
import { LitNodeClient } from "@lit-protocol/lit-node-client";
import { LIT_RPC, LIT_ABILITY } from "@lit-protocol/constants";
import { LitPKPResource, createSiweMessageWithRecaps, generateAuthSig, LitActionResource } from "@lit-protocol/auth-helpers";

const USDC_CONTRACT_ADDRESS = "0x94a9D9AC8a22534E3FaCa9F4e7F2E2cf85d5E4C8"; // Sepolia USDC (AAVE)
const USDC_ABI = ["function transfer(address to, uint256 amount) returns (bool)"];

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

export const sendUSDC: Action = {
  name: "SEND_USDC",
  description: "Sends USDC to an address on Sepolia using PKP wallet",
  similes: ["send usdc", "send * usdc to *", "transfer * usdc to *"],
  validate: async (runtime: IAgentRuntime) => true,
  handler: async (
    runtime: IAgentRuntime,
    message: Memory,
    state: State,
    _options: Record<string, unknown>,
    callback?: HandlerCallback
  ): Promise<boolean> => {
    try {
      const matches = message.content.text.match(/send ([\d.]+) usdc to (0x[a-fA-F0-9]{40})/i);
      if (!matches) throw new Error("Could not parse USDC amount and address");

      const [_, amount, to] = matches;
      const litState = (state.lit || {}) as LitState;
      if (!litState.nodeClient || !litState.pkp || !litState.evmWallet || !litState.capacityCredit?.tokenId) {
        throw new Error("Lit environment not fully initialized");
      }

      const provider = new ethers.providers.JsonRpcProvider(runtime.getSetting("RPC_URL"));
      const usdcContract = new ethers.Contract(USDC_CONTRACT_ADDRESS, USDC_ABI, provider);
      const decimals = 6; // USDC has 6 decimals
      const value = ethers.utils.parseUnits(amount, decimals);

      const unsignedTx = await usdcContract.populateTransaction.transfer(to, value);
      unsignedTx.nonce = await provider.getTransactionCount(litState.pkp.ethAddress);
      unsignedTx.gasPrice = await provider.getGasPrice();
      unsignedTx.gasLimit = ethers.BigNumber.from(100000);
      unsignedTx.chainId = 11155111; // Sepolia

      const fundingWallet = new ethers.Wallet(
        runtime.getSetting("FUNDING_PRIVATE_KEY"),
        new ethers.providers.JsonRpcProvider(LIT_RPC.CHRONICLE_YELLOWSTONE)
      );

      const { capacityDelegationAuthSig } = await litState.nodeClient.createCapacityDelegationAuthSig({
        dAppOwnerWallet: fundingWallet,
        capacityTokenId: litState.capacityCredit.tokenId,
        delegateeAddresses: [litState.pkp.ethAddress],
        uses: "1",
        expiration: new Date(Date.now() + 1000 * 60 * 10).toISOString(),
      });

      const sessionSigs = await litState.nodeClient.getSessionSigs({
        pkpPublicKey: litState.pkp.publicKey,
        chain: "sepolia",
        capabilityAuthSigs: [capacityDelegationAuthSig],
        expiration: new Date(Date.now() + 1000 * 60 * 60 * 24).toISOString(),
        resourceAbilityRequests: [
          { resource: new LitPKPResource("*"), ability: LIT_ABILITY.PKPSigning },
          { resource: new LitActionResource("*"), ability: LIT_ABILITY.LitActionExecution },
        ],
        authNeededCallback: async ({ resourceAbilityRequests, expiration, uri }) => {
          const toSign = await createSiweMessageWithRecaps({
            uri: uri!,
            expiration: expiration!,
            resources: resourceAbilityRequests!,
            walletAddress: litState.evmWallet.address,
            nonce: await litState.nodeClient.getLatestBlockhash(),
            litNodeClient: litState.nodeClient,
          });
          return await generateAuthSig({ signer: litState.evmWallet, toSign });
        },
      });

      const sig = await litState.nodeClient.pkpSign({
        pubKey: litState.pkp.publicKey,
        toSign: ethers.utils.arrayify(ethers.utils.keccak256(ethers.utils.serializeTransaction(unsignedTx))),
        sessionSigs,
      });

      const signature = { r: "0x" + sig.r, s: "0x" + sig.s, v: sig.recid === 0 ? 27 : 28 };
      const signedTx = ethers.utils.serializeTransaction(unsignedTx, signature);
      const sentTx = await provider.sendTransaction(signedTx);
      await sentTx.wait();

      callback?.({
        text: `Successfully sent ${amount} USDC to ${to}. Transaction hash: ${sentTx.hash}`,
        content: { success: true, hash: sentTx.hash, amount, to },
      });
      return true;

    } catch (error) {
      console.error("Error in sendUSDC:", error);
      callback?.({
        text: `Failed to send USDC: ${error instanceof Error ? error.message : "Unknown error"}`,
        content: { success: false, error: error instanceof Error ? error.message : "Unknown error" },
      });
      return false;
    }
  },
  examples: [[
    { user: "{{user1}}", content: { text: "Send 10 USDC to 0x742d35Cc6634C0532925a3b844Bc454e4438f44e" }},
    { user: "{{user2}}", content: { text: "Successfully sent USDC" }}
  ]],
};